import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { CacheService } from '../../utils/cache.js';
import { normalizeE164, dispatchCustomerInvoicePdf } from '../../services/whatsapp-outbound.service.js';
import { sendOrResendInvoiceViaWhatsApp } from '../../services/invoice-lifecycle.service.js';

export default async function sendInvoiceTemplateRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  cacheService: CacheService,
  emitNewMessage?: (agentId: number, messageData: any) => void
) {
  fastify.post('/send-invoice-template', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;
      const {
        user_id,
        customer_phone,
        invoice_url,
        invoice_name,
        order_number: rawOrderNumber,
        invoice_number,
        invoice_id,
        total_amount,
        customer_name,
      } = body || {};

      const effectiveUserId = user_id || authenticatedUser.id;
      const order_number = rawOrderNumber || invoice_number || (invoice_id ? `INV-${invoice_id}` : 'Invoice');

      if (!customer_phone || (!invoice_url && !invoice_id)) {
        return reply.code(400).send({
          error: "Missing required fields: customer_phone and invoice_url or invoice_id",
        });
      }

      // Get agent (support both owner and sub-users)
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix, user_id, business_name, name FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)",
        [effectiveUserId]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({ error: "Agent not found" });
      }

      const agent = agentRows[0];
      const agentPrefix = agent.agent_prefix;

      // Check if invoice_id is provided or can be found by pdf_url
      let resolvedInvoiceId = invoice_id ? Number(invoice_id) : null;
      if (!resolvedInvoiceId && invoice_url) {
        const { rows: matchRows } = await pgClient.query(
          `SELECT id FROM ${agentPrefix}_orders_invoices WHERE pdf_url = $1 LIMIT 1`,
          [invoice_url]
        );
        if (matchRows.length > 0) {
          resolvedInvoiceId = matchRows[0].id;
        }
      }

      // If we have an invoice record in DB, delegate directly to invoice lifecycle service
      if (resolvedInvoiceId && !isNaN(resolvedInvoiceId)) {
        const result = await sendOrResendInvoiceViaWhatsApp({
          agent,
          invoiceId: resolvedInvoiceId,
          pgClient,
          emitNewMessage,
          cacheService,
        });

        return reply.code(200).send({
          success: result.success,
          message_id: 'dispatched',
          invoice: result.invoice,
        });
      }

      // Fallback: Ad-hoc PDF dispatch via WhatsApp Cloud API
      const normalizedPhone = normalizeE164(customer_phone);
      if (!normalizedPhone) {
        return reply.code(400).send({ error: `Invalid recipient phone format: ${customer_phone}` });
      }

      const { rows: waRows } = await pgClient.query(
        "SELECT api_key, phone_number_id, user_id FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true",
        [agent.user_id]
      );

      if (waRows.length === 0) {
        return reply.code(404).send({ error: "Active WhatsApp configuration not found" });
      }

      const whatsappConfig = waRows[0];
      const customersTable = `${agentPrefix}_customers`;

      // Find or create customer
      let { rows: custRows } = await pgClient.query(
        `SELECT id, name, phone FROM ${customersTable} WHERE phone = $1 OR phone = $2 LIMIT 1`,
        [customer_phone, normalizedPhone]
      );

      let customer = custRows[0];
      if (!customer) {
        const { rows: newCust } = await pgClient.query(
          `INSERT INTO ${customersTable} (phone, name, agent_id, last_user_message_time)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, name, phone`,
          [normalizedPhone, customer_name || normalizedPhone, agent.id]
        );
        customer = newCust[0];
      }

      const totalVal = parseFloat(total_amount) || 0;
      const formatLkr = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const caption = `*Invoice ${order_number}* - ${agent.business_name || agent.name || 'Invoice'}\nTotal Amount: LKR ${formatLkr(totalVal)}\nOnce you make the advance or full payment at once, we start the work immediately. Our project manager will contact you soon for gathering requirements.`;

      const dispatched = await dispatchCustomerInvoicePdf({
        agent,
        customer,
        invoice: {
          id: 0,
          invoice_number: order_number,
          name: invoice_name || 'Invoice',
          pdf_url: invoice_url,
          status: 'sent',
          total_amount: totalVal,
        },
        caption,
        whatsappConfig,
        pgClient,
        emitNewMessage,
        cacheService,
      });

      if (!dispatched) {
        return reply.code(500).send({ error: "Failed to dispatch invoice PDF to WhatsApp" });
      }

      return reply.code(200).send({
        success: true,
        message: "Invoice sent via WhatsApp successfully",
        message_id: 'dispatched',
      });
    } catch (err: any) {
      console.error("[Send Invoice Template] Error:", err);
      return reply.code(500).send({ error: err.message || "Internal server error" });
    }
  });
}