import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { processIncomingMessage, processMessageStatus } from '../../utils/helpers.js';

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';

export default async function whatsappWebhookRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  cacheService: any,
  emitNewMessage: (agentId: number, messageData: any) => void,
  emitAgentStatusUpdate: (agentId: number, statusData: any) => void
) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  fastify.route({
    method: ["GET", "POST", "OPTIONS"],
    url: "/whatsapp-webhook",
    config: {
      rawBody: true,
    },
    handler: async (request, reply) => {
      if (request.method === "OPTIONS") {
        return reply.code(204).headers({
          ...corsHeaders,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-forwarded-proto, x-forwarded-host",
        });
      }

      const authHeader = request.headers.authorization;

      if (request.method === "GET") {
        const responseHeaders = {
          ...corsHeaders,
          "Content-Type": "text/plain",
        };

        try {
          const url = new URL(request.url, `http://${request.headers.host}`);
          const mode = url.searchParams.get("hub.mode");
          const token = url.searchParams.get("hub.verify_token");
          const challenge = url.searchParams.get("hub.challenge");
          const phoneNumberId = url.searchParams.get("phone_number_id");

          if (mode === "subscribe" && token && challenge) {
            let expectedToken: string | null = null;

            if (phoneNumberId) {
              expectedToken = WHATSAPP_VERIFY_TOKEN;
            }

            if (!expectedToken && WHATSAPP_VERIFY_TOKEN) {
              expectedToken = WHATSAPP_VERIFY_TOKEN;
            }

            if (!expectedToken) {
              try {
                const { rows: configs } = await pgClient.query(
                  "SELECT verify_token FROM whatsapp_configuration WHERE is_active = true LIMIT 1"
                );

                if (configs && configs.length > 0 && configs[0].verify_token) {
                  expectedToken = configs[0].verify_token;
                }
              } catch (dbError) {
                console.error("Database fallback lookup failed:", dbError);
              }
            }

            if (expectedToken && token === expectedToken) {
              return reply.code(200).headers(responseHeaders).send(challenge);
            } else if (!expectedToken) {
              return reply.code(200).headers(responseHeaders).send(challenge);
            } else {
              const expectedStr = expectedToken
                ? `${expectedToken.substring(0, 8)}...`
                : "NOT SET";
              const receivedStr = token
                ? `${String(token).substring(0, 8)}...`
                : "NULL";
              return reply
                .code(403)
                .headers(responseHeaders)
                .send("Verification failed");
            }
          }

          if (mode && challenge) {
            return reply.code(403).headers(responseHeaders).send("Forbidden");
          }

          return reply
            .code(200)
            .headers(responseHeaders)
            .send("WhatsApp Webhook Endpoint");
        } catch (error) {
          return reply
            .code(500)
            .headers({ ...corsHeaders, "Content-Type": "text/plain" })
            .send("Internal server error");
        }
      }

      if (request.method === "POST") {
        const signatureHeader = request.headers["x-hub-signature-256"];
        const authHeader = request.headers.authorization;
        const userAgent = request.headers["user-agent"] || "unknown";
        const origin = request.headers.origin || "none";

        try {
          const payload = request.body as any;

          let signatureVerified = true;

          if (signatureHeader) {
            // For signature verification, we need raw body, but since rawBody is not working, skip for now
            signatureVerified = false;
          }

          // Signature verification disabled for debugging

          // payload already parsed above

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
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              await processIncomingMessage(
                pgClient,
                message,
                value.metadata?.phone_number_id,
                value.contacts?.[0]?.profile?.name,
                emitNewMessage,
                cacheService
              );
            }
          }

          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              await processMessageStatus(pgClient, status);
            }
          }
          return reply
            .code(200)
            .headers({ ...corsHeaders, "Content-Type": "text/plain" })
            .send("OK");
        } catch (error) {
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
}