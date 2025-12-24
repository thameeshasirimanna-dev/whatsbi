import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function updateAgentTemplatePathRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.patch('/update-agent-template-path', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;

      // Validate required fields
      if (!body.agent_id || body.template_path === undefined) {
        return reply.code(400).send({
          success: false,
          message: "agent_id and template_path are required",
        });
      }

      const agentId = parseInt(body.agent_id);
      const templatePath = body.template_path;

      // Update the invoice_template_path in agents table
      const query = `UPDATE agents SET invoice_template_path = $1 WHERE id = $2 AND user_id = $3`;
      const result = await pgClient.query(query, [templatePath, agentId, authenticatedUser.id]);

      if (result.rowCount === 0) {
        return reply.code(404).send({
          success: false,
          message: "Agent not found or not authorized",
        });
      }

      return reply.code(200).send({
        success: true,
        message: "Template path updated successfully",
      });
    } catch (err) {
      console.error("Update agent template path error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}