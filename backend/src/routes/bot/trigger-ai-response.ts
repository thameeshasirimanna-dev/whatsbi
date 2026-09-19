import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { CacheService } from '../../utils/cache.js';
import {
  generateCustomerReply,
  sendWhatsAppTextMessage,
  formatMessageWithAI,
  dispatchServiceSampleImages,
  dispatchCustomerInvoicePdf,
  parseJsonUrls,
  isSampleRequest,
} from '../../services/ai-chatbot.service.js';
import { parseAndExecuteAgentActions } from '../../services/ai-agent-actions.service.js';
import { syncAutonomousLeadStage } from '../../services/ai-lead-stage.service.js';

export default async function triggerAiResponseRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  cacheService: CacheService,
  emitNewMessage?: (agentId: number, messageData: any) => void,
  emitAgentStatusUpdate?: (agentId: number, statusData: any) => void
) {
  fastify.post('/trigger-ai-response', async (request, reply) => {
    try {
      const user = await verifyJWT(request, pgClient);
      const body = request.body as any;

      const {
        customer_id,
        action_type = 'custom_prompt',
        product_id,
        service_id,
        prompt,
      } = body;

      if (!customer_id) {
        return reply.code(400).send({
          success: false,
          error: 'customer_id is required',
        });
      }

      // Fetch agent associated with user
      let agentRows;
      try {
        const res = await pgClient.query(
          `SELECT a.id, a.agent_prefix, u.name as business_name, a.business_type, a.credits, a.ai_balance, a.company_overview, a.company_overview_path, a.ai_instructions, a.user_id, a.business_email, a.contact_number, a.address, a.website, a.invoice_template_path
           FROM agents a
           LEFT JOIN users u ON a.user_id = u.id
           WHERE a.user_id = $1 OR a.id = (SELECT agent_id FROM users WHERE id = $1)`,
          [user.id]
        );
        agentRows = res.rows;
      } catch (colErr: any) {
        try {
          const res = await pgClient.query(
            `SELECT a.id, a.agent_prefix, u.name as business_name, a.business_type, a.credits, a.ai_balance, a.company_overview_path, a.user_id, a.business_email, a.contact_number, a.address, a.website, a.invoice_template_path
             FROM agents a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.user_id = $1 OR a.id = (SELECT agent_id FROM users WHERE id = $1)`,
            [user.id]
          );
          agentRows = res.rows;
        } catch {
          const res = await pgClient.query(
            `SELECT a.id, a.agent_prefix, u.name as business_name, a.business_type, a.credits, a.company_overview_path, a.user_id, a.business_email, a.contact_number, a.address, a.website, a.invoice_template_path
             FROM agents a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.user_id = $1 OR a.id = (SELECT agent_id FROM users WHERE id = $1)`,
            [user.id]
          );
          agentRows = res.rows;
        }
      }

      if (agentRows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Agent not found for user',
        });
      }

      const agent = agentRows[0];

      // Check agent DeepSeek AI balance
      const currentAiBalance = parseFloat(agent.ai_balance ?? '4.0');
      if (currentAiBalance <= 0) {
        return reply.code(400).send({
          success: false,
          error: `Insufficient AI balance ($${currentAiBalance.toFixed(4)} available). Please contact an administrator to top up your balance.`,
        });
      }

      // Fetch customer
      const customersTable = `${agent.agent_prefix}_customers`;
      const { rows: customerRows } = await pgClient.query(
        `SELECT id, name, phone, language, lead_stage, ai_enabled
         FROM ${customersTable}
         WHERE id = $1`,
        [customer_id]
      );

      if (customerRows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Customer not found',
        });
      }

      const customer = customerRows[0];

      // Fetch WhatsApp configuration
      const { rows: configRows } = await pgClient.query(
        `SELECT api_key, phone_number_id, user_id, deepseek_api_key
         FROM whatsapp_configuration
         WHERE user_id = $1 AND is_active = true`,
        [agent.user_id]
      );

      if (configRows.length === 0 || !configRows[0].phone_number_id || !configRows[0].api_key) {
        return reply.code(400).send({
          success: false,
          error: 'WhatsApp configuration (Phone Number ID / API Key) not found or inactive',
        });
      }

      const whatsappConfig = configRows[0];

      // Compose prompt based on action
      let customPrompt = prompt || '';

      if (action_type === 'product_inquiry' && product_id) {
        const itemsTable = `${agent.agent_prefix}_inventory_items`;
        const { rows: itemRows } = await pgClient.query(
          `SELECT name, sku, price, description
           FROM ${itemsTable}
           WHERE id = $1`,
          [product_id]
        );

        if (itemRows.length > 0) {
          const item = itemRows[0];
          customPrompt =
            prompt ||
            `The customer is asking about product "${item.name}" (SKU: ${item.sku || 'N/A'}, Price: Rs. ${item.price || '0.00'}). Description: ${item.description || 'Standard product'}. Please provide a polite, concise overview of this product, confirm the price, and ask if they would like to place an order or have questions.`;
        }
      } else if (action_type === 'service_inquiry' && service_id) {
        const servicesTable = `${agent.agent_prefix}_services`;
        const packagesTable = `${agent.agent_prefix}_service_packages`;
        const { rows: serviceRows } = await pgClient.query(
          `SELECT service_name, description, service_links, image_urls
           FROM ${servicesTable}
           WHERE id = $1`,
          [service_id]
        );

        if (serviceRows.length > 0) {
          const service = serviceRows[0];
          let packageInfo = '';
          try {
            const { rows: pkgRows } = await pgClient.query(
              `SELECT package_name, price, currency, description
               FROM ${packagesTable}
               WHERE service_id = $1 AND (is_active = true OR is_active IS NULL)`,
              [service_id]
            );
            if (pkgRows.length > 0) {
              packageInfo = ' Packages: ' + pkgRows.map(p => `${p.package_name} (${p.currency || 'Rs.'} ${p.price || 'N/A'})`).join(', ');
            }
          } catch (pErr) {
            console.warn('Could not fetch packages for service inquiry prompt:', pErr);
          }

          let sampleInfo = '';
          const sampleLinks = parseJsonUrls(service.service_links);
          if (sampleLinks.length > 0) {
            sampleInfo += ` Sample Work & Portfolio Links: ${sampleLinks.join(', ')}.`;
          }
          const sampleImages = parseJsonUrls(service.image_urls);
          if (sampleImages.length > 0) {
            sampleInfo += ` Sample work photos are available for this service.`;
          }

          customPrompt =
            prompt ||
            `The customer is inquiring about service "${service.service_name}". Description: ${service.description || 'Professional service'}.${packageInfo}${sampleInfo} Please provide a helpful, concise description of this service and its available packages, share the portfolio / sample work links if relevant, and invite them to schedule a booking or consultation.`;
        }
      }

      // Generate response using DeepSeek
      const aiResult = await generateCustomerReply({
        agent,
        customer,
        customPrompt,
        pgClient,
        deepseekApiKey: whatsappConfig.deepseek_api_key,
      });

      const replyText = aiResult.reply;
      if (!replyText) {
        return reply.code(500).send({
          success: false,
          error: 'DeepSeek AI could not generate a response. Please check API key configuration.',
        });
      }

      // Execute any agent actions (appointments, invoices, lead stage updates) and obtain clean text
      const { cleanReply, actionsExecuted } = await parseAndExecuteAgentActions({
        agent,
        customer,
        rawReply: replyText,
        incomingText: prompt || customPrompt,
        pgClient,
        cacheService,
        emitAgentStatusUpdate,
      });

      // Synchronize customer pipeline stage
      await syncAutonomousLeadStage({
        agent,
        customer,
        stage: aiResult.stage || 'inquiry',
        incomingText: prompt || customPrompt,
        actionsExecuted,
        pgClient,
        cacheService,
        emitAgentStatusUpdate,
      });

      if (!cleanReply) {
        return reply.code(500).send({
          success: false,
          error: 'Generated empty reply after action execution.',
        });
      }

      // Format the full message using AI for clean spacing, unbroken sentences, and WhatsApp markdown
      const formattedReply = await formatMessageWithAI(cleanReply, {
        apiKey: aiResult.apiKey || whatsappConfig.deepseek_api_key,
      });

      // Dispatch to WhatsApp
      const sendResult = await sendWhatsAppTextMessage(
        whatsappConfig.phone_number_id,
        whatsappConfig.api_key,
        customer.phone,
        formattedReply
      );

      if (!sendResult.success) {
        return reply.code(500).send({
          success: false,
          error: `WhatsApp dispatch failed: ${sendResult.error}`,
        });
      }

      // Insert outbound message into {prefix}_messages
      const messagesTable = `${agent.agent_prefix}_messages`;
      const { rows: insertedRows } = await pgClient.query(
        `INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption)
         VALUES ($1, $2, 'outbound', CURRENT_TIMESTAMP, true, 'none', NULL, NULL) RETURNING *`,
        [customer.id, formattedReply]
      );

      // Deduct 2.0x actual DeepSeek API cost from ai_balance
      const chargedCost = aiResult.cost?.chargedCost || 0.001;
      let newBalance = 4.0;
      try {
        const { rows: updatedRows } = await pgClient.query(
          'UPDATE agents SET ai_balance = GREATEST(0, ai_balance - $1) WHERE id = $2 RETURNING ai_balance',
          [chargedCost, agent.id]
        );
        newBalance = updatedRows.length > 0 ? parseFloat(updatedRows[0].ai_balance) : 0;
      } catch (updateErr: any) {
        console.warn('[DeepSeek AI] ai_balance column not yet present for update:', updateErr.message);
      }
      console.log(`[DeepSeek AI] Manual CRM action by Agent ${agent.id}: actual cost $${aiResult.cost?.actualCost?.toFixed(6)}, charged 2x $${chargedCost.toFixed(6)}. New AI balance: $${newBalance.toFixed(4)}`);

      if (emitAgentStatusUpdate) {
        emitAgentStatusUpdate(agent.id, {
          type: 'ai_balance_updated',
          ai_balance: newBalance,
          balance: newBalance,
        });
        const createdAppt = actionsExecuted.find((a) => a.type === 'CREATE_APPOINTMENT' && a.success && a.data)?.data;
        if (createdAppt) {
          emitAgentStatusUpdate(agent.id, {
            type: 'appointment_created',
            appointment: createdAppt,
          });
        }
      }

      // Emit real-time Socket.IO event
      if (emitNewMessage && insertedRows.length > 0) {
        const msg = insertedRows[0];
        emitNewMessage(agent.id, {
          id: msg.id,
          customer_id: customer.id,
          customer_name: customer.name || customer.phone,
          customer_phone: customer.phone,
          message: msg.message,
          sender_type: 'agent',
          direction: 'outbound',
          timestamp: msg.timestamp,
          media_type: 'none',
          media_url: null,
          caption: null,
        });
      }

      // Invalidate caches
      if (cacheService) {
        await cacheService.invalidateRecentMessages(agent.id, customer.id);
        await cacheService.invalidateChatList(agent.id);
      }

      // Log to whatsapp_message_logs
      if (sendResult.messageId) {
        try {
          await pgClient.query(
            `INSERT INTO whatsapp_message_logs (user_id, agent_id, customer_phone, message_type, category, status, whatsapp_message_id)
             VALUES ($1, $2, $3, 'text', 'chatbot', 'sent', $4)`,
            [
              whatsappConfig.user_id,
              agent.id,
              customer.phone,
              sendResult.messageId,
            ]
          );
        } catch (logErr: any) {
          console.warn('Notice: could not record in whatsapp_message_logs:', logErr.message);
        }
      }

      // Dispatch invoice PDF document if an invoice was generated, or if customer asked or AI promised
      let invoiceToDispatch = actionsExecuted.find(
        (a) => a.type === 'CREATE_INVOICE' && a.success && a.data?.pdf_url && a.data?.is_generated
      )?.data;

      if (!invoiceToDispatch) {
        const incomingText = (prompt || '').trim();
        const isAskingInvoice = /ko\s*(?:mage\s*)?invoice|invoice\s*(?:eka\s*)?ko|where\s*(?:is\s*)?(?:my\s*)?invoice|send\s*(?:the\s*)?invoice|කෝ\s*(?:මගේ\s*)?ඉන්වොයිස්|කෝ\s*බිල|invoice\s*eka\s*ewanna/i.test(incomingText);
        const isPromisingPdf = /PDF\s*එක\s*(?:පහළින්\s*)?එව(?:ා\s*ඇත|න්නම්)|sending\s*(?:the\s*)?(?:invoice\s*)?pdf|attached\s*below|Invoice\s*PDF\s*එක/i.test(cleanReply);

        if (isAskingInvoice || isPromisingPdf) {
          try {
            const { rows: recentInvoices } = await pgClient.query(`
              SELECT * FROM ${agent.agent_prefix}_orders_invoices
              WHERE customer_id = $1 AND pdf_url IS NOT NULL AND is_generated = true
              ORDER BY id DESC LIMIT 1
            `, [customer.id]);

            if (recentInvoices.length > 0 && recentInvoices[0].pdf_url?.startsWith('http') && !recentInvoices[0].pdf_url.endsWith('/invoices')) {
              invoiceToDispatch = recentInvoices[0];
              console.log(`[Trigger AI Response] Customer asked or AI promised invoice. Re-dispatching invoice #${invoiceToDispatch.id}...`);
            }
          } catch (invErr: any) {
            console.warn('[Trigger AI Response] Notice: could not fetch recent invoice for PDF dispatch:', invErr.message);
          }
        }
      }

      if (invoiceToDispatch) {
        console.log(`[Trigger AI Response] Found invoice #${invoiceToDispatch.id} (${invoiceToDispatch.pdf_url}), triggering WhatsApp PDF document dispatch...`);
        await dispatchCustomerInvoicePdf({
          agent,
          customer,
          invoice: invoiceToDispatch,
          whatsappConfig,
          pgClient,
          emitNewMessage,
          cacheService,
        });
      } else {
        console.log(`[Trigger AI Response] No invoice to dispatch for customer ${customer.id}`);
      }

      // If requested or if service has sample images and prompt/action indicates samples
      if (
        action_type === 'service_inquiry' &&
        (body.send_samples === true || isSampleRequest(prompt || ''))
      ) {
        await dispatchServiceSampleImages({
          agent,
          customer,
          incomingText: prompt || 'sample',
          replyText: cleanReply,
          whatsappConfig,
          pgClient,
          emitNewMessage,
          cacheService,
        });
      }

      return reply.code(200).send({
        success: true,
        message: cleanReply,
        message_id: sendResult.messageId,
        actions: actionsExecuted,
        ai_balance: newBalance,
        cost: aiResult.cost,
      });
    } catch (err: any) {
      console.error('Trigger AI response error:', err);
      return reply.code(500).send({
        success: false,
        error: 'Server error: ' + (err.message || err),
      });
    }
  });
}
