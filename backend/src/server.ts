import 'dotenv/config';
console.log("🚀 Server starting...");
import fastify from 'fastify';
import { createClient } from "@supabase/supabase-js";
import Redis from "ioredis";
import crypto from 'crypto';
import { CacheService } from './utils/cache';
import whatsappWebhookRoutes from './routes/whatsapp/whatsapp-webhook';
import sendWhatsappMessageRoutes from './routes/whatsapp/send-whatsapp-message';
import getMediaPreviewRoutes from './routes/media/get-media-preview';
import uploadInventoryImagesRoutes from './routes/inventory/upload-inventory-images';
import uploadMediaRoutes from './routes/media/upload-media';
import authenticatedMessagesStreamRoutes from './routes/conversations/authenticated-messages-stream';
import addAgentRoutes from './routes/agents/add-agent';
import getAgentsRoutes from "./routes/agents/get-agents";
import getWhatsappConfigRoutes from './routes/whatsapp/get-whatsapp-config';
import updateWhatsappConfigRoutes from './routes/whatsapp/update-whatsapp-config';
import deleteWhatsappConfigRoutes from './routes/whatsapp/delete-whatsapp-config';
import addCreditsRoutes from './routes/agents/add-credits';
import deleteAgentRoutes from './routes/agents/delete-agent';
import getConversationsRoutes from './routes/conversations/get-conversations';
import getConversationMessagesRoutes from './routes/conversations/get-conversation-messages';
import getBotContextRoutes from './routes/bot/get-bot-context';
import chatbotReplyRoutes from './routes/bot/chatbot-reply';
import manageServicesRoutes from './routes/services/manage-services';
import manageInventoryRoutes from './routes/inventory/manage-inventory';
import manageCustomersRoutes from './routes/customers/manage-customers';
import getWhatsappProfilePicRoutes from './routes/whatsapp/get-whatsapp-profile-pic';
import uploadServiceImagesRoutes from './routes/services/upload-service-images';
import setupWhatsappConfigRoutes from './routes/whatsapp/setup-whatsapp-config';
import getInvoiceTemplateRoutes from "./routes/invoices/get-invoice-template";
import updateAgentRoutes from "./routes/agents/update-agent";
import sendInvoiceTemplateRoutes from "./routes/invoices/send-invoice-template";
import getUsersRoutes from "./routes/users/get-users";
import addUserRoutes from "./routes/users/add-user";
import updateUserRoutes from "./routes/users/update-user";
import deleteUserRoutes from "./routes/users/delete-user";
import updatePasswordRoutes from "./routes/users/update-password";
import manageOrdersRoutes from "./routes/orders/manage-orders";
import manageAppointmentsRoutes from "./routes/appointments/manage-appointments";
import manageTemplatesRoutes from "./routes/templates/manage-templates";
import getAgentProfileRoutes from "./routes/agents/get-agent-profile";
import uploadInvoiceTemplateRoutes from "./routes/upload-invoice-template";
import getAdminInfoRoutes from "./routes/admin/get-admin-info";
import fastifySocketIO from "fastify-socket.io";

const server = fastify();

// Register CORS plugin
server.register(require("@fastify/cors"), {
  origin: true, // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Register multipart plugin
server.register(require("@fastify/multipart"));

// Register Socket.IO plugin
server.register(fastifySocketIO, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELET E, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper function
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Redis client
console.log("Attempting to connect to Redis at:", REDIS_URL);
const redisClient = new Redis(REDIS_URL);
redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

// Cache service
const cacheService = new CacheService(redisClient);

// Register routes
async function registerRoutes() {
  await whatsappWebhookRoutes(server, supabaseClient, cacheService);
  await sendWhatsappMessageRoutes(server, supabaseClient);
  await getMediaPreviewRoutes(server, supabaseClient);
  await uploadInventoryImagesRoutes(server, supabaseClient);
  await uploadMediaRoutes(server, supabaseClient);
  await authenticatedMessagesStreamRoutes(server, supabaseClient);
  await addAgentRoutes(server, supabaseClient);
  await getAgentsRoutes(server, supabaseClient);
  await getWhatsappConfigRoutes(server, supabaseClient);
  await updateWhatsappConfigRoutes(server, supabaseClient);
  await deleteWhatsappConfigRoutes(server, supabaseClient);
  await addCreditsRoutes(server, supabaseClient);
  await deleteAgentRoutes(server, supabaseClient);
  await getConversationsRoutes(server, supabaseClient, cacheService);
  await getConversationMessagesRoutes(server, supabaseClient, cacheService);
  await getBotContextRoutes(server, supabaseClient, cacheService);
  await chatbotReplyRoutes(server, supabaseClient);
  await manageServicesRoutes(server, supabaseClient);
  await manageInventoryRoutes(server, supabaseClient);
  await manageCustomersRoutes(server, supabaseClient);
  await getWhatsappProfilePicRoutes(server, supabaseClient);
  await uploadServiceImagesRoutes(server, supabaseClient);
  await setupWhatsappConfigRoutes(server, supabaseClient);
  await getInvoiceTemplateRoutes(server, supabaseClient, cacheService);
  await updateAgentRoutes(server, supabaseClient);
  await sendInvoiceTemplateRoutes(server, supabaseClient);
  await getUsersRoutes(server, supabaseClient);
  await addUserRoutes(server, supabaseClient);
  await updateUserRoutes(server, supabaseClient);
  await deleteUserRoutes(server, supabaseClient);
  await updatePasswordRoutes(server, supabaseClient);
  await manageOrdersRoutes(server, supabaseClient);
  await manageAppointmentsRoutes(server, supabaseClient);
  await manageTemplatesRoutes(server, supabaseClient);
  await getAgentProfileRoutes(server, supabaseClient);
  await uploadInvoiceTemplateRoutes(server, supabaseClient);
  await getAdminInfoRoutes(server, supabaseClient);
}

// Socket.IO connection handling
server.ready().then(() => {
  (server as any).io.on("connection", (socket: any) => {
    console.log("Client connected:", socket.id);

    socket.on("join-agent-room", (data: any) => {
      const { agentId, token } = data;
      if (agentId && token) {
        // Verify JWT token
        // For now, just join the room - proper auth will be added
        socket.join(`agent-${agentId}`);
        console.log(`Socket ${socket.id} joined agent room: agent-${agentId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
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

// Upload inventory images route
server.get("/health", async (request, reply) => {
  return { status: "ok" };
});

// Socket.IO utility functions
function emitNewMessage(agentId: number, messageData: any) {
  (server as any).io.to(`agent-${agentId}`).emit("new-message", messageData);
}

function emitAgentStatusUpdate(agentId: number, statusData: any) {
  (server as any).io
    .to(`agent-${agentId}`)
    .emit("agent-status-update", statusData);
}

const start = async () => {
  try {
    await registerRoutes();
    await server.listen({ port: 8080, host: "0.0.0.0" });
    console.log("Server running on http://localhost:8080");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Handle unhandled errors without terminating
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

start();