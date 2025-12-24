import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

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

      if (!body.whatsapp_number || !body.webhook_url) {
        return reply.code(400).send({
          success: false,
          message:
            "whatsapp_number and webhook_url are required for WhatsApp setup",
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

      // Get agent details
      const { rows: agentRows } = await pgClient.query(
        "SELECT agent_prefix, id FROM agents WHERE user_id = $1",
        [body.user_id]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "Agent not found for user",
        });
      }

      const agentData = agentRows[0];

      // Create or update WhatsApp configuration using function
      let configRows;
      try {
        const result = await pgClient.query(
          "SELECT * FROM create_whatsapp_config($1, $2, $3, $4, $5, $6, $7)",
          [
            body.user_id,
            body.whatsapp_number,
            body.webhook_url,
            body.api_key || null,
            body.business_account_id || null,
            body.phone_number_id || null,
            body.whatsapp_app_secret || null,
          ]
        );
        configRows = result.rows;
      } catch (dbError) {
        console.error("Database query failed:", dbError);
        return reply.code(500).send({
          success: false,
          message: "Database error: " + (dbError as Error).message,
        });
      }

      if (configRows.length === 0 || !configRows[0].success) {
        console.error(
          "Failed to setup WhatsApp configuration. Rows:",
          configRows
        );
        return reply.code(400).send({
          success: false,
          message: "Failed to setup WhatsApp configuration",
        });
      }

      const configData = configRows[0].config;

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
        user_id: body.user_id,
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