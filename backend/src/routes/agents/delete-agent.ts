import { FastifyInstance } from 'fastify';
import { verifyJWT } from "../../utils/helpers.js";

export default async function deleteAgentRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.post('/delete-agent', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Check if user is admin
      if (authenticatedUser.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

      const body = request.body as any;
      const { agent_id } = body;

      if (!agent_id) {
        return reply.code(400).send({
          success: false,
          message: "Agent ID is required",
        });
      }

      // 1️⃣ Get agent details including user_id and agent_prefix
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, user_id, agent_prefix FROM agents WHERE id = $1",
        [parseInt(agent_id)]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "Agent not found",
        });
      }

      const agent = agentRows[0];

      // 2️⃣ Drop dynamic per-agent tables using database function
      if (agent.agent_prefix) {
        const prefix = agent.agent_prefix.toLowerCase();
        try {
          await pgClient.query("SELECT drop_agent_tables($1)", [prefix]);
        } catch (rpcError) {
          console.error("Exception during table cleanup RPC:", rpcError);
          // Continue with other deletion steps - table cleanup is best-effort
        }
      }

      // 3️⃣ Get user details
      const { rows: userRows } = await pgClient.query(
        "SELECT id, email FROM users WHERE id = $1",
        [agent.user_id]
      );

      // 4️⃣ Delete agent first
      const { rowCount: agentDeleted } = await pgClient.query(
        "DELETE FROM agents WHERE id = $1",
        [parseInt(agent_id)]
      );

      if (agentDeleted === 0) {
        return reply.code(500).send({
          success: false,
          message: "Failed to delete agent",
        });
      }

      // 5️⃣ Delete user (cascades whatsapp_configuration, etc.)
      if (userRows.length > 0) {
        const user = userRows[0];
        const { rowCount: userDeleted } = await pgClient.query(
          "DELETE FROM users WHERE id = $1",
          [user.id]
        );

        if (userDeleted === 0) {
          return reply.code(500).send({
            success: false,
            message: "Failed to delete user record",
          });
        }
      }

      return reply.code(200).send({
        success: true,
        message: "Agent deleted successfully",
        deleted: {
          agent_id,
          user_id: agent.user_id
        },
      });
    } catch (err) {
      console.error("Delete agent error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}