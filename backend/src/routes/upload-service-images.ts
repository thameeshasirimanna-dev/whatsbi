import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';

export default async function uploadServiceImagesRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post('/upload-service-images', async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const { agentId, serviceId, images } = request.body as any;

      if (!agentId) {
        return reply.code(400).send({ error: 'agentId is required' });
      }

      if (!images || !Array.isArray(images) || images.length === 0) {
        return reply.code(400).send({ error: 'images array is required' });
      }

      if (images.length > 10) {
        return reply.code(400).send({ error: 'Maximum 10 images allowed' });
      }

      // Validate each image
      for (const image of images) {
        if (!image.fileName || !image.fileBase64 || !image.fileType) {
          return reply.code(400).send({ error: 'Each image must have fileName, fileBase64, and fileType' });
        }

        if (!image.fileType.startsWith('image/')) {
          return reply.code(400).send({ error: 'Only image files are allowed' });
        }
      }

      const uploadedUrls: string[] = [];

      // Upload each image (simplified, without processing)
      for (const image of images) {
        try {
          const binaryString = Buffer.from(image.fileBase64, 'base64');
          const bytes = new Uint8Array(binaryString);

          const uniqueId = crypto.randomUUID();
          const filePath = serviceId ? `${serviceId}/${uniqueId}.jpg` : `${uniqueId}.jpg`;

          const { error: uploadError } = await supabaseClient.storage
            .from('service-images')
            .upload(filePath, bytes, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (uploadError) {
            // Rollback
            for (const uploadedUrl of uploadedUrls) {
              // Delete logic
            }
            return reply.code(500).send({ error: 'Upload failed: ' + uploadError.message });
          }

          const { data: { publicUrl } } = supabaseClient.storage
            .from('service-images')
            .getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
        } catch (error: any) {
          // Rollback
          return reply.code(500).send({ error: 'Upload failed: ' + error.message });
        }
      }

      return reply.code(200).send({ success: true, urls: uploadedUrls });
    } catch (error) {
      console.error('Upload service images error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}