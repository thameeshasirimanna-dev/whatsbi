import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function updateAgentDetailsRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.patch('/update-agent-details', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;

      // Validate required fields
      if (!body.agent_id) {
        return reply.code(400).send({
          success: false,
          message: "agent_id is required",
        });
      }

      const agentId = parseInt(body.agent_id);
      const userUpdates = body.user_updates || {};
      const agentUpdates = body.agent_updates || {};

      // Start transaction
      await pgClient.query('BEGIN');

      try {
        // Update users table if user_updates provided
        if (Object.keys(userUpdates).length > 0) {
          const userFields = Object.keys(userUpdates);
          const userValues = Object.values(userUpdates);
          const userSetClause = userFields.map((field, index) => `${field} = $${index + 1}`).join(', ');

          const userQuery = `UPDATE users SET ${userSetClause} WHERE id = $${userFields.length + 1}`;
          await pgClient.query(userQuery, [...userValues, authenticatedUser.id]);
        }

        // Update agents table if agent_updates provided
        if (Object.keys(agentUpdates).length > 0) {
          const agentFields = Object.keys(agentUpdates);
          const agentValues = Object.values(agentUpdates);
          const agentSetClause = agentFields.map((field, index) => `${field} = $${index + 1}`).join(', ');

          const agentQuery = `UPDATE agents SET ${agentSetClause} WHERE id = $${agentFields.length + 1} AND user_id = $${agentFields.length + 2}`;
          await pgClient.query(agentQuery, [...agentValues, agentId, authenticatedUser.id]);
        }

        await pgClient.query('COMMIT');

        return reply.code(200).send({
          success: true,
          message: "Agent details updated successfully",
        });
      } catch (error) {
        await pgClient.query('ROLLBACK');
        throw error;
      }
    } catch (err) {
      console.error("Update agent details error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}