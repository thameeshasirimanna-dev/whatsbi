import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function getWhatsappProfilePicRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.post('/get-whatsapp-profile-pic', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;
      const { phone, user_id } = body;

      if (!phone) {
        return reply.code(400).send({
          status: 'error',
          message: 'Phone number is required'
        });
      }

      // Get agent
      const { rows: agentRows } = await pgClient.query(
        'SELECT id, agent_prefix FROM agents WHERE user_id = $1',
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          status: 'error',
          message: 'Agent not found'
        });
      }

      const agent = agentRows[0];

      // Get WhatsApp config
      const { rows: configRows } = await pgClient.query(
        'SELECT api_key FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true',
        [authenticatedUser.id]
      );

      if (configRows.length === 0 || !configRows[0].api_key) {
        return reply.code(400).send({
          status: 'error',
          message: 'WhatsApp not configured'
        });
      }

      const accessToken = configRows[0].api_key;

      // Fetch profile picture from WhatsApp API
      try {
        const response = await fetch(
          `https://graph.facebook.com/v23.0/${phone}?fields=profile_picture_url`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            // Profile picture not available
            return reply.code(200).send({
              success: false,
              message: 'Profile picture not available'
            });
          }
          throw new Error(`WhatsApp API error: ${response.status}`);
        }

        const data: any = await response.json();

        if (data.profile_picture_url) {
          return reply.code(200).send({
            success: true,
            profile_image_url: data.profile_picture_url
          });
        } else {
          return reply.code(200).send({
            success: false,
            message: 'Profile picture not available'
          });
        }
      } catch (apiError) {
        console.error('WhatsApp API error:', apiError);
        return reply.code(500).send({
          status: 'error',
          message: 'Failed to fetch profile picture'
        });
      }
    } catch (error) {
      console.error('Get WhatsApp profile pic error:', error);
      return reply.code(500).send({
        status: 'error',
        message: 'Internal server error'
      });
    }
  });
}