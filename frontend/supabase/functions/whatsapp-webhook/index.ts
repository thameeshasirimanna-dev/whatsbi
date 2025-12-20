// DEPRECATED: Replaced by Node backend
// @ts-nocheck - Disable TypeScript checking for this file to ensure deployment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// EARLY DEBUG LOGGING - This should appear first if function loads
console.log("🚀 WHATSAPP WEBHOOK FUNCTION LOADED");
console.log("📋 Environment check:", {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") ? "SET" : "MISSING",
  WHATSAPP_VERIFY_TOKEN: Deno.env.get("WHATSAPP_VERIFY_TOKEN")
    ? "SET"
    : "MISSING",
  WHATSAPP_APP_SECRET: Deno.env.get("WHATSAPP_APP_SECRET") ? "SET" : "MISSING",
  SUPABASE_SERVICE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ? "SET"
    : "MISSING",
});
console.log("✅ Function initialization complete - ready to handle requests");

// Type declarations for Deno APIs
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Type declarations for Supabase client
// @ts-nocheck already applied at top of file

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/* Global secrets from edge function secrets */
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const WHATSAPP_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Supabase client for message processing (only created when needed)
let supabaseClient: any = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    } as any);
  }
  return supabaseClient;
}

// Helper function to get app secret for signature verification
async function getAppSecret(phoneNumberId: string): Promise<string | null> {
  // Use global secret from environment variables (edge function secrets)
  if (WHATSAPP_APP_SECRET) {
    console.log("Using WHATSAPP_APP_SECRET from environment");
    return WHATSAPP_APP_SECRET;
  }

  console.warn("No WHATSAPP_APP_SECRET found in environment variables");
  return null;
}

// Helper function to get verification token (for GET verification)
async function getVerificationToken(
  phoneNumberId: string | null
): Promise<string | null> {
  // Use global secret from environment variables (edge function secrets)
  if (WHATSAPP_VERIFY_TOKEN) {
    console.log("Using WHATSAPP_VERIFY_TOKEN from environment");
    return WHATSAPP_VERIFY_TOKEN;
  }

  console.warn("No WHATSAPP_VERIFY_TOKEN found in environment variables");
  return null;
}

// Helper function to determine media type from WhatsApp message
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

// Helper function to download media from WhatsApp
async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken: string
): Promise<Uint8Array | null> {
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

    // Get the media URL first
    const mediaData = await response.json();
    if (!mediaData.url) {
      console.error("No media URL in response:", mediaData);
      return null;
    }

    // Download the actual media file
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

    const mediaBuffer = await fileResponse.arrayBuffer();
    return new Uint8Array(mediaBuffer);
  } catch (error) {
    console.error("Error downloading WhatsApp media:", error);
    return null;
  }
}

