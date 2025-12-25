import "dotenv/config";
import fastify from "fastify";
import { Pool } from "pg";
import Redis from "ioredis";
import crypto from "crypto";
import { CacheService } from "./utils/cache";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import whatsappWebhookRoutes from "./routes/whatsapp/whatsapp-webhook";
import sendWhatsappMessageRoutes from "./routes/whatsapp/send-whatsapp-message";
import getMediaPreviewRoutes from "./routes/media/get-media-preview";
import uploadInventoryImagesRoutes from "./routes/inventory/upload-inventory-images";
import uploadMediaRoutes from "./routes/media/upload-media";
import authenticatedMessagesStreamRoutes from "./routes/conversations/authenticated-messages-stream";
import addAgentRoutes from "./routes/agents/add-agent";
import getAgentsRoutes from "./routes/agents/get-agents";
import getWhatsappConfigRoutes from "./routes/whatsapp/get-whatsapp-config";
import updateWhatsappConfigRoutes from "./routes/whatsapp/update-whatsapp-config";
import deleteWhatsappConfigRoutes from "./routes/whatsapp/delete-whatsapp-config";
import addCreditsRoutes from "./routes/agents/add-credits";
import deleteAgentRoutes from "./routes/agents/delete-agent";
import getConversationsRoutes from "./routes/conversations/get-conversations";
import getConversationMessagesRoutes from "./routes/conversations/get-conversation-messages";
import markMessagesReadRoutes from "./routes/conversations/mark-messages-read";
import getBotContextRoutes from "./routes/bot/get-bot-context";
import chatbotReplyRoutes from "./routes/bot/chatbot-reply";
import manageServicesRoutes from "./routes/services/manage-services";
import manageInventoryRoutes from "./routes/inventory/manage-inventory";
import manageCustomersRoutes from "./routes/customers/manage-customers";
import getWhatsappProfilePicRoutes from "./routes/whatsapp/get-whatsapp-profile-pic";
import uploadServiceImagesRoutes from "./routes/services/upload-service-images";
import setupWhatsappConfigRoutes from "./routes/whatsapp/setup-whatsapp-config";
import getInvoiceTemplateRoutes from "./routes/invoices/get-invoice-template";
import uploadInvoiceRoutes from "./routes/invoices/upload-invoice";
import updateAgentRoutes from "./routes/agents/update-agent";
import sendInvoiceTemplateRoutes from "./routes/invoices/send-invoice-template";
import manageInvoicesRoutes from "./routes/invoices/manage-invoices";
import getUsersRoutes from "./routes/users/get-users";
import addUserRoutes from "./routes/users/add-user";
import updateUserRoutes from "./routes/users/update-user";
import deleteUserRoutes from "./routes/users/delete-user";
import updatePasswordRoutes from "./routes/users/update-password";
import manageOrdersRoutes from "./routes/orders/manage-orders";
import manageAppointmentsRoutes from "./routes/appointments/manage-appointments";
import manageTemplatesRoutes from "./routes/templates/manage-templates";
import getAgentProfileRoutes from "./routes/agents/get-agent-profile";
import updateAgentDetailsRoutes from "./routes/agents/update-agent-details";
import updateAgentTemplatePathRoutes from "./routes/agents/update-agent-template-path";
import uploadInvoiceTemplateRoutes from "./routes/upload-invoice-template";
import getAdminInfoRoutes from "./routes/admin/get-admin-info";
import getAnalyticsRoutes from "./routes/analytics/get-analytics";
import getDashboardDataRoutes from "./routes/dashboard/get-dashboard-data";
import loginRoutes from "./routes/auth/login";
import logoutRoutes from "./routes/auth/logout";
import getCurrentUserRoutes from "./routes/auth/get-current-user";
import fastifySocketIO from "fastify-socket.io";

const server = fastify();

