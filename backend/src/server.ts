import fastify from 'fastify';
import { createClient } from "@supabase/supabase-js";
import crypto from 'crypto';
import whatsappWebhookRoutes from './routes/whatsapp-webhook';
import sendWhatsappMessageRoutes from './routes/send-whatsapp-message';
import getMediaPreviewRoutes from './routes/get-media-preview';
import uploadInventoryImagesRoutes from './routes/upload-inventory-images';
import uploadMediaRoutes from './routes/upload-media';

const server = fastify();

// Register multipart plugin
server.register(require('@fastify/multipart'));

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? "";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELET E, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper function
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper functions (ported from Edge Function)
function getMediaTypeFromWhatsApp(
  messageType: string,
  mimeType?: string
): "none" | "image" | "video" | "audio" | "document" | "sticker" {
  switch (messageType) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "document":
      return "document";
    case "sticker":
      return "sticker";
    default:
      return "none";
  }
}

async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken: string
): Promise<Buffer | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        `Failed to download media ${mediaId}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const mediaData: any = await response.json();
    if (!mediaData.url) {
      console.error("No media URL in response:", mediaData);
      return null;
    }

    const fileResponse = await fetch(mediaData.url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!fileResponse.ok) {
      console.error(
        `Failed to download media file: ${fileResponse.status} ${fileResponse.statusText}`
      );
      return null;
    }

    const mediaBuffer = Buffer.from(await fileResponse.arrayBuffer());
    return mediaBuffer;
  } catch (error) {
    console.error("Error downloading WhatsApp media:", error);
    return null;
  }
}

async function uploadMediaToStorage(
  agentPrefix: string,
  mediaBuffer: Buffer,
  originalFilename: string,
  contentType: string
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const fileExt = originalFilename.split(".").pop()?.toLowerCase() || "bin";
    const fileName = `${timestamp}_${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${agentPrefix}/incoming/${fileName}`;

    console.log(`Uploading media to storage: ${filePath}`);

    const { data, error } = await supabaseClient.storage
      .from("whatsapp-media")
      .upload(filePath, mediaBuffer, {
        contentType: contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }

    const { data: urlData } = supabaseClient.storage
      .from("whatsapp-media")
      .getPublicUrl(filePath);

    console.log(`Media uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading media to storage:", error);
    return null;
  }
}

async function processIncomingMessage(
  supabase: any,
  message: any,
  phoneNumberId: string,
  contactName: string
) {
  try {
    console.log("Processing message:", message.id, message.type);

    const { data: whatsappConfig } = await supabase
      .from("whatsapp_configuration")
      .select("user_id, api_key, webhook_url")
      .eq("phone_number_id", phoneNumberId)
      .eq("is_active", true)
      .single();

    if (!whatsappConfig) {
      console.log("No config for phone:", phoneNumberId);
      return;
    }

    const { data: agent } = await supabase
      .from("agents")
      .select("id, agent_prefix")
      .eq("user_id", whatsappConfig.user_id)
      .single();

    if (!agent) {
      console.log("No agent for user:", whatsappConfig.user_id);
      return;
    }

    const customersTable = `${agent.agent_prefix}_customers`;
    const messagesTable = `${agent.agent_prefix}_messages`;

    const fromPhone = message.from;
    let customerId;

    const { data: existingCustomer } = await supabase
      .from(customersTable)
      .select("id")
      .eq("phone", fromPhone)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: insertError } = await supabase
        .from(customersTable)
        .insert({
          phone: fromPhone,
          name: contactName || fromPhone,
          agent_id: agent.id,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error inserting new customer:", insertError);
        return;
      }

      if (!newCustomer || !newCustomer.id) {
        console.error("Failed to create customer - no ID returned");
        return;
      }

      customerId = newCustomer.id;
      console.log("New customer created successfully");
    }

    let { data: customer, error: customerError } = await supabase
      .from(customersTable)
      .select("id, name, ai_enabled, language")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      console.log(
        "Warning: Could not fetch customer ai_enabled, assuming false"
      );
      customer = {
        id: customerId,
        name: contactName || fromPhone,
        ai_enabled: false,
        language: "english",
      };
    }

    const { error: updateError } = await supabase
      .from(customersTable)
      .update({ last_user_message_time: new Date().toISOString() })
      .eq("id", customerId);

    if (updateError) {
      console.error("Error updating last_user_message_time:", updateError);
    } else {
      console.log(`Updated last_user_message_time for customer ${customerId}`);
    }

    const messageDate = new Date(message.timestamp * 1000);
    const messageTimestamp = messageDate.toISOString();

    console.log("Timestamp conversion:", {
      whatsappTimestamp: message.timestamp,
      convertedDate: messageDate.toISOString(),
      localString: messageDate.toLocaleString(),
    });

    let messageText = "";
    let mediaType:
      | "none"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "sticker" = "none";
    let mediaUrl: string | null = null;
    let caption: string | null = null;

    if (message.type === "text") {
      messageText = message.text.body;
    } else if (["image", "video", "audio", "document"].includes(message.type)) {
      mediaType = getMediaTypeFromWhatsApp(message.type);
      caption = message[message.type]?.caption || null;
      messageText = caption || `[${message.type.toUpperCase()}] Media file`;

      if (message[message.type]?.id && whatsappConfig.api_key) {
        console.log(
          `Downloading ${message.type} media: ${message[message.type].id}`
        );

        const mediaBuffer = await downloadWhatsAppMedia(
          message[message.type].id,
          whatsappConfig.api_key
        );

        if (mediaBuffer && mediaBuffer.length > 0) {
          let contentType = "application/octet-stream";
          let filename = `media_${Date.now()}.${message.type}`;

          if (message[message.type].mime_type) {
            contentType = message[message.type].mime_type;
            const ext = contentType.split("/")[1] || message.type;
            filename = `media_${Date.now()}.${ext}`;
          }

          mediaUrl = await uploadMediaToStorage(
            agent.agent_prefix,
            mediaBuffer,
            filename,
            contentType
          );

          if (mediaUrl) {
            console.log(`Media uploaded successfully: ${mediaUrl}`);
          } else {
            console.error("Failed to upload media to storage");
          }
        } else {
          console.error(
            `Failed to download media: ${message[message.type].id}`
          );
        }
      }
    } else if (message.type === "sticker") {
      mediaType = "sticker";
      messageText = "[STICKER] Sticker message";

      if (message.sticker?.id && whatsappConfig.api_key) {
        const mediaBuffer = await downloadWhatsAppMedia(
          message.sticker.id,
          whatsappConfig.api_key
        );
        if (mediaBuffer && mediaBuffer.length > 0) {
          mediaUrl = await uploadMediaToStorage(
            agent.agent_prefix,
            mediaBuffer,
            `sticker_${Date.now()}.webp`,
            "image/webp"
          );
        }
      }
    } else if (message.type === "button") {
      console.log(
        "🔍 DEBUG: Full button message payload:",
        JSON.stringify(message, null, 2)
      );
      console.log("🔍 DEBUG: Button reply details:", message.button?.reply);

      messageText =
        message.button?.reply?.title ||
        message.button?.reply?.id ||
        "Button clicked";
    } else if (message.type === "interactive") {
      console.log(
        "🔍 DEBUG: Full interactive message payload:",
        JSON.stringify(message, null, 2)
      );
      console.log("🔍 DEBUG: Interactive type:", message.interactive?.type);
      console.log(
        "🔍 DEBUG: Button reply details:",
        message.interactive?.button_reply
      );

      if (message.interactive?.type === "button_reply") {
        messageText =
          message.interactive.button_reply?.title || "Button clicked";
      } else {
        messageText = `[INTERACTIVE_${
          message.interactive?.type?.toUpperCase() || "UNKNOWN"
        }] Interactive message`;
      }
    } else {
      messageText = `[${message.type.toUpperCase()}] Unsupported message type`;
    }

    const messageData = {
      customer_id: customerId,
      message: messageText,
      direction: "inbound",
      timestamp: messageTimestamp,
      is_read: false,
      media_type: mediaType,
      media_url: mediaUrl,
      caption: caption,
    };

    const { data: insertedMessage, error: insertError } = await supabase
      .from(messagesTable)
      .insert(messageData)
      .select()
      .single();

    if (insertError) {
      console.error("Error storing message:", insertError);
    } else {
      console.log("Message stored successfully in dynamic table:", {
        id: insertedMessage.id,
        type: message.type,
        mediaType,
        hasMediaUrl: !!mediaUrl,
      });

      if (customer.ai_enabled && whatsappConfig?.webhook_url) {
        console.log(
          `Triggering agent webhook for AI-enabled customer ${customer.id}`
        );
        const payload = {
          event: "message_received",
          data: {
            ...insertedMessage,
            customer_phone: fromPhone,
            customer_name: customer.name,
            customer_language: customer.language || "english",
            agent_prefix: agent.agent_prefix,
            agent_user_id: whatsappConfig.user_id,
            phone_number_id: phoneNumberId,
          },
        };
        try {
          const response = await fetch(whatsappConfig.webhook_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `Agent webhook failed: HTTP ${response.status} - ${errorText}`
            );
          } else {
            console.log("Agent webhook triggered successfully");
          }
        } catch (webhookError) {
          console.error("Error triggering agent webhook:", webhookError);
        }
      }
    }
  } catch (error) {
    console.error("Message processing error:", error);
  }
}

