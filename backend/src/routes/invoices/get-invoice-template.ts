import { FastifyInstance } from 'fastify';
import { CacheService } from '../../utils/cache';

export default async function getInvoiceTemplateRoutes(fastify: FastifyInstance, supabaseClient: any, cacheService: CacheService) {
  fastify.get('/get-invoice-template', async (request, reply) => {
    try {
      const cacheKey = 'invoice_template_image';

      // Check cache first
      const cachedImage = await cacheService.get(cacheKey);
      if (cachedImage) {
        // Return cached image
        const buffer = Buffer.from(cachedImage, 'base64');
        return reply
          .header('Content-Type', 'image/png')
          .header('Cache-Control', 'public, max-age=3600') // Cache for 1 hour
          .send(buffer);
      }

      // Fetch from Supabase storage
      const supabaseUrl = process.env.SUPABASE_URL;
      const imageUrl = `${supabaseUrl}/storage/v1/object/public/invoices/IDesign%20Invoice%20Template.png`;

      const response = await fetch(imageUrl);
      if (!response.ok) {
        return reply.code(404).send({
          status: 'error',
          message: 'Invoice template not found'
        });
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      // Cache the image (base64 encoded)
      await cacheService.set(cacheKey, imageBuffer.toString('base64'), 3600); // Cache for 1 hour

      return reply
        .header('Content-Type', 'image/png')
        .header('Cache-Control', 'public, max-age=3600')
        .send(imageBuffer);
    } catch (error) {
      console.error('Get invoice template error:', error);
      return reply.code(500).send({
        status: 'error',
        message: 'Internal server error'
      });
    }
  });
}