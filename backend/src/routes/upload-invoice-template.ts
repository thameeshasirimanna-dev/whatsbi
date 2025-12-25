import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';
import { uploadMediaToR2 } from '../utils/s3';

export default async function uploadInvoiceTemplateRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post("/upload-invoice-template", async (request, reply) => {
    try {
      console.log("Upload invoice template request received");
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);
      console.log("JWT verified, user:", authenticatedUser.id);

      // Parse JSON body
      const body = request.body as any;
      const agentId = body.agentId;
      const fileData = body.file;

      console.log("agentId:", agentId);
      console.log("fileData:", fileData?.fileName, fileData?.fileType);

      if (!agentId) {
        return reply.code(400).send({
          success: false,
          message: "agentId is required",
        });
      }

      if (!fileData) {
        return reply.code(400).send({
          success: false,
          message: "file is required",
        });
      }

      // Get agent to validate ownership
      const { rows: agentRows } = await supabaseClient.query(
        "SELECT id, agent_prefix FROM agents WHERE id = $1 AND user_id = $2",
        [agentId, authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          success: false,
          message: "Agent not found or access denied",
        });
      }

      const agent = agentRows[0];

      // Decode base64 file
      const binaryString = atob(fileData.fileBase64);
      const fileBuffer = Buffer.alloc(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        fileBuffer[i] = binaryString.charCodeAt(i);
      }

      // Upload to S3
      const fileName = `invoice-template.${fileData.fileName.split(".").pop()}`;
      const s3Key = `${agent.agent_prefix}/invoice_template/${fileName}`;

      const uploadResult = await uploadMediaToR2(
        "",
        fileBuffer,
        fileData.fileName,
        fileData.fileType,
        "incoming",
        s3Key
      );

      if (!uploadResult) {
        return reply.code(500).send({
          success: false,
          message: "Failed to upload file to storage",
        });
      }

      // Update agent record with template path
      await supabaseClient.query(
        "UPDATE agents SET invoice_template_path = $1 WHERE id = $2 AND user_id = $3",
        [s3Key, agentId, authenticatedUser.id]
      );

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