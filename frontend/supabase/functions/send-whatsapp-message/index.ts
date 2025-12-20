import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-nocheck - Disable TypeScript checking for this file to ensure deployment

// Type declarations for Deno APIs
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
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
      message,
      type = "text",
      category = "utility",
      is_promotional = false,
      template_name,
      template_params = [],
      header_params = [],
      template_buttons = [],
      media_id,
      media_ids,
      caption,
      filename,
    } = body;
    let media_header = body.media_header ?? null;

    if (type === "template") {
      console.log("Template-specific inputs:", {
        template_name,
        template_params: JSON.stringify(template_params, null, 2),
        header_params: JSON.stringify(header_params, null, 2),
        media_header: JSON.stringify(media_header, null, 2),
        template_buttons: JSON.stringify(template_buttons, null, 2),
      });
    }

    if (
      !user_id ||
      !customer_phone ||
      (type === "text" && !message) ||
      (type === "template" && !template_name) ||
      (type !== "text" &&
        type !== "template" &&
        !media_id &&
        !media_ids?.length)
    ) {
      let missingField = "unknown";
      if (type === "text") missingField = "message";
      else if (type === "template") missingField = "template_name";
      else missingField = "media_id or media_ids";
      return new Response(
        JSON.stringify({
          error: `Missing required fields: user_id, customer_phone, ${missingField}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate template-specific inputs
    if (type === "template") {
      if (
        media_header &&
        (!media_header.type || (!media_header.id && !media_header.link))
      ) {
        return new Response(
          JSON.stringify({
            error: "media_header must specify type and either id or link",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate header_params if provided
      for (const param of header_params) {
        if (
          !param ||
          !param.type ||
          !["text", "currency", "date_time"].includes(param.type)
        ) {
          return new Response(
            JSON.stringify({
              error: `Invalid header parameter type: ${param?.type}`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (
          param.type === "currency" &&
          (!param.currency ||
            !param.currency.code ||
            typeof param.currency.amount_1000 !== "number" ||
            !param.currency.fallback_value)
        ) {
          return new Response(
            JSON.stringify({
              error:
                "currency header parameter missing required fields (fallback_value, code, amount_1000)",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (
          param.type === "date_time" &&
          (!param.date_time || !param.date_time.fallback_value)
        ) {
          return new Response(
            JSON.stringify({
              error: "date_time header parameter missing fallback_value",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (param.type === "text" && !param.text) {
          return new Response(
            JSON.stringify({
              error: "text header parameter missing text value",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Validate template_params
      for (const param of template_params) {
        if (
          !param ||
          !param.type ||
          !["text", "currency", "date_time"].includes(param.type)
        ) {
          return new Response(
            JSON.stringify({ error: `Invalid parameter type: ${param?.type}` }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (
          param.type === "currency" &&
          (!param.currency ||
            !param.currency.code ||
            typeof param.currency.amount_1000 !== "number" ||
            !param.currency.fallback_value)
        ) {
          return new Response(
            JSON.stringify({
              error:
                "currency parameter missing required fields (fallback_value, code, amount_1000)",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (
          param.type === "date_time" &&
          (!param.date_time || !param.date_time.fallback_value)
        ) {
          return new Response(
            JSON.stringify({
              error: "date_time parameter missing fallback_value",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (param.type === "text" && !param.text) {
          return new Response(
            JSON.stringify({ error: "text parameter missing text value" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Validate template_buttons
      for (const button of template_buttons) {
        if (
          !button ||
          !button.sub_type ||
          !["quick_reply", "cta_phone", "cta_url"].includes(button.sub_type) ||
          typeof button.index !== "number"
        ) {
          return new Response(
            JSON.stringify({
              error: `Invalid button configuration: ${JSON.stringify(button)}`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (button.sub_type === "quick_reply" && !button.payload) {
          return new Response(
            JSON.stringify({ error: "quick_reply button missing payload" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (button.sub_type === "cta_phone" && !button.phone_number) {
          return new Response(
            JSON.stringify({ error: "cta_phone button missing phone_number" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (button.sub_type === "cta_url" && !button.url) {
          return new Response(
            JSON.stringify({ error: "cta_url button missing url" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
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
    const messagesTable = `${agent.agent_prefix}_messages`;
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

    const now = new Date();
    const lastTime = customer.last_user_message_time
      ? new Date(customer.last_user_message_time)
      : new Date(0);
    const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

    let useTemplate = false;
    let templateData = null;

    if (is_promotional || type === "template") {
      useTemplate = true;
    } else if (hoursSince > 24) {
      // Check for available template
      const { data: templates, error: templateError } = await supabase
        .from(templatesTable)
        .select("*")
        .eq("agent_id", agent.id)
        .eq("category", category)
        .eq("is_active", true)
        .limit(1);

      if (templateError || !templates || templates.length === 0) {
        console.log("No template available for 24h window");
        return new Response(
          JSON.stringify({
            error: "Template required after 24h window, none available",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      templateData = templates[0];
      useTemplate = true;
    }

    if (useTemplate) {
      const { data: creditsData, error: creditError } = await supabase
        .from("agents")
        .select("credits")
        .eq("id", agent.id)
        .single();

      if (creditError || !creditsData || creditsData.credits < 0.01) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits for template message" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Prepare WhatsApp payload
    const accessToken = whatsappConfig.api_key;
    const phoneNumberId = whatsappConfig.phone_number_id;

    let media_download_url = null;
    let storedMediaUrl: string | null = null;
    let effectiveMediaId = media_id;
    let templateMimeType: string | null = null;

    // Media processing
    const singleMediaId = body.media_id;
    const multipleMediaIds = body.media_ids;
    let mediaIdsToProcess: string[] = [];
    if (
      multipleMediaIds &&
      Array.isArray(multipleMediaIds) &&
      multipleMediaIds.length > 0
    ) {
      mediaIdsToProcess = multipleMediaIds;
      console.log(
        `[DEBUG] Processing multiple media IDs: ${JSON.stringify(
          mediaIdsToProcess
        )}`
      );
    } else if (singleMediaId) {
      mediaIdsToProcess = [singleMediaId];
      console.log(`[DEBUG] Processing single media ID: ${singleMediaId}`);
    } else {
      console.log(`[DEBUG] No media IDs to process`);
    }
    let processedMedia: Array<{
      effectiveMediaId: string;
      storedMediaUrl: string | null;
      mediaFormat: string;
    }> = [];
    if (mediaIdsToProcess.length > 0) {
      if (useTemplate) {
        return new Response(
          JSON.stringify({
            error:
              "Media messages cannot be sent using templates. Ensure you're within the 24-hour messaging window.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (mediaIdsToProcess.length > 1 && type !== "image") {
        return new Response(
          JSON.stringify({
            error: "Multiple media sending is only supported for images.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      console.log(
        `[DEBUG] Starting to process ${mediaIdsToProcess.length} media items`
      );
      processedMedia = await Promise.all(
        mediaIdsToProcess.map(async (mediaId: string, index: number) => {
          console.log(
            `[DEBUG] Processing media ${index + 1}/${
              mediaIdsToProcess.length
            }: ${mediaId}`
          );
          const mediaUrlResponse = await fetch(
            `https://graph.facebook.com/v23.0/${mediaId}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          if (!mediaUrlResponse.ok) {
            const errorText = await mediaUrlResponse.text();
            console.error("Failed to fetch media details:", errorText);
            throw new Error(
              `Invalid media ID - cannot fetch media details: ${errorText}`
            );
          }
          const mediaUrlData = await mediaUrlResponse.json();
          const media_download_url = mediaUrlData.url;
          if (!media_download_url) {
            throw new Error("No download URL in media response");
          }
          const templateMimeType = mediaUrlData.mime_type;
          let mediaFormat: string;
          if (templateMimeType?.startsWith("image/")) {
            mediaFormat = "image";
          } else if (templateMimeType?.startsWith("video/")) {
            mediaFormat = "video";
          } else if (templateMimeType?.startsWith("audio/")) {
            mediaFormat = "audio";
          } else if (
            templateMimeType?.startsWith("application/") ||
            templateMimeType?.startsWith("text/")
          ) {
            mediaFormat = "document";
          } else {
            throw new Error(`Unsupported media type: ${templateMimeType}`);
          }
          console.log(
            `[DEBUG] Media ${
              index + 1
            } URL fetched: ${media_download_url}, format: ${mediaFormat}`
          );
          console.log(
            `[DEBUG] Media ${index + 1} metadata:`,
            JSON.stringify(mediaUrlData, null, 2)
          );
          // Download media
          console.log(
            `[DEBUG] Downloading media ${index + 1} for storage:`,
            media_download_url
          );
          const mediaResponse = await fetch(media_download_url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (!mediaResponse.ok) {
            const dlErrorText = await mediaResponse.text();
            console.error("Failed to download media:", dlErrorText);
            throw new Error("Failed to download media for storage");
          }
          const mediaBlob = await mediaResponse.blob();
          const mimeType =
            templateMimeType ||
            mediaResponse.headers.get("content-type") ||
            "application/octet-stream";
          let storedMediaUrl: string | null = null;
          // Upload to Supabase storage for permanent dashboard access
          if (agent && agent.agent_prefix) {
            try {
              const timestamp = Date.now();
              const fileExt = mimeType.split("/")[1] || "bin";
              const fileName = `outgoing_${timestamp}_${crypto.randomUUID()}.${fileExt}`;
              const filePath = `${agent.agent_prefix}/outgoing/${fileName}`;
              console.log(
                `[DEBUG] Uploading outgoing media ${
                  index + 1
                } to Supabase storage: ${filePath}`
              );
              const { data: uploadData, error: uploadError } =
                await supabase.storage
                  .from("whatsapp-media")
                  .upload(filePath, mediaBlob, {
                    contentType: mimeType,
                    cacheControl: "3600",
                    upsert: false,
                  });
              if (!uploadError && uploadData) {
                const { data: urlData } = supabase.storage
                  .from("whatsapp-media")
                  .getPublicUrl(filePath);
                storedMediaUrl = urlData.publicUrl;
                console.log(
                  `[DEBUG] Outgoing media ${
                    index + 1
                  } uploaded to storage: ${storedMediaUrl}`
                );
              } else {
                console.error(
                  `[DEBUG] Failed to upload outgoing media ${
                    index + 1
                  } to storage:`,
                  uploadError
                );
              }
            } catch (storageError) {
              console.error(
                `[DEBUG] Error uploading media ${
                  index + 1
                } to Supabase storage:`,
                storageError
              );
            }
          }
          const effectiveMediaId = mediaId; // Use original media ID, no re-upload needed
          console.log(
            `[DEBUG] Processed media ${
              index + 1
            } ID for sending: ${effectiveMediaId}`
          );
          return { effectiveMediaId, storedMediaUrl, mediaFormat };
        })
      );
      console.log(
        `[DEBUG] All media processed: ${JSON.stringify(
          processedMedia.map((p) => ({
            id: p.effectiveMediaId,
            format: p.mediaFormat,
          })),
          null,
          2
        )}`
      );
      // Validate all media have the same format
      const uniqueFormats = [
        ...new Set(processedMedia.map((p) => p.mediaFormat)),
      ];
      console.log(
        `[DEBUG] Unique media formats found: ${JSON.stringify(uniqueFormats)}`
      );
      if (uniqueFormats.length > 1) {
        throw new Error(
          "Mixed media formats not supported in a single request"
        );
      }
      const actualType = uniqueFormats[0];
      console.log(
        `[DEBUG] Actual media type: ${actualType}, expected: ${type}`
      );
      if (actualType !== type) {
        throw new Error(
          `Media format mismatch: expected ${type}, got ${actualType}`
        );
      }
    }

    let whatsappPayload;
    let allResults = [];
    let allMessageIds = [];

    let templateStoredMediaUrl: string | null = null;
    let templateMediaType: string | null = null;
    let headerMediaObject: any = null;

    if (!useTemplate) {
      console.log(
        `[DEBUG] Building WhatsApp payload for type: ${type}, media count: ${processedMedia.length}`
      );
      if (type === "text") {
        // Free-form text
        console.log(`[DEBUG] Text payload: ${message}`);
        whatsappPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone,
          type: "text",
          text: { body: message },
        };
      } else if (type === "image" || type === "video") {
        if (processedMedia.length === 0) {
          throw new Error("No processed media available for image/video type");
        }
        const effective_caption = (caption || message || "").trim();
        console.log(
          `[DEBUG] Media payload for ${type}, caption: "${effective_caption}", media count: ${processedMedia.length}`
        );
        // For multiple images, prepare array of payloads
        if (processedMedia.length === 1) {
          const singleMedia = processedMedia[0];
          whatsappPayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: normalizedPhone,
            type: type,
            [type]: {
              id: singleMedia.effectiveMediaId,
              ...(effective_caption && { caption: effective_caption }),
            },
          };
          console.log(
            `[DEBUG] Single media payload ID: ${singleMedia.effectiveMediaId}`
          );
        } else if (processedMedia.length > 1 && type === "image") {
          console.log(
            `[DEBUG] Multiple images detected (${processedMedia.length}), preparing separate payloads`
          );
          const multiplePayloads = processedMedia.map((media, index) => ({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: normalizedPhone,
            type: type,
            [type]: {
              id: media.effectiveMediaId,
              ...(effective_caption && { caption: effective_caption }),
            },
          }));
          console.log(
            `[DEBUG] Multiple image payloads prepared: ${JSON.stringify(
              multiplePayloads.map((p) => p[type].id),
              null,
              2
            )}`
          );
          whatsappPayload = multiplePayloads;
        } else {
          throw new Error(`Unsupported multiple media for type: ${type}`);
        }
      } else if (type === "audio") {
        if (processedMedia.length === 0) {
          throw new Error("No processed media available for audio type");
        }
        const singleMedia = processedMedia[0];
        whatsappPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone,
          type: "audio",
          audio: {
            id: singleMedia.effectiveMediaId,
          },
        };
        console.log(
          `[DEBUG] Audio payload ID: ${singleMedia.effectiveMediaId}`
        );
      } else if (type === "document") {
        if (processedMedia.length === 0) {
          throw new Error("No processed media available for document type");
        }
        const singleMedia = processedMedia[0];
        whatsappPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone,
          type: "document",
          document: {
            id: singleMedia.effectiveMediaId,
            ...(filename && { filename }),
          },
        };
        console.log(
          `[DEBUG] Document payload ID: ${singleMedia.effectiveMediaId}`
        );
      } else {
        return new Response(
          JSON.stringify({ error: `Unsupported message type: ${type}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      console.log(
        `[DEBUG] Final WhatsApp payload: ${JSON.stringify(
          whatsappPayload,
          null,
          2
        )}`
      );
    } else {
      // Template
      console.log(
        "Fetching template with name:",
        template_name,
        "for agent_id:",
        agent.id
      );
      if (!templateData && template_name) {
        const { data: namedTemplate, error: fetchError } = await supabase
          .from(templatesTable)
          .select("*")
          .eq("agent_id", agent.id)
          .eq("name", template_name)
          .eq("is_active", true)
          .single();
        console.log("Fetched template:", namedTemplate, "Error:", fetchError);
        templateData = namedTemplate;
      }
      if (!templateData) {
        console.log("Template not found in DB for:", template_name);
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate components against stored template
      const storedComponents = templateData.body.components || [];
      const storedHeader = storedComponents.find(
        (c: any) => c.type.toLowerCase() === "header"
      );
      const storedBody = storedComponents.find(
        (c: any) => c.type.toLowerCase() === "body"
      );
      const storedButtons = storedComponents.filter(
        (c: any) => c.type.toLowerCase() === "button"
      );

      // Require media_header if template has media header
      if (
        storedHeader &&
        ["IMAGE", "VIDEO", "DOCUMENT"].includes(storedHeader.format)
      ) {
        console.log(
          "Template header details:",
          JSON.stringify(storedHeader, null, 2)
        );
        if (!media_header) {
          if (
            storedHeader.example &&
            storedHeader.example.header_handle &&
            storedHeader.example.header_handle.length > 0
          ) {
            media_header = {
              type: storedHeader.format.toLowerCase(),
              link: storedHeader.example.header_handle[0],
            };
            console.log(
              "Using example media link for header:",
              media_header.link
            );
          } else {
            console.log(
              "Media header required but not provided for format:",
              storedHeader.format
            );
            return new Response(
              JSON.stringify({
                error:
                  "Media header required for this template (format: " +
                  storedHeader.format +
                  ")",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
      }

      if (
        media_header &&
        (!storedHeader ||
          !["IMAGE", "VIDEO", "DOCUMENT"].includes(storedHeader.format))
      ) {
        console.log(
          "Media header provided but template header format is:",
          storedHeader ? storedHeader.format : "none"
        );
        return new Response(
          JSON.stringify({ error: "Template does not support media header" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate text header parameters requirement
      if (storedHeader && storedHeader.format?.toUpperCase() === "TEXT") {
        const requiredHeaderParams =
          storedHeader.example?.header_text_named_params?.length || 0;
        if (header_params.length !== requiredHeaderParams) {
          return new Response(
            JSON.stringify({
              error: `Template header requires exactly ${requiredHeaderParams} parameters, provided ${header_params.length}`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      const requiredBodyParams =
        storedBody?.example?.body_text_named_params?.length || 0;
      if (template_params.length !== requiredBodyParams) {
        return new Response(
          JSON.stringify({
            error: `Template body requires exactly ${requiredBodyParams} parameters, provided ${template_params.length}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (template_buttons.length !== storedButtons.length) {
        return new Response(
          JSON.stringify({
            error: `Template requires exactly ${storedButtons.length} buttons, provided ${template_buttons.length}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Handle media header for template
      if (media_header) {
        const { type: mediaType, id, link } = media_header;
        const mediaFormat = mediaType.toLowerCase();
        if (!["image", "video", "document"].includes(mediaFormat)) {
          return new Response(
            JSON.stringify({
              error: `Unsupported media format for header: ${mediaType}`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        let effectiveHeaderId: string | null = null;
        let downloadUrl: string | null = null;
        let mimeType: string | null = null;

        if (id) {
          // For existing ID, fetch details to validate and get download URL for storage
          const mediaUrlResponse = await fetch(
            `https://graph.facebook.com/v23.0/${id}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!mediaUrlResponse.ok) {
            const errorText = await mediaUrlResponse.text();
            console.error("Failed to fetch media details:", errorText);
            return new Response(
              JSON.stringify({ error: "Invalid media ID for template header" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          const mediaUrlData = await mediaUrlResponse.json();
          downloadUrl = mediaUrlData.url;
          mimeType = mediaUrlData.mime_type;
          effectiveHeaderId = id; // Use existing ID

          // Validate mime type matches format
          let expectedMimePrefix: string;
          switch (mediaFormat) {
            case "image":
              expectedMimePrefix = "image/";
              break;
            case "video":
              expectedMimePrefix = "video/";
              break;
            case "document":
              expectedMimePrefix = "application/";
              break;
            default:
              expectedMimePrefix = "";
          }
          if (mimeType && !mimeType.startsWith(expectedMimePrefix)) {
            return new Response(
              JSON.stringify({
                error: `Media MIME type mismatch for ${mediaFormat}: ${mimeType}`,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          templateMediaType = mediaFormat;
        } else if (link) {
          downloadUrl = link;
          // Get mime type
          let headResponse = await fetch(link, { method: "HEAD" });
          if (headResponse.ok) {
            mimeType = headResponse.headers.get("content-type") || "";
          } else {
            const getResponse = await fetch(link);
            mimeType = getResponse.headers.get("content-type") || "";
          }

          // Validate mime type
          let expectedMimePrefix: string;
          switch (mediaFormat) {
            case "image":
              expectedMimePrefix = "image/";
              break;
            case "video":
              expectedMimePrefix = "video/";
              break;
            case "document":
              expectedMimePrefix = "application/";
              break;
            default:
              expectedMimePrefix = "";
          }
          if (mimeType && !mimeType.startsWith(expectedMimePrefix)) {
            return new Response(
              JSON.stringify({
                error: `Link MIME type mismatch for ${mediaFormat}: ${mimeType}`,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          // Download media
          const mediaResponse = await fetch(downloadUrl!);
          if (!mediaResponse.ok) {
            return new Response(
              JSON.stringify({ error: "Failed to download media from link" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          const mediaBlob = await mediaResponse.blob();
          const finalMimeType =
            mimeType ||
            mediaResponse.headers.get("content-type") ||
            "application/octet-stream";

          // Determine upload type
          let uploadType: string;
          if (finalMimeType.startsWith("image/")) uploadType = "image";
          else if (finalMimeType.startsWith("video/")) uploadType = "video";
          else if (finalMimeType.startsWith("audio/")) uploadType = "audio";
          else uploadType = "document";

          if (uploadType !== mediaFormat) {
            return new Response(
              JSON.stringify({
                error: `Media type mismatch for upload: expected ${mediaFormat}, got ${uploadType}`,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          // Upload to WhatsApp to get ID
          const uploadedFileName = filename || `header_${Date.now()}`;
          const uploadedFile = new File([mediaBlob], uploadedFileName, {
            type: finalMimeType,
          });
          const uploadFormData = new FormData();
          uploadFormData.append("messaging_product", "whatsapp");
          uploadFormData.append("type", uploadType);
          uploadFormData.append("file", uploadedFile);

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
            console.error("Failed to upload media from link:", upErrorText);
            return new Response(
              JSON.stringify({
                error: "Failed to upload media from link to WhatsApp",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          const uploadResult = await uploadResponse.json();
          effectiveHeaderId = uploadResult.id;

          if (!effectiveHeaderId) {
            return new Response(
              JSON.stringify({ error: "No media ID from upload" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          templateMediaType = mediaFormat;
          mimeType = finalMimeType; // For storage
        }

        if (!downloadUrl || !effectiveHeaderId) {
          return new Response(
            JSON.stringify({
              error: "No valid media source or ID obtained",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        headerMediaObject = { id: effectiveHeaderId };

        // Download for storage (use downloadUrl, which is valid)
        console.log(
          "Downloading media for template header storage:",
          downloadUrl
        );
        const needsAuth = !!id; // Only if original was ID
        let storageDownloadUrl = downloadUrl;
        if (link) {
          // For link, we already have the response from earlier, but to simplify, re-fetch without auth
          const storageResponse = await fetch(downloadUrl);
          if (!storageResponse.ok) {
            console.warn("Could not download for storage from link");
          } else {
            const storageBlob = await storageResponse.blob();
            // Use storageBlob for upload
            const storageMimeType =
              mimeType ||
              storageResponse.headers.get("content-type") ||
              "application/octet-stream";

            // Upload to Supabase
            if (agent && agent.agent_prefix) {
              try {
                const timestamp = Date.now();
                const fileExt = storageMimeType.split("/")[1] || "bin";
                const fileName = `template_header_${timestamp}_${crypto.randomUUID()}.${fileExt}`;
                const filePath = `${agent.agent_prefix}/outgoing/${fileName}`;

                const { data: uploadData, error: uploadError } =
                  await supabase.storage
                    .from("whatsapp-media")
                    .upload(filePath, storageBlob, {
                      contentType: storageMimeType,
                      cacheControl: "3600",
                      upsert: false,
                    });

                if (!uploadError && uploadData) {
                  const { data: urlData } = supabase.storage
                    .from("whatsapp-media")
                    .getPublicUrl(filePath);
                  templateStoredMediaUrl = urlData.publicUrl;
                  console.log(
                    `Template header media stored: ${templateStoredMediaUrl}`
                  );
                } else {
                  console.error("Failed to store template media:", uploadError);
                }
              } catch (storageError) {
                console.error(
                  "Storage error for template media:",
                  storageError
                );
              }
            }
          }
        } else {
          // For ID, download with auth
          const mediaResponse = await fetch(downloadUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!mediaResponse.ok) {
            console.warn("Could not download for storage from ID");
          } else {
            const mediaBlob = await mediaResponse.blob();
            const finalMimeType =
              mimeType ||
              mediaResponse.headers.get("content-type") ||
              "application/octet-stream";

            // Upload to Supabase
            if (agent && agent.agent_prefix) {
              try {
                const timestamp = Date.now();
                const fileExt = finalMimeType.split("/")[1] || "bin";
                const fileName = `template_header_${timestamp}_${crypto.randomUUID()}.${fileExt}`;
                const filePath = `${agent.agent_prefix}/outgoing/${fileName}`;

                const { data: uploadData, error: uploadError } =
                  await supabase.storage
                    .from("whatsapp-media")
                    .upload(filePath, mediaBlob, {
                      contentType: finalMimeType,
                      cacheControl: "3600",
                      upsert: false,
                    });

                if (!uploadError && uploadData) {
                  const { data: urlData } = supabase.storage
                    .from("whatsapp-media")
                    .getPublicUrl(filePath);
                  templateStoredMediaUrl = urlData.publicUrl;
                  console.log(
                    `Template header media stored: ${templateStoredMediaUrl}`
                  );
                } else {
                  console.error("Failed to store template media:", uploadError);
                }
              } catch (storageError) {
                console.error(
                  "Storage error for template media:",
                  storageError
                );
              }
            }
          }
        }
      } else if (storedHeader && storedHeader.type.toUpperCase() === "TEXT") {
        // Handle text header without media
        const requiredHeaderParams = storedHeader.parameters
          ? storedHeader.parameters.length
          : 0;
        if (requiredHeaderParams > 0) {
          // header_params already validated earlier
          // Will add component later
        }
      }

      // Prepare minimal template payload - only dynamic components
      const templateName = templateData.body.name;
      const templateLanguageCode =
        typeof templateData.body.language === "string"
          ? templateData.body.language
          : templateData.body.language?.code || "en";
      let templateComponents: any[] = [];

      // Add header component
      if (media_header && headerMediaObject && templateMediaType) {
        const expectedFormat = storedHeader.format.toLowerCase();
        if (expectedFormat !== templateMediaType) {
          return new Response(
            JSON.stringify({
              error: `Header format mismatch: expected ${expectedFormat}, provided ${templateMediaType}`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        templateComponents.push({
          type: "header",
          parameters: [
            {
              type: templateMediaType,
              [templateMediaType as string]: headerMediaObject,
            },
          ],
        });
      }

      // Add text header component if applicable
      if (
        storedHeader &&
        storedHeader.format?.toUpperCase() === "TEXT" &&
        header_params.length > 0
      ) {
        const headerParameters = header_params
          .map((param: any, index: number) => {
            const paramName =
              storedHeader.example?.header_text_named_params?.[index]
                ?.param_name;
            switch (param.type) {
              case "text":
                return {
                  type: "text",
                  text: param.text,
                  parameter_name: paramName,
                };
              case "currency":
                return {
                  type: "currency",
                  currency: {
                    code: param.currency.code,
                    amount_1000: param.currency.amount_1000,
                    fallback_value: param.currency.fallback_value,
                  },
                  parameter_name: paramName,
                };
              case "date_time":
                return {
                  type: "date_time",
                  date_time: {
                    fallback_value: param.date_time.fallback_value,
                  },
                  parameter_name: paramName,
                };
              default:
                return null;
            }
          })
          .filter(Boolean);
        templateComponents.push({
          type: "header",
          parameters: headerParameters,
        });
      }

      // Add body parameters
      if (template_params.length > 0) {
        const bodyParameters: any[] = [];
        for (let i = 0; i < template_params.length; i++) {
          const param = template_params[i];
          const paramName =
            storedBody?.example?.body_text_named_params?.[i]?.param_name;
          let paramObj: any;
          switch (param.type) {
            case "text":
              paramObj = {
                type: "text",
                text: param.text,
                parameter_name: paramName,
              };
              break;
            case "currency":
              paramObj = {
                type: "currency",
                currency: param.currency,
                parameter_name: paramName,
              };
              break;
            case "date_time":
              paramObj = {
                type: "date_time",
                date_time: param.date_time,
                parameter_name: paramName,
              };
              break;
          }
          bodyParameters.push(paramObj);
        }
        templateComponents.push({
          type: "body",
          parameters: bodyParameters,
        });
      }

      // Add button components
      for (const button of template_buttons) {
        let buttonParams: any[] = [];
        switch (button.sub_type) {
          case "quick_reply":
            buttonParams = [{ type: "payload", payload: button.payload }];
            break;
          case "cta_phone":
            buttonParams = [
              { type: "phone_number", phone_number: button.phone_number },
            ];
            break;
          case "cta_url":
            buttonParams = [{ type: "url", url: button.url }];
            break;
        }

        // Validate against stored button
        const storedBtn = storedButtons[button.index];
        if (storedBtn && storedBtn.sub_type !== button.sub_type) {
          return new Response(
            JSON.stringify({
              error: `Button index ${button.index} sub_type mismatch`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        templateComponents.push({
          type: "button",
          sub_type: button.sub_type,
          index: button.index,
          parameters: buttonParams,
        });
      }

      whatsappPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguageCode },
          components: templateComponents,
        },
      };
      console.log(
        "Constructed template payload:",
        JSON.stringify(whatsappPayload, null, 2)
      );

      // Debug logging for template payload
      console.log(
        "Template data body:",
        JSON.stringify(templateData.body, null, 2)
      );
      console.log(
        "Constructed WhatsApp payload:",
        JSON.stringify(whatsappPayload, null, 2)
      );
    }

    // Send to WhatsApp
    if (Array.isArray(whatsappPayload)) {
      console.log(
        `[DEBUG] Sending ${whatsappPayload.length} separate messages`
      );
      for (let i = 0; i < whatsappPayload.length; i++) {
        const singlePayload = whatsappPayload[i];
        console.log(
          `[DEBUG] Sending message ${i + 1}/${
            whatsappPayload.length
          }: ${JSON.stringify(singlePayload, null, 2)}`
        );
        const response = await fetch(
          `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(singlePayload),
          }
        );

        const result = await response.json();
        console.log(
          `[DEBUG] Response for message ${i + 1}:`,
          JSON.stringify(result, null, 2)
        );
        allResults.push(result);
        if (
          response.ok &&
          result.messages &&
          result.messages[0] &&
          result.messages[0].id
        ) {
          allMessageIds.push(result.messages[0].id);
        } else {
          console.error(`[DEBUG] Failed to send message ${i + 1}:`, result);
          // Continue sending others even if one fails
        }
      }
    } else {
      console.log(
        `[DEBUG] Sending single payload: ${JSON.stringify(
          whatsappPayload,
          null,
          2
        )}`
      );
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
      allResults = [result];
      console.log(
        "Full WhatsApp API response:",
        JSON.stringify(result, null, 2)
      );
      console.log("WhatsApp response status:", response.status);
      if (!response.ok) {
        console.error(
          "WhatsApp API error details:",
          JSON.stringify(result, null, 2)
        );
      }

      if (!response.ok) {
        console.error("WhatsApp API error:", result);
        return new Response(
          JSON.stringify({ error: "Failed to send message", details: result }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const whatsappMessageId = result.messages?.[0]?.id || null;
      allMessageIds = [whatsappMessageId].filter((id) => id);

      if (useTemplate) {
        const { data: newCredits, error: deductError } = await supabase.rpc('deduct_credits', {
          p_agent_id: agent.id,
          p_amount: 0.01
        });

        if (deductError || newCredits === null) {
          console.error('Failed to deduct credits:', deductError || 'Insufficient credits');
        } else {
          console.log(`Credits deducted successfully. Remaining: ${newCredits}`);
        }
      }
    }

    // Insert to messages table - handle multiple for images
    const messageTimestamp = now.toISOString();
    let storedMessagesCount = 0;

    if (Array.isArray(whatsappPayload) && type === "image") {
      console.log(
        `[DEBUG] Inserting ${processedMedia.length} separate image records`
      );
      for (let i = 0; i < processedMedia.length; i++) {
        const media = processedMedia[i];
        const effective_caption = (caption || message || "").trim();
        const singleTimestamp = new Date(
          Date.parse(messageTimestamp) + i * 100
        ).toISOString();
        const { error: msgError } = await supabase.from(messagesTable).insert({
          customer_id: customer.id,
          message: effective_caption,
          direction: "outbound",
          timestamp: singleTimestamp,
          is_read: true,
          media_type: type,
          media_url: media.storedMediaUrl,
          caption: effective_caption,
        });
        if (msgError) {
          console.error(
            `[DEBUG] Error inserting image message ${i + 1}:`,
            msgError
          );
        } else {
          storedMessagesCount++;
        }
      }
    } else if (type === "template") {
      const templateName = templateData.body.name;
      const templateLanguageCode =
        typeof templateData.body.language === "string"
          ? templateData.body.language
          : templateData.body.language?.code || "en";

      const dynamicData = {
        header_params: header_params || [],
        body_params: template_params || [],
        buttons: template_buttons || [],
        media_header: media_header || null,
      };

      // Compute rendered body for fallback (simple text replacement)
      let renderedBody = `Template: ${template_name}`;
      const bodyComponent = templateData.body.components?.find(
        (c: any) => c.type.toLowerCase() === "body"
      );
      if (bodyComponent && bodyComponent.text) {
        renderedBody = bodyComponent.text;
        // Replace placeholders with fallback values
        for (let i = 0; i < dynamicData.body_params.length; i++) {
          const placeholder = `{{${i + 1}}}`;
          let paramValue = "";
          const param = dynamicData.body_params[i];
          if (param?.text) {
            paramValue = param.text;
          } else if (param?.currency?.fallback_value) {
            paramValue = param.currency.fallback_value;
          } else if (param?.date_time?.fallback_value) {
            paramValue = param.date_time.fallback_value;
          }
          renderedBody = renderedBody.replace(
            new RegExp(escapeRegExp(placeholder), "g"),
            paramValue
          );
        }
      }

      const fullTemplateData = {
        is_template: true,
        name: templateName,
        language: { code: templateLanguageCode },
        components: templateData.body.components || [],
        dynamic_data: dynamicData,
        rendered_body: renderedBody,
      };
      let stored_message: string;
      let stored_caption = null;
      let stored_media_type = "none";
      let stored_media_url = null;

      stored_message = JSON.stringify(fullTemplateData);

      stored_media_type = "none";
      stored_media_url = null;
      stored_caption = null;
      if (media_header) {
        stored_media_type = media_header.type || "image";
        stored_media_url = templateStoredMediaUrl;
      }

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
        console.error("Error inserting template message:", msgError);
      } else {
        storedMessagesCount++;
      }
    } else if (type === "text") {
      let stored_message =
        typeof message === "string" ? message : JSON.stringify(message);
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
        console.error("Error inserting text message:", msgError);
      } else {
        storedMessagesCount++;
      }
    } else if (
      ["image", "video"].includes(type) &&
      processedMedia.length === 1
    ) {
      const media = processedMedia[0];
      const effective_caption = (caption || message || "").trim();
      const { error: msgError } = await supabase.from(messagesTable).insert({
        customer_id: customer.id,
        message: effective_caption,
        direction: "outbound",
        timestamp: messageTimestamp,
        is_read: true,
        media_type: type,
        media_url: media.storedMediaUrl,
        caption: effective_caption,
      });

      if (msgError) {
        console.error("Error inserting single media message:", msgError);
      } else {
        storedMessagesCount++;
      }
    } else if (type === "audio" || type === "document") {
      if (processedMedia.length === 0) {
        throw new Error("No processed media for audio/document");
      }
      const media = processedMedia[0];
      const effective_caption = (caption || message || "").trim();
      const { error: msgError } = await supabase.from(messagesTable).insert({
        customer_id: customer.id,
        message: effective_caption,
        direction: "outbound",
        timestamp: messageTimestamp,
        is_read: true,
        media_type: type,
        media_url: media.storedMediaUrl,
        caption: effective_caption,
      });

      if (msgError) {
        console.error("Error inserting audio/document message:", msgError);
      } else {
        storedMessagesCount++;
      }
    } else {
      let stored_message =
        typeof message === "string" ? message : JSON.stringify(message);
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
      } else {
        storedMessagesCount++;
      }
    }

    if (storedMessagesCount === 0) {
      return new Response(
        JSON.stringify({
          error: "Failed to store any messages in database",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[DEBUG] Messages sent successfully: ${allMessageIds.length} WhatsApp IDs, ${storedMessagesCount} DB records`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message_ids: allMessageIds,
        stored_messages: storedMessagesCount,
        details: allResults,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});