async function processMessageStatus(supabase: any, status: any) {
  try {
    console.log(
      "📨 Processing message status update:",
      status.id,
      status.status
    );

    const statusDate = new Date(status.timestamp * 1000);
    const statusTimestamp = statusDate.toISOString();

    console.log("Status timestamp conversion:", {
      whatsappTimestamp: status.timestamp,
      convertedDate: statusDate.toISOString(),
      localString: statusDate.toLocaleString(),
    });

    console.log(
      `📨 Message ${status.id} status: "${status.status}" at ${statusTimestamp}`
    );

    console.log(
      "✅ Status update logged (full tracking available with optional migration)"
    );
  } catch (error) {
    console.error("Status processing error:", error);
  }
}

// Webhook route
server.route({
  method: ["GET", "POST", "OPTIONS"],
  url: "/whatsapp-webhook",
  config: {
    rawBody: true,
  },
  handler: async (request, reply) => {
    console.log(
      `[${new Date().toISOString()}] ${request.method} ${request.url}`
    );
    console.log("📋 All headers:", request.headers);
    console.log("🔍 Request origin:", request.headers.origin);
    console.log("🔍 User-Agent:", request.headers["user-agent"]);

    if (request.method === "OPTIONS") {
      console.log("✅ Handling CORS preflight (OPTIONS)");
      return reply.code(204).headers({
        ...corsHeaders,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-forwarded-proto, x-forwarded-host",
      });
    }

    const authHeader = request.headers.authorization;
    if (authHeader) {
      console.log(
        "⚠️ Unexpected Authorization header found:",
        authHeader.substring(0, 20) + "..."
      );
    }

    console.log("✅ Public webhook endpoint - no JWT auth required");

    if (request.method === "GET") {
      const responseHeaders = { ...corsHeaders, "Content-Type": "text/plain" };

      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const phoneNumberId = url.searchParams.get("phone_number_id");

        console.log("GET VERIFICATION:", {
          mode,
          token: token ? `${String(token).substring(0, 8)}...` : null,
          hasChallenge: !!challenge,
          phoneNumberId: phoneNumberId
            ? `${String(phoneNumberId).substring(0, 8)}...`
            : null,
        });

        if (mode === "subscribe" && token && challenge) {
          let expectedToken: string | null = null;

          if (phoneNumberId) {
            // For simplicity, use global token
            expectedToken = WHATSAPP_VERIFY_TOKEN;
            console.log(
              "Token lookup by phone_number_id:",
              expectedToken ? "found" : "not found"
            );
          }

          if (!expectedToken && WHATSAPP_VERIFY_TOKEN) {
            expectedToken = WHATSAPP_VERIFY_TOKEN;
            console.log("Using WHATSAPP_VERIFY_TOKEN env var");
          }

          if (!expectedToken) {
            try {
              const { data: configs, error } = await supabaseClient
                .from("whatsapp_configuration")
                .select("verify_token")
                .eq("is_active", true)
                .limit(1);

              if (
                !error &&
                configs &&
                configs.length > 0 &&
                configs[0].verify_token
              ) {
                expectedToken = configs[0].verify_token;
                console.log("Found verify_token from database fallback");
              }
            } catch (dbError) {
              console.error("Database fallback lookup failed:", dbError);
            }
          }

          if (expectedToken && token === expectedToken) {
            console.log(
              "✅ VERIFICATION SUCCESS - Token matches expected token"
            );
            return reply.code(200).headers(responseHeaders).send(challenge);
          } else if (!expectedToken) {
            console.warn(
              "⚠️ VERIFICATION WARNING - No verification token configured"
            );
            console.warn("⚠️ Allowing verification for development/testing");
            console.warn(
              "⚠️ Configure WHATSAPP_VERIFY_TOKEN or database token for production"
            );
            return reply.code(200).headers(responseHeaders).send(challenge);
          } else {
            console.error("❌ VERIFICATION FAILED - Token mismatch");
            const expectedStr = expectedToken
              ? `${expectedToken.substring(0, 8)}...`
              : "NOT SET";
            const receivedStr = token
              ? `${String(token).substring(0, 8)}...`
              : "NULL";
            console.error(`Expected: ${expectedStr}`);
            console.error(`Received: ${receivedStr}`);
            return reply
              .code(403)
              .headers(responseHeaders)
              .send("Verification failed");
          }
        }

        if (mode && challenge) {
          console.log("GET request with challenge but wrong mode:", mode);
          return reply.code(403).headers(responseHeaders).send("Forbidden");
        }

        console.log("GET request without verification parameters");
        return reply
          .code(200)
          .headers(responseHeaders)
          .send("WhatsApp Webhook Endpoint");
      } catch (error) {
        console.error("GET Verification error:", error);
        return reply
          .code(500)
          .headers({ ...corsHeaders, "Content-Type": "text/plain" })
          .send("Internal server error");
      }
    }

    if (request.method === "POST") {
      console.log("🚀 POST webhook received - processing WhatsApp payload");

      const signatureHeader = request.headers["x-hub-signature-256"];
      const authHeader = request.headers.authorization;
      const userAgent = request.headers["user-agent"] || "unknown";
      const origin = request.headers.origin || "none";

      console.log("📋 POST request details:", {
        url: request.url,
        userAgent:
          userAgent.substring(0, 50) + (userAgent.length > 50 ? "..." : ""),
        origin: origin,
        hasSignature: !!signatureHeader,
        hasAuth: !!authHeader,
        contentLength: request.headers["content-length"],
      });

      try {
        const chunks: Buffer[] = [];
        for await (const chunk of request.raw) {
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks).toString();

        const bodyPreview = body.substring(0, 200);
        console.log(
          "📄 Request body preview:",
          bodyPreview.replace(/\n/g, " ")
        );

        console.log("Body length:", body.length);
        console.log("Signature header present:", !!signatureHeader);

        console.log("🔐 Processing webhook authentication...");

        let signatureVerified = true;

        if (signatureHeader) {
          console.log(
            "✅ WhatsApp signature header detected - will verify HMAC"
          );
          signatureVerified = false;
        } else {
          console.log(
            "⚠️ No signature header - allowing for testing/development"
          );
        }

        console.log("✅ Webhook request allowed - processing payload");

        if (signatureHeader) {
          console.log("🔐 Verifying WhatsApp signature...");

          const payload = JSON.parse(body);
          let phoneNumberId: string | null = null;
          if (
            payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id
          ) {
            phoneNumberId =
              payload.entry[0].changes[0].value.metadata.phone_number_id;
          }

          console.log(
            "Phone number ID for verification:",
            phoneNumberId
              ? `${(phoneNumberId as string).substring(0, 8)}...`
              : "not found"
          );

          let verificationSecret: string | null = null;
          if (phoneNumberId) {
            verificationSecret = WHATSAPP_APP_SECRET;
            console.log(
              "App secret lookup:",
              verificationSecret ? "found" : "not found"
            );
          }

          if (!verificationSecret && WHATSAPP_APP_SECRET) {
            verificationSecret = WHATSAPP_APP_SECRET;
            console.log(
              "Using WHATSAPP_APP_SECRET env var for signature verification"
            );
          }

          if (verificationSecret) {
            try {
              const hmac = crypto.createHmac("sha256", verificationSecret);
              hmac.update(body);
              const expectedSignature = "sha256=" + hmac.digest("hex");

              console.log(
                "Computed signature:",
                expectedSignature.substring(0, 20) + "..."
              );
              const sigHeader = Array.isArray(signatureHeader)
                ? signatureHeader[0]
                : signatureHeader;
              console.log(
                "Received signature:",
                sigHeader.substring(0, 20) + "..."
              );

              if (sigHeader !== expectedSignature) {
                console.error("❌ Message signature verification failed");
                console.error(
                  `Expected: ${expectedSignature.substring(0, 20)}...`
                );
                console.error(`Received: ${sigHeader.substring(0, 20)}...`);
                console.warn(
                  "⚠️ Continuing despite signature mismatch for debugging"
                );
                signatureVerified = false;
              } else {
                console.log("✅ Message signature verified successfully");
                signatureVerified = true;
              }
            } catch (error) {
              console.error("❌ Signature verification error:", error);
              console.warn(
                "⚠️ Continuing despite signature error for debugging"
              );
              signatureVerified = false;
            }
          } else {
            console.warn(
              "⚠️ No app secret available - continuing without signature verification"
            );
            console.warn(
              "Configure WHATSAPP_APP_SECRET or database secret for production"
            );
            signatureVerified = false;
          }
        } else {
          console.log(
            "⚠️ No signature header - skipping verification (test mode)"
          );
        }

        if (signatureVerified) {
          console.log("✅ Webhook signature verification passed");
        } else {
          console.warn("⚠️ Webhook proceeding without signature verification");
        }

        const payload = JSON.parse(body);

        if (payload.object !== "whatsapp_business_account") {
          return reply.code(400).send("Invalid payload");
        }

        const entry = payload.entry?.[0];
        if (!entry) {
          return reply.code(400).send("No entry in payload");
        }

        const changes = entry.changes?.[0];
        if (!changes) {
          return reply.code(400).send("No changes in entry");
        }

        const value = changes.value;
        if (!value) {
          return reply.code(400).send("No value in changes");
        }

        const supabase = supabaseClient;

        if (value.messages && value.messages.length > 0) {
          console.log(`Processing ${value.messages.length} message(s)`);
          for (const message of value.messages) {
            await processIncomingMessage(
              supabase,
              message,
              value.metadata?.phone_number_id,
              value.contacts?.[0]?.profile?.name
            );
          }
        }

        if (value.statuses && value.statuses.length > 0) {
          console.log(`Processing ${value.statuses.length} status update(s)`);
          for (const status of value.statuses) {
            await processMessageStatus(supabase, status);
          }
        }

        console.log("Message processing completed");
        return reply
          .code(200)
          .headers({ ...corsHeaders, "Content-Type": "text/plain" })
          .send("OK");
      } catch (error) {
        console.error("POST processing error:", error);
        return reply
          .code(500)
          .headers({ ...corsHeaders, "Content-Type": "application/json" })
          .send({ error: "Internal server error" });
      }
    }

    return reply
      .code(405)
      .headers({ ...corsHeaders, "Content-Type": "application/json" })
      .send({ error: "Method not allowed" });
  },
});

