import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { downloadMediaFromR2 } from '../../utils/s3.js';

export default async function downloadInvoiceRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.get("/download-invoice", async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, pgClient);

      const query = request.query as any;
      const { invoiceId } = query;

      if (!invoiceId) {
        return reply.code(400).send({ error: "Missing invoice ID" });
      }

      // Get agent profile to get agent prefix
      const agentQuery = `
        SELECT agent_prefix FROM agents WHERE user_id = $1
      `;
      const agentResult = await pgClient.query(agentQuery, [authenticatedUser.id]);

      if (agentResult.rows.length === 0) {
        return reply.code(404).send({ error: "Agent not found" });
      }

      const agentPrefix = agentResult.rows[0].agent_prefix;

      // Get invoice details
      const invoicesTable = `${agentPrefix}_orders_invoices`;
      const invoiceQuery = `
        SELECT pdf_url, name FROM ${invoicesTable} WHERE id = $1
      `;
      const invoiceResult = await pgClient.query(invoiceQuery, [invoiceId]);

      if (invoiceResult.rows.length === 0) {
        return reply.code(404).send({ error: "Invoice not found" });
      }

      const invoice = invoiceResult.rows[0];
      const pdfUrl = invoice.pdf_url;
      const invoiceName = invoice.name;

      // Extract key from URL (everything after R2_PUBLIC_URL)
      const r2PublicUrl = process.env.R2_PUBLIC_URL!;
      const key = pdfUrl.replace(r2PublicUrl + '/', '');

      // Download from R2
      const pdfBuffer = await downloadMediaFromR2(key);

      if (!pdfBuffer) {
        return reply.code(500).send({ error: "Failed to download invoice from storage" });
      }

      // Sanitize filename
      const sanitizedFileName = invoiceName.replace(/[^a-z0-9]/gi, "_").toLowerCase();

      // Set headers for download
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="${sanitizedFileName}.pdf"`);
      reply.header('Content-Length', pdfBuffer.length);

      return reply.code(200).send(pdfBuffer);
    } catch (error) {
      console.error("Download invoice error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}