import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { CacheService } from '../../utils/cache.js';

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
        order_number,
        total_amount,
        customer_name,
      } = body;

      // Validate required fields
      if (!user_id || !customer_phone || !invoice_url || !invoice_name || !order_number || !total_amount) {
        return reply.code(400).send({
          error: "Missing required fields: user_id, customer_phone, invoice_url, invoice_name, order_number, total_amount",
        });
      }

      // Get agent (support both owner and sub-users)
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix, user_id FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)",
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({ error: "Agent not found" });
      }

      const agent = agentRows[0];

      // Get WhatsApp config using agent owner's user_id
      const { rows: whatsappRows } = await pgClient.query(
        "SELECT api_key, phone_number_id, user_id FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true",
        [agent.user_id]
      );

      if (whatsappRows.length === 0) {
        return reply.code(404).send({
          error: "WhatsApp configuration not found",
        });
      }

      const whatsappConfig = whatsappRows[0];

      const customersTable = `${agent.agent_prefix}_customers`;
      const templatesTable = `${agent.agent_prefix}_templates`;

      const cleanPhone = customer_phone.replace(/\D/g, "");
      // Find customer
      const { rows: customerRows } = await pgClient.query(
        `SELECT id, name, last_user_message_time, phone FROM ${customersTable} WHERE phone = $1 OR phone = $2`,
        [customer_phone, cleanPhone]
      );

      if (customerRows.length === 0) {
        return reply.code(404).send({ error: "Customer not found" });
      }

      const customer = customerRows[0];

      // Normalize phone number to E.164 format
      let normalizedPhone = customer.phone.replace(/\D/g, ""); // Remove non-digits
      if (!normalizedPhone.startsWith("1") && normalizedPhone.length === 10) {
        normalizedPhone = "1" + normalizedPhone; // Assume US if 10 digits
      }
      normalizedPhone = "+" + normalizedPhone;
      if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
        return reply.code(400).send({
          error: "Invalid phone number format",
        });
      }

      // Check if customer is in free form window (24 hours)
      const now = new Date();
      const lastTime = customer.last_user_message_time
        ? new Date(customer.last_user_message_time)
        : new Date(0);
      const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

      let useFreeForm = false;
      if (hoursSince <= 24) {
        useFreeForm = true;
      }

      let stored_message;
      let stored_caption = null;
      let stored_media_type = "none";
      let stored_media_url = null;

      if (!useFreeForm) {
        // Get the invoice_template
        const { rows: templateRows } = await pgClient.query(
          `SELECT * FROM ${templatesTable} WHERE agent_id = $1 AND name = $2 AND is_active = true`,
          [agent.id, "invoice_template"]
        );

        if (templateRows.length === 0) {
          return reply.code(404).send({
            error:
              "Invoice template not found. Please create 'invoice_template' template first.",
          });
        }

        const templates = templateRows[0];

        const templateData = templates;
        const accessToken = whatsappConfig.api_key;
        const phoneNumberId = whatsappConfig.phone_number_id;

        // Prepare template parameters
        const templateName = templateData.body.name;
        const templateLanguageCode =
          typeof templateData.body.language === "string"
            ? templateData.body.language
            : templateData.body.language?.code || "en";

        // Get template components to extract parameter names
        const storedComponents = templateData.body.components || [];
        const storedBody = storedComponents.find(
          (c: any) => c.type.toLowerCase() === "body"
        );

        if (!storedBody) {
          return reply.code(400).send({
            error: "Template body component not found in stored template",
          });
        }

        // Invoice parameter values - mapped to your exact template parameter names
        const invoiceDataMap: { [key: string]: string } = {
          customer: customer_name || "Valued Customer",
          order_id: order_number,
          total: `LKR ${parseFloat(total_amount).toFixed(2)}`,
          invoice_url: invoice_url,
          // Additional fallback mappings
          customer_name: customer_name || "Valued Customer",
          name: customer_name || "Valued Customer",
          order: order_number,
          order_number: order_number,
          order_no: order_number,
          amount: `LKR ${parseFloat(total_amount).toFixed(2)}`,
          total_amount: `LKR ${parseFloat(total_amount).toFixed(2)}`,
          url: invoice_url,
          link: invoice_url,
        };

        // Build template parameters using stored parameter names
        let templateParams: any[] = [];

        if (storedBody.parameters && storedBody.parameters.length > 0) {
          templateParams = storedBody.parameters.map(
            (param: any, index: number) => {
              // Try to extract parameter name from various sources
              let paramName = "";

              if (param.parameter_name) {
                paramName = param.parameter_name;
              } else if (param.name) {
                paramName = param.name;
              } else if (
                param.text &&
                param.text.includes("{{") &&
                param.text.includes("}}")
              ) {
                // Extract from {{parameter}} format
                const match = param.text.match(/\{\{([^}]+)\}\}/);
                paramName = match ? match[1].trim() : `param_${index + 1}`;
              } else {
                paramName = `param_${index + 1}`;
              }

              // Get the value from our mapping or use fallback
              let value = invoiceDataMap[paramName];
              if (!value) {
                // Fallback to positional mapping
                const fallbackValues = [
                  customer_name || "Valued Customer",
                  order_number,
                  `LKR ${parseFloat(total_amount).toFixed(2)}`,
                  invoice_url,
                ];
                value = fallbackValues[index] || "";
              }

              return {
                type: "text",
                parameter_name: paramName,
                text: value,
              };
            }
          );
        } else {
          // Fallback matching your exact template parameter names
          templateParams = [
            {
              type: "text",
              parameter_name: "customer",
              text: customer_name || "Valued Customer",
            },
            {
              type: "text",
              parameter_name: "order_id",
              text: order_number,
            },
            {
              type: "text",
              parameter_name: "total",
              text: `LKR ${parseFloat(total_amount).toFixed(2)}`,
            },
            {
              type: "text",
              parameter_name: "invoice_url",
              text: invoice_url,
            },
          ];
        }

        // Create WhatsApp template payload
        const whatsappPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLanguageCode },
            components: [
              {
                type: "body",
                parameters: templateParams,
              },
            ],
          },
        };

        // Send to WhatsApp
        const response = await fetch(
          `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(whatsappPayload),
          }
        );

        const result = await response.json() as any;

        if (!response.ok) {
          return reply.code(500).send({
            error: "Failed to send invoice template",
            details: result,
          });
        }

        const whatsappMessageId = result.messages?.[0]?.id || null;

        // Insert to messages table
        const messagesTable = `${agent.agent_prefix}_messages`;
        const messageTimestamp = now.toISOString();
        // Render the template body text with parameters
        const bodyComponent = (templates?.body?.components || []).find((c: any) => c.type?.toLowerCase() === "body");
        let renderedText = bodyComponent?.text || `Invoice template: ${invoice_name}`;
        if (bodyComponent && bodyComponent.parameters) {
          bodyComponent.parameters.forEach((param: any, index: number) => {
            const placeholder = `{{${index + 1}}}`;
            let paramValue = '';
            if (param.parameter_name) {
              if (param.parameter_name === 'customer' || param.parameter_name === 'customer_name' || param.parameter_name === 'name') {
                paramValue = customer_name || 'Valued Customer';
              } else if (param.parameter_name === 'order_id' || param.parameter_name === 'order' || param.parameter_name === 'order_number' || param.parameter_name === 'order_no') {
                paramValue = order_number;
              } else if (param.parameter_name === 'total' || param.parameter_name === 'amount' || param.parameter_name === 'total_amount') {
                paramValue = `LKR ${parseFloat(total_amount).toFixed(2)}`;
              } else if (param.parameter_name === 'invoice_url' || param.parameter_name === 'url' || param.parameter_name === 'link') {
                paramValue = invoice_url;
              }
            }
            renderedText = renderedText.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), paramValue);
          });
        }
        stored_message = renderedText;

        let insertedMessage;
        try {
          const { rows: msgRows } = await pgClient.query(
            `INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [customer.id, stored_message, "outbound", messageTimestamp, true, "none", null, null]
          );
          if (msgRows.length > 0) {
            insertedMessage = msgRows[0];
          }
        } catch (msgError) {
          return reply.code(500).send({
            error: "Failed to store message in database",
            details: (msgError as Error).message,
          });
        }

        if (emitNewMessage && insertedMessage) {
          const messageDataForSocket = {
            id: insertedMessage.id,
            customer_id: insertedMessage.customer_id,
            customer_name: customer.name || customer.phone,
            customer_phone: customer.phone,
            message: insertedMessage.message,
            sender_type: "agent",
            timestamp: insertedMessage.timestamp,
            media_type: insertedMessage.media_type,
            media_url: insertedMessage.media_url,
            caption: insertedMessage.caption,
          };
          emitNewMessage(agent.id, messageDataForSocket);
        }

        if (cacheService) {
          await cacheService.invalidateRecentMessages(agent.id, customer.id);
          await cacheService.invalidateChatList(agent.id);
        }

        return reply.code(200).send({
          success: true,
          message_id: whatsappMessageId,
          template_used: templateName,
          details: result,
        });
      } else {
        // Free form sending - send document with caption
        const accessToken = whatsappConfig.api_key;
        const phoneNumberId = whatsappConfig.phone_number_id;

        // Build caption
        const caption = `*Your invoice is ready!*

Hello ${customer_name || "Valued Customer"},

Your invoice for Order ${order_number} is ready!
Total Amount: LKR ${parseFloat(total_amount).toFixed(2)}

Thank you for your business!`;

        // Download invoice PDF
        const invoiceResponse = await fetch(invoice_url);
        if (!invoiceResponse.ok) {
          return reply.code(400).send({ error: "Failed to download invoice PDF" });
        }
        const invoiceBlob = await invoiceResponse.blob();
        const mimeType =
          invoiceResponse.headers.get("content-type") || "application/pdf";

        // Upload to Supabase storage for dashboard access
        let storedMediaUrl = null;
        // TODO: Implement storage upload using S3 or other method

        // Upload to WhatsApp media using Blob to avoid ReferenceError: File is not defined
        const uploadFormData = new FormData();
        uploadFormData.append("messaging_product", "whatsapp");
        uploadFormData.append("type", "document");
        uploadFormData.append(
          "file",
          invoiceBlob,
          invoice_name || `invoice_${order_number}.pdf`
        );

        const uploadResponse = await fetch(
          `https://graph.facebook.com/v23.0/${phoneNumberId}/media`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: uploadFormData,
          }
        );

        if (!uploadResponse.ok) {
          const upErrorText = await uploadResponse.text();
          return reply.code(400).send({
            error: "Failed to upload invoice to WhatsApp media",
          });
        }

        const uploadResult = await uploadResponse.json() as any;
        const mediaId = uploadResult.id;

        if (!mediaId) {
          return reply.code(400).send({ error: "Invalid WhatsApp media upload response" });
        }

        // Send document message with caption
        const whatsappPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone,
          type: "document",
          document: {
            id: mediaId,
            caption: caption,
            filename: invoice_name || `invoice_${order_number}.pdf`,
          },
        };

        // Send to WhatsApp
        const response = await fetch(
          `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(whatsappPayload),
          }
        );

        const result = await response.json() as any;

        if (!response.ok) {
          return reply.code(500).send({
            error: "Failed to send invoice document",
            details: result,
          });
        }

        const whatsappMessageId = result.messages?.[0]?.id || null;

        // Insert to messages table
        const messagesTable = `${agent.agent_prefix}_messages`;
        const messageTimestamp = now.toISOString();
        stored_message = caption; // Use the caption as the message text
        stored_caption = caption;
        stored_media_type = "document";
        stored_media_url = storedMediaUrl;

        let insertedMessage;
        try {
          const { rows: msgRows } = await pgClient.query(
            `INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [customer.id, stored_message, "outbound", messageTimestamp, true, stored_media_type, stored_media_url, stored_caption]
          );
          if (msgRows.length > 0) {
            insertedMessage = msgRows[0];
          }
        } catch (msgError) {
          return reply.code(500).send({
            error: "Failed to store message in database",
            details: msgError.message,
          });
        }

        if (emitNewMessage && insertedMessage) {
          const messageDataForSocket = {
            id: insertedMessage.id,
            customer_id: insertedMessage.customer_id,
            customer_name: customer.name || customer.phone,
            customer_phone: customer.phone,
            message: insertedMessage.message,
            sender_type: "agent",
            timestamp: insertedMessage.timestamp,
            media_type: insertedMessage.media_type,
            media_url: insertedMessage.media_url,
            caption: insertedMessage.caption,
          };
          emitNewMessage(agent.id, messageDataForSocket);
        }

        if (cacheService) {
          await cacheService.invalidateRecentMessages(agent.id, customer.id);
          await cacheService.invalidateChatList(agent.id);
        }

        return reply.code(200).send({
          success: true,
          message_id: whatsappMessageId,
          sent_as: "document",
          details: result,
        });
      }
    } catch (error) {
      console.error("Send invoice template error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}