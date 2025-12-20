import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';
import { uploadMediaToR2 } from '../utils/s3';

export default async function uploadInvoiceTemplateRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post('/upload-invoice-template', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const formData = request.body as any;
      const agentId = formData.agentId;
      const file = formData.file;

      if (!agentId || !file) {
        return reply.code(400).send({
          success: false,
          message: "agentId and file are required",
        });
      }

      // Get agent to validate ownership
      const { data: agent, error: agentError } = await supabaseClient
        .from('agents')
        .select('id, agent_prefix')
        .eq('id', agentId)
        .eq('user_id', authenticatedUser.id)
        .single();

      if (agentError || !agent) {
        return reply.code(403).send({
          success: false,
          message: "Agent not found or access denied",
        });
      }

      // Upload to S3
      const fileName = `invoice-template.${file.filename.split('.').pop()}`;
      const s3Key = `agents/${agentId}/${fileName}`;

      const uploadResult = await uploadMediaToR2("", file, s3Key, file.mimetype, "incoming", s3Key);

      if (!uploadResult) {
        return reply.code(500).send({
          success: false,
          message: "Failed to upload file to storage",
        });
      }

      // Update agent record with template path
      const { error: updateError } = await supabaseClient.rpc("update_agent_template_path", {
        p_agent_id: parseInt(agentId),
        p_template_path: s3Key,
        p_current_user_id: authenticatedUser.id,
      });

      if (updateError) {
        console.error("Failed to update agent template path:", updateError);
        return reply.code(500).send({
          success: false,
          message: "File uploaded but failed to update database",
        });
      }

      return reply.code(200).send({
        success: true,
        message: "Invoice template uploaded successfully",
        filePath: s3Key,
      });
    } catch (error) {
      console.error("Upload invoice template error:", error);
      return reply.code(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  });
}