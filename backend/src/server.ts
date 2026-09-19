import { config } from "dotenv";
config({ path: "../.env" });

// Pick env-specific vars based on NODE_ENV
const _envPrefix = process.env.NODE_ENV === "production" ? "PROD_" : "DEV_";
const _pick = (key: string) => process.env[`${_envPrefix}${key}`] ?? process.env[key] ?? "";
import fastify from "fastify";
import { Pool } from "pg";
import Redis from "ioredis";
import crypto from "crypto";
import { CacheService } from "./utils/cache.js";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import whatsappWebhookRoutes from "./routes/whatsapp/whatsapp-webhook.js";
import sendWhatsappMessageRoutes from "./routes/whatsapp/send-whatsapp-message.js";
import getMediaPreviewRoutes from "./routes/media/get-media-preview.js";
import uploadInventoryImagesRoutes from "./routes/inventory/upload-inventory-images.js";
import uploadMediaRoutes from "./routes/media/upload-media.js";
import addAgentRoutes from "./routes/agents/add-agent.js";
import { verifySocketToken } from "./utils/helpers.js";
import getAgentsRoutes from "./routes/agents/get-agents.js";
import getWhatsappConfigRoutes from "./routes/whatsapp/get-whatsapp-config.js";
import updateWhatsappConfigRoutes from "./routes/whatsapp/update-whatsapp-config.js";
import deleteWhatsappConfigRoutes from "./routes/whatsapp/delete-whatsapp-config.js";
import addCreditsRoutes from "./routes/agents/add-credits.js";
import deleteAgentRoutes from "./routes/agents/delete-agent.js";
import getConversationsRoutes from "./routes/conversations/get-conversations.js";
import getConversationMessagesRoutes from "./routes/conversations/get-conversation-messages.js";
import markMessagesReadRoutes from "./routes/conversations/mark-messages-read.js";
import getBotContextRoutes from "./routes/bot/get-bot-context.js";
import chatbotReplyRoutes from "./routes/bot/chatbot-reply.js";
import triggerAiResponseRoutes from "./routes/bot/trigger-ai-response.js";
import manageServicesRoutes from "./routes/services/manage-services.js";
import manageInventoryRoutes from "./routes/inventory/manage-inventory.js";
import manageCustomersRoutes from "./routes/customers/manage-customers.js";
import manageCustomerGroupsRoutes from "./routes/customers/manage-customer-groups.js";
import getWhatsappProfilePicRoutes from "./routes/whatsapp/get-whatsapp-profile-pic.js";
import uploadServiceImagesRoutes from "./routes/services/upload-service-images.js";
import setupWhatsappConfigRoutes from "./routes/whatsapp/setup-whatsapp-config.js";
import getInvoiceTemplateRoutes from "./routes/invoices/get-invoice-template.js";
import uploadInvoiceRoutes from "./routes/invoices/upload-invoice.js";
import downloadInvoiceRoutes from "./routes/invoices/download-invoice.js";
import updateAgentRoutes from "./routes/agents/update-agent.js";
import sendInvoiceTemplateRoutes from "./routes/invoices/send-invoice-template.js";
import manageInvoicesRoutes from "./routes/invoices/manage-invoices.js";
import getUsersRoutes from "./routes/users/get-users.js";
import addUserRoutes from "./routes/users/add-user.js";
import updateUserRoutes from "./routes/users/update-user.js";
import deleteUserRoutes from "./routes/users/delete-user.js";
import updatePasswordRoutes from "./routes/users/update-password.js";
import manageAgentUsersRoutes from "./routes/users/manage-agent-users.js";
import manageOrdersRoutes from "./routes/orders/manage-orders.js";
import manageAppointmentsRoutes from "./routes/appointments/manage-appointments.js";
import manageTemplatesRoutes from "./routes/templates/manage-templates.js";
import getAgentProfileRoutes from "./routes/agents/get-agent-profile.js";
import updateAgentDetailsRoutes from "./routes/agents/update-agent-details.js";
import updateAgentTemplatePathRoutes from "./routes/agents/update-agent-template-path.js";
import uploadInvoiceTemplateRoutes from "./routes/upload-invoice-template.js";
import companyOverviewRoutes from "./routes/agents/company-overview.js";
import getAdminInfoRoutes from "./routes/admin/get-admin-info.js";
import getAnalyticsRoutes from "./routes/analytics/get-analytics.js";
import getDashboardDataRoutes from "./routes/dashboard/get-dashboard-data.js";
import loginRoutes from "./routes/auth/login.js";
import logoutRoutes from "./routes/auth/logout.js";
import getCurrentUserRoutes from "./routes/auth/get-current-user.js";
import manageBroadcastsRoutes from "./routes/conversations/manage-broadcasts.js";
import maintenanceRoutes, { getCachedMaintenanceSettings } from "./routes/admin/maintenance.js";
import systemAnalyticsRoutes from "./routes/admin/system-analytics.js";
import fastifySocketIO from "fastify-socket.io";

