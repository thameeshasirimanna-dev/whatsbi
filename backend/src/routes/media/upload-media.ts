import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { verifyJWT, uploadMediaToStorage } from "../../utils/helpers.js";

function getMediaType(
  mimeType: string
): "image" | "video" | "audio" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export default async function uploadMediaRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.post("/upload-media", async (request, reply) => {
    const startTime = Date.now();

    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);
      const userId = authenticatedUser.id;

      // Get agent info (support both owner and sub-users)
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix, user_id FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)",
        [userId]
      );
      const agent = agentRows[0];
      const agentError = agentRows.length === 0 ? "Agent not found" : null;

      if (agentError || !agent) {
        console.error("❌ Agent not found for user", userId, ":", agentError);
        return reply
          .code(403)
          .send({ error: "Agent not found for authenticated user" });
      }

      const agentPrefix = agent.agent_prefix;
      if (!agentPrefix) {
        console.error("❌ Agent prefix not configured for agent", agent.id);
        return reply.code(400).send({ error: "Agent prefix not configured" });
      }

      // Get WhatsApp config using agent owner's user_id
      const { rows: configRows } = await pgClient.query(
        "SELECT api_key, phone_number_id FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true",
        [agent.user_id]
      );
      const whatsappConfig = configRows[0];
      const configError = configRows.length === 0 ? "Config not found" : null;

      if (configError || !whatsappConfig) {
        console.error("❌ WhatsApp config not found:", configError);
        return reply
          .code(404)
          .send({ error: "WhatsApp configuration not found" });
      }

      const accessToken = whatsappConfig.api_key;
      const phoneNumberId = whatsappConfig.phone_number_id;

      if (!accessToken || !phoneNumberId) {
        console.error("❌ Invalid WhatsApp configuration");
        return reply
          .code(400)
          .send({ error: "Invalid WhatsApp configuration" });
      }

      // Parse multipart form data
      const parts = request.parts();
      const files: any[] = [];
      let caption = "";
      let currentPurpose = "whatsapp";

      for await (const part of parts) {
        if (part.type === "file") {
          try {
            const chunks: Buffer[] = [];
            let totalSize = 0;
            for await (const chunk of part.file) {
              chunks.push(Buffer.from(chunk));
              totalSize += chunk.length;

              if (totalSize > 100 * 1024 * 1024) {
                throw new Error("File too large (max 100MB)");
              }
            }
            const buffer = Buffer.concat(chunks);
            files.push({
              success: true,
              buffer,
              filename: part.filename,
              mimetype: part.mimetype,
              purpose: currentPurpose,
            });
          } catch (streamError: any) {
            console.error(`Error streaming file ${part.filename}:`, streamError);
            files.push({
              success: false,
              filename: part.filename || `upload_${Date.now()}`,
              error: streamError.message || streamError,
            });
          }
        } else if (part.fieldname === "purpose") {
          currentPurpose = part.value as string;
        } else if (part.fieldname === "caption") {
          caption = part.value as string;
        }
      }


      if (files.length === 0) {
        console.error("❌ No files provided in request");
        return reply.code(400).send({ error: "No files provided" });
      }

      // Upload files to storage
      const uploadedMedia: any[] = [];
      const errors: string[] = [];

      for (const fileObj of files) {
        if (!fileObj.success) {
          errors.push(`Error uploading ${fileObj.filename}: ${fileObj.error}`);
          continue;
        }

        const purpose = fileObj.purpose;
        const buffer = fileObj.buffer;
        const contentType = fileObj.mimetype || "application/octet-stream";
        const filename = fileObj.filename || `upload_${Date.now()}`;

        try {
          if (purpose === "whatsapp") {
            // Upload to WhatsApp instead of our storage

            const whatsappController = new AbortController();
            const whatsappTimeout = setTimeout(
              () => whatsappController.abort(),
              60000
            ); // 60s timeout

            const whatsappResponse = await fetch(
              `https://graph.facebook.com/v20.0/${phoneNumberId}/media`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                signal: whatsappController.signal,
                body: (() => {
                  const formData = new FormData();
                  formData.append(
                    "file",
                    new Blob([buffer], { type: contentType }),
                    filename
                  );
                  formData.append("type", contentType);
                  formData.append("messaging_product", "whatsapp");
                  return formData;
                })(),
              }
            );
            clearTimeout(whatsappTimeout);

            const responseText = await whatsappResponse.text();

            if (!whatsappResponse.ok) {
              throw new Error(
                `WhatsApp upload failed: ${whatsappResponse.status} ${responseText}`
              );
            }

            let whatsappData;
            try {
              whatsappData = JSON.parse(responseText) as { id: string };
            } catch (parseError) {
              throw new Error(
                `Failed to parse WhatsApp response: ${responseText}`
              );
            }

            const mediaId = whatsappData.id;

            if (mediaId) {
              // Also upload to our storage for dashboard purposes
              const storageUrl = await uploadMediaToStorage(
                pgClient,
                agentPrefix,
                buffer,
                filename,
                contentType
              );
              if (!storageUrl) {
                console.error(`Failed to upload ${filename} to storage`);
              }

              uploadedMedia.push({
                filename,
                media_id: mediaId,
                media_download_url: storageUrl || "", // For dashboard display
                media_type: getMediaType(contentType),
                size: buffer.length,
              });
            } else {
              errors.push(
                `Failed to get media ID from WhatsApp for ${filename}`
              );
            }
          } else if (purpose === "storage") {
            // Upload to storage only
            const storageUrl = await uploadMediaToStorage(
              pgClient,
              agentPrefix,
              buffer,
              filename,
              contentType
            );
            if (!storageUrl) {
              console.error(`Failed to upload ${filename} to storage`);
            }
          }
        } catch (error: any) {
          console.error(`Error uploading file ${filename}:`, error);
          errors.push(
            `Error uploading ${filename}: ${error.message || error}`
          );
        }
      }

      return reply.code(200).send({
        success: true,
        uploaded: uploadedMedia.length,
        total: files.length,
        media: uploadedMedia,
        errors,
      });
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      console.error(
        `💥 Upload-media function failed after ${totalDuration}ms:`,
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return reply
        .code(500)
        .send({ error: "Internal server error", details: errorMessage });
    }
  });
}