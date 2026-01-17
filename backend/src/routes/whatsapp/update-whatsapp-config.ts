import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function updateWhatsappConfigRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.put('/update-whatsapp-config', async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;

      // Validate required fields
      if (!body.user_id) {
        return reply.code(400).send({
          success: false,
          message: "user_id is required",
        });
      }

      // Validate user exists
      const { rows: userRows } = await pgClient.query(
        'SELECT id FROM users WHERE id = $1',
        [body.user_id]
      );

      if (userRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "User not found",
        });
      }

      // Update WhatsApp configuration using function
      const { rows: configRows } = await pgClient.query(
        'SELECT * FROM update_whatsapp_config($1, $2, $3, $4, $5, $6, $7)',
        [
          body.user_id,
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
        user_id: body.user_id,
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