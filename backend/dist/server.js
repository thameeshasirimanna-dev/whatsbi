import 'dotenv/config';
import fastify from 'fastify';
import { createClient } from "@supabase/supabase-js";
import whatsappWebhookRoutes from './routes/whatsapp-webhook';
import sendWhatsappMessageRoutes from './routes/send-whatsapp-message';
import getMediaPreviewRoutes from './routes/get-media-preview';
import uploadInventoryImagesRoutes from './routes/upload-inventory-images';
import uploadMediaRoutes from './routes/upload-media';
import authenticatedMessagesStreamRoutes from './routes/authenticated-messages-stream';
import addAgentRoutes from './routes/add-agent';
import getWhatsappConfigRoutes from './routes/get-whatsapp-config';
import addCreditsRoutes from './routes/add-credits';
import deleteAgentRoutes from './routes/delete-agent';
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
    await addAgentRoutes(server, supabaseClient);
    await getWhatsappConfigRoutes(server, supabaseClient);
    await addCreditsRoutes(server, supabaseClient);
    await deleteAgentRoutes(server, supabaseClient);
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
