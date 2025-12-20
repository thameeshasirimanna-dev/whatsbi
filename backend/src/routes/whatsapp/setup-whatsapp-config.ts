import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function setupWhatsappConfigRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post('/setup-whatsapp-config', async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, supabaseClient);

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
          message: "whatsapp_number and webhook_url are required for WhatsApp setup",
        });
      }

      // Validate user exists
      const { data: userExists, error: userCheckError } = await supabaseClient
        .from("users")
        .select("id")
        .eq("id", body.user_id)
        .single();

      if (userCheckError || !userExists) {
        return reply.code(404).send({
          success: false,
          message: "User not found: " + userCheckError?.message,
        });
      }

      // Get agent details
      const { data: agentData, error: agentError } = await supabaseClient
        .from("agents")
        .select("agent_prefix, id")
        .eq("user_id", body.user_id)
        .single();

      if (agentError || !agentData) {
        return reply.code(404).send({
          success: false,
          message: "Agent not found for user: " + agentError?.message,
        });
      }

      // Create or update WhatsApp configuration using RPC
      const { data: configData, error: configError } = await supabaseClient.rpc(
        "create_whatsapp_config",
        {
          p_user_id: body.user_id,
          p_whatsapp_number: body.whatsapp_number,
          p_webhook_url: body.webhook_url,
          p_api_key: body.api_key || null,
          p_business_account_id: body.business_account_id || null,
          p_phone_number_id: body.phone_number_id || null,
        }
      );

      if (configError) {
        return reply.code(400).send({
          success: false,
          message: "Failed to setup WhatsApp configuration: " + configError.message,
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
          body: {
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
          },
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          agent_id: agentData.id,
          name: "invoice_template",
          category: "utility",
          language: "en_US",
          body: {
            name: "invoice_template",
            language: { code: "en_US" },
            components: [
              {
                text: "Your invoice is ready!",
                type: "HEADER",
                format: "TEXT"
              },
              {
                text: "Hello {{customer}},\n\nYour invoice for Order {{order_id}} is ready!\nTotal Amount: {{total}}\n\nDownload your invoice: {{invoice_url}}\n\nThank you for your business!",
                type: "BODY",
                example: {
                  body_text_named_params: [
                    {
                      example: "Kusal Sirimanna",
                      param_name: "customer"
                    },
                    {
                      example: "000001",
                      param_name: "order_id"
                    },
                    {
                      example: "LKR 5000",
                      param_name: "total"
                    },
                    {
                      example: "www.facebook.com",
                      param_name: "invoice_url"
                    }
                  ]
                }
              },
              {
                type: "BUTTONS",
                buttons: [
                  {
                    text: "Send Message",
                    type: "QUICK_REPLY"
                  }
                ]
              }
            ]
          },
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];

      const { error: templateError } = await supabaseClient
        .from(templatesTable)
        .upsert(defaultTemplates, { onConflict: "agent_id,name" });

      if (templateError) {
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
        message: "Server error: " + (err as Error).message
      });
    }
  });
}