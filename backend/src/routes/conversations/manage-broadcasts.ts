import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { CacheService } from "../../utils/cache.js";
import {
  handleSmsBroadcastCreate,
  handleSmsBroadcastResend,
} from "./broadcast-sms-handler.js";
import { interpolateSmsTemplate } from "../../services/textlk-sms.service.js";

export default async function manageBroadcastsRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  cacheService: CacheService,
  emitNewMessage?: (agentId: number, messageData: any) => void,
  emitAgentStatusUpdate?: (agentId: number, statusData: any) => void,
  emitBroadcastUpdated?: (agentId: number, data: any) => void
) {
  fastify.all("/manage-broadcasts", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent (support both owner and sub-users)
      const agentQuery =
        "SELECT id, agent_prefix, user_id, credits, COALESCE(sms_credits, 0.00) as sms_credits FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)";
      const agentResult = await pgClient.query(agentQuery, [
        authenticatedUser.id,
      ]);

      if (agentResult.rows.length === 0) {
        return reply.code(403).send({
          success: false,
          message: "Agent not found",
        });
      }

      const agent = agentResult.rows[0];
      const agentPrefix = agent.agent_prefix;
      const method = request.method;
      const url = new URL(request.url, `http://${request.headers.host}`);
      let parsedBody = null;

      if (method === "POST" || method === "PUT") {
        try {
          parsedBody = request.body as any;
        } catch (e) {
          console.error("JSON parse error:", e);
          return reply
            .code(400)
            .send({ success: false, message: "Invalid JSON body" });
        }
      }

      switch (method) {
        case "GET": {
          const id = url.searchParams.get("id");

          if (id) {
            // Get single broadcast campaign with its recipients
            const broadcastQuery = `SELECT * FROM ${agentPrefix}_broadcasts WHERE id = $1`;
            const { rows: broadcasts } = await pgClient.query(broadcastQuery, [id]);

            if (broadcasts.length === 0) {
              return reply.code(404).send({
                success: false,
                message: "Broadcast campaign not found",
              });
            }

            const recipientsQuery = `
              SELECT r.*, c.name as customer_name 
              FROM ${agentPrefix}_broadcast_recipients r 
              LEFT JOIN ${agentPrefix}_customers c ON r.customer_id = c.id 
              WHERE r.broadcast_id = $1
              ORDER BY r.id ASC
            `;
            const { rows: recipients } = await pgClient.query(recipientsQuery, [id]);

            return reply.code(200).send({
              success: true,
              broadcast: {
                ...broadcasts[0],
                recipients: recipients || [],
              },
            });
          }

          // Defensive addition of channel column if migration has not been applied yet
          try {
            await pgClient.query(`
              ALTER TABLE ${agentPrefix}_broadcasts ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'whatsapp';
            `);
          } catch {}

          // Get list of all broadcasts
          const queryParams = (request.query as Record<string, string>) || {};
          const channelFilter = queryParams.channel;

          let broadcasts: any[] = [];
          try {
            let listQuery = `SELECT * FROM ${agentPrefix}_broadcasts`;
            if (channelFilter === "sms") {
              listQuery += ` WHERE channel = 'sms' OR message_type = 'sms'`;
            } else if (channelFilter === "whatsapp") {
              listQuery += ` WHERE channel = 'whatsapp' OR (channel IS NULL AND message_type != 'sms')`;
            }
            listQuery += ` ORDER BY created_at DESC`;

            const result = await pgClient.query(listQuery);
            broadcasts = result.rows || [];
          } catch (queryErr: any) {
            // Fallback if 'channel' column does not exist in broadcasts table yet
            if (queryErr.code === "42703" || String(queryErr.message).includes("channel")) {
              let fallbackQuery = `SELECT * FROM ${agentPrefix}_broadcasts`;
              if (channelFilter === "sms") {
                fallbackQuery += ` WHERE message_type = 'sms'`;
              } else if (channelFilter === "whatsapp") {
                fallbackQuery += ` WHERE message_type != 'sms'`;
              }
              fallbackQuery += ` ORDER BY created_at DESC`;
              const fallbackResult = await pgClient.query(fallbackQuery);
              broadcasts = fallbackResult.rows || [];
            } else {
              throw queryErr;
            }
          }

          return reply.code(200).send({
            success: true,
            broadcasts: broadcasts || [],
          });
        }

        case "POST": {
          const body = parsedBody;
          const {
            action,
            broadcast_id,
            name,
            message_type,
            template_name,
            template_language = "en",
            message,
            template_params = [],
            header_params = [],
            template_buttons = [],
            media_header = null,
            recipient_ids = [],
          } = body || {};

          if (action === "resend") {
            if (!broadcast_id) {
              return reply
                .code(400)
                .send({ success: false, message: "broadcast_id is required for resend action" });
            }

            // Fetch the broadcast campaign
            const broadcastQuery = `SELECT * FROM ${agentPrefix}_broadcasts WHERE id = $1`;
            const { rows: broadcasts } = await pgClient.query(broadcastQuery, [broadcast_id]);

            if (broadcasts.length === 0) {
              return reply.code(404).send({
                success: false,
                message: "Broadcast campaign not found",
              });
            }

            const broadcast = broadcasts[0];

            if (broadcast.status !== "completed" && broadcast.status !== "failed") {
              return reply.code(400).send({
                success: false,
                message: `Cannot resend a broadcast that is currently in status: ${broadcast.status}`,
              });
            }

            if (broadcast.channel === "sms" || broadcast.message_type === "sms") {
              return handleSmsBroadcastResend(
                { request, reply, pgClient, cacheService, emitNewMessage, emitAgentStatusUpdate, emitBroadcastUpdated, agent },
                broadcast
              );
            }

            // Find all failed recipients
            const failedRecipientsQuery = `
              SELECT customer_id, phone 
              FROM ${agentPrefix}_broadcast_recipients 
              WHERE broadcast_id = $1 AND status = 'failed'
            `;
            const { rows: failedRecipients } = await pgClient.query(failedRecipientsQuery, [broadcast_id]);

            if (failedRecipients.length === 0) {
              return reply.code(400).send({
                success: false,
                message: "No failed recipients to resend for this campaign",
              });
            }

            // Check credits if template (Rs. 30.00 per WhatsApp template message)
            if (broadcast.message_type === "template") {
              const requiredCredits = failedRecipients.length * 30.00;
              if (Number(agent.credits) < requiredCredits) {
                return reply.code(400).send({
                  success: false,
                  message: `Insufficient WhatsApp credits. Required: Rs. ${Math.round(requiredCredits)}, Available: Rs. ${Math.round(Number(agent.credits))}`,
                });
              }
            }

            const failedCustomerIds = failedRecipients.map(r => r.customer_id);
            const customersQuery = `
              SELECT id, name, phone, last_user_message_time 
              FROM ${agentPrefix}_customers 
              WHERE id = ANY($1)
            `;
            const { rows: targetCustomers } = await pgClient.query(customersQuery, [failedCustomerIds]);

            if (targetCustomers.length === 0) {
              return reply.code(400).send({
                success: false,
                message: "No valid customers found for the failed recipients",
              });
            }

            // Update failed recipients' status back to 'pending' and clear error
            await pgClient.query(
              `UPDATE ${agentPrefix}_broadcast_recipients SET status = 'pending', error_message = NULL WHERE broadcast_id = $1 AND customer_id = ANY($2)`,
              [broadcast_id, failedCustomerIds]
            );

            // Update campaign status to processing and reduce failed count by the amount we are retrying
            await pgClient.query(
              `UPDATE ${agentPrefix}_broadcasts SET status = 'processing', failed_count = failed_count - $1 WHERE id = $2`,
              [failedRecipients.length, broadcast_id]
            );

            // Get WhatsApp config
            const whatsappConfigQuery =
              "SELECT api_key, phone_number_id FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true";
            const { rows: whatsappConfigRows } = await pgClient.query(whatsappConfigQuery, [
              agent.user_id,
            ]);

            if (whatsappConfigRows.length === 0) {
              await pgClient.query(
                `UPDATE ${agentPrefix}_broadcasts SET status = 'failed' WHERE id = $1`,
                [broadcast_id]
              );
              return reply.code(400).send({
                success: false,
                message: "WhatsApp configuration not found or inactive for the agent",
              });
            }

            const whatsappConfig = whatsappConfigRows[0];

            reply.code(202).send({
              success: true,
              message: "Resending failed broadcast messages started",
              broadcast_id: broadcast_id,
            });

            if (emitBroadcastUpdated) {
              emitBroadcastUpdated(agent.id, {
                broadcast_id: broadcast_id,
                sent_count: broadcast.sent_count,
                failed_count: broadcast.failed_count - failedRecipients.length,
                total_recipients: broadcast.total_recipients,
                status: "processing",
              });
            }

            // Background sending loop (Asynchronous)
            (async () => {
              let sentCount = broadcast.sent_count;
              let failedCount = broadcast.failed_count - failedRecipients.length;

              for (const customer of targetCustomers) {
                try {
                  const creditsRes = await pgClient.query("SELECT credits FROM agents WHERE id = $1", [agent.id]);
                  const currentCredits = Number(creditsRes.rows[0]?.credits ?? 0);

                  if (broadcast.message_type === "template" && currentCredits < 30.00) {
                    throw new Error("Insufficient WhatsApp credits left to send message (Rs. 30.00 required)");
                  }

                  if (broadcast.message_type === "text") {
                    if (!customer.last_user_message_time) {
                      throw new Error("Blocked: Customer has never messaged the business (outside 24-hour window)");
                    }
                    const now = new Date();
                    const lastTime = new Date(customer.last_user_message_time);
                    const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

                    if (hoursSince > 24) {
                      throw new Error("Blocked: Cannot send free-text message after 24h window (template required)");
                    }
                  }

                  let normalizedPhone = customer.phone.replace(/\D/g, "");
                  if (!normalizedPhone.startsWith("1") && normalizedPhone.length === 10) {
                    normalizedPhone = "1" + normalizedPhone;
                  }
                  normalizedPhone = "+" + normalizedPhone;

                  let whatsappPayload: any;

                  if (broadcast.message_type === "text") {
                    const personalizedMessage = interpolateSmsTemplate(broadcast.message || "", customer);
                    let media_header = broadcast.media_header;
                    if (typeof media_header === "string") {
                      try {
                        media_header = JSON.parse(media_header);
                      } catch (e) {}
                    }

                    if (media_header && (media_header.link || media_header.id)) {
                      const mediaType = media_header.type || "image";
                      const mediaObj: any = {};
                      if (media_header.id) {
                        mediaObj.id = media_header.id;
                      } else if (media_header.link) {
                        mediaObj.link = media_header.link;
                      }
                      if (personalizedMessage && personalizedMessage.trim().length > 0) {
                        mediaObj.caption = personalizedMessage;
                      }
                      whatsappPayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: normalizedPhone,
                        type: mediaType,
                        [mediaType]: mediaObj,
                      };
                    } else {
                      whatsappPayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: normalizedPhone,
                        type: "text",
                        text: { body: personalizedMessage },
                      };
                    }
                  } else {
                    let components: any[] = [];
                    const template_params = broadcast.template_params;
                    const header_params = broadcast.header_params;
                    const template_buttons = broadcast.template_buttons;
                    const media_header = broadcast.media_header;

                    if (template_params && template_params.length > 0) {
                      components.push({
                        type: "body",
                        parameters: template_params.map((param: any) => {
                          if (param.type === "text") {
                            return { type: "text", text: interpolateSmsTemplate(param.text || "", customer) };
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

                    if (header_params && header_params.length > 0) {
                      components.push({
                        type: "header",
                        parameters: header_params.map((param: any) => {
                          if (param.type === "text") {
                            return { type: "text", text: interpolateSmsTemplate(param.text || "", customer) };
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

                    whatsappPayload = {
                      messaging_product: "whatsapp",
                      to: normalizedPhone,
                      type: "template",
                      template: {
                        name: broadcast.template_name,
                        language: { code: broadcast.template_language || "en" },
                        components: components,
                      },
                    };
                  }

                  const response = await fetch(
                    `https://graph.facebook.com/v23.0/${whatsappConfig.phone_number_id}/messages`,
                    {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${whatsappConfig.api_key}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(whatsappPayload),
                    }
                  );

                  if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`WhatsApp API error: ${errorText}`);
                  }

                  const result = (await response.json()) as any;
                  const messageId = result.messages?.[0]?.id;

                  const messageText = broadcast.message_type === "text" ? interpolateSmsTemplate(broadcast.message || "", customer) : broadcast.template_name;
                  let retryMediaHeader = broadcast.media_header;
                  if (typeof retryMediaHeader === "string") {
                    try {
                      retryMediaHeader = JSON.parse(retryMediaHeader);
                    } catch (e) {}
                  }
                  const retryMediaType = retryMediaHeader ? (retryMediaHeader.type || "image") : "none";
                  const retryMediaUrl = retryMediaHeader?.link || null;
                  const retryCaption = retryMediaHeader ? messageText : null;

                  const { rows: insertedMessageRows } = await pgClient.query(
                    `INSERT INTO ${agentPrefix}_messages (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                    [
                      customer.id,
                      messageText,
                      "outbound",
                      new Date(),
                      true,
                      retryMediaType,
                      retryMediaUrl,
                      retryCaption,
                    ]
                  );

                  if (broadcast.message_type === "template") {
                    const { rows: creditRows } = await pgClient.query(
                      "UPDATE agents SET credits = GREATEST(0, credits - 30.00) WHERE id = $1 RETURNING credits",
                      [agent.id]
                    );
                    if (emitAgentStatusUpdate && creditRows.length > 0) {
                      emitAgentStatusUpdate(agent.id, {
                        type: "credits_updated",
                        credits: parseFloat(creditRows[0].credits),
                      });
                    }
                  }

                  if (emitNewMessage && insertedMessageRows.length > 0) {
                    const insertedMessage = insertedMessageRows[0];
                    emitNewMessage(agent.id, {
                      id: insertedMessage.id,
                      customer_id: insertedMessage.customer_id,
                      customer_name: customer.name || customer.phone,
                      customer_phone: customer.phone,
                      message: insertedMessage.message,
                      sender_type: "agent",
                      timestamp: insertedMessage.timestamp,
                      media_type: insertedMessage.media_type || "none",
                      media_url: insertedMessage.media_url || null,
                      caption: insertedMessage.caption || null,
                    });
                  }

                  await cacheService.invalidateRecentMessages(agent.id, customer.id);
                  await cacheService.invalidateChatList(agent.id);

                  await pgClient.query(
                    `UPDATE ${agentPrefix}_broadcast_recipients SET status = 'sent', sent_at = now() WHERE broadcast_id = $1 AND customer_id = $2`,
                    [broadcast_id, customer.id]
                  );

                  sentCount++;
                } catch (err: any) {
                  console.error(`Broadcast retry failed for customer ${customer.id}:`, err);
                  await pgClient.query(
                    `UPDATE ${agentPrefix}_broadcast_recipients SET status = 'failed', error_message = $3 WHERE broadcast_id = $1 AND customer_id = $2`,
                    [broadcast_id, customer.id, err.message || "Unknown error"]
                  );
                  failedCount++;
                }

                await pgClient.query(
                  `UPDATE ${agentPrefix}_broadcasts SET sent_count = $1, failed_count = $2 WHERE id = $3`,
                  [sentCount, failedCount, broadcast_id]
                );

                if (emitBroadcastUpdated) {
                  emitBroadcastUpdated(agent.id, {
                    broadcast_id: broadcast_id,
                    sent_count: sentCount,
                    failed_count: failedCount,
                    total_recipients: broadcast.total_recipients,
                    status: "processing",
                  });
                }
              }

              const finalStatus = (sentCount === 0) ? "failed" : "completed";
              await pgClient.query(
                `UPDATE ${agentPrefix}_broadcasts SET status = $1, updated_at = now() WHERE id = $2`,
                [finalStatus, broadcast_id]
              );

              if (emitBroadcastUpdated) {
                emitBroadcastUpdated(agent.id, {
                  broadcast_id: broadcast_id,
                  sent_count: sentCount,
                  failed_count: failedCount,
                  total_recipients: broadcast.total_recipients,
                  status: finalStatus,
                });
              }
            })();

            return;
          }

          if (body.channel === "sms" || message_type === "sms") {
            return handleSmsBroadcastCreate(
              { request, reply, pgClient, cacheService, emitNewMessage, emitAgentStatusUpdate, emitBroadcastUpdated, agent },
              body
            );
          }

          // Validate required fields
          if (!name || typeof name !== "string" || name.trim().length === 0) {
            return reply
              .code(400)
              .send({ success: false, message: "Campaign name is required" });
          }

          if (message_type !== "text" && message_type !== "template") {
            return reply
              .code(400)
              .send({ success: false, message: "Invalid message type. Must be 'text' or 'template'" });
          }

          if (message_type === "text" && (!message || message.trim().length === 0)) {
            return reply
              .code(400)
              .send({ success: false, message: "Message body is required for text broadcasts" });
          }

          if (message_type === "template" && !template_name) {
            return reply
              .code(400)
              .send({ success: false, message: "Template name is required for template broadcasts" });
          }

          if (!Array.isArray(recipient_ids) || recipient_ids.length === 0) {
            return reply
              .code(400)
              .send({ success: false, message: "Recipient IDs list cannot be empty" });
          }

          // Check credits for templates (Rs. 30.00 per WhatsApp template message)
          if (message_type === "template") {
            const requiredCredits = recipient_ids.length * 30.00;
            if (Number(agent.credits) < requiredCredits) {
              return reply.code(400).send({
                success: false,
                message: `Insufficient WhatsApp credits. Required: Rs. ${requiredCredits.toFixed(2)}, Available: Rs. ${Number(agent.credits).toFixed(2)}`,
              });
            }
          }

          // Resolve recipient customer records
          const customersQuery = `
            SELECT id, name, phone, last_user_message_time 
            FROM ${agentPrefix}_customers 
            WHERE id = ANY($1)
          `;
          const { rows: initialCustomers } = await pgClient.query(customersQuery, [recipient_ids]);

          if (initialCustomers.length === 0) {
            return reply.code(400).send({
              success: false,
              message: "No valid customers resolved for the provided recipient IDs",
            });
          }

          let targetCustomers = initialCustomers;

          if (message_type === "text") {
            const within24hList = targetCustomers.filter(c => {
              if (!c.last_user_message_time) return false;
              const lastTime = new Date(c.last_user_message_time).getTime();
              if (isNaN(lastTime)) return false;
              const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60);
              return hoursSince >= 0 && hoursSince <= 24;
            });

            if (within24hList.length === 0) {
              return reply.code(400).send({
                success: false,
                message: "Cannot send free-form text: Free-form WhatsApp messages can only be sent to customers in the 24-hour active window. Please select the 'Within 24h Active' customer group or use an Approved Template.",
              });
            }

            // Strictly constrain free-form broadcast to only within-24h active customers
            targetCustomers = within24hList;
          }

          // 1. Create Broadcast Record
          const insertBroadcastQuery = `
            INSERT INTO ${agentPrefix}_broadcasts (agent_id, name, message_type, template_name, template_language, message, template_params, header_params, template_buttons, media_header, status, total_recipients)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'processing', $11)
            RETURNING id
          `;
          const { rows: broadcastRows } = await pgClient.query(insertBroadcastQuery, [
            agent.id,
            name.trim(),
            message_type,
            template_name || null,
            template_language || 'en',
            message || null,
            template_params ? JSON.stringify(template_params) : null,
            header_params ? JSON.stringify(header_params) : null,
            template_buttons ? JSON.stringify(template_buttons) : null,
            media_header ? JSON.stringify(media_header) : null,
            targetCustomers.length,
          ]);

          const broadcastId = broadcastRows[0].id;

          // 2. Create Recipients Records (Pending)
          const insertRecipientsQuery = `
            INSERT INTO ${agentPrefix}_broadcast_recipients (broadcast_id, customer_id, phone, status)
            VALUES ${targetCustomers.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3}, 'pending')`).join(', ')}
          `;
          const insertRecipientsParams = [broadcastId];
          targetCustomers.forEach(c => {
            insertRecipientsParams.push(c.id);
            insertRecipientsParams.push(c.phone);
          });
          await pgClient.query(insertRecipientsQuery, insertRecipientsParams);

          // Get WhatsApp configuration for sending messages
          const whatsappConfigQuery =
            "SELECT api_key, phone_number_id FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true";
          const { rows: whatsappConfigRows } = await pgClient.query(whatsappConfigQuery, [
            agent.user_id,
          ]);

          if (whatsappConfigRows.length === 0) {
            // Update status to failed since config is missing
            await pgClient.query(
              `UPDATE ${agentPrefix}_broadcasts SET status = 'failed' WHERE id = $1`,
              [broadcastId]
            );
            return reply.code(400).send({
              success: false,
              message: "WhatsApp configuration not found or inactive for the agent",
            });
          }

          const whatsappConfig = whatsappConfigRows[0];

          // 3. Return HTTP response and handle sending in the background
          reply.code(202).send({
            success: true,
            message: "Broadcast campaign started",
            broadcast_id: broadcastId,
          });

          if (emitBroadcastUpdated) {
            emitBroadcastUpdated(agent.id, {
              broadcast_id: broadcastId,
              sent_count: 0,
              failed_count: 0,
              total_recipients: targetCustomers.length,
              status: "processing",
            });
          }

          // Background sending loop (Asynchronous)
          (async () => {
            let sentCount = 0;
            let failedCount = 0;

            for (const customer of targetCustomers) {
              try {
                // Fetch latest credit count check
                const creditsRes = await pgClient.query("SELECT credits FROM agents WHERE id = $1", [agent.id]);
                const currentCredits = Number(creditsRes.rows[0]?.credits ?? 0);

                if (message_type === "template" && currentCredits < 30.00) {
                  throw new Error("Insufficient WhatsApp credits left to send message (Rs. 30.00 required)");
                }

                // Check 24 hour window for text messages
                if (message_type === "text") {
                  if (!customer.last_user_message_time) {
                    throw new Error("Blocked: Customer has never messaged the business (outside 24-hour window)");
                  }
                  const now = new Date();
                  const lastTime = new Date(customer.last_user_message_time);
                  const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

                  if (hoursSince > 24) {
                    throw new Error("Blocked: Cannot send free-text message after 24h window (template required)");
                  }
                }

                // E.164 phone formatting
                let normalizedPhone = customer.phone.replace(/\D/g, "");
                if (!normalizedPhone.startsWith("1") && normalizedPhone.length === 10) {
                  normalizedPhone = "1" + normalizedPhone;
                }
                normalizedPhone = "+" + normalizedPhone;

                // Build payload
                let whatsappPayload: any;

                if (message_type === "text") {
                  const personalizedMessage = interpolateSmsTemplate(message || "", customer);
                  if (media_header && (media_header.link || media_header.id)) {
                    const mediaType = media_header.type || "image";
                    const mediaObj: any = {};
                    if (media_header.id) {
                      mediaObj.id = media_header.id;
                    } else if (media_header.link) {
                      mediaObj.link = media_header.link;
                    }
                    if (personalizedMessage && personalizedMessage.trim().length > 0) {
                      mediaObj.caption = personalizedMessage;
                    }
                    whatsappPayload = {
                      messaging_product: "whatsapp",
                      recipient_type: "individual",
                      to: normalizedPhone,
                      type: mediaType,
                      [mediaType]: mediaObj,
                    };
                  } else {
                    whatsappPayload = {
                      messaging_product: "whatsapp",
                      recipient_type: "individual",
                      to: normalizedPhone,
                      type: "text",
                      text: { body: personalizedMessage },
                    };
                  }
                } else {
                  // Template payload building
                  let components: any[] = [];
                  if (template_params && template_params.length > 0) {
                    components.push({
                      type: "body",
                      parameters: template_params.map((param: any) => {
                        if (param.type === "text") {
                          return { type: "text", text: interpolateSmsTemplate(param.text || "", customer) };
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

                  if (header_params && header_params.length > 0) {
                    components.push({
                      type: "header",
                      parameters: header_params.map((param: any) => {
                        if (param.type === "text") {
                          return { type: "text", text: interpolateSmsTemplate(param.text || "", customer) };
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

                  whatsappPayload = {
                    messaging_product: "whatsapp",
                    to: normalizedPhone,
                    type: "template",
                    template: {
                      name: template_name,
                      language: { code: template_language },
                      components: components,
                    },
                  };
                }

                // Send to Meta Graph API
                const response = await fetch(
                  `https://graph.facebook.com/v23.0/${whatsappConfig.phone_number_id}/messages`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${whatsappConfig.api_key}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(whatsappPayload),
                  }
                );

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`WhatsApp API error: ${errorText}`);
                }

                const result = (await response.json()) as any;
                const messageId = result.messages?.[0]?.id;

                // Create message record in database
                const messageText = message_type === "text" ? interpolateSmsTemplate(message || "", customer) : template_name;
                const outboundMediaType = media_header ? (media_header.type || "image") : "none";
                const outboundMediaUrl = media_header?.link || null;
                const outboundCaption = media_header ? messageText : null;

                const { rows: insertedMessageRows } = await pgClient.query(
                  `INSERT INTO ${agentPrefix}_messages (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                  [
                    customer.id,
                    messageText,
                    "outbound",
                    new Date(),
                    true,
                    outboundMediaType,
                    outboundMediaUrl,
                    outboundCaption,
                  ]
                );

                // Deduct credits if template (Rs. 30.00)
                if (message_type === "template") {
                  const { rows: creditRows } = await pgClient.query(
                    "UPDATE agents SET credits = GREATEST(0, credits - 30.00) WHERE id = $1 RETURNING credits",
                    [agent.id]
                  );
                  if (emitAgentStatusUpdate && creditRows.length > 0) {
                    emitAgentStatusUpdate(agent.id, {
                      type: "credits_updated",
                      credits: parseFloat(creditRows[0].credits),
                    });
                  }
                }

                // Emit Socket event if configured
                if (emitNewMessage && insertedMessageRows.length > 0) {
                  const insertedMessage = insertedMessageRows[0];
                  emitNewMessage(agent.id, {
                    id: insertedMessage.id,
                    customer_id: insertedMessage.customer_id,
                    customer_name: customer.name || customer.phone,
                    customer_phone: customer.phone,
                    message: insertedMessage.message,
                    sender_type: "agent",
                    timestamp: insertedMessage.timestamp,
                    media_type: insertedMessage.media_type || "none",
                    media_url: insertedMessage.media_url || null,
                    caption: insertedMessage.caption || null,
                  });
                }

                // Invalidate recent messages cache and chat list cache
                await cacheService.invalidateRecentMessages(agent.id, customer.id);
                await cacheService.invalidateChatList(agent.id);

                // Update recipient status to sent
                await pgClient.query(
                  `UPDATE ${agentPrefix}_broadcast_recipients SET status = 'sent', sent_at = now() WHERE broadcast_id = $1 AND customer_id = $2`,
                  [broadcastId, customer.id]
                );

                sentCount++;
              } catch (err: any) {
                console.error(`Broadcast message failed for customer ${customer.id}:`, err);

                // Update recipient status to failed
                await pgClient.query(
                  `UPDATE ${agentPrefix}_broadcast_recipients SET status = 'failed', error_message = $3 WHERE broadcast_id = $1 AND customer_id = $2`,
                  [broadcastId, customer.id, err.message || "Unknown error"]
                );

                failedCount++;
              }

              // Update live status counts in broadcast campaign record
              await pgClient.query(
                `UPDATE ${agentPrefix}_broadcasts SET sent_count = $1, failed_count = $2 WHERE id = $3`,
                [sentCount, failedCount, broadcastId]
              );

              if (emitBroadcastUpdated) {
                emitBroadcastUpdated(agent.id, {
                  broadcast_id: broadcastId,
                  sent_count: sentCount,
                  failed_count: failedCount,
                  total_recipients: targetCustomers.length,
                  status: "processing",
                });
              }
            }

            // Mark campaign as completed
            const finalStatus = failedCount === targetCustomers.length ? "failed" : "completed";
            await pgClient.query(
              `UPDATE ${agentPrefix}_broadcasts SET status = $1, updated_at = now() WHERE id = $2`,
              [finalStatus, broadcastId]
            );

            if (emitBroadcastUpdated) {
              emitBroadcastUpdated(agent.id, {
                broadcast_id: broadcastId,
                sent_count: sentCount,
                failed_count: failedCount,
                total_recipients: targetCustomers.length,
                status: finalStatus,
              });
            }

          })();

          break;
        }

        case "DELETE": {
          const id = url.searchParams.get("id");
          const idsParam = url.searchParams.get("ids");

          let targetIds: number[] = [];
          if (idsParam) {
            targetIds = idsParam.split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
          } else if (id) {
            const parsedId = Number(id);
            if (!isNaN(parsedId) && parsedId > 0) targetIds = [parsedId];
          } else if (parsedBody?.ids && Array.isArray(parsedBody.ids)) {
            targetIds = parsedBody.ids.map(Number).filter((n: any) => !isNaN(n) && n > 0);
          }

          if (targetIds.length === 0) {
            return reply.code(400).send({
              success: false,
              message: "Broadcast campaign ID(s) required",
            });
          }

          // Check if any matching campaign is currently processing
          const checkQuery = `SELECT id, status FROM ${agentPrefix}_broadcasts WHERE id = ANY($1)`;
          const { rows: campaigns } = await pgClient.query(checkQuery, [targetIds]);

          if (campaigns.length === 0) {
            return reply.code(404).send({
              success: false,
              message: "No matching broadcast campaigns found",
            });
          }

          const processingCampaigns = campaigns.filter((c: any) => c.status === "processing");
          if (processingCampaigns.length > 0) {
            return reply.code(400).send({
              success: false,
              message: "Cannot delete campaigns that are currently processing messages",
            });
          }

          // Delete the broadcast campaign records (will cascade delete recipients)
          const deleteQuery = `DELETE FROM ${agentPrefix}_broadcasts WHERE id = ANY($1)`;
          await pgClient.query(deleteQuery, [targetIds]);

          return reply.code(200).send({
            success: true,
            message: `${targetIds.length} campaign(s) deleted successfully`,
          });
        }

        default: {
          return reply
            .code(405)
            .send({ success: false, message: "Method not allowed" });
        }
      }
    } catch (error) {
      console.error("Broadcast management error:", error);
      return reply
        .code(500)
        .send({ success: false, message: "Internal server error" });
    }
  });
}
