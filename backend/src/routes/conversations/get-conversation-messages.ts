import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';
import { CacheService } from '../../utils/cache';

export default async function getConversationMessagesRoutes(fastify: FastifyInstance, supabaseClient: any, cacheService: CacheService) {
  fastify.get('/conversations/:customerId/messages', async (request, reply) => {
    try {
      // Verify JWT and get user
      const user = await verifyJWT(request, supabaseClient);

      const params = request.params as any;
      const customerId = params.customerId;
      const query = request.query as any;
      const agentId = query.agentId;

      if (!customerId || !agentId) {
        return reply.code(400).send('Customer ID and Agent ID required');
      }

      // Verify agent ownership
      const { data: agentData, error: agentError } = await supabaseClient
        .from('agents')
        .select('agent_prefix, id')
        .eq('id', parseInt(agentId))
        .eq('user_id', user.id)
        .single();

      if (agentError || !agentData) {
        return reply.code(403).send('Agent not found or access denied');
      }

      // Verify customer belongs to agent
      const customersTable = `${agentData.agent_prefix}_customers`;
      const { data: customer, error: customerError } = await supabaseClient
        .from(customersTable)
        .select('id, name, phone, last_user_message_time, ai_enabled, lead_stage, interest_stage, conversion_stage')
        .eq('id', parseInt(customerId))
        .eq('agent_id', parseInt(agentId))
        .single();

      if (customerError || !customer) {
        return reply.code(404).send('Customer not found');
      }

      const cacheKey = CacheService.recentMessagesKey(parseInt(agentId), parseInt(customerId));

      // Check cache first
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        console.log('Returning cached messages for conversation', agentId, customerId);
        return JSON.parse(cachedData);
      }

      // Cache miss - fetch from DB
      console.log('Cache miss for messages, fetching from DB for conversation', agentId, customerId);

      const messagesTable = `${agentData.agent_prefix}_messages`;

      const { data: messagesData, error: messagesError } = await supabaseClient
        .from(messagesTable)
        .select('*')
        .eq('customer_id', parseInt(customerId))
        .order('timestamp', { ascending: true });

      if (messagesError) {
        return reply.code(500).send('Failed to fetch messages');
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