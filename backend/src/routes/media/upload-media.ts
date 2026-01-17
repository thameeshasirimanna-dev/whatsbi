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
    console.log("Upload-media route called");
    const startTime = Date.now();

    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);
      const userId = authenticatedUser.id;

      // Log client type for debugging
      console.log(
        "pgClient type:",
        typeof pgClient,
        pgClient?.constructor?.name
      );

      // Get agent info
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE user_id = $1",
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

      // Get WhatsApp config
      const { rows: configRows } = await pgClient.query(
        "SELECT api_key, phone_number_id FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true",
        [userId]
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
          files.push({ file: part, purpose: currentPurpose });
        } else if (part.fieldname === "purpose") {
          currentPurpose = part.value as string;
        } else if (part.fieldname === "caption") {
          caption = part.value as string;
        }
      }
      console.log(`Parsed ${files.length} files and caption: ${caption}`);

      if (files.length === 0) {
        console.error("❌ No files provided in request");
        return reply.code(400).send({ error: "No files provided" });
      }

      // Upload files to storage
      const uploadedMedia: any[] = [];
      const errors: string[] = [];

      for (const fileObj of files) {
        const file = fileObj.file;
        const purpose = fileObj.purpose;
        try {
          // Use stream instead of loading entire file into memory
          const stream = file.file; // Readable stream
          const chunks: Buffer[] = [];
          let totalSize = 0;

          for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
            totalSize += chunk.length;

            // Prevent memory issues with extremely large files
            if (totalSize > 100 * 1024 * 1024) {
              // 100MB limit
              throw new Error("File too large (max 100MB)");
            }
          }

          let buffer: any = Buffer.concat(chunks);
          let contentType = file.mimetype || "application/octet-stream";
          let filename = file.filename || `upload_${Date.now()}`;

          // Images are already compressed by frontend, just log for debugging
          console.log(
            `Processing ${filename}, size: ${buffer.length} bytes, contentType: ${contentType}, purpose: ${purpose}`
          );

          if (purpose === "whatsapp") {
            console.log(
              `Uploading ${filename} to WhatsApp, size: ${buffer.length} bytes`
            );

            // Upload to WhatsApp instead of our storage
            console.log(
              `Making WhatsApp API call to: https://graph.facebook.com/v20.0/${phoneNumberId}/media`
            );
            console.log(
              `Content-Type: ${contentType}, File size: ${buffer.length}`
            );

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

            console.log(`WhatsApp response status: ${whatsappResponse.status}`);
            const responseText = await whatsappResponse.text();
            console.log(`WhatsApp response body: ${responseText}`);

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
            console.log(`Got WhatsApp media ID: ${mediaId}`);

            if (mediaId) {
              // Also upload to our storage for dashboard purposes
              console.log(
                `Uploading ${filename} to R2 storage for dashboard...`
              );
              const storageUrl = await uploadMediaToStorage(
                pgClient,
                agentPrefix,
                buffer,
                filename,
                contentType
              );
              console.log(`R2 storage URL: ${storageUrl}`);
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
              console.log(
                `Successfully uploaded ${filename} to WhatsApp (ID: ${mediaId})`
              );
            } else {
              errors.push(
                `Failed to get media ID from WhatsApp for ${filename}`
              );
            }
          } else if (purpose === "storage") {
            // Upload to storage only
            console.log(`Uploading ${filename} to R2 storage...`);
            const storageUrl = await uploadMediaToStorage(
              pgClient,
              agentPrefix,
              buffer,
              filename,
              contentType
            );
            console.log(`R2 storage URL: ${storageUrl}`);
            if (!storageUrl) {
              console.error(`Failed to upload ${filename} to storage`);
            }
          }
        } catch (error: any) {
          console.error(`Error uploading file ${file.filename}:`, error);
          errors.push(
            `Error uploading ${file.filename}: ${error.message || error}`
          );
        }
      }

      console.log(
        `Upload-media completed successfully, uploaded: ${uploadedMedia.length}, errors: ${errors.length}`
      );
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