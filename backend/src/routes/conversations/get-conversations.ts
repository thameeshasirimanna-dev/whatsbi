import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';
import { CacheService } from '../../utils/cache';

export default async function getConversationsRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  cacheService: CacheService
) {
  fastify.get("/conversations", async (request, reply) => {
    try {
      // Verify JWT and get user
      const user = await verifyJWT(request, pgClient);

      const query = request.query as any;
      const agentId = query.agentId;

      if (!agentId) {
        return reply.code(400).send("Agent ID required");
      }

      // Verify agent ownership
      const agentQuery =
        "SELECT agent_prefix, id FROM agents WHERE id = $1 AND user_id = $2";
      const agentResult = await pgClient.query(agentQuery, [
        parseInt(agentId),
        user.id,
      ]);

      if (agentResult.rows.length === 0) {
        return reply.code(403).send("Agent not found or access denied");
      }

      const agentData = agentResult.rows[0];

      const cacheKey = CacheService.chatListKey(parseInt(agentId));

      // Check cache first
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Cache miss - fetch from DB

      const customersTable = `${agentData.agent_prefix}_customers`;
      const messagesTable = `${agentData.agent_prefix}_messages`;

      // Get customers
      const customersQuery = `
        SELECT id, name, phone, last_user_message_time, ai_enabled, lead_stage, interest_stage, conversion_stage, created_at
        FROM ${customersTable}
        WHERE agent_id = $1
      `;
      const customersResult = await pgClient.query(customersQuery, [
        parseInt(agentId),
      ]);
      const customers = customersResult.rows;

      if (customers.length === 0) {
        const emptyResult: any[] = [];
        await cacheService.set(cacheKey, JSON.stringify(emptyResult), 30); // 30s TTL
        return emptyResult;
      }

      // Get last message for each customer
      const customerIds = customers.map((c: any) => c.id);
      const placeholders = customerIds
        .map((_: any, i: number) => `$${i + 1}`)
        .join(",");
      const messagesQuery = `
        SELECT id, customer_id, message, direction, timestamp, is_read, media_type, media_url, caption
        FROM ${messagesTable}
        WHERE customer_id IN (${placeholders})
        ORDER BY timestamp DESC
      `;
      const messagesResult = await pgClient.query(messagesQuery, customerIds);
      const messages = messagesResult.rows;

      // Group messages by customer and create conversations
      const conversationsMap: { [key: number]: any } = {};

      customers.forEach((customer: any) => {
        const customerMessages =
          messages?.filter((msg: any) => msg.customer_id === customer.id) || [];
        const lastMessage = customerMessages[0]; // Already ordered by timestamp desc

        const unreadCount = customerMessages.filter(
          (msg: any) => msg.direction === "inbound" && !msg.is_read
        ).length;

        const lastMessageText = lastMessage
          ? processMessageText(
              lastMessage.message,
              lastMessage.media_type,
              lastMessage.caption
            )
          : "No messages yet";
        const lastMessageTime = lastMessage
          ? new Date(lastMessage.timestamp).toLocaleString([], {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            })
          : new Date(customer.created_at).toLocaleString([], {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            });

        const rawLastTimestamp = lastMessage
          ? new Date(lastMessage.timestamp).getTime()
          : new Date(customer.created_at).getTime();

        conversationsMap[customer.id] = {
          id: customer.id,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          lastUserMessageTime: customer.last_user_message_time || null,
          aiEnabled: customer.ai_enabled || false,
          leadStage: customer.lead_stage,
          interestStage: customer.interest_stage,
          conversionStage: customer.conversion_stage,
          lastMessage: lastMessageText,
          lastMessageTime,
          rawLastTimestamp,
          unreadCount,
        };
      });

      // Sort conversations by last message time
      const conversations = Object.values(conversationsMap).sort(
        (a: any, b: any) => b.rawLastTimestamp - a.rawLastTimestamp
      );

      // Cache the result
      await cacheService.set(cacheKey, JSON.stringify(conversations), 30); // 30s TTL

      return conversations;
    } catch (error: any) {
      console.error("Get conversations error:", error);
      return reply.code(500).send("Internal Server Error");
    }
  });
}

function processMessageText(rawText: string | undefined | null, mediaType: string | null, caption: string | null): string {
  const text = (rawText || '').trim();
  if (text) {
    try {
      JSON.parse(text);
      return '[TEMPLATE]';
    } catch (e) {
      return text;
    }
  }
  if (mediaType && mediaType !== 'none') {
    return caption || `[${mediaType.toUpperCase()}]`;
  }
  return 'No message content';
}