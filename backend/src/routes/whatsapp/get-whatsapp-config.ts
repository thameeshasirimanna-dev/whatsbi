import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function getWhatsappConfigRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.get('/get-whatsapp-config', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      const query = request.query as any;
      let userId = query.user_id;

      // Validate required parameter
      if (!userId) {
        return reply.code(400).send({
          success: false,
          message: "user_id is required"
        });
      }

      // Validate user exists
      const { rows: userRows } = await pgClient.query(
        'SELECT id, email FROM users WHERE id = $1',
        [userId]
      );

      if (userRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "User not found"
        });
      }

      const userExists = userRows[0];

      // Get WhatsApp configuration using function
      const { rows: configRows } = await pgClient.query(
        'SELECT * FROM get_whatsapp_config($1)',
        [userId]
      );

      const configData = configRows.length > 0 ? configRows[0].config : null;

      return reply.code(200).send({
        success: true,
        message: configData ? "WhatsApp configuration found" : "No WhatsApp configuration set up for this user",
        user: userExists,
        whatsapp_config: configData,
        user_id: userId
      });

    } catch (err) {
      console.error("WhatsApp config retrieval error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}