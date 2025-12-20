import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function getWhatsappProfilePicRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post('/get-whatsapp-profile-pic', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const body = request.body as any;
      const { phone, user_id } = body;

      if (!phone) {
        return reply.code(400).send({
          status: 'error',
          message: 'Phone number is required'
        });
      }

      // Get agent and WhatsApp config
      const { data: agent, error: agentError } = await supabaseClient
        .from('agents')
        .select('id, agent_prefix, whatsapp_config')
        .eq('user_id', authenticatedUser.id)
        .single();

      if (agentError || !agent) {
        return reply.code(403).send({
          status: 'error',
          message: 'Agent not found'
        });
      }

      if (!agent.whatsapp_config?.access_token) {
        return reply.code(400).send({
          status: 'error',
          message: 'WhatsApp not configured'
        });
      }

      // Fetch profile picture from WhatsApp API
      try {
        const response = await fetch(
          `https://graph.facebook.com/v23.0/${phone}?fields=profile_picture_url`,
          {
            headers: {
              Authorization: `Bearer ${agent.whatsapp_config.access_token}`,
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

        const data = await response.json();

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