// Register CORS plugin
server.register(fastifyCors, {
  origin: true, // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Register multipart plugin
server.register(fastifyMultipart);

// Register Socket.IO plugin
server.register(fastifySocketIO, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Environment variables
const DATABASE_URL = process.env.DATABASE_URL ?? "";
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper function
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// PostgreSQL client
const pgClient = new Pool({
  connectionString: DATABASE_URL,
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
  await whatsappWebhookRoutes(
    server,
    pgClient,
    cacheService,
    emitNewMessage,
    emitAgentStatusUpdate
  );
  await sendWhatsappMessageRoutes(server, pgClient, cacheService);
  await getMediaPreviewRoutes(server, pgClient);
  await uploadInventoryImagesRoutes(server, pgClient);
  await uploadMediaRoutes(server, pgClient);
  await authenticatedMessagesStreamRoutes(server, pgClient);
  await addAgentRoutes(server, pgClient);
  await getAgentsRoutes(server, pgClient);
  await getWhatsappConfigRoutes(server, pgClient);
  await updateWhatsappConfigRoutes(server, pgClient);
  await deleteWhatsappConfigRoutes(server, pgClient);
  await addCreditsRoutes(server, pgClient, emitAgentStatusUpdate);
  await deleteAgentRoutes(server, pgClient);
  await getConversationsRoutes(server, pgClient, cacheService);
  await getConversationMessagesRoutes(server, pgClient, cacheService);
  await markMessagesReadRoutes(server, pgClient, cacheService);
  await getBotContextRoutes(server, pgClient, cacheService);
  await chatbotReplyRoutes(server, pgClient);
  await manageServicesRoutes(server, pgClient);
  await manageInventoryRoutes(server, pgClient);
  await manageCustomersRoutes(server, pgClient);
  await getWhatsappProfilePicRoutes(server, pgClient);
  await uploadServiceImagesRoutes(server, pgClient);
  await setupWhatsappConfigRoutes(server, pgClient);
  await getInvoiceTemplateRoutes(server, pgClient, cacheService);
  await updateAgentRoutes(server, pgClient);
  await sendInvoiceTemplateRoutes(server, pgClient);
  await manageInvoicesRoutes(server, pgClient);
  await getUsersRoutes(server, pgClient);
  await addUserRoutes(server, pgClient);
  await updateUserRoutes(server, pgClient);
  await deleteUserRoutes(server, pgClient);
  await updatePasswordRoutes(server, pgClient);
  await manageOrdersRoutes(server, pgClient);
  await manageAppointmentsRoutes(server, pgClient);
  await manageTemplatesRoutes(server, pgClient);
  await getAgentProfileRoutes(server, pgClient);
  await updateAgentDetailsRoutes(server, pgClient);
  await updateAgentTemplatePathRoutes(server, pgClient);
  await uploadInvoiceTemplateRoutes(server, pgClient);
  await getAdminInfoRoutes(server, pgClient);
  await getAnalyticsRoutes(server, pgClient);
  await getDashboardDataRoutes(server, pgClient);
  await loginRoutes(server, pgClient);
  await logoutRoutes(server, pgClient);
  await getCurrentUserRoutes(server, pgClient);
}

// Socket.IO connection handling will be set up after routes are registered

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
    // Wait for DB connection check
    await pgClient.query("SELECT 1");
    console.log("✅ Connected to PostgreSQL");
    await registerRoutes();

    // Set up Socket.IO connection handling after routes are registered
    server.ready().then(() => {
      (server as any).io.on("connection", (socket: any) => {
        // console.log("Client connected:", socket.id);

        socket.on("join-agent-room", (data: any) => {
          const { agentId, token } = data;
          if (agentId && token) {
            // Verify JWT token
            // For now, just join the room - proper auth will be added
            socket.join(`agent-${agentId}`);
            // console.log(
            //   `Socket ${socket.id} joined agent room: agent-${agentId}`
            // );
          }
        });

        socket.on("disconnect", (reason: any) => {
          // console.log("Client disconnected:", socket.id, "reason:", reason);
        });
      });
    });

    await server.listen({ port: 8080, host: "0.0.0.0" });
    console.log("Server running on http://localhost:8080");
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err);
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
