import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function setupWhatsappConfigRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.post("/setup-whatsapp-config", async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;

      // Validate required fields
      if (!body.user_id) {
        return reply.code(400).send({
          success: false,
          message: "user_id is required",
        });
      }

      if (!body.whatsapp_number) {
        return reply.code(400).send({
          success: false,
          message: "whatsapp_number is required for WhatsApp setup",
        });
      }

      // Validate user exists
      const { rows: userRows } = await pgClient.query(
        "SELECT id FROM users WHERE id = $1",
        [body.user_id]
      );

      if (userRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "User not found",
        });
      }

      const targetUserId = authenticatedUser.role === 'admin' ? body.user_id : authenticatedUser.id;

      // Get agent details (support both owner and sub-users)
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix, user_id FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)",
        [targetUserId]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "Agent not found for user",
        });
      }

      const agentData = agentRows[0];

      // Only the agent owner or admin can manage WhatsApp settings
      if (authenticatedUser.role !== 'admin' && agentData.user_id !== authenticatedUser.id) {
        return reply.code(403).send({
          success: false,
          message: "Access denied. Only the agent owner or administrator can manage WhatsApp settings."
        });
      }

      const configUserId = agentData.user_id || targetUserId;

      // Ensure whatsapp_configuration columns and constraints are ready
      try {
        await pgClient.query(`
          ALTER TABLE whatsapp_configuration ADD COLUMN IF NOT EXISTS deepseek_api_key TEXT;
          ALTER TABLE whatsapp_configuration ADD COLUMN IF NOT EXISTS whatsapp_app_secret TEXT;
          ALTER TABLE whatsapp_configuration ALTER COLUMN webhook_url DROP NOT NULL;
        `);
      } catch (colErr: any) {
        console.warn("Notice: could not alter whatsapp_configuration columns:", colErr.message);
      }

      const webhookUrl = body.webhook_url ? String(body.webhook_url).trim() : "";
      const trimmedDeepSeekKey = body.deepseek_api_key !== undefined && body.deepseek_api_key !== null
        ? String(body.deepseek_api_key).trim() || null
        : null;

      // Check if WhatsApp configuration already exists for this user/agent
      const { rows: existingRows } = await pgClient.query(
        "SELECT id FROM whatsapp_configuration WHERE user_id = $1",
        [configUserId]
      );

      let configData: any = null;

      if (existingRows.length > 0) {
        // UPDATE existing record
        try {
          const { rows: updateRows } = await pgClient.query(`
            UPDATE whatsapp_configuration
            SET
              whatsapp_number = $1,
              webhook_url = COALESCE($2, webhook_url, ''),
              api_key = COALESCE($3, api_key),
              business_account_id = COALESCE($4, business_account_id),
              phone_number_id = COALESCE($5, phone_number_id),
              whatsapp_app_secret = COALESCE($6, whatsapp_app_secret),
              deepseek_api_key = $7,
              is_active = true,
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $8
            RETURNING row_to_json(whatsapp_configuration.*)::jsonb AS config;
          `, [
            body.whatsapp_number,
            webhookUrl,
            body.api_key || null,
            body.business_account_id || null,
            body.phone_number_id || null,
            body.whatsapp_app_secret || null,
            trimmedDeepSeekKey,
            configUserId,
          ]);

          if (updateRows.length > 0) {
            configData = updateRows[0].config;
          }
        } catch (updateErr: any) {
          console.warn("Update with whatsapp_app_secret failed, trying fallback:", updateErr.message);
          const { rows: fallbackUpdateRows } = await pgClient.query(`
            UPDATE whatsapp_configuration
            SET
              whatsapp_number = $1,
              webhook_url = COALESCE($2, webhook_url, ''),
              api_key = COALESCE($3, api_key),
              business_account_id = COALESCE($4, business_account_id),
              phone_number_id = COALESCE($5, phone_number_id),
              deepseek_api_key = $6,
              is_active = true,
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $7
            RETURNING row_to_json(whatsapp_configuration.*)::jsonb AS config;
          `, [
            body.whatsapp_number,
            webhookUrl,
            body.api_key || null,
            body.business_account_id || null,
            body.phone_number_id || null,
            trimmedDeepSeekKey,
            configUserId,
          ]);

          if (fallbackUpdateRows.length > 0) {
            configData = fallbackUpdateRows[0].config;
          }
        }
      } else {
        // INSERT new record
        try {
          const { rows: insertRows } = await pgClient.query(`
            INSERT INTO whatsapp_configuration (
              user_id,
              whatsapp_number,
              webhook_url,
              api_key,
              business_account_id,
              phone_number_id,
              whatsapp_app_secret,
              deepseek_api_key,
              is_active,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP)
            RETURNING row_to_json(whatsapp_configuration.*)::jsonb AS config;
          `, [
            configUserId,
            body.whatsapp_number,
            webhookUrl,
            body.api_key || null,
            body.business_account_id || null,
            body.phone_number_id || null,
            body.whatsapp_app_secret || null,
            trimmedDeepSeekKey,
          ]);

          if (insertRows.length > 0) {
            configData = insertRows[0].config;
          }
        } catch (insertErr: any) {
          console.warn("Insert with whatsapp_app_secret failed, trying fallback:", insertErr.message);
          const { rows: fallbackInsertRows } = await pgClient.query(`
            INSERT INTO whatsapp_configuration (
              user_id,
              whatsapp_number,
              webhook_url,
              api_key,
              business_account_id,
              phone_number_id,
              deepseek_api_key,
              is_active,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP)
            RETURNING row_to_json(whatsapp_configuration.*)::jsonb AS config;
          `, [
            configUserId,
            body.whatsapp_number,
            webhookUrl,
            body.api_key || null,
            body.business_account_id || null,
            body.phone_number_id || null,
            trimmedDeepSeekKey,
          ]);

          if (fallbackInsertRows.length > 0) {
            configData = fallbackInsertRows[0].config;
          }
        }
      }

      if (!configData) {
        return reply.code(500).send({
          success: false,
          message: "Failed to persist WhatsApp configuration in database",
        });
      }

      // Create default templates
      const templatesTable = `${agentData.agent_prefix}_templates`;

      const defaultTemplates = [
        {
          agent_id: agentData.id,
          name: "welcome_template",
          category: "utility",
          language: "en_US",
          body: JSON.stringify({
            name: "welcome_template",
            language: { code: "en_US" },
            components: [
              {
                text: "Welcome to {{business_name}}",
                type: "header",
                format: "TEXT",
                example: {
                  header_text_named_params: [
                    {
                      example: "IDesign Solutions",
                      param_name: "business_name",
                    },
                  ],
                },
              },
              {
                text: "Thank you for choosing us. We're happy to have you with us and look forward to working together. Please feel free to share your requirements or questions anytime — our team is here to help.\n\nIf you have any requirements, references, or questions, feel free to share them anytime — we're here to help 😊\n\nLooking forward to working with you!\n— {{business_name}} Team",
                type: "body",
                example: {
                  body_text_named_params: [
                    {
                      example: "IDesign Solutions",
                      param_name: "business_name",
                    },
                  ],
                },
              },
              {
                type: "buttons",
                buttons: [
                  {
                    text: "Send Message",
                    type: "QUICK_REPLY",
                  },
                ],
              },
            ],
          }),
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          agent_id: agentData.id,
          name: "invoice_template",
          category: "utility",
          language: "en_US",
          body: JSON.stringify({
            name: "invoice_template",
            language: { code: "en_US" },
            components: [
              {
                text: "Your invoice is ready!",
                type: "HEADER",
                format: "TEXT",
              },
              {
                text: "Hello {{customer}},\n\nYour invoice for Order {{order_id}} is ready!\nTotal Amount: {{total}}\n\nDownload your invoice: {{invoice_url}}\n\nThank you for your business!",
                type: "BODY",
                example: {
                  body_text_named_params: [
                    {
                      example: "Kusal Sirimanna",
                      param_name: "customer",
                    },
                    {
                      example: "000001",
                      param_name: "order_id",
                    },
                    {
                      example: "LKR 5000",
                      param_name: "total",
                    },
                    {
                      example: "www.facebook.com",
                      param_name: "invoice_url",
                    },
                  ],
                },
              },
              {
                type: "BUTTONS",
                buttons: [
                  {
                    text: "Send Message",
                    type: "QUICK_REPLY",
                  },
                ],
              },
            ],
          }),
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];

      try {
        for (const template of defaultTemplates) {
          await pgClient.query(
            `INSERT INTO ${templatesTable} (agent_id, name, category, language, body, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (agent_id, name) DO NOTHING`,
            [
              template.agent_id,
              template.name,
              template.category,
              template.language,
              template.body,
              template.is_active,
              template.created_at,
            ]
          );
        }
      } catch (templateError) {
        console.error("Failed to create default templates:", templateError);
      }

      return reply.code(200).send({
        success: true,
        message: "WhatsApp configuration set up successfully",
        whatsapp_config: configData,
        user_id: agentData.user_id,
      });
    } catch (err) {
      console.error("WhatsApp setup error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message,
      });
    }
  });
}