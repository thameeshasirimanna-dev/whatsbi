import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function updateWhatsappConfigRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.put('/update-whatsapp-config', async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;

      const targetUserId = authenticatedUser.role === 'admin' ? (body.user_id || authenticatedUser.id) : authenticatedUser.id;

      // Get agent details (support both owner and sub-users)
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix, user_id FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)",
        [targetUserId]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "Agent not found for user",
        });
      }

      const agentData = agentRows[0];

      // Only the agent owner or admin can manage WhatsApp settings
      if (authenticatedUser.role !== 'admin' && agentData.user_id !== authenticatedUser.id) {
        return reply.code(403).send({
          success: false,
          message: "Access denied. Only the agent owner or administrator can manage WhatsApp settings."
        });
      }

      // Update WhatsApp configuration using function
      const { rows: configRows } = await pgClient.query(
        'SELECT * FROM update_whatsapp_config($1, $2, $3, $4, $5, $6, $7)',
        [
          agentData.user_id,
          body.whatsapp_number || null,
          body.webhook_url || null,
          body.api_key || null,
          body.business_account_id || null,
          body.phone_number_id || null,
          null, // p_is_active
        ]
      );

      if (configRows.length === 0 || !configRows[0].success) {
        return reply.code(400).send({
          success: false,
          message: "Failed to update WhatsApp configuration",
        });
      }

      const configData = configRows[0].updated_config;

      return reply.code(200).send({
        success: true,
        message: "WhatsApp configuration updated successfully",
        whatsapp_config: configData,
        user_id: agentData.user_id,
      });
    } catch (err) {
      console.error("WhatsApp config update error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}