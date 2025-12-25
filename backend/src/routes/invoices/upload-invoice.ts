import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';
import { uploadMediaToR2 } from "../../utils/s3";

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
        orderId,
        invoiceName,
        agentPrefix,
        customerId,
        discountPercentage,
        pdfBase64,
      } = body;

      if (
        !orderId ||
        !invoiceName ||
        !agentPrefix ||
        !customerId ||
        !pdfBase64
      ) {
        return reply.code(400).send({ error: "Missing required fields" });
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

      const fileName = `invoice_${orderId}${formattedDate}.pdf`;
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
      const insertQuery = `
        INSERT INTO ${invoicesTable} (order_id, name, pdf_url, status, discount_percentage)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await pgClient.query(insertQuery, [
        orderId,
        invoiceName,
        uploadedUrl,
        "generated",
        discountPercentage || 0,
      ]);

      return reply.code(200).send({ success: true, publicUrl: uploadedUrl });
    } catch (error) {
      console.error("Upload invoice error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}