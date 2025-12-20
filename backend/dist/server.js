import 'dotenv/config';
import fastify from 'fastify';
import { createClient } from "@supabase/supabase-js";
import crypto from 'crypto';
import whatsappWebhookRoutes from './routes/whatsapp-webhook';
import sendWhatsappMessageRoutes from './routes/send-whatsapp-message';
import getMediaPreviewRoutes from './routes/get-media-preview';
import uploadInventoryImagesRoutes from './routes/upload-inventory-images';
import uploadMediaRoutes from './routes/upload-media';
import authenticatedMessagesStreamRoutes from './routes/authenticated-messages-stream';
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
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
// Register routes
async function registerRoutes() {
    await whatsappWebhookRoutes(server, supabaseClient);
    await sendWhatsappMessageRoutes(server, supabaseClient);
    await getMediaPreviewRoutes(server, supabaseClient);
    await uploadInventoryImagesRoutes(server, supabaseClient);
    await uploadMediaRoutes(server, supabaseClient);
    await authenticatedMessagesStreamRoutes(server, supabaseClient);
}
// Helper functions (ported from Edge Function)
function getMediaTypeFromWhatsApp(messageType, mimeType) {
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
async function downloadWhatsAppMedia(mediaId, accessToken) {
    try {
        const response = await fetch(`https://graph.facebook.com/v23.0/${mediaId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            console.error(`Failed to download media ${mediaId}: ${response.status} ${response.statusText}`);
            return null;
        }
        const mediaData = await response.json();
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
            console.error(`Failed to download media file: ${fileResponse.status} ${fileResponse.statusText}`);
            return null;
        }
        const mediaBuffer = Buffer.from(await fileResponse.arrayBuffer());
        return mediaBuffer;
    }
    catch (error) {
        console.error("Error downloading WhatsApp media:", error);
        return null;
    }
}
async function uploadMediaToStorage(agentPrefix, mediaBuffer, originalFilename, contentType) {
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
    }
    catch (error) {
        console.error("Error uploading media to storage:", error);
        return null;
    }
}
async function processIncomingMessage(supabase, message, phoneNumberId, contactName) {
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
        }
        else {
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
            console.log("Warning: Could not fetch customer ai_enabled, assuming false");
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
        }
        else {
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
        let mediaType = "none";
        let mediaUrl = null;
        let caption = null;
        if (message.type === "text") {
            messageText = message.text.body;
        }
        else if (["image", "video", "audio", "document"].includes(message.type)) {
            mediaType = getMediaTypeFromWhatsApp(message.type);
            caption = message[message.type]?.caption || null;
            messageText = caption || `[${message.type.toUpperCase()}] Media file`;
            if (message[message.type]?.id && whatsappConfig.api_key) {
                console.log(`Downloading ${message.type} media: ${message[message.type].id}`);
                const mediaBuffer = await downloadWhatsAppMedia(message[message.type].id, whatsappConfig.api_key);
                if (mediaBuffer && mediaBuffer.length > 0) {
                    let contentType = "application/octet-stream";
                    let filename = `media_${Date.now()}.${message.type}`;
                    if (message[message.type].mime_type) {
                        contentType = message[message.type].mime_type;
                        const ext = contentType.split("/")[1] || message.type;
                        filename = `media_${Date.now()}.${ext}`;
                    }
                    mediaUrl = await uploadMediaToStorage(agent.agent_prefix, mediaBuffer, filename, contentType);
                    if (mediaUrl) {
                        console.log(`Media uploaded successfully: ${mediaUrl}`);
                    }
                    else {
                        console.error("Failed to upload media to storage");
                    }
                }
                else {
                    console.error(`Failed to download media: ${message[message.type].id}`);
                }
            }
        }
        else if (message.type === "sticker") {
            mediaType = "sticker";
            messageText = "[STICKER] Sticker message";
            if (message.sticker?.id && whatsappConfig.api_key) {
                const mediaBuffer = await downloadWhatsAppMedia(message.sticker.id, whatsappConfig.api_key);
                if (mediaBuffer && mediaBuffer.length > 0) {
                    mediaUrl = await uploadMediaToStorage(agent.agent_prefix, mediaBuffer, `sticker_${Date.now()}.webp`, "image/webp");
                }
            }
        }
        else if (message.type === "button") {
            console.log("🔍 DEBUG: Full button message payload:", JSON.stringify(message, null, 2));
            console.log("🔍 DEBUG: Button reply details:", message.button?.reply);
            messageText =
                message.button?.reply?.title ||
                    message.button?.reply?.id ||
                    "Button clicked";
        }
        else if (message.type === "interactive") {
            console.log("🔍 DEBUG: Full interactive message payload:", JSON.stringify(message, null, 2));
            console.log("🔍 DEBUG: Interactive type:", message.interactive?.type);
            console.log("🔍 DEBUG: Button reply details:", message.interactive?.button_reply);
            if (message.interactive?.type === "button_reply") {
                messageText =
                    message.interactive.button_reply?.title || "Button clicked";
            }
            else {
                messageText = `[INTERACTIVE_${message.interactive?.type?.toUpperCase() || "UNKNOWN"}] Interactive message`;
            }
        }
        else {
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
        }
        else {
            console.log("Message stored successfully in dynamic table:", {
                id: insertedMessage.id,
                type: message.type,
                mediaType,
                hasMediaUrl: !!mediaUrl,
            });
            if (customer.ai_enabled && whatsappConfig?.webhook_url) {
                console.log(`Triggering agent webhook for AI-enabled customer ${customer.id}`);
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
                        console.error(`Agent webhook failed: HTTP ${response.status} - ${errorText}`);
                    }
                    else {
                        console.log("Agent webhook triggered successfully");
                    }
                }
                catch (webhookError) {
                    console.error("Error triggering agent webhook:", webhookError);
                }
            }
        }
    }
    catch (error) {
        console.error("Message processing error:", error);
    }
}
async function processMessageStatus(supabase, status) {
    try {
        console.log("📨 Processing message status update:", status.id, status.status);
        const statusDate = new Date(status.timestamp * 1000);
        const statusTimestamp = statusDate.toISOString();
        console.log("Status timestamp conversion:", {
            whatsappTimestamp: status.timestamp,
            convertedDate: statusDate.toISOString(),
            localString: statusDate.toLocaleString(),
        });
        console.log(`📨 Message ${status.id} status: "${status.status}" at ${statusTimestamp}`);
        console.log("✅ Status update logged (full tracking available with optional migration)");
    }
    catch (error) {
        console.error("Status processing error:", error);
    }
}
// Upload inventory images route
server.get('/health', async (request, reply) => {
    return { status: 'ok' };
});
const start = async () => {
    try {
        await registerRoutes();
        await server.listen({ port: 8080, host: '0.0.0.0' });
        console.log('Server running on http://localhost:8080');
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