const server = fastify();

// Maintenance mode interceptor hook
server.addHook("preHandler", async (request, reply) => {
  const maintenance = getCachedMaintenanceSettings();
  if (!maintenance.maintenance_mode) return;

  const url = request.url.split("?")[0];

  // Whitelist: public status, health, auth, admin management, webhooks
  const isWhitelisted =
    url === "/maintenance-status" ||
    url === "/health" ||
    url === "/login" ||
    url === "/logout" ||
    url === "/get-current-user" ||
    url === "/get-admin-info" ||
    url.startsWith("/admin/") ||
    url === "/whatsapp-webhook";

  if (isWhitelisted) return;

  // If request is for an agent-facing route and maintenance is on, return 503
  return reply.code(503).send({
    success: false,
    maintenance: true,
    title: maintenance.maintenance_title,
    message: maintenance.maintenance_message,
    estimated_end: maintenance.estimated_end,
  });
});

// Register CORS plugin
server.register(fastifyCors, {
  origin: true, // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Register multipart plugin
server.register(fastifyMultipart, {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Register Socket.IO plugin
server.register(fastifySocketIO, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Environment variables
const DATABASE_URL = _pick("DATABASE_URL");
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
const REDIS_URL = _pick("REDIS_URL") || "redis://localhost:6379";

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
let isRedisLogged = false;
const redisClient = new Redis(REDIS_URL, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) {
      if (!isRedisLogged) {
        console.warn("⚠️ Redis unavailable at " + REDIS_URL + ", proceeding without cache.");
        isRedisLogged = true;
      }
      return 15000;
    }
    return 1000;
  },
  reconnectOnError: () => false,
});
redisClient.on("error", (err) => {
  if (isRedisLogged) return;
  console.warn(`⚠️ Redis connection issue: ${err.message}`);
  isRedisLogged = true;
});
redisClient.on("connect", () => {
  console.log("✅ Connected to Redis");
  isRedisLogged = false;
});

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
  await sendWhatsappMessageRoutes(server, pgClient, cacheService, emitNewMessage);
  await getMediaPreviewRoutes(server, pgClient);
  await uploadInventoryImagesRoutes(server, pgClient);
  await uploadMediaRoutes(server, pgClient);
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
  await chatbotReplyRoutes(server, pgClient, cacheService, emitNewMessage);
  await triggerAiResponseRoutes(server, pgClient, cacheService, emitNewMessage, emitAgentStatusUpdate);
  await manageServicesRoutes(server, pgClient);
  await manageInventoryRoutes(server, pgClient);
  await manageCustomersRoutes(server, pgClient, cacheService, emitAgentStatusUpdate);
  await manageCustomerGroupsRoutes(server, pgClient);
  await getWhatsappProfilePicRoutes(server, pgClient);
  await uploadServiceImagesRoutes(server, pgClient);
  await setupWhatsappConfigRoutes(server, pgClient);
  await getInvoiceTemplateRoutes(server, cacheService);
  await uploadInvoiceRoutes(server, pgClient);
  await downloadInvoiceRoutes(server, pgClient);
  await updateAgentRoutes(server, pgClient);
  await sendInvoiceTemplateRoutes(server, pgClient, cacheService, emitNewMessage);
  await manageInvoicesRoutes(server, pgClient, cacheService, emitNewMessage, emitAgentStatusUpdate);
  await getUsersRoutes(server, pgClient);
  await addUserRoutes(server, pgClient);
  await updateUserRoutes(server, pgClient);
  await deleteUserRoutes(server, pgClient);
  await updatePasswordRoutes(server, pgClient);
  await manageAgentUsersRoutes(server, pgClient);
  await manageOrdersRoutes(server, pgClient, cacheService, emitAgentStatusUpdate);
  await manageAppointmentsRoutes(server, pgClient);
  await manageTemplatesRoutes(server, pgClient);
  await getAgentProfileRoutes(server, pgClient);
  await updateAgentDetailsRoutes(server, pgClient);
  await updateAgentTemplatePathRoutes(server, pgClient);
  await uploadInvoiceTemplateRoutes(server, pgClient);
  await companyOverviewRoutes(server, pgClient);
  await getAdminInfoRoutes(server, pgClient);
  await getAnalyticsRoutes(server, pgClient);
  await getDashboardDataRoutes(server, pgClient);
  await loginRoutes(server, pgClient);
  await logoutRoutes(server, pgClient);
  await getCurrentUserRoutes(server, pgClient);
  await manageBroadcastsRoutes(server, pgClient, cacheService, emitNewMessage);
  await maintenanceRoutes(server, pgClient, cacheService);
  await systemAnalyticsRoutes(server, pgClient);
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

    // Ensure whatsapp_message_logs exists
    try {
      await pgClient.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
          id BIGSERIAL PRIMARY KEY,
          user_id UUID,
          agent_id BIGINT,
          customer_phone VARCHAR(20) NOT NULL,
          message_type VARCHAR(50) NOT NULL,
          category VARCHAR(50) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) NOT NULL,
          whatsapp_message_id VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_user_timestamp ON whatsapp_message_logs (user_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_customer ON whatsapp_message_logs (customer_phone);
      `);
    } catch (tblErr: any) {
      console.warn("Notice: could not initialize whatsapp_message_logs table:", tblErr.message);
    }

    // Ensure whatsapp_configuration has deepseek_api_key and nullable webhook_url
    try {
      await pgClient.query(`
        ALTER TABLE whatsapp_configuration ADD COLUMN IF NOT EXISTS deepseek_api_key TEXT;
        ALTER TABLE whatsapp_configuration ALTER COLUMN webhook_url DROP NOT NULL;
      `);
      console.log("✅ whatsapp_configuration schema verified (deepseek_api_key ready)");
    } catch (schemaErr: any) {
      console.warn("Notice: could not update whatsapp_configuration columns:", schemaErr.message);
    }

    // Ensure agents table has ai_balance column for DeepSeek AI
    try {
      await pgClient.query(`
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS ai_balance NUMERIC(14, 6) DEFAULT 4.000000;
        UPDATE agents SET ai_balance = 4.000000 WHERE ai_balance IS NULL;
      `);
      console.log("✅ agents schema verified (ai_balance ready)");
    } catch (agentSchemaErr: any) {
      console.warn("Notice: could not update agents ai_balance column:", agentSchemaErr.message);
    }

    // Ensure users table has last_login_at column
    try {
      await pgClient.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
      `);
      console.log("✅ users schema verified (last_login_at ready)");
    } catch (userSchemaErr: any) {
      console.warn("Notice: could not update users last_login_at column:", userSchemaErr.message);
    }

    // Ensure system_settings table exists
    try {
      await pgClient.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id VARCHAR(50) PRIMARY KEY,
          maintenance_mode BOOLEAN DEFAULT FALSE,
          maintenance_title VARCHAR(255) DEFAULT 'System Maintenance Underway',
          maintenance_message TEXT DEFAULT 'We are currently performing scheduled maintenance to improve system stability. Services will resume shortly.',
          estimated_end VARCHAR(100),
          webhook_retry_mode BOOLEAN DEFAULT TRUE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_by UUID
        );
        INSERT INTO system_settings (id, maintenance_mode) 
        VALUES ('system', FALSE) 
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log("✅ system_settings schema verified");
    } catch (tblErr: any) {
      console.warn("Notice: could not initialize system_settings table:", tblErr.message);
    }

    await registerRoutes();

    // Set up Socket.IO connection handling after routes are registered
    server.ready().then(() => {
      (server as any).io.on("connection", (socket: any) => {
        socket.on("join-agent-room", async (data: any) => {
          const { agentId, token } = data;
          if (agentId && token) {
            const isValid = await verifySocketToken(token, parseInt(agentId), pgClient);
            if (isValid) {
              socket.join(`agent-${agentId}`);
            } else {
              socket.emit("error", { message: "Unauthorized agent room join request" });
            }
          } else {
            socket.emit("error", { message: "agentId and token are required" });
          }
        });

        socket.on("disconnect", (reason: any) => {
        });
      });
    });

    const PORT = parseInt(process.env.PORT || "8080", 10);
    await server.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${PORT}`);
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