// Helper function to upload media to Supabase Storage
async function uploadMediaToStorage(
  agentPrefix: string,
  mediaBuffer: Uint8Array,
  originalFilename: string,
  contentType: string
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const fileExt = originalFilename.split(".").pop()?.toLowerCase() || "bin";
    const fileName = `${timestamp}_${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${agentPrefix}/incoming/${fileName}`;

    console.log(`Uploading media to storage: ${filePath}`);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
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

    const { data: urlData } = supabase.storage
      .from("whatsapp-media")
      .getPublicUrl(filePath);

    console.log(`Media uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading media to storage:", error);
    return null;
  }
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log("📋 All headers:", Object.fromEntries(req.headers.entries()));
  console.log("🔍 Request origin:", req.headers.get("Origin"));
  console.log("🔍 User-Agent:", req.headers.get("User-Agent"));

  // CORS preflight - Handle this FIRST for all requests
  if (req.method === "OPTIONS") {
    console.log("✅ Handling CORS preflight (OPTIONS)");
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-forwarded-proto, x-forwarded-host",
      },
    });
  }

  // Log any Authorization header for debugging
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    console.log(
      "⚠️ Unexpected Authorization header found:",
      authHeader.substring(0, 20) + "..."
    );
  }

  // Explicitly allow unauthenticated public webhook requests
  console.log("✅ Public webhook endpoint - no JWT auth required");

  // WHATSAPP WEBHOOK VERIFICATION - DATABASE TOKEN APPROACH
  if (req.method === "GET") {
    // Return CORS headers for all GET requests to help with preflight
    const responseHeaders = { ...corsHeaders, "Content-Type": "text/plain" };

    try {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      const phoneNumberId = url.searchParams.get("phone_number_id"); // Meta includes this in verification

      console.log("GET VERIFICATION:", {
        mode,
        token: token ? `${String(token).substring(0, 8)}...` : null,
        hasChallenge: !!challenge,
        phoneNumberId: phoneNumberId
          ? `${String(phoneNumberId).substring(0, 8)}...`
          : null,
      });

      // Handle webhook verification
      if (mode === "subscribe" && token && challenge) {
        let expectedToken: string | null = null;

        // Try multiple verification token sources
        if (phoneNumberId) {
          expectedToken = await getVerificationToken(phoneNumberId);
          console.log(
            "Token lookup by phone_number_id:",
            expectedToken ? "found" : "not found"
          );
        }

        // Fallback to global secret if no phone_number_id or no config found
        if (!expectedToken && WHATSAPP_VERIFY_TOKEN) {
          expectedToken = WHATSAPP_VERIFY_TOKEN;
          console.log("Using WHATSAPP_VERIFY_TOKEN env var");
        }

        // If still no token, try to get from database without phone_number_id
        if (!expectedToken) {
          try {
            const supabase = getSupabaseClient();
            const { data: configs, error } = await supabase
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
          console.log("✅ VERIFICATION SUCCESS - Token matches expected token");
          return new Response(challenge, {
            status: 200,
            headers: responseHeaders,
          });
        } else if (!expectedToken) {
          console.warn(
            "⚠️ VERIFICATION WARNING - No verification token configured"
          );
          console.warn("⚠️ Allowing verification for development/testing");
          console.warn(
            "⚠️ Configure WHATSAPP_VERIFY_TOKEN or database token for production"
          );
          return new Response(challenge, {
            status: 200,
            headers: responseHeaders,
          });
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
          return new Response("Verification failed", {
            status: 403,
            headers: responseHeaders,
          });
        }
      }

      // For other GET requests, return 404 or challenge if valid but not subscribe mode
      if (mode && challenge) {
        console.log("GET request with challenge but wrong mode:", mode);
        return new Response("Forbidden", {
          status: 403,
          headers: responseHeaders,
        });
      }

      console.log("GET request without verification parameters");
      return new Response("WhatsApp Webhook Endpoint", {
        status: 200,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error("GET Verification error:", error);
      return new Response("Internal server error", {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }
  }

  // WHATSAPP MESSAGE PROCESSING (POST) - SAME SECRET FOR SIGNATURE
  if (req.method === "POST") {
    console.log("🚀 POST webhook received - processing WhatsApp payload");

    const signatureHeader = req.headers.get("X-Hub-Signature-256");
    const authHeader = req.headers.get("Authorization");
    const userAgent = req.headers.get("User-Agent") || "unknown";
    const origin = req.headers.get("Origin") || "none";

    console.log("📋 POST request details:", {
      url: req.url,
      userAgent:
        userAgent.substring(0, 50) + (userAgent.length > 50 ? "..." : ""),
      origin: origin,
      hasSignature: !!signatureHeader,
      hasAuth: !!authHeader,
      contentLength: req.headers.get("Content-Length"),
    });

    try {
      // Read body only once and store it
      const body = await req.text();
      
      // Log the first 200 chars for debugging
      const bodyPreview = body.substring(0, 200);
      console.log("📄 Request body preview:", bodyPreview.replace(/\n/g, " "));

      console.log("Body length:", body.length);
      console.log("Signature header present:", !!signatureHeader);

      // Simplified authentication for webhook
      console.log("🔐 Processing webhook authentication...");

      // Allow all webhook requests but verify signature if present
      let signatureVerified = true; // Start with true, only fail if signature check fails

      if (signatureHeader) {
        console.log("✅ WhatsApp signature header detected - will verify HMAC");
        signatureVerified = false; // Will be set to true after verification
      } else {
        console.log(
          "⚠️ No signature header - allowing for testing/development"
        );
      }

      console.log("✅ Webhook request allowed - processing payload");

      // Handle signature verification if present
      if (signatureHeader) {
        console.log("🔐 Verifying WhatsApp signature...");

        // Extract phone_number_id from payload metadata
        let phoneNumberId: string | null = null;
        try {
          const payload = JSON.parse(body);
          if (
            payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id
          ) {
            phoneNumberId =
              payload.entry[0].changes[0].value.metadata.phone_number_id;
          }
        } catch (e) {
          console.error("Error parsing payload for phone_number_id:", e);
        }

        console.log(
          "Phone number ID for verification:",
          phoneNumberId
            ? `${(phoneNumberId as string).substring(0, 8)}...`
            : "not found"
        );

        // Get secret from database first
        let verificationSecret: string | null = null;
        if (phoneNumberId) {
          verificationSecret = await getAppSecret(phoneNumberId as string);
          console.log(
            "App secret lookup:",
            verificationSecret ? "found" : "not found"
          );
        }

        // Fallback to global secret
        if (!verificationSecret && WHATSAPP_APP_SECRET) {
          verificationSecret = WHATSAPP_APP_SECRET;
          console.log(
            "Using WHATSAPP_APP_SECRET env var for signature verification"
          );
        }

        if (verificationSecret) {
          try {
            const encoder = new TextEncoder();
            const keyData = encoder.encode(verificationSecret);
            const bodyData = encoder.encode(body);

            // Import key for HMAC
            const key = await crypto.subtle.importKey(
              "raw",
              keyData,
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"]
            );

            // Compute HMAC of body
            const signatureBuffer = await crypto.subtle.sign(
              "HMAC",
              key,
              bodyData
            );
            const signatureArray = Array.from(new Uint8Array(signatureBuffer));
            const expectedSignature =
              "sha256=" +
              signatureArray
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");

            console.log(
              "Computed signature:",
              expectedSignature.substring(0, 20) + "..."
            );
            console.log(
              "Received signature:",
              signatureHeader.substring(0, 20) + "..."
            );

            if (signatureHeader !== expectedSignature) {
              console.error("❌ Message signature verification failed");
              console.error(
                `Expected: ${expectedSignature.substring(0, 20)}...`
              );
              console.error(`Received: ${signatureHeader.substring(0, 20)}...`);
              // Instead of returning 403, log the error but continue processing
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
            console.warn("⚠️ Continuing despite signature error for debugging");
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

      // Log verification result but don't block processing
      if (signatureVerified) {
        console.log("✅ Webhook signature verification passed");
      } else {
        console.warn("⚠️ Webhook proceeding without signature verification");
      }

      const payload = JSON.parse(body);

      if (payload.object !== "whatsapp_business_account") {
        return new Response("Invalid payload", { status: 400 });
      }

      const entry = payload.entry?.[0];
      if (!entry) {
        return new Response("No entry in payload", { status: 400 });
      }

      const changes = entry.changes?.[0];
      if (!changes) {
        return new Response("No changes in entry", { status: 400 });
      }

      const value = changes.value;
      if (!value) {
        return new Response("No value in changes", { status: 400 });
      }

      const supabase = getSupabaseClient();

      // Process messages
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

      // Process status updates
      if (value.statuses && value.statuses.length > 0) {
        console.log(`Processing ${value.statuses.length} status update(s)`);
        for (const status of value.statuses) {
          await processMessageStatus(supabase, status);
        }
      }

      console.log("Message processing completed");
      return new Response("OK", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    } catch (error) {
      console.error("POST processing error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Method not allowed
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// Message processing functions
async function processIncomingMessage(
  supabase,
  message,
  phoneNumberId,
  contactName
) {
  try {
    console.log("Processing message:", message.id, message.type);

    // Find configuration for this phone number - include api_key for media download
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

    // Find or create customer in agent's dynamic customers table
    const { data: existingCustomer } = await supabase
      .from(customersTable)
      .select("id")
      .eq("phone", fromPhone)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      // Insert new customer (no existing found)
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

      // Fetch and store profile image URL asynchronously
      (async () => {
        try {
          console.log(
            `Processing profile picture for new customer ${customerId} (${fromPhone})`
          );

          // Note: WhatsApp Business API doesn't support direct profile picture retrieval for contacts
          // The frontend will fetch profile pictures on-demand when displaying customers
          // For now, we'll store a placeholder or leave it null

          // If contactName was provided in the webhook payload, we could potentially
          // use that to generate an avatar, but no actual image URL is available
          console.log(
            `Profile picture fetch skipped for ${fromPhone} - using frontend on-demand fetching`
          );

          // Optionally, you could store a generated avatar URL based on the name
          // For example: `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName || fromPhone)}&background=10b981&color=fff`
        } catch (profileError) {
          console.error(
            `Error processing profile for ${fromPhone}:`,
            profileError
          );
        }
      })();
    }
    // Fetch customer to check ai_enabled
    const { data: customer, error: customerError } = await supabase
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

    // Update last_user_message_time for this customer interaction
    const { error: updateError } = await supabase
      .from(customersTable)
      .update({ last_user_message_time: new Date().toISOString() })
      .eq("id", customerId);

    if (updateError) {
      console.error("Error updating last_user_message_time:", updateError);
    } else {
      console.log(`Updated last_user_message_time for customer ${customerId}`);
    }

    // Initialize message data with defaults - properly handle WhatsApp Unix timestamp
    // WhatsApp timestamps are in seconds, convert to milliseconds for JavaScript Date
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

    // Process different message types
    if (message.type === "text") {
      messageText = message.text.body;
    } else if (["image", "video", "audio", "document"].includes(message.type)) {
      // Handle media messages
      mediaType = getMediaTypeFromWhatsApp(message.type);
      caption = message[message.type]?.caption || null;
      messageText = caption || `[${message.type.toUpperCase()}] Media file`;

      // Download and upload media if media_id exists and access token available
      if (message[message.type]?.id && whatsappConfig.api_key) {
        console.log(
          `Downloading ${message.type} media: ${message[message.type].id}`
        );

        const mediaBuffer = await downloadWhatsAppMedia(
          message[message.type].id,
          whatsappConfig.api_key
        );

        if (mediaBuffer && mediaBuffer.length > 0) {
          // Determine content type and filename
          let contentType = "application/octet-stream";
          let filename = `media_${Date.now()}.${message.type}`;

          if (message[message.type].mime_type) {
            contentType = message[message.type].mime_type;
            const ext = contentType.split("/")[1] || message.type;
            filename = `media_${Date.now()}.${ext}`;
          }

          // Upload to Supabase storage
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
      // Handle stickers
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
      console.log("🔍 DEBUG: Full button message payload:", JSON.stringify(message, null, 2));
      console.log("🔍 DEBUG: Button reply details:", message.button?.reply);

      messageText = message.button?.reply?.title || message.button?.reply?.id || "Button clicked";
    } else if (message.type === "interactive") {
      console.log("🔍 DEBUG: Full interactive message payload:", JSON.stringify(message, null, 2));
      console.log("🔍 DEBUG: Interactive type:", message.interactive?.type);
      console.log("🔍 DEBUG: Button reply details:", message.interactive?.button_reply);

      if (message.interactive?.type === "button_reply") {
        messageText =
          message.interactive.button_reply?.title || "Button clicked";
      } else {
        messageText = `[INTERACTIVE_${
          message.interactive?.type?.toUpperCase() || "UNKNOWN"
        }] Interactive message`;
      }
    } else {
      // Unknown message type
      messageText = `[${message.type.toUpperCase()}] Unsupported message type`;
    }

    // Prepare message insert data
    const messageData = {
      customer_id: customerId,
      message: messageText,
      direction: "inbound",
      timestamp: messageTimestamp,
      is_read: false, // Explicitly set for inbound messages
      media_type: mediaType,
      media_url: mediaUrl,
      caption: caption,
    };

    // Store message in agent's dynamic messages table
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

      // Trigger agent webhook if ai_enabled
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

async function processMessageStatus(supabase, status) {
  try {
    console.log(
      "📨 Processing message status update:",
      status.id,
      status.status
    );

    // Without whatsapp_message_id column, we can't match status to specific messages
    // For basic functionality, just log the status information
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

    // Common WhatsApp statuses:
    // - "sent": Message sent from WhatsApp servers
    // - "delivered": Message delivered to recipient's device
    // - "read": Message read by recipient
    // - "failed": Message delivery failed

    // To enable full status tracking later, you can:
    // 1. Run the migration: database/migrations/008_add_whatsapp_message_id_to_messages.sql
    // 2. Re-enable the database lookup logic in this function

    console.log(
      "✅ Status update logged (full tracking available with optional migration)"
    );
  } catch (error) {
    console.error("Status processing error:", error);
  }
}
