import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { CacheService } from '../../utils/cache.js';

export default async function markMessagesReadRoutes(fastify: FastifyInstance, pgClient: any, cacheService: CacheService) {
  fastify.post(
    "/conversations/:customerId/mark-read",
    async (request, reply) => {
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

        // Verify customer belongs to agent
        const customersTable = `${agentData.agent_prefix}_customers`;
        const customerQuery = `
        SELECT id
        FROM ${customersTable}
        WHERE id = $1 AND agent_id = $2
      `;
        const customerResult = await pgClient.query(customerQuery, [
          parseInt(customerId),
          parseInt(agentId),
        ]);

        if (customerResult.rows.length === 0) {
          return reply.code(404).send("Customer not found");
        }

        const messagesTable = `${agentData.agent_prefix}_messages`;

        // Check current unread messages before update
        const checkQuery = `
        SELECT COUNT(*) as unread_count
        FROM ${messagesTable}
        WHERE customer_id = $1 AND direction = 'inbound' AND is_read IS NOT true
      `;
        const checkResult = await pgClient.query(checkQuery, [
          parseInt(customerId),
        ]);

        // Mark all unread inbound messages as read
        const updateQuery = `
        UPDATE ${messagesTable}
        SET is_read = true
        WHERE customer_id = $1 AND direction = 'inbound' AND is_read IS NOT true
      `;
        const updateResult = await pgClient.query(updateQuery, [
          parseInt(customerId),
        ]);

        // Verify update
        const verifyQuery = `
        SELECT COUNT(*) as unread_count
        FROM ${messagesTable}
        WHERE customer_id = $1 AND direction = 'inbound' AND is_read IS NOT true
      `;
        const verifyResult = await pgClient.query(verifyQuery, [
          parseInt(customerId),
        ]);

        // Invalidate cache for conversations and messages
        await cacheService.invalidateChatList(parseInt(agentId));
        await cacheService.invalidateRecentMessages(
          parseInt(agentId),
          parseInt(customerId)
        );

        return reply.send({
          success: true,
          messagesMarkedRead: updateResult.rowCount,
        });
      } catch (error: any) {
        console.error("Mark messages read error:", error);
        return reply.code(500).send("Internal Server Error");
      }
    }
  );
}