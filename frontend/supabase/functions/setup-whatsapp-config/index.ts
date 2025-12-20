import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

serve(async (req) => {
  // CORS preflight handling
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed. Use POST for WhatsApp setup."
    }), {
      status: 405
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();

    // Validate required fields
    if (!body.user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "user_id is required",
        }),
        {
          status: 400,
        }
      );
    }

    if (!body.whatsapp_number || !body.webhook_url) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "whatsapp_number and webhook_url are required for WhatsApp setup",
        }),
        {
          status: 400,
        }
      );
    }

    // Validate user exists
    const { data: userExists, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("id", body.user_id)
      .single();

    if (userCheckError || !userExists) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "User not found: " + userCheckError?.message,
        }),
        {
          status: 404,
        }
      );
    }

    // Get agent details
    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .select("agent_prefix, id")
      .eq("user_id", body.user_id)
      .single();

    if (agentError || !agentData) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Agent not found for user: " + agentError?.message,
        }),
        {
          status: 404,
        }
      );
    }

    // Create or update WhatsApp configuration using RPC
    const { data: configData, error: configError } = await supabase.rpc(
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
      console.error("WhatsApp config setup error:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Failed to setup WhatsApp configuration: " + configError.message,
        }),
        {
          status: 400,
        }
      );
    }

    console.log("WhatsApp configuration setup successful:", configData);

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

    const { error: templateError } = await supabase
      .from(templatesTable)
      .upsert(defaultTemplates, { onConflict: "agent_id,name" });

    if (templateError) {
      console.error("Failed to create default templates:", templateError);
      // Don't fail the whole setup, just log
    } else {
      console.log("Default templates created successfully");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "WhatsApp configuration set up successfully",
        whatsapp_config: configData,
        user_id: body.user_id,
      }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("WhatsApp setup error:", err);
    return new Response(JSON.stringify({
      success: false,
      message: "Server error: " + err.message
    }), {
      status: 500
    });
  }
});