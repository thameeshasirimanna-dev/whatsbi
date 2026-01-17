import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function getAgentProfileRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.get('/get-agent-profile', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent data with user details
      const agentQuery = `
        SELECT
          id,
          user_id,
          agent_prefix,
          business_type,
          address,
          business_email,
          contact_number,
          website,
          invoice_template_path,
          credits
        FROM agents
        WHERE user_id = $1
      `;
      const agentResult = await pgClient.query(agentQuery, [authenticatedUser.id]);

      if (agentResult.rows.length === 0) {
        return reply
          .code(404)
          .send({ success: false, message: "Agent not found" });
      }

      const agentData = agentResult.rows[0];

      // Get user name
      const userQuery = 'SELECT name, email, role FROM users WHERE id = $1';
      const userResult = await pgClient.query(userQuery, [authenticatedUser.id]);

      if (userResult.rows.length === 0) {
        return reply
          .code(404)
          .send({ success: false, message: "User not found" });
      }

      const userData = userResult.rows[0];

      // Get whatsapp configuration
      const whatsappQuery = 'SELECT whatsapp_number FROM whatsapp_configuration WHERE user_id = $1';
      const whatsappResult = await pgClient.query(whatsappQuery, [authenticatedUser.id]);

      const whatsappData = whatsappResult.rows.length > 0 ? whatsappResult.rows[0] : null;

      return reply.code(200).send({
        success: true,
        agent: {
          id: agentData.id,
          user_id: agentData.user_id,
          agent_prefix: agentData.agent_prefix,
          business_type: agentData.business_type,
          name: userData.name || "Agent",
          email: userData.email || "",
          role: userData.role || "user",
          whatsapp_number: whatsappData?.whatsapp_number || "",
          address: agentData.address || "",
          business_email: agentData.business_email || "",
          contact_number: agentData.contact_number || "",
          website: agentData.website || "",
          invoice_template_path: agentData.invoice_template_path,
          credits: agentData.credits || 0,
        },
      });
    } catch (error) {
      console.error('Get agent profile error:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}