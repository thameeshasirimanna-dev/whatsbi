import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';

export default async function getAgentsRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.get('/get-agents', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      console.log('=== GET-AGENTS FUNCTION START ===');
      console.log('Authenticated User:', authenticatedUser.id);

      // Check table row count first
      const { count: totalCount, error: countError } = await supabaseClient
        .from('agents')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        return reply.code(500).send({
          success: false,
          message: `Database access issue: ${countError.message}`
        });
      }

      if (totalCount === 0) {
        return reply.code(200).send({
          success: true,
          agents: []
        });
      }

      // Fetch agent data with user join
      const { data: agentsData, error: fetchError } = await supabaseClient
        .from('agents')
        .select(`
          *,
          users!user_id (id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) {
        return reply.code(500).send({
          success: false,
          message: `Failed to fetch agents: ${fetchError.message}`
        });
      }

      if (agentsData && agentsData.length > 0) {
        // Transform data and fetch WhatsApp config for each agent
        const agentsWithConfig = await Promise.all(
          agentsData.map(async (agent: any) => {
            const safeAgent = {
              id: agent.id.toString(),
              user_id: agent.user_id,
              created_by: agent.created_by || '',
              agent_prefix: agent.agent_prefix || '',
              business_type: agent.business_type || 'product',
              created_at: agent.created_at || new Date().toISOString(),
              user_name: agent.users?.name || 'Unnamed Agent',
              user_email: agent.users?.email || '',
            };

            // Fetch WhatsApp config separately
            let whatsappConfig = null;
            try {
              const { data: configData, error: configError } = await supabaseClient.rpc('get_whatsapp_config', {
                p_user_id: agent.user_id
              });

              if (!configError && configData && configData.length > 0) {
                const configItem = configData[0];
                whatsappConfig = {
                  whatsapp_number: configItem.whatsapp_number || '',
                  webhook_url: configItem.webhook_url || '',
                  api_key: configItem.api_key || undefined,
                  business_account_id: configItem.business_account_id || undefined,
                  phone_number_id: configItem.phone_number_id || undefined,
                  is_active: Boolean(configItem.is_active)
                };
              }
            } catch (configError) {
              console.warn('Failed to fetch WhatsApp config for agent:', agent.user_id, configError);
              whatsappConfig = null;
            }

            // Fetch email verification status from auth.users
            let isEmailVerified = false;
            try {
              const { data: authUser } = await supabaseClient.auth.admin.getUserById(agent.user_id);
              isEmailVerified = authUser?.user?.email_confirmed_at !== null;
            } catch (authError) {
              console.warn('Failed to fetch auth user email status:', authError);
              isEmailVerified = false;
            }

            return {
              ...safeAgent,
              is_email_verified: isEmailVerified,
              whatsapp_config: whatsappConfig
            };
          })
        );

        return reply.code(200).send({
          success: true,
          agents: agentsWithConfig
        });
      } else {
        return reply.code(200).send({
          success: true,
          agents: []
        });
      }

    } catch (err) {
      console.error("Get agents error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}