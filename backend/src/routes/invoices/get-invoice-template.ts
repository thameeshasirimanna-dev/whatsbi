import { FastifyInstance } from 'fastify';
import { CacheService } from '../../utils/cache';
import { downloadMediaFromR2 } from "../../utils/s3";

export default async function getInvoiceTemplateRoutes(
  fastify: FastifyInstance,
  cacheService: CacheService
) {
  fastify.get("/get-invoice-template", async (request, reply) => {
    try {
      const query = request.query as any;
      const templatePath = query.path;

      if (!templatePath) {
        return reply.code(400).send({
          status: "error",
          message: "Template path is required",
        });
      }

      const cacheKey = `invoice_template_${templatePath}`;

      // Check cache first
      const cachedImage = await cacheService.get(cacheKey);
      if (cachedImage) {
        // Return cached image
        const buffer = Buffer.from(cachedImage, "base64");
        return reply
          .header("Content-Type", "image/png")
          .header("Cache-Control", "public, max-age=3600") // Cache for 1 hour
          .send(buffer);
      }

      // Fetch from R2 storage
      const imageBuffer = await downloadMediaFromR2(templatePath);
      if (!imageBuffer) {
        return reply.code(404).send({
          status: "error",
          message: "Invoice template not found",
        });
      }

      // Cache the image (base64 encoded)
      await cacheService.set(cacheKey, imageBuffer.toString("base64"), 3600); // Cache for 1 hour

      return reply
        .header("Content-Type", "image/png")
        .header("Cache-Control", "public, max-age=3600")
        .send(imageBuffer);
    } catch (error) {
      console.error("Get invoice template error:", error);
      return reply.code(500).send({
        status: "error",
        message: "Internal server error",
      });
    }
  });
}