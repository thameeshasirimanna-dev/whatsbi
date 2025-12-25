import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';
import { deleteMediaFromR2 } from "../../utils/s3";

export default async function manageInvoicesRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.all("/manage-invoices", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE user_id = $1",
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          success: false,
          message: "Agent not found",
        });
      }

      const agent = agentRows[0];
      const agentPrefix = agent.agent_prefix;
      const method = request.method;

      switch (method) {
        case "GET": {
          // Fetch invoices with order and customer details
          const sql = `
            SELECT
              i.*,
              o.customer_id,
              c.name as customer_name
            FROM ${agentPrefix}_orders_invoices i
            LEFT JOIN ${agentPrefix}_orders o ON i.order_id = o.id
            LEFT JOIN ${agentPrefix}_customers c ON o.customer_id = c.id
            ORDER BY i.generated_at DESC
          `;

          const { rows: invoices } = await pgClient.query(sql);

          // Fetch order items to calculate totals
          const invoiceOrderIds = invoices.map((inv: any) => inv.order_id);
          if (invoiceOrderIds.length > 0) {
            const { rows: items } = await pgClient.query(
              `SELECT order_id, total FROM ${agentPrefix}_orders_items WHERE order_id = ANY($1)`,
              [invoiceOrderIds]
            );

            const orderTotals = new Map<number, number>();
            items.forEach((item: any) => {
              const orderId = item.order_id;
              const itemTotal = item.total || 0;
              orderTotals.set(orderId, (orderTotals.get(orderId) || 0) + itemTotal);
            });

            // Process invoices with calculated totals
            const processedInvoices = invoices.map((inv: any) => {
              const subtotal = orderTotals.get(inv.order_id) || 0;
              const discount = inv.discount_percentage || 0;
              const total = subtotal * (1 - discount / 100);

              return {
                ...inv,
                customer_name: inv.customer_name || "Unknown Customer",
                order_number: `#${inv.order_id.toString().padStart(4, "0")}`,
                total: total,
              };
            });

            return reply.code(200).send({
              success: true,
              invoices: processedInvoices,
            });
          } else {
            return reply.code(200).send({
              success: true,
              invoices: [],
            });
          }
        }

        case "PUT": {
          const body = request.body as any;
          const { id, status } = body;

          if (!id || typeof id !== "number") {
            return reply.code(400).send({
              success: false,
              message: "Invoice ID is required",
            });
          }

          if (!status || !["generated", "sent", "paid"].includes(status)) {
            return reply.code(400).send({
              success: false,
              message: "Valid status is required",
            });
          }

          const updateQuery = `
            UPDATE ${agentPrefix}_orders_invoices
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
          `;

          const { rows: updatedInvoices } = await pgClient.query(updateQuery, [
            status,
            id,
          ]);

          if (updatedInvoices.length === 0) {
            return reply.code(404).send({
              success: false,
              message: "Invoice not found",
            });
          }

          return reply.code(200).send({
            success: true,
            message: "Invoice updated successfully",
            invoice: updatedInvoices[0],
          });
        }

        case "DELETE": {
          const url = new URL(request.url, `http://${request.headers.host}`);
          const id = url.searchParams.get("id");

          if (!id || typeof id !== "string" || !id.match(/^\d+$/)) {
            return reply.code(400).send({
              success: false,
              message: "Valid invoice ID is required",
            });
          }

          const invoiceId = parseInt(id);

          // Get invoice details including pdf_url for file deletion
          const selectQuery = `
            SELECT pdf_url FROM ${agentPrefix}_orders_invoices WHERE id = $1
          `;
          const { rows: invoices } = await pgClient.query(selectQuery, [
            invoiceId,
          ]);

          if (invoices.length === 0) {
            return reply.code(404).send({
              success: false,
              message: "Invoice not found",
            });
          }

          const invoice = invoices[0];

          // Extract key from pdf_url
          const publicUrl = process.env.R2_PUBLIC_URL;
          if (!publicUrl) {
            return reply.code(500).send({
              success: false,
              message: "Storage configuration error",
            });
          }

          const key = invoice.pdf_url.replace(publicUrl + "/", "");

          // Delete from storage
          const deleted = await deleteMediaFromR2(key);
          if (!deleted) {
            console.error("Failed to delete invoice from storage:", key);
            // Continue with DB deletion even if storage deletion fails
          }

          // Delete from database
          const deleteQuery = `
            DELETE FROM ${agentPrefix}_orders_invoices WHERE id = $1
          `;
          await pgClient.query(deleteQuery, [invoiceId]);

          return reply.code(200).send({
            success: true,
            message: "Invoice deleted successfully",
          });
        }

        default: {
          return reply
            .code(405)
            .send({ success: false, message: "Method not allowed" });
        }
      }
    } catch (error) {
      console.error("Invoice management error:", error);
      return reply
        .code(500)
        .send({ success: false, message: "Internal server error" });
    }
  });
}