server.post("/get-media-preview", async (request, reply) => {
  try {
    const body = request.body as any;
    const { media_id } = body;

    if (!media_id) {
      return reply.code(400).send({ error: "media_id is required" });
    }

    // Get auth token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply
        .code(401)
        .send({ error: "Authorization header missing or invalid" });
    }

    const token = authHeader.slice(7);

    // Extract user ID from JWT payload
    let userId: string;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      let payload = parts[1];
      payload = payload.replace(/-/g, "+").replace(/_/g, "/");
      while (payload.length % 4) {
        payload += "=";
      }

      const decodedPayload = atob(payload);
      const userData = JSON.parse(decodedPayload);

      if (!userData.sub) {
        throw new Error("No user ID in JWT payload");
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (userData.exp && userData.exp < currentTime) {
        throw new Error("JWT token expired");
      }

      userId = userData.sub;
    } catch (jwtError: any) {
      return reply.code(401).send({
        error: "Invalid authentication token",
        details: jwtError.message,
      });
    }

    // Get agent info
    const { data: agent, error: agentError } = await supabaseClient
      .from("agents")
      .select("id, agent_prefix")
      .eq("user_id", userId)
      .single();

    if (agentError || !agent) {
      return reply
        .code(403)
        .send({ error: "Agent not found for authenticated user" });
    }

    // Get WhatsApp config
    const { data: whatsappConfig, error: configError } = await supabaseClient
      .from("whatsapp_configuration")
      .select("api_key, phone_number_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (configError || !whatsappConfig) {
      return reply
        .code(404)
        .send({ error: "WhatsApp configuration not found" });
    }

    const accessToken = whatsappConfig.api_key;
    const phoneNumberId = whatsappConfig.phone_number_id;

    if (!accessToken || !phoneNumberId) {
      return reply.code(400).send({ error: "Invalid WhatsApp configuration" });
    }

    // Fetch media URL
    const mediaUrlResponse = await fetch(
      `https://graph.facebook.com/v23.0/${media_id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!mediaUrlResponse.ok) {
      const errorText = await mediaUrlResponse.text();
      return reply.code(500).send({
        error: "Failed to fetch media URL",
        details: errorText,
      });
    }

    const mediaUrlData: any = await mediaUrlResponse.json();
    const media_download_url = mediaUrlData.url;

    if (!media_download_url) {
      return reply.code(404).send({ error: "No download URL available" });
    }

    // Download the media
    const mediaResponse = await fetch(media_download_url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      return reply.code(500).send({
        error: "Failed to download media",
        details: errorText,
      });
    }

    const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
    const base64 = mediaBuffer.toString("base64");

    const contentType =
      mediaResponse.headers.get("content-type") || "application/octet-stream";

    return reply.code(200).send({
      success: true,
      base64: base64,
      content_type: contentType,
      media_id: media_id,
    });
  } catch (error: any) {
    return reply
      .code(500)
      .send({ error: "Internal server error", details: error.message });
  }
});

server.post("/send-whatsapp-message", async (request, reply) => {
  try {
    const body = request.body as any;
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
      return reply.code(400).send({
        error: `Missing required fields: user_id, customer_phone, ${missingField}`,
      });
    }

    // Validate template-specific inputs
    if (type === "template") {
      if (
        media_header &&
        (!media_header.type || (!media_header.id && !media_header.link))
      ) {
        return reply.code(400).send({
          error: "media_header must specify type and either id or link",
        });
      }

      // Validate header_params if provided
      for (const param of header_params) {
        if (
          !param ||
          !param.type ||
          !["text", "currency", "date_time"].includes(param.type)
        ) {
          return reply.code(400).send({
            error: `Invalid header parameter type: ${param?.type}`,
          });
        }
        if (
          param.type === "currency" &&
          (!param.currency ||
            !param.currency.code ||
            typeof param.currency.amount_1000 !== "number" ||
            !param.currency.fallback_value)
        ) {
          return reply.code(400).send({
            error:
              "currency header parameter missing required fields (fallback_value, code, amount_1000)",
          });
        }
        if (
          param.type === "date_time" &&
          (!param.date_time || !param.date_time.fallback_value)
        ) {
          return reply.code(400).send({
            error: "date_time header parameter missing fallback_value",
          });
        }
        if (param.type === "text" && !param.text) {
          return reply.code(400).send({
            error: "text header parameter missing text value",
          });
        }
      }

      // Validate template_params
      for (const param of template_params) {
        if (
          !param ||
          !param.type ||
          !["text", "currency", "date_time"].includes(param.type)
        ) {
          return reply.code(400).send({
            error: `Invalid parameter type: ${param?.type}`,
          });
        }
        if (
          param.type === "currency" &&
          (!param.currency ||
            !param.currency.code ||
            typeof param.currency.amount_1000 !== "number" ||
            !param.currency.fallback_value)
        ) {
          return reply.code(400).send({
            error:
              "currency parameter missing required fields (fallback_value, code, amount_1000)",
          });
        }
        if (
          param.type === "date_time" &&
          (!param.date_time || !param.date_time.fallback_value)
        ) {
          return reply.code(400).send({
            error: "date_time parameter missing fallback_value",
          });
        }
        if (param.type === "text" && !param.text) {
          return reply.code(400).send({
            error: "text parameter missing text value",
          });
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
          return reply.code(400).send({
            error: `Invalid button configuration: ${JSON.stringify(button)}`,
          });
        }
        if (button.sub_type === "quick_reply" && !button.payload) {
          return reply.code(400).send({
            error: "quick_reply button missing payload",
          });
        }
        if (button.sub_type === "cta_phone" && !button.phone_number) {
          return reply.code(400).send({
            error: "cta_phone button missing phone_number",
          });
        }
        if (button.sub_type === "cta_url" && !button.url) {
          return reply.code(400).send({
            error: "cta_url button missing url",
          });
        }
      }
    }

    // Validate user
    const { data: user, error: userError } = await supabaseClient
      .from("users")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return reply.code(404).send({ error: "User not found" });
    }

    // Get WhatsApp config
    const { data: whatsappConfig, error: configError } = await supabaseClient
      .from("whatsapp_configuration")
      .select("api_key, phone_number_id, user_id")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .single();

    if (configError || !whatsappConfig) {
      return reply
        .code(404)
        .send({ error: "WhatsApp configuration not found" });
    }

    // Get agent
    const { data: agent, error: agentError } = await supabaseClient
      .from("agents")
      .select("id, agent_prefix")
      .eq("user_id", user_id)
      .single();

    if (agentError || !agent) {
      return reply.code(404).send({ error: "Agent not found" });
    }

    const customersTable = `${agent.agent_prefix}_customers`;
    const messagesTable = `${agent.agent_prefix}_messages`;
    const templatesTable = `${agent.agent_prefix}_templates`;

    // Find customer
    const { data: customer, error: customerError } = await supabaseClient
      .from(customersTable)
      .select("id, last_user_message_time, phone")
      .eq("phone", customer_phone)
      .single();

    if (customerError || !customer) {
      return reply.code(404).send({ error: "Customer not found" });
    }

    // Normalize phone number to E.164 format
    let normalizedPhone = customer.phone.replace(/\D/g, ""); // Remove non-digits
    if (!normalizedPhone.startsWith("1") && normalizedPhone.length === 10) {
      normalizedPhone = "1" + normalizedPhone; // Assume US if 10 digits
    }
    normalizedPhone = "+" + normalizedPhone;
    if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
      return reply.code(400).send({ error: "Invalid phone number format" });
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
      const { data: templates, error: templateError } = await supabaseClient
        .from(templatesTable)
        .select("*")
        .eq("agent_id", agent.id)
        .eq("category", category)
        .eq("is_active", true)
        .limit(1);

      if (templateError || !templates || templates.length === 0) {
        console.log("No template available for 24h window");
        return reply.code(400).send({
          error: "Template required after 24h window, none available",
        });
      }
      templateData = templates[0];
      useTemplate = true;
    }

    if (useTemplate) {
      const { data: creditsData, error: creditError } = await supabaseClient
        .from("agents")
        .select("credits")
        .eq("id", agent.id)
        .single();

      if (creditError || !creditsData || creditsData.credits < 0.01) {
        return reply.code(400).send({
          error: "Insufficient credits for template message",
        });
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
        return reply.code(400).send({
          error:
            "Media messages cannot be sent using templates. Ensure you're within the 24-hour messaging window.",
        });
      }
      if (mediaIdsToProcess.length > 1 && type !== "image") {
        return reply.code(400).send({
          error: "Multiple media sending is only supported for images.",
        });
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
          const mediaUrlData: any = await mediaUrlResponse.json();
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
                await supabaseClient.storage
                  .from("whatsapp-media")
                  .upload(filePath, mediaBlob, {
                    contentType: mimeType,
                    cacheControl: "3600",
                    upsert: false,
                  });
              if (!uploadError && uploadData) {
                const { data: urlData } = supabaseClient.storage
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
        return reply.code(400).send({
          error: `Unsupported message type: ${type}`,
        });
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
        const { data: namedTemplate, error: fetchError } = await supabaseClient
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
        return reply.code(404).send({ error: "Template not found" });
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
            return reply.code(400).send({
              error:
                "Media header required for this template (format: " +
                storedHeader.format +
                ")",
            });
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
        return reply.code(400).send({
          error: "Template does not support media header",
        });
      }

      // Validate text header parameters requirement
      if (storedHeader && storedHeader.format?.toUpperCase() === "TEXT") {
        const requiredHeaderParams =
          storedHeader.example?.header_text_named_params?.length || 0;
        if (header_params.length !== requiredHeaderParams) {
          return reply.code(400).send({
            error: `Template header requires exactly ${requiredHeaderParams} parameters, provided ${header_params.length}`,
          });
        }
      }

      const requiredBodyParams =
        storedBody?.example?.body_text_named_params?.length || 0;
      if (template_params.length !== requiredBodyParams) {
        return reply.code(400).send({
          error: `Template body requires exactly ${requiredBodyParams} parameters, provided ${template_params.length}`,
        });
      }

      if (template_buttons.length !== storedButtons.length) {
        return reply.code(400).send({
          error: `Template requires exactly ${storedButtons.length} buttons, provided ${template_buttons.length}`,
        });
      }

      // Handle media header for template
      if (media_header) {
        const { type: mediaType, id, link } = media_header;
        const mediaFormat = mediaType.toLowerCase();
        if (!["image", "video", "document"].includes(mediaFormat)) {
          return reply.code(400).send({
            error: `Unsupported media format for header: ${mediaType}`,
          });
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
            return reply.code(400).send({
              error: "Invalid media ID for template header",
            });
          }

          const mediaUrlData: any = await mediaUrlResponse.json();
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
            return reply.code(400).send({
              error: `Media MIME type mismatch for ${mediaFormat}: ${mimeType}`,
            });
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
            return reply.code(400).send({
              error: `Link MIME type mismatch for ${mediaFormat}: ${mimeType}`,
            });
          }

          // Download media
          const mediaResponse = await fetch(downloadUrl!);
          if (!mediaResponse.ok) {
            return reply.code(400).send({
              error: "Failed to download media from link",
            });
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
            return reply.code(400).send({
              error: `Media type mismatch for upload: expected ${mediaFormat}, got ${uploadType}`,
            });
          }

          // Upload to WhatsApp to get ID
          const uploadedFileName = filename || `header_${Date.now()}`;
          const uploadFormData = new FormData();
          uploadFormData.append("messaging_product", "whatsapp");
          uploadFormData.append("type", uploadType);
          uploadFormData.append("file", mediaBlob, uploadedFileName);

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
            return reply.code(400).send({
              error: "Failed to upload media from link to WhatsApp",
            });
          }

          const uploadResult: any = await uploadResponse.json();
          effectiveHeaderId = uploadResult.id;

          if (!effectiveHeaderId) {
            return reply.code(400).send({
              error: "No media ID from upload",
            });
          }

          templateMediaType = mediaFormat;
          mimeType = finalMimeType; // For storage
        }

        if (!downloadUrl || !effectiveHeaderId) {
          return reply.code(400).send({
            error: "No valid media source or ID obtained",
          });
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
                  await supabaseClient.storage
                    .from("whatsapp-media")
                    .upload(filePath, storageBlob, {
                      contentType: storageMimeType,
                      cacheControl: "3600",
                      upsert: false,
                    });

                if (!uploadError && uploadData) {
                  const { data: urlData } = supabaseClient.storage
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
                  await supabaseClient.storage
                    .from("whatsapp-media")
                    .upload(filePath, mediaBlob, {
                      contentType: finalMimeType,
                      cacheControl: "3600",
                      upsert: false,
                    });

                if (!uploadError && uploadData) {
                  const { data: urlData } = supabaseClient.storage
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
          return reply.code(400).send({
            error: `Header format mismatch: expected ${expectedFormat}, provided ${templateMediaType}`,
          });
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
          return reply.code(400).send({
            error: `Button index ${button.index} sub_type mismatch`,
          });
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

        const result: any = await response.json();
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

      const result: any = await response.json();
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
        return reply.code(500).send({
          error: "Failed to send message",
          details: result,
        });
      }
      const whatsappMessageId = result.messages?.[0]?.id || null;
      allMessageIds = [whatsappMessageId].filter((id) => id);

      if (useTemplate) {
        const { data: newCredits, error: deductError } =
          await supabaseClient.rpc("deduct_credits", {
            p_agent_id: agent.id,
            p_amount: 0.01,
          });

        if (deductError || newCredits === null) {
          console.error(
            "Failed to deduct credits:",
            deductError || "Insufficient credits"
          );
        } else {
          console.log(
            `Credits deducted successfully. Remaining: ${newCredits}`
          );
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
        const { error: msgError } = await supabaseClient
          .from(messagesTable)
          .insert({
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

      const { error: msgError } = await supabaseClient
        .from(messagesTable)
        .insert({
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
      const { error: msgError } = await supabaseClient
        .from(messagesTable)
        .insert({
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
      const { error: msgError } = await supabaseClient
        .from(messagesTable)
        .insert({
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
      const { error: msgError } = await supabaseClient
        .from(messagesTable)
        .insert({
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
      const { error: msgError } = await supabaseClient
        .from(messagesTable)
        .insert({
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
      return reply.code(500).send({
        error: "Failed to store any messages in database",
      });
    }

    console.log(
      `[DEBUG] Messages sent successfully: ${allMessageIds.length} WhatsApp IDs, ${storedMessagesCount} DB records`
    );

    return reply.code(200).send({
      success: true,
      message_ids: allMessageIds,
      stored_messages: storedMessagesCount,
      details: allResults,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return reply.code(500).send({ error: "Internal server error" });
  }
});

// Upload inventory images route
server.post('/upload-inventory-images', async (request, reply) => {
  try {
    const body = request.body as any;
    const { agentId, productId, images } = body;

    if (!agentId) {
      return reply.code(400).send({ error: 'agentId is required' });
    }

    if (!productId) {
      return reply.code(400).send({ error: 'productId is required' });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return reply.code(400).send({ error: 'images array is required' });
    }

    if (images.length > 5) {
      return reply.code(400).send({ error: 'Maximum 5 images allowed' });
    }

    // Validate each image
    for (const image of images) {
      if (!image.fileName || !image.fileBase64 || !image.fileType) {
        return reply.code(400).send({
          error: 'Each image must have fileName, fileBase64, and fileType',
        });
      }

      if (!image.fileType.startsWith('image/')) {
        return reply.code(400).send({ error: 'Only image files are allowed' });
      }
    }

    const uploadedUrls: string[] = [];

    // Upload each image
    for (const image of images) {
      try {
        // Decode base64 file
        const prefix = `data:${image.fileType};base64,`;
        const base64Data = image.fileBase64.replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '');
        const binaryString = atob(base64Data);
        let bytes = Buffer.alloc(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // TODO: Add image resizing/compression using sharp or similar
        // For now, upload as is
        const processedFileType = image.fileType;

        const uniqueId = crypto.randomUUID();
        const extension = image.fileName.split('.').pop() || 'jpg';
        const filePath = `${productId}/${uniqueId}.${extension}`;

        // Upload to storage
        const { error: uploadError } = await supabaseClient.storage
          .from('inventory-images')
          .upload(filePath, bytes, {
            contentType: processedFileType,
            upsert: false,
          });

        if (uploadError) {
          // Rollback any successfully uploaded images if this fails
          for (const uploadedUrl of uploadedUrls) {
            const urlObj = new URL(uploadedUrl);
            const pathname = urlObj.pathname;
            const parts = pathname.split('/').slice(5);
            if (parts.length > 1 && parts[0] === 'inventory-images') {
              const pathToDelete = parts.slice(1).join('/');
              await supabaseClient.storage.from('inventory-images').remove([pathToDelete]);
            }
          }
          return reply.code(500).send({ error: 'Upload failed: ' + uploadError.message });
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('inventory-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error: any) {
        // Rollback on any error
        for (const uploadedUrl of uploadedUrls) {
          const urlObj = new URL(uploadedUrl);
          const pathname = urlObj.pathname;
          const parts = pathname.split('/').slice(5);
          if (parts.length > 1 && parts[0] === 'inventory-images') {
            const pathToDelete = parts.slice(1).join('/');
            await supabaseClient.storage.from('inventory-images').remove([pathToDelete]);
          }
        }
        return reply.code(500).send({
          error: 'Upload failed: ' + (error.message || 'Unknown error'),
        });
      }
    }

    return reply.code(200).send({ success: true, urls: uploadedUrls });
  } catch (error: any) {
    return reply.code(400).send({ error: error.message || 'Unknown error' });
  }
});

// Upload media route
server.post("/upload-media", async (request, reply) => {
  console.log(`🚀 Upload-media function invoked - Method: ${request.method}`);
  console.log("📋 Request headers:", request.headers);

  const startTime = Date.now();

  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.authorization;
    console.log(
      "📋 Auth header:",
      authHeader ? `${authHeader.substring(0, 20)}...` : "MISSING"
    );

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ Authorization header missing or invalid");
      return reply
        .code(401)
        .send({ error: "Authorization header missing or invalid" });
    }

    const token = authHeader.slice(7);
    console.log("🔑 Token extracted, length:", token.length);

    // For simplicity, since we have supabase client, we can use it to verify the user
    // But for now, assume the token is valid, as in the Edge Function

    // Get agent info - for now, skip JWT parsing and assume user from token
    // In production, parse JWT

    // For migration, I'll simplify and assume we can get user from supabase auth
    // But since it's a backend, and the Edge Function does JWT parsing, I'll port that

    // Extract user ID from JWT
    let userId: string;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      let payload = parts[1];
      payload = payload.replace(/-/g, "+").replace(/_/g, "/");
      while (payload.length % 4) {
        payload += "=";
      }

      const decodedPayload = Buffer.from(payload, "base64").toString();
      const userData = JSON.parse(decodedPayload);

      console.log("📊 JWT payload extracted:", {
        userId: userData.sub,
        email: userData.email,
        exp: userData.exp
          ? new Date(userData.exp * 1000).toISOString()
          : undefined,
      });

      if (!userData.sub) {
        throw new Error("No user ID in JWT payload");
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (userData.exp && userData.exp < currentTime) {
        throw new Error("JWT token expired");
      }

      userId = userData.sub;
      console.log("✅ User ID extracted from JWT:", userId);
    } catch (jwtError: any) {
      console.error("❌ JWT parsing failed:", jwtError);
      return reply.code(401).send({
        error: "Invalid authentication token",
        details: jwtError.message,
      });
    }

    // Get agent info
    console.log("🏢 Fetching agent information for user:", userId);
    const { data: agent, error: agentError } = await supabaseClient
      .from("agents")
      .select("id, agent_prefix")
      .eq("user_id", userId)
      .single();

    console.log("📊 Agent result:", {
      agentId: agent?.id,
      agentPrefix: agent?.agent_prefix,
      agentError: agentError ? agentError.message : null,
    });

    if (agentError || !agent) {
      console.error(
        "❌ Agent not found for user",
        userId,
        ":",
        agentError?.message
      );
      return reply
        .code(403)
        .send({ error: "Agent not found for authenticated user" });
    }

    const agentPrefix = agent.agent_prefix;
    if (!agentPrefix) {
      console.error("❌ Agent prefix not configured for agent", agent.id);
      return reply.code(400).send({ error: "Agent prefix not configured" });
    }

    console.log("✅ Agent found:", { agentId: agent.id, prefix: agentPrefix });

    // Get WhatsApp config
    console.log("🏢 Fetching WhatsApp configuration for user:", userId);
    const { data: whatsappConfig, error: configError } = await supabaseClient
      .from("whatsapp_configuration")
      .select("api_key, phone_number_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (configError || !whatsappConfig) {
      console.error("❌ WhatsApp config not found:", configError?.message);
      return reply
        .code(404)
        .send({ error: "WhatsApp configuration not found" });
    }

    const accessToken = whatsappConfig.api_key;
    const phoneNumberId = whatsappConfig.phone_number_id;

    if (!accessToken || !phoneNumberId) {
      console.error("❌ Invalid WhatsApp configuration");
      return reply.code(400).send({ error: "Invalid WhatsApp configuration" });
    }

    console.log("✅ WhatsApp config loaded:", {
      phoneNumberId: phoneNumberId.substring(0, 10) + "...",
      hasToken: !!accessToken,
    });

    // Parse multipart form data
    console.log("📥 Parsing multipart form data...");
    const parts = (request as any).parts();
    const files: Array<{ buffer: Buffer; name: string; size: number; type: string }> = [];
    let caption = "";

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'file') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        files.push({
          buffer,
          name: part.filename,
          size: buffer.length,
          type: part.mimetype,
        });
      } else if (part.type === 'field' && part.fieldname === 'caption') {
        caption = part.value as string;
      }
    }

    console.log("📁 Files info:", files.length > 0 ? {
      count: files.length,
      types: files.map((f) => f.type),
      sizes: files.map((f) => f.size),
      caption: caption,
    } : "NO FILES");

    console.log(
      "📁 Files info:",
      files.length > 0
        ? {
            count: files.length,
            types: files.map((f) => f.type),
            sizes: files.map((f) => f.size),
            caption: caption,
          }
        : "NO FILES"
    );

    if (files.length === 0) {
      console.error("❌ No files provided in request");
      return reply.code(400).send({ error: "No files provided" });
    }

    // Validate files
    const allowedMediaTypes: Record<string, number> = {
      "image/jpeg": 5 * 1024 * 1024,
      "image/png": 5 * 1024 * 1024,
      "image/webp": 500 * 1024,
      "text/plain": 100 * 1024 * 1024,
      "application/pdf": 100 * 1024 * 1024,
      "application/msword": 100 * 1024 * 1024,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        100 * 1024 * 1024,
      "application/vnd.ms-excel": 100 * 1024 * 1024,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        100 * 1024 * 1024,
      "application/vnd.ms-powerpoint": 100 * 1024 * 1024,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        100 * 1024 * 1024,
      "audio/aac": 16 * 1024 * 1024,
      "audio/amr": 16 * 1024 * 1024,
      "audio/mpeg": 16 * 1024 * 1024,
      "audio/mp4": 16 * 1024 * 1024,
      "audio/ogg": 16 * 1024 * 1024,
      "video/3gpp": 16 * 1024 * 1024,
      "video/mp4": 16 * 1024 * 1024,
    };

    console.log("🔍 Validating files...");
    const invalidFiles = files.filter((file) => {
      const maxForType =
        allowedMediaTypes[file.type as keyof typeof allowedMediaTypes];
      if (maxForType === undefined) {
        console.warn(`Unsupported MIME type: ${file.type}`);
        return true;
      }
      if (file.size > maxForType) {
        console.warn(
          `File too large: ${file.name} (${file.size} bytes) exceeds ${maxForType} bytes for ${file.type}`
        );
        return true;
      }
      return false;
    });
    if (invalidFiles.length > 0) {
      console.error(
        "❌ Invalid files:",
        invalidFiles.map((f) => ({ name: f.name, size: f.size, type: f.type }))
      );
      return reply.code(400).send({
        error:
          "Some files are too large or unsupported type. Limits: Images/Stickers (5MB/500KB), Documents (100MB), Audio/Video (16MB).",
      });
    }

    console.log("✅ All files validation passed");

    // Upload to WhatsApp
    console.log("📤 Uploading files to WhatsApp Cloud API...");
    const version = "v19.0";
    const uploadPromises = files.map(async (file, index) => {
      const uploadFormData = new FormData();
      uploadFormData.append("messaging_product", "whatsapp");
      uploadFormData.append("file", file.buffer, file.name);

      const uploadStartTime = Date.now();

      const uploadResponse = await fetch(
        `https://graph.facebook.com/${version}/${phoneNumberId}/media`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: uploadFormData,
        }
      );

      const uploadDuration = Date.now() - uploadStartTime;
      console.log(
        `⏱️ Cloud API upload for file ${index + 1} took ${uploadDuration}ms`
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.text();
        console.error(
          `❌ Media upload failed for file ${index + 1}:`,
          errorData
        );
        return {
          error: `Failed to upload file ${index + 1}: ${errorData}`,
          index,
        };
      }

      const uploadResult: any = await uploadResponse.json();
      const media_id = uploadResult.id;

      if (!media_id) {
        console.error(`❌ No media ID for file ${index + 1}:`, uploadResult);
        return {
          error: `Invalid media upload response for file ${index + 1} - no ID`,
          index,
        };
      }

      console.log(`✅ File ${index + 1} uploaded successfully, ID:`, media_id);

      // Fetch media URL
      let media_download_url = null;
      const mediaUrlResponse = await fetch(
        `https://graph.facebook.com/${version}/${media_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (mediaUrlResponse.ok) {
        const mediaUrlData: any = await mediaUrlResponse.json();
        media_download_url = mediaUrlData.url;
        console.log(
          `Media URL for file ${index + 1} fetched:`,
          media_download_url
        );
      } else {
        console.error(
          `Failed to fetch media URL for file ${index + 1}:`,
          await mediaUrlResponse.text()
        );
      }

      // Download and upload to Supabase
      let supabasePublicUrl = null;
      if (media_download_url) {
        try {
          console.log(
            `🔄 Attempting to download preview blob for file ${
              index + 1
            } from:`,
            media_download_url.substring(0, 50) + "..."
          );
          const blobResponse = await fetch(media_download_url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          console.log(
            `📥 Blob response for file ${index + 1}: status ${
              blobResponse.status
            }, ok: ${blobResponse.ok}`
          );

          if (blobResponse.ok) {
            const blob = await blobResponse.blob();
            console.log(
              `📦 Blob downloaded for file ${index + 1}: size ${
                blob.size
              } bytes, type ${blob.type}`
            );
            const timestamp = Date.now();
            const fileExt = file.name.split(".").pop() || "bin";
            const fileName = `whatsapp_${agentPrefix}_preview_${timestamp}.${fileExt}`;
            const filePath = `${agentPrefix}/previews/${fileName}`;

            console.log(`☁️ Uploading preview to Supabase: path ${filePath}`);

            const { data: uploadData, error: uploadError } =
              await supabaseClient.storage
                .from("whatsapp-media")
                .upload(filePath, blob, {
                  contentType: file.type,
                  cacheControl: "3600",
                  upsert: false,
                });

            if (!uploadError && uploadData) {
              const { data: publicUrlData } = supabaseClient.storage
                .from("whatsapp-media")
                .getPublicUrl(filePath);
              supabasePublicUrl = publicUrlData.publicUrl;
              console.log(
                `✅ Preview uploaded to Supabase for file ${
                  index + 1
                }: ${supabasePublicUrl}`
              );
            } else {
              console.error(
                `❌ Failed to upload preview to Supabase for file ${
                  index + 1
                }:`,
                uploadError
              );
            }
          } else {
            const errorText = await blobResponse.text();
            console.error(
              `❌ Failed to download blob for preview for file ${
                index + 1
              }: status ${blobResponse.status}, response:`,
              errorText
            );
          }
        } catch (blobError) {
          console.error(
            `❌ Error downloading blob for preview for file ${index + 1}:`,
            blobError
          );
        }
      }

      // Determine media type
      let mediaType: "none" | "image" | "video" | "audio" | "document" = "none";
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
        mediaType = "image";
      } else if (["mp4", "3gp"].includes(extension)) {
        mediaType = "video";
      } else if (["mp3", "aac", "amr", "m4a", "ogg"].includes(extension)) {
        mediaType = "audio";
      } else if (
        ["pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(
          extension
        )
      ) {
        mediaType = "document";
      }

      console.log(
        `🏷️ Determined media type for file ${
          index + 1
        }: ${mediaType} (extension: ${extension})`
      );

      return {
        media_id: media_id,
        media_download_url: supabasePublicUrl || media_download_url,
        media_type: mediaType,
        filename: file.name,
        size: file.size,
        index,
      };
    });

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((r) => !r.error);
    const failedUploads = results.filter((r) => r.error);

    if (failedUploads.length > 0) {
      console.error(
        "❌ Some uploads failed:",
        failedUploads.map((f) => f.error)
      );
    }

    if (successfulUploads.length === 0) {
      return reply.code(500).send({
        error: "All file uploads failed",
        details: failedUploads.map((f) => f.error),
      });
    }

    console.log(
      `🎉 ${successfulUploads.length}/${files.length} files uploaded successfully`,
      successfulUploads.map((u) => ({ id: u.media_id, type: u.media_type }))
    );

    const totalDuration = Date.now() - startTime;
    console.log(`🏁 Function completed in ${totalDuration}ms`);

    return reply.code(200).send({
      success: true,
      uploaded: successfulUploads.length,
      total: files.length,
      media: successfulUploads,
      errors: failedUploads.map((f) => ({ index: f.index, error: f.error })),
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(
      `💥 Upload-media function failed after ${totalDuration}ms:`,
      error
    );

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return reply
      .code(500)
      .send({ error: "Internal server error", details: errorMessage });
  }
});

server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await server.listen({ port: 8080, host: '0.0.0.0' });
    console.log('Server running on http://localhost:8080');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();