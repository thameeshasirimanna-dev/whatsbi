import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { CacheService } from '../../utils/cache.js';

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

      // Verify agent ownership (support sub-users)
      const agentQuery =
        "SELECT agent_prefix, id, user_id FROM agents WHERE id = $1 AND (user_id = $2 OR id = (SELECT agent_id FROM users WHERE id = $2))";
      const agentResult = await pgClient.query(agentQuery, [
        parseInt(agentId),
        user.id,
      ]);

      if (agentResult.rows.length === 0) {
        return reply.code(403).send("Agent not found or access denied");
      }

      const agentData = agentResult.rows[0];

      const customersTable = `${agentData.agent_prefix}_customers`;
      const messagesTable = `${agentData.agent_prefix}_messages`;

      // Get customers with their last message and unread counts in a single database query
      const queryStr = `
        SELECT 
          c.id, 
          c.name, 
          c.phone, 
          c.last_user_message_time, 
          c.ai_enabled, 
          c.lead_stage, 
          c.interest_stage, 
          c.conversion_stage, 
          c.created_at,
          m.message AS last_message,
          m.direction AS last_message_direction,
          m.timestamp AS last_message_timestamp,
          m.media_type AS last_message_media_type,
          m.media_url AS last_message_media_url,
          m.caption AS last_message_caption,
          COALESCE(u.unread_count, 0)::integer AS unread_count
        FROM ${customersTable} c
        LEFT JOIN LATERAL (
          SELECT message, direction, timestamp, media_type, media_url, caption
          FROM ${messagesTable}
          WHERE customer_id = c.id
          ORDER BY timestamp DESC
          LIMIT 1
        ) m ON true
        LEFT JOIN (
          SELECT customer_id, COUNT(*)::integer AS unread_count
          FROM ${messagesTable}
          WHERE direction = 'inbound' AND is_read = false
          GROUP BY customer_id
        ) u ON u.customer_id = c.id
        WHERE c.agent_id = $1
      `;
      
      const { rows } = await pgClient.query(queryStr, [parseInt(agentId)]);

      const conversations = rows.map((row: any) => {
        const lastMessageText = row.last_message !== null
          ? processMessageText(
              row.last_message,
              row.last_message_media_type,
              row.last_message_caption
            )
          : "No messages yet";
          
        const lastMessageTime = row.last_message_timestamp
          ? new Date(row.last_message_timestamp).toISOString()
          : (row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString());

        const rawLastTimestamp = row.last_message_timestamp
          ? new Date(row.last_message_timestamp).getTime()
          : (row.created_at ? new Date(row.created_at).getTime() : new Date().getTime());

        return {
          id: row.id,
          customerId: row.id,
          customerName: row.name,
          customerPhone: row.phone,
          lastUserMessageTime: row.last_user_message_time ? new Date(row.last_user_message_time).toISOString() : null,
          aiEnabled: row.ai_enabled || false,
          leadStage: row.lead_stage,
          interestStage: row.interest_stage,
          conversionStage: row.conversion_stage,
          lastMessage: lastMessageText,
          lastMessageTime,
          rawLastTimestamp,
          unreadCount: row.unread_count || 0,
        };
      });

      // Sort conversations by last message time
      conversations.sort((a: any, b: any) => b.rawLastTimestamp - a.rawLastTimestamp);

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