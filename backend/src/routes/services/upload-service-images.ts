import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';
import { uploadMediaToR2 } from "../../utils/s3";

export default async function uploadServiceImagesRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.post("/upload-service-images", async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, pgClient);

      const { agentId, serviceId, images } = request.body as any;

      if (!agentId) {
        return reply.code(400).send({ error: "agentId is required" });
      }

      if (!images || !Array.isArray(images) || images.length === 0) {
        return reply.code(400).send({ error: "images array is required" });
      }

      if (images.length > 10) {
        return reply.code(400).send({ error: "Maximum 10 images allowed" });
      }

      // Validate each image
      for (const image of images) {
        if (!image.fileName || !image.fileBase64 || !image.fileType) {
          return reply.code(400).send({
            error: "Each image must have fileName, fileBase64, and fileType",
          });
        }

        if (!image.fileType.startsWith("image/")) {
          return reply
            .code(400)
            .send({ error: "Only image files are allowed" });
        }
      }

      // Get agent prefix
      const { rows: agentRows } = await pgClient.query(
        "SELECT agent_prefix FROM agents WHERE id = $1",
        [agentId]
      );
      if (agentRows.length === 0) {
        return reply.code(400).send({ error: "Agent not found" });
      }
      const agentPrefix = agentRows[0].agent_prefix;

      const uploadedUrls: string[] = [];

      // Upload each image
      for (const image of images) {
        try {
          // Decode base64 file
          const prefix = `data:${image.fileType};base64,`;
          const base64Data = image.fileBase64.replace(
            new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
            ""
          );
          const binaryString = atob(base64Data);
          let bytes = Buffer.alloc(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const uniqueId = crypto.randomUUID();
          const extension = image.fileName.split(".").pop() || "jpg";
          const filePath = serviceId
            ? `services/${serviceId}/${uniqueId}.${extension}`
            : `services/${uniqueId}.${extension}`;

          // Upload to R2
          const r2Key = `${agentPrefix}/${filePath}`;
          const uploadedUrl = await uploadMediaToR2(
            "", // No additional agent prefix since it's already in r2Key
            bytes,
            image.fileName,
            image.fileType,
            "incoming", // default
            r2Key
          );

          if (!uploadedUrl) {
            return reply.code(500).send({ error: "Upload failed" });
          }

          // Use hardcoded R2 URL to ensure https
          const finalUrl = `https://r2.idesignsolutions.lk/${r2Key}`;

          uploadedUrls.push(finalUrl);
        } catch (error: any) {
          return reply.code(500).send({
            error: "Upload failed: " + (error.message || "Unknown error"),
          });
        }
      }

      return reply.code(200).send({ success: true, urls: uploadedUrls });
    } catch (error) {
      console.error("Upload service images error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}