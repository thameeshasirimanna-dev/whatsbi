import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function addCreditsRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  emitAgentStatusUpdate: (agentId: number, statusData: any) => void
) {
  fastify.post("/add-credits", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Check if user is admin
      if (authenticatedUser.role !== 'admin') {
        return reply.code(403).send({
          error: "Access denied. Admin role required.",
        });
      }

      const { agent_id, amount } = request.body as any;

      // Validate input
      if (!agent_id || !amount || amount <= 0) {
        return reply.code(400).send({
          error: "Invalid input: agent_id and positive amount required",
        });
      }

      // Update credits directly
      const updateQuery = "UPDATE agents SET credits = credits + $1 WHERE id = $2 RETURNING credits";
      const { rows: updateRows } = await pgClient.query(updateQuery, [
        parseFloat(amount),
        parseInt(agent_id)
      ]);

      if (updateRows.length === 0) {
        return reply.code(404).send({
          error: "Agent not found",
        });
      }

      const newCredits = parseFloat(updateRows[0].credits);

      // Emit agent status update
      emitAgentStatusUpdate(agent_id, {
        type: "credits_updated",
        credits: newCredits,
      });

      return reply.code(200).send({
        message: "Credits added successfully",
        credits: newCredits,
      });
    } catch (error) {
      console.error(error);
      return reply.code(400).send({
        error: (error as Error).message,
      });
    }
  });
}