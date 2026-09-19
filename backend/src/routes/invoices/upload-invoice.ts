import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { uploadMediaToR2 } from "../../utils/s3.js";
import { updateInvoiceWithPdfRegeneration } from '../../services/invoice-edit.service.js';

export default async function uploadInvoiceRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.post("/upload-invoice", async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;
      const {
        id,
        invoiceId,
        orderId,
        invoiceName,
        agentPrefix,
        customerId,
        discountPercentage,
        totalAmount,
        advanceAmount,
        notes,
        items,
        pdfBase64,
      } = body;

      const targetInvoiceId = invoiceId || id;
      if (targetInvoiceId) {
        const { rows: agentRows } = await pgClient.query(
          "SELECT * FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)",
          [authenticatedUser.id]
        );
        if (agentRows.length > 0) {
          const updateRes = await updateInvoiceWithPdfRegeneration({
            agent: agentRows[0],
            invoiceId: Number(targetInvoiceId),
            invoiceName,
            items: items || [],
            discountPercentage,
            advanceAmount,
            totalAmount,
            notes,
            customerId,
            pdfBase64,
            pgClient,
          });
          return reply.code(200).send({
            success: true,
            publicUrl: updateRes.pdfUrl,
            invoice: updateRes.invoice,
          });
        }
      }

      if (
        !invoiceName ||
        !agentPrefix ||
        !customerId ||
        !pdfBase64
      ) {
        return reply.code(400).send({ error: "Missing required fields: invoiceName, agentPrefix, customerId, pdfBase64" });
      }

      // Decode base64 to buffer
      const pdfBuffer = Buffer.from(pdfBase64, "base64");

      // Generate filename
      const now = new Date();
      const formattedDate = `${now.getFullYear()}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(
        now.getHours()
      ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
        now.getSeconds()
      ).padStart(2, "0")}`;

      const filePrefix = orderId ? `order_${orderId}` : `cust_${customerId}`;
      const fileName = `invoice_${filePrefix}_${formattedDate}.pdf`;
      const r2Key = `${agentPrefix}/invoices/${customerId}/${fileName}`;

      // Upload to R2
      const uploadedUrl = await uploadMediaToR2(
        "",
        pdfBuffer,
        fileName,
        "application/pdf",
        "incoming",
        r2Key
      );

      if (!uploadedUrl) {
        return reply.code(500).send({ error: "Failed to upload invoice" });
      }

      // Insert invoice record
      const invoicesTable = `${agentPrefix}_orders_invoices`;
      const itemsTable = `${agentPrefix}_orders_items`;

      const insertQuery = `
        INSERT INTO ${invoicesTable} (customer_id, order_id, name, pdf_url, status, discount_percentage, total_amount, advance_amount, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const { rows: invoiceRows } = await pgClient.query(insertQuery, [
        customerId,
        orderId || null,
        invoiceName,
        uploadedUrl,
        "generated",
        discountPercentage || 0,
        totalAmount || 0,
        advanceAmount || 0,
        notes || null,
      ]);

      const invoice = invoiceRows[0];

      // If items were provided, insert into itemsTable with invoice_id
      if (items && Array.isArray(items) && items.length > 0) {
        const orderItems = items.map((item: any) => ({
          order_id: orderId || null,
          invoice_id: invoice.id,
          name: item.name.trim(),
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
        }));

        const values = orderItems
          .map(
            (_, i) =>
              `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
          )
          .join(", ");
        const params = orderItems.flatMap((item) => [
          item.order_id,
          item.invoice_id,
          item.name,
          item.quantity,
          item.price,
        ]);

        await pgClient.query(
          `INSERT INTO ${itemsTable} (order_id, invoice_id, name, quantity, price) VALUES ${values}`,
          params
        );
      }

      return reply.code(200).send({
        success: true,
        publicUrl: uploadedUrl,
        invoice: {
          ...invoice,
          items: items || [],
        },
      });
    } catch (error) {
      console.error("Upload invoice error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}