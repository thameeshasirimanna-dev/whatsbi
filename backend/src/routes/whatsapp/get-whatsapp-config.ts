import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

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
          message: "user_id is required",
        });
      }

      // Validate userId is a valid UUID
      if (
        userId === "null" ||
        !userId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
      ) {
        return reply.code(400).send({
          success: false,
          message: "user_id must be a valid UUID",
        });
      }

      // Validate user exists
      const { rows: userRows } = await pgClient.query(
        "SELECT id, email, agent_id FROM users WHERE id = $1",
        [userId]
      );

      if (userRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "User not found",
        });
      }

      const userExists = userRows[0];

      // If user is a sub-user of an agent, resolve to agent owner's user_id
      let configUserId = userId;
      if (userExists.agent_id) {
        const { rows: agentOwnerRows } = await pgClient.query(
          "SELECT user_id FROM agents WHERE id = $1",
          [userExists.agent_id]
        );
        if (agentOwnerRows.length > 0 && agentOwnerRows[0].user_id) {
          configUserId = agentOwnerRows[0].user_id;
        }
      }

      // Get WhatsApp configuration using function
      const { rows: configRows } = await pgClient.query(
        "SELECT * FROM get_whatsapp_config($1)",
        [configUserId]
      );

      const configData = configRows.length > 0 ? configRows[0].config : null;

      return reply.code(200).send({
        success: true,
        message: configData
          ? "WhatsApp configuration found"
          : "No WhatsApp configuration set up for this user",
        user: userExists,
        whatsapp_config: configData,
        user_id: userId,
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