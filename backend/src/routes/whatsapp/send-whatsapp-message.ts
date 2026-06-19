import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { downloadWhatsAppMedia, uploadMediaToStorage, escapeRegExp, verifyJWT } from '../../utils/helpers.js';
import { uploadMediaToR2 } from "../../utils/s3.js";
import { CacheService } from "../../utils/cache.js";

export default async function sendWhatsappMessageRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  cacheService: CacheService,
  emitNewMessage?: (agentId: number, messageData: any) => void
) {
  fastify.post("/send-whatsapp-message", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;

      const {
        user_id,
        customer_phone,
        message,
        type = "text",
        category = "utility",
        is_promotional = false,
        template_name,
        template_language,
        template_params = [],
        header_params = [],
        template_buttons = [],
        media_id,
        media_ids,
        caption,
        filename,
        voice = false,
      } = body;
      let media_header = body.media_header ?? null;

      if (type === "template") {
        // Template validation will be done below
      }

      if (
        !user_id ||
        !customer_phone ||
        (type === "text" && !message) ||
        (type === "template" && !template_name) ||
        (type !== "text" &&
          type !== "template" &&
          !media_id &&
          !media_ids?.length)
      ) {
        let missingField = "unknown";
        if (type === "text") missingField = "message";
        else if (type === "template") missingField = "template_name";
        else missingField = "media_id or media_ids";
        return reply.code(400).send({
          error: `Missing required fields: user_id, customer_phone, ${missingField}`,
        });
      }

      // Validate template-specific inputs
      if (type === "template") {
        if (
          media_header &&
          (!media_header.type || (!media_header.id && !media_header.link))
        ) {
          return reply.code(400).send({
            error: "media_header must specify type and either id or link",
          });
        }

        // Validate header_params if provided
        for (const param of header_params) {
          if (
            !param ||
            !param.type ||
            !["text", "currency", "date_time"].includes(param.type)
          ) {
            return reply.code(400).send({
              error: `Invalid header parameter type: ${param?.type}`,
            });
          }
          if (
            param.type === "currency" &&
            (!param.currency ||
              !param.currency.code ||
              typeof param.currency.amount_1000 !== "number" ||
              !param.currency.fallback_value)
          ) {
            return reply.code(400).send({
              error:
                "currency header parameter missing required fields (fallback_value, code, amount_1000)",
            });
          }
          if (
            param.type === "date_time" &&
            (!param.date_time || !param.date_time.fallback_value)
          ) {
            return reply.code(400).send({
              error: "date_time header parameter missing fallback_value",
            });
          }
          if (param.type === "text" && !param.text) {
            return reply.code(400).send({
              error: "text header parameter missing text value",
            });
          }
        }

        // Validate template_params
        for (const param of template_params) {
          if (
            !param ||
            !param.type ||
            !["text", "currency", "date_time"].includes(param.type)
          ) {
            return reply.code(400).send({
              error: `Invalid parameter type: ${param?.type}`,
            });
          }
          if (
            param.type === "currency" &&
            (!param.currency ||
              !param.currency.code ||
              typeof param.currency.amount_1000 !== "number" ||
              !param.currency.fallback_value)
          ) {
            return reply.code(400).send({
              error:
                "currency parameter missing required fields (fallback_value, code, amount_1000)",
            });
          }
          if (
            param.type === "date_time" &&
            (!param.date_time || !param.date_time.fallback_value)
          ) {
            return reply.code(400).send({
              error: "date_time parameter missing fallback_value",
            });
          }
          if (param.type === "text" && !param.text) {
            return reply.code(400).send({
              error: "text parameter missing text value",
            });
          }
        }

        // Validate template_buttons
        for (const button of template_buttons) {
          if (
            !button ||
            !button.sub_type ||
            !["quick_reply", "cta_phone", "cta_url"].includes(
              button.sub_type
            ) ||
            typeof button.index !== "number"
          ) {
            return reply.code(400).send({
              error: `Invalid button configuration: ${JSON.stringify(button)}`,
            });
          }
          if (button.sub_type === "quick_reply" && !button.payload) {
            return reply.code(400).send({
              error: "quick_reply button missing payload",
            });
          }
          if (button.sub_type === "cta_phone" && !button.phone_number) {
            return reply.code(400).send({
              error: "cta_phone button missing phone_number",
            });
          }
          if (button.sub_type === "cta_url" && !button.url) {
            return reply.code(400).send({
              error: "cta_url button missing url",
            });
          }
        }
      }

      // Get agent (support both owner and sub-users)
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix, user_id FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)",
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({ error: "Agent not found" });
      }

      const agent = agentRows[0];

      // Get WhatsApp config using agent owner's user_id
      const { rows: whatsappConfigRows } = await pgClient.query(
        "SELECT api_key, phone_number_id, user_id FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true",
        [agent.user_id]
      );

      if (whatsappConfigRows.length === 0) {
        return reply
          .code(404)
          .send({ error: "WhatsApp configuration not found" });
      }

      const whatsappConfig = whatsappConfigRows[0];

      const customersTable = `${agent.agent_prefix}_customers`;
      const messagesTable = `${agent.agent_prefix}_messages`;
      const templatesTable = `${agent.agent_prefix}_templates`;

      const cleanPhone = customer_phone.replace(/\D/g, "");
      // Find customer
      let { rows: customerRows } = await pgClient.query(
        `SELECT id, name, last_user_message_time, phone FROM ${customersTable} WHERE phone = $1 OR phone = $2`,
        [customer_phone, cleanPhone]
      );

      let customer;
      if (customerRows.length === 0) {
        const defaultName = body.customer_name || cleanPhone;
        try {
          const insertCustomerQuery = `
            INSERT INTO ${customersTable} (phone, name, agent_id, last_user_message_time)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, last_user_message_time, phone
          `;
          const { rows: newCustomerRows } = await pgClient.query(insertCustomerQuery, [
            cleanPhone,
            defaultName,
            agent.id,
            new Date().toISOString()
          ]);
          if (newCustomerRows.length === 0) {
            return reply.code(500).send({ error: "Failed to create customer record" });
          }
          customer = newCustomerRows[0];
        } catch (insertError: any) {
          if (insertError.code === "23505") {
            const { rows: retryRows } = await pgClient.query(
              `SELECT id, name, last_user_message_time, phone FROM ${customersTable} WHERE phone = $1`,
              [cleanPhone]
            );
            if (retryRows.length > 0) {
              customer = retryRows[0];
            } else {
              throw insertError;
            }
          } else {
            throw insertError;
          }
        }

        // Invalidate chat list cache for the agent
        if (cacheService) {
          await cacheService.invalidateChatList(agent.id);
        }
      } else {
        customer = customerRows[0];
      }

      // Normalize phone number to E.164 format
      let normalizedPhone = customer.phone.replace(/\D/g, ""); // Remove non-digits
      if (!normalizedPhone.startsWith("1") && normalizedPhone.length === 10) {
        normalizedPhone = "1" + normalizedPhone; // Assume US if 10 digits
      }
      normalizedPhone = "+" + normalizedPhone;
      if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
        return reply.code(400).send({ error: "Invalid phone number format" });
      }

      const now = new Date();
      const lastTime = customer.last_user_message_time
        ? new Date(customer.last_user_message_time)
        : new Date(0);
      const hoursSince =
        (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

      let useTemplate = false;
      let templateData = null;

      if (is_promotional || type === "template") {
        useTemplate = true;
      } else if (hoursSince > 24) {
        // Check for available template
        const { rows: templateRows } = await pgClient.query(
          `SELECT * FROM ${templatesTable} WHERE agent_id = $1 AND category = $2 AND is_active = true LIMIT 1`,
          [agent.id, category]
        );

        if (templateRows.length === 0) {
          return reply.code(400).send({
            error: "Template required after 24h window, none available",
          });
        }
        templateData = templateRows[0];
        useTemplate = true;
      }

      if (useTemplate) {
        const { rows: creditsRows } = await pgClient.query(
          "SELECT credits FROM agents WHERE id = $1",
          [agent.id]
        );

        if (creditsRows.length === 0 || creditsRows[0].credits < 0.01) {
          return reply.code(400).send({
            error: "Insufficient credits for template message",
          });
        }
      }

      // Prepare WhatsApp payload
      const accessToken = whatsappConfig.api_key;
      const phoneNumberId = whatsappConfig.phone_number_id;

      let media_download_url = null;
      let storedMediaUrl: string | null = null;
      let effectiveMediaId = media_id;
      let templateMimeType: string | null = null;

      // Media processing
      const singleMediaId = body.media_id;
      const multipleMediaIds = body.media_ids;
      let mediaIdsToProcess: string[] = [];
      if (
        multipleMediaIds &&
        Array.isArray(multipleMediaIds) &&
        multipleMediaIds.length > 0
      ) {
        mediaIdsToProcess = multipleMediaIds;
      } else if (singleMediaId) {
        mediaIdsToProcess = [singleMediaId];
      }
      let processedMedia: Array<{
        effectiveMediaId: string;
        storedMediaUrl: string | null;
        mediaFormat: string;
      }> = [];
      if (mediaIdsToProcess.length > 0) {
        if (useTemplate) {
          return reply.code(400).send({
            error:
              "Media messages cannot be sent using templates. Ensure you're within the 24-hour messaging window.",
          });
        }
        if (mediaIdsToProcess.length > 1 && type !== "image") {
          return reply.code(400).send({
            error: "Multiple media sending is only supported for images.",
          });
        }
        processedMedia = await Promise.all(
          mediaIdsToProcess.map(async (mediaId: string, index: number) => {
            const mediaUrlResponse = await fetch(
              `https://graph.facebook.com/v23.0/${mediaId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
            if (!mediaUrlResponse.ok) {
              const errorText = await mediaUrlResponse.text();
              console.error("Failed to fetch media details:", errorText);
              throw new Error(
                `Invalid media ID - cannot fetch media details: ${errorText}`
              );
            }
            const mediaUrlData: any = await mediaUrlResponse.json();
            const media_download_url = mediaUrlData.url;
            if (!media_download_url) {
              throw new Error("No download URL in media response");
            }
            const templateMimeType = mediaUrlData.mime_type;
            let mediaFormat: string;
            if (templateMimeType?.startsWith("image/")) {
              mediaFormat = "image";
            } else if (templateMimeType?.startsWith("video/")) {
              mediaFormat = "video";
            } else if (templateMimeType?.startsWith("audio/")) {
              mediaFormat = "audio";
            } else if (
              templateMimeType?.startsWith("application/") ||
              templateMimeType?.startsWith("text/")
            ) {
              mediaFormat = "document";
            } else {
              throw new Error(`Unsupported media type: ${templateMimeType}`);
            }
            const mediaResponse = await fetch(media_download_url, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
            if (!mediaResponse.ok) {
              const dlErrorText = await mediaResponse.text();
              console.error("Failed to download media:", dlErrorText);
              throw new Error("Failed to download media for storage");
            }
            const mediaBlob = await mediaResponse.blob();
            const mimeType =
              templateMimeType ||
              mediaResponse.headers.get("content-type") ||
              "application/octet-stream";
            let storedMediaUrl: string | null = null;
            // Upload to R2 for permanent dashboard access
            if (agent && agent.agent_prefix) {
              try {
                // Convert blob to buffer
                const arrayBuffer = await mediaBlob.arrayBuffer();
                const mediaBuffer = Buffer.from(arrayBuffer);

                 const cleanMime = mimeType.split(";")[0].trim();
                 const fileExt = cleanMime.split("/")[1] || "bin";
                 const fileName = `outgoing_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;

                storedMediaUrl = await uploadMediaToR2(
                  agent.agent_prefix,
                  mediaBuffer,
                  fileName,
                  mimeType,
                  "outgoing"
                );
              } catch (storageError) {
                // Media upload failed, continue without stored URL
              }
            }
            const effectiveMediaId = mediaId; // Use original media ID, no re-upload needed
            return { effectiveMediaId, storedMediaUrl, mediaFormat, mimeType };
          })
        );
        // Validate all media have the same format
        const uniqueFormats = [
          ...new Set(processedMedia.map((p) => p.mediaFormat)),
        ];
        if (uniqueFormats.length > 1) {
          throw new Error(
            "Mixed media formats not supported in a single request"
          );
        }
        const actualType = uniqueFormats[0];
        if (actualType !== type) {
          throw new Error(
            `Media format mismatch: expected ${type}, got ${actualType}`
          );
        }
      }

      let whatsappPayload;
      let allResults: any[] = [];
      let allMessageIds: any[] = [];

      let templateStoredMediaUrl: string | null = null;
      let templateMediaType: string | null = null;
      let headerMediaObject: any = null;
      let templateName: string = "";

      if (!useTemplate) {
        if (type === "text") {
          // Free-form text
          whatsappPayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: normalizedPhone,
            type: "text",
            text: { body: message },
          };
        } else if (type === "image" || type === "video") {
          if (processedMedia.length === 0) {
            throw new Error(
              "No processed media available for image/video type"
            );
          }
          const effective_caption = (caption || message || "").trim();
          // For multiple images, prepare array of payloads
          if (processedMedia.length === 1) {
            const singleMedia = processedMedia[0];
            whatsappPayload = {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: normalizedPhone,
              type: type,
              [type]: {
                id: singleMedia.effectiveMediaId,
                ...(effective_caption && { caption: effective_caption }),
              },
            };
          } else if (processedMedia.length > 1 && type === "image") {
            const multiplePayloads = processedMedia.map((media, index) => ({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: normalizedPhone,
              type: type,
              [type]: {
                id: media.effectiveMediaId,
                ...(effective_caption && { caption: effective_caption }),
              },
            }));
            whatsappPayload = multiplePayloads;
          } else {
            throw new Error(`Unsupported multiple media for type: ${type}`);
          }
        } else if (type === "audio") {
          if (processedMedia.length === 0) {
            throw new Error("No processed media available for audio type");
          }
          const singleMedia = processedMedia[0];
          const isVoice = voice || (singleMedia as any).mimeType?.includes("ogg") || filename?.includes("voice_note") || (singleMedia as any).storedMediaUrl?.includes("voice_note");
          whatsappPayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: normalizedPhone,
            type: "audio",
            audio: {
              id: singleMedia.effectiveMediaId,
              ...(isVoice && { voice: true }),
            },
          };
        } else if (type === "document") {
          if (processedMedia.length === 0) {
            throw new Error("No processed media available for document type");
          }
          const singleMedia = processedMedia[0];
          whatsappPayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: normalizedPhone,
            type: "document",
            document: {
              id: singleMedia.effectiveMediaId,
              ...(filename && { filename }),
            },
          };
        } else {
          return reply.code(400).send({
            error: `Unsupported message type: ${type}`,
          });
        }

        // Send to WhatsApp
        if (Array.isArray(whatsappPayload)) {
          for (const payload of whatsappPayload) {
            const response = await fetch(
              `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              }
            );
            if (!response.ok) {
              const errorText = await response.text();
              console.error("WhatsApp API error:", errorText);
              throw new Error(`Failed to send message: ${errorText}`);
            }
            const result = (await response.json()) as any;
            allResults.push(result);
            allMessageIds.push(result.messages[0].id);
          }
        } else {
          const response = await fetch(
            `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(whatsappPayload),
            }
          );
          if (!response.ok) {
            const errorText = await response.text();
            console.error("WhatsApp API error:", errorText);
            throw new Error(`Failed to send message: ${errorText}`);
          }
          const result = (await response.json()) as any;
          allResults.push(result);
          allMessageIds.push(result.messages[0].id);
        }
      } else {
        // Template message
        let languageCode = template_language || templateData?.language || "en";
        let components: any[] = [];

        if (type === "template") {
          templateName = template_name;
          // Body parameters
          if (template_params && template_params.length > 0) {
            components.push({
              type: "body",
              parameters: template_params.map((param: any) => {
                if (param.type === "text") {
                  return { type: "text", text: param.text };
                } else if (param.type === "currency") {
                  return {
                    type: "currency",
                    currency: {
                      fallback_value: param.currency.fallback_value,
                      code: param.currency.code,
                      amount_1000: param.currency.amount_1000,
                    },
                  };
                } else if (param.type === "date_time") {
                  return {
                    type: "date_time",
                    date_time: {
                      fallback_value: param.date_time.fallback_value,
                    },
                  };
                }
              }),
            });
          }
          // Header parameters
          if (header_params && header_params.length > 0) {
            const headerComponent = {
              type: "header",
              parameters: header_params.map((param: any) => {
                if (param.type === "text") {
                  return { type: "text", text: param.text };
                } else if (param.type === "currency") {
                  return {
                    type: "currency",
                    currency: {
                      fallback_value: param.currency.fallback_value,
                      code: param.currency.code,
                      amount_1000: param.currency.amount_1000,
                    },
                  };
                } else if (param.type === "date_time") {
                  return {
                    type: "date_time",
                    date_time: {
                      fallback_value: param.date_time.fallback_value,
                    },
                  };
                }
              }),
            };
            components.push(headerComponent);
          }
          // Media header
          if (media_header) {
            if (!components.find((c) => c.type === "header")) {
              components.push({ type: "header", parameters: [] });
            }
            const headerComp = components.find((c) => c.type === "header");
            if (
              media_header.type === "image" ||
              media_header.type === "video" ||
              media_header.type === "document"
            ) {
              headerComp.parameters.push({
                type: media_header.type,
                [media_header.type]: {
                  id: media_header.id || undefined,
                  link: media_header.link || undefined,
                },
              });
            }
          }
          // Buttons
          if (template_buttons && template_buttons.length > 0) {
            template_buttons.forEach((button: any) => {
              const buttonComponent = {
                type: "button",
                sub_type: button.sub_type,
                index: button.index,
                parameters: [] as any[],
              };
              if (button.sub_type === "quick_reply") {
                buttonComponent.parameters.push({
                  type: "payload",
                  payload: button.payload,
                });
              } else if (button.sub_type === "cta_phone") {
                buttonComponent.parameters.push({
                  type: "phone_number",
                  phone_number: button.phone_number,
                });
              } else if (button.sub_type === "cta_url") {
                buttonComponent.parameters.push({
                  type: "url",
                  url: button.url,
                });
              }
              components.push(buttonComponent);
            });
          }
        } else {
          // Forced template (24h window)
          templateName = templateData.name;
          // No parameters for forced templates
        }

        whatsappPayload = {
          messaging_product: "whatsapp",
          to: normalizedPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components,
          },
        };

        // Send template
        const response = await fetch(
          `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(whatsappPayload),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error("WhatsApp API error for template:", errorText);
          throw new Error(`Failed to send template message: ${errorText}`);
        }
        const result = (await response.json()) as any;
        allResults.push(result);
        allMessageIds.push(result.messages[0].id);
      }

      // Store messages in database
      let storedCount = 0;
      for (let i = 0; i < allMessageIds.length; i++) {
        const messageId = allMessageIds[i];
        let messageText = "";
        let mediaType = null;
        let mediaUrl = null;
        let captionText = null;
        if (!useTemplate) {
          if (type === "text") {
            messageText = message;
          } else {
            // media
            messageText = caption || "";
            mediaType = type;
            mediaUrl = processedMedia[i]?.storedMediaUrl || null;
            captionText = caption || null;
          }
        } else {
          messageText = templateName || "";
          // TODO: handle template media if needed
        }
        const { rows: insertedMessageRows } = await pgClient.query(
          `INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            customer.id,
            messageText,
            "outbound",
            new Date(),
            true,
            mediaType,
            mediaUrl,
            captionText,
          ]
        );
        storedCount++;

        if (emitNewMessage && insertedMessageRows.length > 0) {
          const insertedMessage = insertedMessageRows[0];
          const messageDataForSocket = {
            id: insertedMessage.id,
            customer_id: insertedMessage.customer_id,
            customer_name: customer.name || customer.phone,
            customer_phone: customer.phone,
            message: insertedMessage.message,
            sender_type: "agent",
            timestamp: insertedMessage.timestamp,
            media_type: insertedMessage.media_type,
            media_url: insertedMessage.media_url,
            caption: insertedMessage.caption,
          };
          emitNewMessage(agent.id, messageDataForSocket);
        }
      }

      // Invalidate cache for the conversation and chat list
      await cacheService.invalidateRecentMessages(agent.id, customer.id);
      await cacheService.invalidateChatList(agent.id);

      // Deduct credits for template messages
      if (useTemplate) {
        await pgClient.query(
          "UPDATE agents SET credits = credits - 0.01 WHERE id = $1",
          [agent.id]
        );
      }


      return reply.code(200).send({
        success: true,
        message_ids: allMessageIds,
        stored_messages: storedCount,
        details: allResults,
      });
    } catch (error) {
      console.error("Send message error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}

