import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { CacheService } from '../../utils/cache.js';

export default async function getBotContextRoutes(fastify: FastifyInstance, pgClient: any, cacheService: CacheService) {
  fastify.get('/bot-context/:customerId', async (request, reply) => {
    try {
      // Verify JWT and get user
      const user = await verifyJWT(request, pgClient);

      const params = request.params as any;
      const customerId = params.customerId;
      const query = request.query as any;
      const agentId = query.agentId;

      if (!customerId || !agentId) {
        return reply.code(400).send("Customer ID and Agent ID required");
      }

      // Verify agent ownership
      const agentQuery = "SELECT agent_prefix, id FROM agents WHERE id = $1 AND user_id = $2";
      const { rows: agentRows } = await pgClient.query(agentQuery, [parseInt(agentId), user.id]);

      if (agentRows.length === 0) {
        return reply.code(403).send("Agent not found or access denied");
      }

      const agentData = agentRows[0];

      // Verify customer belongs to agent
      const customersTable = `${agentData.agent_prefix}_customers`;
      const customerQuery = `
        SELECT id, ai_enabled, lead_stage, interest_stage, conversion_stage
        FROM ${customersTable}
        WHERE id = $1 AND agent_id = $2
      `;
      const { rows: customerRows } = await pgClient.query(customerQuery, [parseInt(customerId), parseInt(agentId)]);

      if (customerRows.length === 0) {
        return reply.code(404).send("Customer not found");
      }

      const customer = customerRows[0];

      const cacheKey = CacheService.botContextKey(
        parseInt(agentId),
        parseInt(customerId)
      );

      // Check cache first
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Cache miss - fetch from DB
      const botContext = {
        aiEnabled: customer.ai_enabled || false,
        leadStage: customer.lead_stage,
        interestStage: customer.interest_stage,
        conversionStage: customer.conversion_stage,
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