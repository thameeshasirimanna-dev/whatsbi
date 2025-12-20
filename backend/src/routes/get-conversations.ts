import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';
import { CacheService } from '../utils/cache';

export default async function getConversationsRoutes(fastify: FastifyInstance, supabaseClient: any, cacheService: CacheService) {
  fastify.get('/conversations', async (request, reply) => {
    try {
      // Verify JWT and get user
      const user = await verifyJWT(request, supabaseClient);

      const query = request.query as any;
      const agentId = query.agentId;

      if (!agentId) {
        return reply.code(400).send('Agent ID required');
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

      const cacheKey = CacheService.chatListKey(parseInt(agentId));

      // Check cache first
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        console.log('Returning cached chat list for agent', agentId);
        return JSON.parse(cachedData);
      }

      // Cache miss - fetch from DB
      console.log('Cache miss for chat list, fetching from DB for agent', agentId);

      const customersTable = `${agentData.agent_prefix}_customers`;
      const messagesTable = `${agentData.agent_prefix}_messages`;

      // Get customers
      const { data: customers, error: customersError } = await supabaseClient
        .from(customersTable)
        .select('id, name, phone, last_user_message_time, ai_enabled, lead_stage, interest_stage, conversion_stage, created_at')
        .eq('agent_id', parseInt(agentId));

      if (customersError) {
        return reply.code(500).send('Failed to fetch customers');
      }

      if (!customers || customers.length === 0) {
        const emptyResult: any[] = [];
        await cacheService.set(cacheKey, JSON.stringify(emptyResult), 30); // 30s TTL
        return emptyResult;
      }

      // Get last message for each customer
      const customerIds = customers.map((c: any) => c.id);
      const { data: messages, error: messagesError } = await supabaseClient
        .from(messagesTable)
        .select('id, customer_id, message, direction, timestamp, is_read, media_type, media_url, caption')
        .in('customer_id', customerIds)
        .order('timestamp', { ascending: false });

      if (messagesError) {
        return reply.code(500).send('Failed to fetch messages');
      }

      // Group messages by customer and create conversations
      const conversationsMap: { [key: number]: any } = {};

      customers.forEach((customer: any) => {
        const customerMessages = messages?.filter((msg: any) => msg.customer_id === customer.id) || [];
        const lastMessage = customerMessages[0]; // Already ordered by timestamp desc

        const unreadCount = customerMessages.filter((msg: any) => msg.direction === 'inbound' && !msg.is_read).length;

        const lastMessageText = lastMessage ? processMessageText(lastMessage.message, lastMessage.media_type, lastMessage.caption) : 'No messages yet';
        const lastMessageTime = lastMessage ? new Date(lastMessage.timestamp).toLocaleString([], {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'short',
        }) : new Date(customer.created_at).toLocaleString([], {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'short',
        });

        const rawLastTimestamp = lastMessage ? new Date(lastMessage.timestamp).getTime() : new Date(customer.created_at).getTime();

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
      const conversations = Object.values(conversationsMap).sort((a: any, b: any) => b.rawLastTimestamp - a.rawLastTimestamp);

      // Cache the result
      await cacheService.set(cacheKey, JSON.stringify(conversations), 30); // 30s TTL

      return conversations;
    } catch (error: any) {
      console.error('Get conversations error:', error);
      return reply.code(500).send('Internal Server Error');
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