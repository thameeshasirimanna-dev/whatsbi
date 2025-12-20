import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { escapeRegExp, verifyJWT } from '../../utils/helpers';
import { uploadMediaToR2 } from "../../utils/s3";

export default async function uploadInventoryImagesRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post('/upload-inventory-images', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const body = request.body as any;
      const { agentId, productId, images } = body;

      if (!agentId) {
        return reply.code(400).send({ error: 'agentId is required' });
      }

      if (!productId) {
        return reply.code(400).send({ error: 'productId is required' });
      }

      if (!images || !Array.isArray(images) || images.length === 0) {
        return reply.code(400).send({ error: 'images array is required' });
      }

      if (images.length > 5) {
        return reply.code(400).send({ error: 'Maximum 5 images allowed' });
      }

      // Validate each image
      for (const image of images) {
        if (!image.fileName || !image.fileBase64 || !image.fileType) {
          return reply.code(400).send({
            error: 'Each image must have fileName, fileBase64, and fileType',
          });
        }

        if (!image.fileType.startsWith('image/')) {
          return reply.code(400).send({ error: 'Only image files are allowed' });
        }
      }

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

          // TODO: Add image resizing/compression using sharp or similar
          // For now, upload as is
          const processedFileType = image.fileType;

          const uniqueId = crypto.randomUUID();
          const extension = image.fileName.split(".").pop() || "jpg";
          const filePath = `${productId}/${uniqueId}.${extension}`;

          // Upload to R2
          const r2Key = `inventory/${filePath}`;
          const uploadedUrl = await uploadMediaToR2(
            "", // No agent prefix for inventory
            bytes,
            image.fileName,
            processedFileType,
            "incoming", // default
            r2Key
          );

          if (!uploadedUrl) {
            return reply.code(500).send({ error: "Upload failed" });
          }

          uploadedUrls.push(uploadedUrl);
        } catch (error: any) {
          return reply.code(500).send({
            error: "Upload failed: " + (error.message || "Unknown error"),
          });
        }
      }

      return reply.code(200).send({ success: true, urls: uploadedUrls });
    } catch (error: any) {
      return reply.code(400).send({ error: error.message || 'Unknown error' });
    }
  });
}