import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function deleteWhatsappConfigRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.delete('/delete-whatsapp-config/:user_id', async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, pgClient);

      const { user_id } = request.params as any;

      // Validate required parameter
      if (!user_id) {
        return reply.code(400).send({
          success: false,
          message: "user_id is required",
        });
      }

      // Validate user exists
      const { rows: userRows } = await pgClient.query(
        'SELECT id FROM users WHERE id = $1',
        [user_id]
      );

      if (userRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "User not found",
        });
      }

      // Delete WhatsApp configuration using function
      const { rows: deleteRows } = await pgClient.query(
        'SELECT * FROM delete_whatsapp_config($1)',
        [user_id]
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
        user_id: user_id,
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