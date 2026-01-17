import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { CacheService } from '../../utils/cache.js';

export default async function getConversationMessagesRoutes(fastify: FastifyInstance, pgClient: any, cacheService: CacheService) {
  fastify.get('/conversations/:customerId/messages', async (request, reply) => {
    try {
      // Verify JWT and get user
      const user = await verifyJWT(request, pgClient);

      const params = request.params as any;
      const customerId = params.customerId;
      const query = request.query as any;
      const agentId = query.agentId;
      const limit = parseInt(query.limit) || null; // Default to null for backward compatibility
      const offset = parseInt(query.offset) || 0;

      if (!customerId || !agentId) {
        return reply.code(400).send('Customer ID and Agent ID required');
      }

      // Verify agent ownership
      const agentQuery = 'SELECT agent_prefix, id FROM agents WHERE id = $1 AND user_id = $2';
      const agentResult = await pgClient.query(agentQuery, [parseInt(agentId), user.id]);

      if (agentResult.rows.length === 0) {
        return reply.code(403).send('Agent not found or access denied');
      }

      const agentData = agentResult.rows[0];

      // Verify customer belongs to agent
      const customersTable = `${agentData.agent_prefix}_customers`;
      const customerQuery = `
        SELECT id, name, phone, last_user_message_time, ai_enabled, lead_stage, interest_stage, conversion_stage
        FROM ${customersTable}
        WHERE id = $1 AND agent_id = $2
      `;
      const customerResult = await pgClient.query(customerQuery, [parseInt(customerId), parseInt(agentId)]);

      if (customerResult.rows.length === 0) {
        return reply.code(404).send('Customer not found');
      }

      const customer = customerResult.rows[0];

      const cacheKey = limit
        ? CacheService.recentMessagesKey(parseInt(agentId), parseInt(customerId), limit, offset)
        : CacheService.recentMessagesKey(parseInt(agentId), parseInt(customerId));

      // Check cache first
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        // console.log('Returning cached messages for conversation', agentId, customerId, limit, offset);
        return JSON.parse(cachedData);
      }

      // Cache miss - fetch from DB
      const messagesTable = `${agentData.agent_prefix}_messages`;

      let messagesQuery: string;
      let queryParams: any[];

      if (limit) {
        // For pagination: get messages in descending order (newest first), then we'll reverse in processing
        messagesQuery = `
          SELECT *
          FROM ${messagesTable}
          WHERE customer_id = $1
          ORDER BY timestamp DESC
          LIMIT $2 OFFSET $3
        `;
        queryParams = [parseInt(customerId), limit, offset];
      } else {
        // Backward compatibility: get all messages in ascending order
        messagesQuery = `
          SELECT *
          FROM ${messagesTable}
          WHERE customer_id = $1
          ORDER BY timestamp ASC
        `;
        queryParams = [parseInt(customerId)];
      }

      const messagesResult = await pgClient.query(messagesQuery, queryParams);
      let messagesData = messagesResult.rows;

      // If using pagination, reverse to get ascending order (oldest first)
      if (limit) {
        messagesData = messagesData.reverse();
      }

      const processedMessages = messagesData.map((msg: any) => ({
        id: msg.id,
        text: processMessageText(msg.message, msg.direction, msg.media_type, msg.caption),
        sender: msg.direction === 'inbound' ? 'customer' : 'agent',
        timestamp: new Date(msg.timestamp).toLocaleString([], {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'short',
        }),
        rawTimestamp: new Date(msg.timestamp).getTime(),
        isRead: msg.is_read ?? msg.direction === 'outbound',
        media_type: msg.media_type || 'none',
        media_url: msg.media_url || null,
        caption: msg.caption || null,
      }));

      // Cache the result
      await cacheService.set(cacheKey, JSON.stringify(processedMessages), 60); // 60s TTL

      return processedMessages;
    } catch (error: any) {
      console.error('Get conversation messages error:', error);
      return reply.code(500).send('Internal Server Error');
    }
  });
}

function processMessageText(rawText: string | undefined | null, direction: string, mediaType: string | null, caption: string | null): string {
  const text = (rawText || '').trim();
  if (text && direction === 'outbound') {
    try {
      JSON.parse(text);
      return '[TEMPLATE]';
    } catch (e) {
      // Not template
    }
  }
  if (text) return text;
  if (mediaType && mediaType !== 'none') {
    return caption || `[${mediaType.toUpperCase()}]`;
  }
  return 'No message content';
}