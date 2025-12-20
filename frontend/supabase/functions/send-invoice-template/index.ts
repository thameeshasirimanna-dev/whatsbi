import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    } as any);

    const body = await req.json();
    console.log("Incoming request body:", JSON.stringify(body, null, 2));

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
      return new Response(
        JSON.stringify({
          error: "Missing required fields: user_id, customer_phone, invoice_url, invoice_name, order_number, total_amount",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get WhatsApp config
    const { data: whatsappConfig, error: configError } = await supabase
      .from("whatsapp_configuration")
      .select("api_key, phone_number_id, user_id")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .single();

    if (configError || !whatsappConfig) {
      return new Response(
        JSON.stringify({ error: "WhatsApp configuration not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, agent_prefix")
      .eq("user_id", user_id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customersTable = `${agent.agent_prefix}_customers`;
    const templatesTable = `${agent.agent_prefix}_templates`;

    // Find customer
    const { data: customer, error: customerError } = await supabase
      .from(customersTable)
      .select("id, last_user_message_time, phone")
      .eq("phone", customer_phone)
      .single();

    if (customerError || !customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize phone number to E.164 format
    let normalizedPhone = customer.phone.replace(/\D/g, ""); // Remove non-digits
    if (!normalizedPhone.startsWith("1") && normalizedPhone.length === 10) {
      normalizedPhone = "1" + normalizedPhone; // Assume US if 10 digits
    }
    normalizedPhone = "+" + normalizedPhone;
    if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

    let whatsappPayload;
    let stored_message;
    let stored_caption = null;
    let stored_media_type = "none";
    let stored_media_url = null;

    if (!useFreeForm) {
      // Get the invoice_template
      const { data: templates, error: templateError } = await supabase
        .from(templatesTable)
        .select("*")
        .eq("agent_id", agent.id)
        .eq("name", "invoice_template")
        .eq("is_active", true)
        .single();

      if (templateError || !templates) {
        return new Response(
          JSON.stringify({
            error:
              "Invoice template not found. Please create 'invoice_template' template first.",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const templateData = templates;
      const accessToken = whatsappConfig.api_key;
      const phoneNumberId = whatsappConfig.phone_number_id;

      console.log(
        "Full template data from DB:",
        JSON.stringify(templateData, null, 2)
      );

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

      console.log(
        "Template components:",
        JSON.stringify(storedComponents, null, 2)
      );
      console.log(
        "Template body component:",
        JSON.stringify(storedBody, null, 2)
      );

      if (!storedBody) {
        return new Response(
          JSON.stringify({
            error: "Template body component not found in stored template",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
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

      console.log("Invoice data mapping:", invoiceDataMap);

      // Build template parameters using stored parameter names
      let templateParams: any[] = [];

      if (storedBody.parameters && storedBody.parameters.length > 0) {
        console.log("Using stored template parameters:", storedBody.parameters);

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

            console.log(
              `Parameter ${index}: name="${paramName}", value="${value}"`
            );

            return {
              type: "text",
              parameter_name: paramName,
              text: value,
            };
          }
        );
      } else {
        console.log(
          "No stored parameters found, using fallback for your template"
        );
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

      console.log(
        "Final template params with parameter_name:",
        JSON.stringify(templateParams, null, 2)
      );

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

      console.log(
        "Final WhatsApp payload:",
        JSON.stringify(whatsappPayload, null, 2)
      );

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

      const result = await response.json();
      console.log("WhatsApp API response:", JSON.stringify(result, null, 2));
      console.log("WhatsApp response status:", response.status);

      if (!response.ok) {
        console.error("WhatsApp API error:", result);
        return new Response(
          JSON.stringify({
            error: "Failed to send invoice template",
            details: result,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const whatsappMessageId = result.messages?.[0]?.id || null;

      // Insert to messages table
      const messagesTable = `${agent.agent_prefix}_messages`;
      const messageTimestamp = now.toISOString();
      // Render the template body text with parameters
      const bodyComponent = templates.body.components.find((c: any) => c.type.toLowerCase() === "body");
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
      const stored_message = renderedText;

      const { error: msgError } = await supabase.from(messagesTable).insert({
        customer_id: customer.id,
        message: stored_message,
        direction: "outbound",
        timestamp: messageTimestamp,
        is_read: true,
        media_type: "none",
        media_url: null,
        caption: null,
      });

      if (msgError) {
        console.error("Error inserting message:", msgError);
        return new Response(
          JSON.stringify({
            error: "Failed to store message in database",
            details: msgError,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Invoice template sent successfully:", whatsappMessageId);

      return new Response(
        JSON.stringify({
          success: true,
          message_id: whatsappMessageId,
          template_used: templateName,
          details: result,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Free form sending - send document with caption
      console.log("Sending invoice as document in free form");

      const accessToken = whatsappConfig.api_key;
      const phoneNumberId = whatsappConfig.phone_number_id;

      // Build caption
      const caption = `*Your invoice is ready!*

Hello ${customer_name || "Valued Customer"},

Your invoice for Order ${order_number} is ready!
Total Amount: LKR ${parseFloat(total_amount).toFixed(2)}

Thank you for your business!`;

      console.log("Invoice caption:", caption);

      // Download invoice PDF
      console.log("Downloading invoice from:", invoice_url);
      const invoiceResponse = await fetch(invoice_url);
      if (!invoiceResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to download invoice PDF" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const invoiceBlob = await invoiceResponse.blob();
      const mimeType =
        invoiceResponse.headers.get("content-type") || "application/pdf";

      // Upload to Supabase storage for dashboard access
      let storedMediaUrl = null;
      if (agent && agent.agent_prefix) {
        try {
          const now = new Date();
          const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
          const fileName = `invoice_${order_number}${formattedDate}.pdf`;
          const filePath = `${agent.agent_prefix}/outgoing/${customer.id}/${fileName}`;

          console.log(`Uploading invoice to Supabase storage: ${filePath}`);

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("whatsapp-media")
              .upload(filePath, invoiceBlob, {
                contentType: mimeType,
                cacheControl: "3600",
                upsert: false,
              });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage
              .from("whatsapp-media")
              .getPublicUrl(filePath);
            storedMediaUrl = urlData.publicUrl;
            console.log(`Invoice uploaded to storage: ${storedMediaUrl}`);
          } else {
            console.error("Failed to upload invoice to storage:", uploadError);
          }
        } catch (storageError) {
          console.error("Error uploading to Supabase storage:", storageError);
        }
      }

      // Upload to WhatsApp media
      const uploadedFile = new File(
        [invoiceBlob],
        invoice_name || `invoice_${order_number}.pdf`,
        {
          type: mimeType,
        }
      );

      const uploadFormData = new FormData();
      uploadFormData.append("messaging_product", "whatsapp");
      uploadFormData.append("type", "document");
      uploadFormData.append("file", uploadedFile);

      console.log("Uploading invoice to WhatsApp media...");
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
        console.error("Failed to upload invoice to WhatsApp:", upErrorText);
        return new Response(
          JSON.stringify({
            error: "Failed to upload invoice to WhatsApp media",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const uploadResult = await uploadResponse.json();
      const mediaId = uploadResult.id;

      if (!mediaId) {
        console.error("No media ID from WhatsApp upload:", uploadResult);
        return new Response(
          JSON.stringify({ error: "Invalid WhatsApp media upload response" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("WhatsApp media ID:", mediaId);

      // Send document message with caption
      whatsappPayload = {
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

      console.log(
        "Document payload:",
        JSON.stringify(whatsappPayload, null, 2)
      );

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

      const result = await response.json();
      console.log("WhatsApp API response:", JSON.stringify(result, null, 2));
      console.log("WhatsApp response status:", response.status);

      if (!response.ok) {
        console.error("WhatsApp API error:", result);
        return new Response(
          JSON.stringify({
            error: "Failed to send invoice document",
            details: result,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const whatsappMessageId = result.messages?.[0]?.id || null;

      // Insert to messages table
      const messagesTable = `${agent.agent_prefix}_messages`;
      const messageTimestamp = now.toISOString();
      stored_message = caption; // Use the caption as the message text
      stored_caption = caption;
      stored_media_type = "document";
      stored_media_url = storedMediaUrl;

      const { error: msgError } = await supabase.from(messagesTable).insert({
        customer_id: customer.id,
        message: stored_message,
        direction: "outbound",
        timestamp: messageTimestamp,
        is_read: true,
        media_type: stored_media_type,
        media_url: stored_media_url,
        caption: stored_caption,
      });

      if (msgError) {
        console.error("Error inserting message:", msgError);
        return new Response(
          JSON.stringify({
            error: "Failed to store message in database",
            details: msgError,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Invoice document sent successfully:", whatsappMessageId);

      return new Response(
        JSON.stringify({
          success: true,
          message_id: whatsappMessageId,
          sent_as: "document",
          details: result,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Send invoice template error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});