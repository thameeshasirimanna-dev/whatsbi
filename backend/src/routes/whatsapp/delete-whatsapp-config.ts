import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function deleteWhatsappConfigRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.delete('/delete-whatsapp-config/:user_id', async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, pgClient);

      const { user_id } = request.params as any;

      // Get agent details (support both owner and sub-users)
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix, user_id FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)",
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "Agent not found for user",
        });
      }

      const agentData = agentRows[0];

      // Only the agent owner can manage WhatsApp settings
      if (agentData.user_id !== authenticatedUser.id) {
        return reply.code(403).send({
          success: false,
          message: "Access denied. Only the agent owner can manage WhatsApp settings."
        });
      }

      // Delete WhatsApp configuration using function
      const { rows: deleteRows } = await pgClient.query(
        'SELECT * FROM delete_whatsapp_config($1)',
        [agentData.user_id]
      );

      if (deleteRows.length === 0 || !deleteRows[0].success) {
        return reply.code(400).send({
          success: false,
          message: "Failed to delete WhatsApp configuration",
        });
      }

      return reply.code(200).send({
        success: true,
        message: deleteRows[0].message || "WhatsApp configuration deleted successfully",
        user_id: agentData.user_id,
      });
    } catch (err) {
      console.error("WhatsApp config delete error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}