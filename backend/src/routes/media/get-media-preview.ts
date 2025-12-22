import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function getMediaPreviewRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.post("/get-media-preview", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);
      const userId = authenticatedUser.id;

      const body = request.body as any;
      const { media_id } = body;

      if (!media_id) {
        return reply.code(400).send({ error: "media_id is required" });
      }

      // Get agent info
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE user_id = $1",
        [userId]
      );

      if (agentRows.length === 0) {
        return reply
          .code(403)
          .send({ error: "Agent not found for authenticated user" });
      }

      const agent = agentRows[0];

      // Get WhatsApp config
      const { rows: whatsappConfigRows } = await pgClient.query(
        "SELECT api_key, phone_number_id FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true",
        [userId]
      );

      if (whatsappConfigRows.length === 0) {
        return reply
          .code(404)
          .send({ error: "WhatsApp configuration not found" });
      }

      const whatsappConfig = whatsappConfigRows[0];

      const accessToken = whatsappConfig.api_key;
      const phoneNumberId = whatsappConfig.phone_number_id;

      if (!accessToken || !phoneNumberId) {
        return reply
          .code(400)
          .send({ error: "Invalid WhatsApp configuration" });
      }

      // Fetch media URL
      const mediaUrlResponse = await fetch(
        `https://graph.facebook.com/v23.0/${media_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!mediaUrlResponse.ok) {
        const errorText = await mediaUrlResponse.text();
        return reply.code(500).send({
          error: "Failed to fetch media URL",
          details: errorText,
        });
      }

      const mediaUrlData: any = await mediaUrlResponse.json();
      const media_download_url = mediaUrlData.url;

      if (!media_download_url) {
        return reply.code(404).send({ error: "No download URL available" });
      }

      // Download the media
      const mediaResponse = await fetch(media_download_url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!mediaResponse.ok) {
        const errorText = await mediaResponse.text();
        return reply.code(500).send({
          error: "Failed to download media",
          details: errorText,
        });
      }

      const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
      const base64 = mediaBuffer.toString("base64");

      const contentType =
        mediaResponse.headers.get("content-type") || "application/octet-stream";

      return reply.code(200).send({
        success: true,
        base64: base64,
        content_type: contentType,
        media_id: media_id,
      });
    } catch (error: any) {
      return reply
        .code(500)
        .send({ error: "Internal server error", details: error.message });
    }
  });
}