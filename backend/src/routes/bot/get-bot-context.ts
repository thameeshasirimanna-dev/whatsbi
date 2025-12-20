import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';
import { CacheService } from '../../utils/cache';

export default async function getBotContextRoutes(fastify: FastifyInstance, supabaseClient: any, cacheService: CacheService) {
  fastify.get('/bot-context/:customerId', async (request, reply) => {
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
        .select('id, ai_enabled, lead_stage, interest_stage, conversion_stage')
        .eq('id', parseInt(customerId))
        .eq('agent_id', parseInt(agentId))
        .single();

      if (customerError || !customer) {
        return reply.code(404).send('Customer not found');
      }

      const cacheKey = CacheService.botContextKey(parseInt(agentId), parseInt(customerId));

      // Check cache first
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        console.log('Returning cached bot context for customer', customerId);
        return JSON.parse(cachedData);
      }

      // Cache miss - fetch from DB
      console.log('Cache miss for bot context, fetching from DB for customer', customerId);

      // For now, bot context includes AI enabled status and stages
      // This can be extended to include conversation history summary or AI state
      const botContext = {
        aiEnabled: customer.ai_enabled || false,
        leadStage: customer.lead_stage,
        interestStage: customer.interest_stage,
        conversionStage: customer.conversion_stage,
        // Could add more AI context here like conversation summary, etc.
      };

      // Cache the result (5-10 min TTL, using 7.5 min average)
      await cacheService.set(cacheKey, JSON.stringify(botContext), 450); // 450s = 7.5 min

      return botContext;
    } catch (error: any) {
      console.error('Get bot context error:', error);
      return reply.code(500).send('Internal Server Error');
    }
  });
}