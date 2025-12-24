import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function getAgentsRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.get("/get-agents", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Check table row count first
      const { rows: countRows } = await pgClient.query(
        "SELECT COUNT(*) as count FROM agents"
      );
      const totalCount = parseInt(countRows[0].count);

      if (totalCount === 0) {
        return reply.code(200).send({
          success: true,
          agents: [],
        });
      }

      // Fetch agent data with user join
      const { rows: agentsData } = await pgClient.query(`
        SELECT
          a.*,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email
        FROM agents a
        JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
      `);

      if (agentsData && agentsData.length > 0) {
        // Transform data and fetch WhatsApp config for each agent
        const agentsWithConfig = await Promise.all(
          agentsData.map(async (agent: any) => {
            const safeAgent = {
              id: agent.id.toString(),
              user_id: agent.user_id,
              created_by: agent.created_by || "",
              agent_prefix: agent.agent_prefix || "",
              business_type: agent.business_type || "product",
              created_at: agent.created_at || new Date().toISOString(),
              user_name: agent.user_name || "Unnamed Agent",
              user_email: agent.user_email || "",
            };

            // Fetch WhatsApp config separately
            let whatsappConfig = null;
            try {
              const { rows: configRows } = await pgClient.query(
                "SELECT * FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true",
                [agent.user_id]
              );

              if (configRows && configRows.length > 0) {
                const configItem = configRows[0];
                whatsappConfig = {
                  whatsapp_number: configItem.whatsapp_number || "",
                  webhook_url: configItem.webhook_url || "",
                  api_key: configItem.api_key || undefined,
                  business_account_id:
                    configItem.business_account_id || undefined,
                  phone_number_id: configItem.phone_number_id || undefined,
                  is_active: Boolean(configItem.is_active),
                };
              }
            } catch (configError) {
              console.warn(
                "Failed to fetch WhatsApp config for agent:",
                agent.user_id,
                configError
              );
              whatsappConfig = null;
            }

            // Assume email is verified since we're not using Supabase auth
            const isEmailVerified = true;

            return {
              ...safeAgent,
              is_email_verified: isEmailVerified,
              whatsapp_config: whatsappConfig,
            };
          })
        );

        return reply.code(200).send({
          success: true,
          agents: agentsWithConfig,
        });
      } else {
        return reply.code(200).send({
          success: true,
          agents: [],
        });
      }
    } catch (err) {
      console.error("Get agents error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message,
      });
    }
  });
}