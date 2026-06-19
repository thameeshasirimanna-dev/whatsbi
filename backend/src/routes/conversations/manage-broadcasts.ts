import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { CacheService } from "../../utils/cache.js";

export default async function manageBroadcastsRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  cacheService: CacheService,
  emitNewMessage?: (agentId: number, messageData: any) => void
) {
  fastify.all("/manage-broadcasts", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent (support both owner and sub-users)
      const agentQuery =
        "SELECT id, agent_prefix, user_id, credits FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)";
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

          // Get list of all broadcasts
          const listQuery = `SELECT * FROM ${agentPrefix}_broadcasts ORDER BY created_at DESC`;
          const { rows: broadcasts } = await pgClient.query(listQuery);

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

            // Check credits if template
            if (broadcast.message_type === "template") {
              const requiredCredits = failedRecipients.length * 0.01;
              if (agent.credits < requiredCredits) {
                return reply.code(400).send({
                  success: false,
                  message: `Insufficient credits. Required: ${requiredCredits.toFixed(2)}, Available: ${agent.credits.toFixed(2)}`,
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

            // Background sending loop (Asynchronous)
            (async () => {
              let sentCount = broadcast.sent_count;
              let failedCount = broadcast.failed_count - failedRecipients.length;

              for (const customer of targetCustomers) {
                try {
                  const creditsRes = await pgClient.query("SELECT credits FROM agents WHERE id = $1", [agent.id]);
                  const currentCredits = creditsRes.rows[0]?.credits ?? 0;

                  if (broadcast.message_type === "template" && currentCredits < 0.01) {
                    throw new Error("Insufficient credits left to send message");
                  }

                  if (broadcast.message_type === "text" && customer.last_user_message_time) {
                    const now = new Date();
                    const lastTime = new Date(customer.last_user_message_time);
                    const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

                    if (hoursSince > 24) {
                      throw new Error("Cannot send free-text message after 24h window (template required)");
                    }
                  }

                  let normalizedPhone = customer.phone.replace(/\D/g, "");
                  if (!normalizedPhone.startsWith("1") && normalizedPhone.length === 10) {
                    normalizedPhone = "1" + normalizedPhone;
                  }
                  normalizedPhone = "+" + normalizedPhone;

                  let whatsappPayload: any;

                  if (broadcast.message_type === "text") {
                    whatsappPayload = {
                      messaging_product: "whatsapp",
                      recipient_type: "individual",
                      to: normalizedPhone,
                      type: "text",
                      text: { body: broadcast.message },
                    };
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

                    if (header_params && header_params.length > 0) {
                      components.push({
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

                  const messageText = broadcast.message_type === "text" ? broadcast.message : broadcast.template_name;
                  const { rows: insertedMessageRows } = await pgClient.query(
                    `INSERT INTO ${agentPrefix}_messages (customer_id, message, direction, timestamp, is_read) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                    [
                      customer.id,
                      messageText,
                      "outbound",
                      new Date(),
                      true,
                    ]
                  );

                  if (broadcast.message_type === "template") {
                    await pgClient.query(
                      "UPDATE agents SET credits = credits - 0.01 WHERE id = $1",
                      [agent.id]
                    );
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
                      media_type: "none",
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
              }

              const finalStatus = (sentCount === 0) ? "failed" : "completed";
              await pgClient.query(
                `UPDATE ${agentPrefix}_broadcasts SET status = $1, updated_at = now() WHERE id = $2`,
                [finalStatus, broadcast_id]
              );
            })();

            return;
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

          // Check credits for templates
          if (message_type === "template") {
            const requiredCredits = recipient_ids.length * 0.01;
            if (agent.credits < requiredCredits) {
              return reply.code(400).send({
                success: false,
                message: `Insufficient credits. Required: ${requiredCredits.toFixed(2)}, Available: ${agent.credits.toFixed(2)}`,
              });
            }
          }

          // Resolve recipient customer records
          const customersQuery = `
            SELECT id, name, phone, last_user_message_time 
            FROM ${agentPrefix}_customers 
            WHERE id = ANY($1)
          `;
          const { rows: targetCustomers } = await pgClient.query(customersQuery, [recipient_ids]);

          if (targetCustomers.length === 0) {
            return reply.code(400).send({
              success: false,
              message: "No valid customers resolved for the provided recipient IDs",
            });
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
            VALUES ${targetCustomers.map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, 'pending')`).join(', ')}
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

          // Background sending loop (Asynchronous)
          (async () => {
            let sentCount = 0;
            let failedCount = 0;

            for (const customer of targetCustomers) {
              try {
                // Fetch latest credit count check
                const creditsRes = await pgClient.query("SELECT credits FROM agents WHERE id = $1", [agent.id]);
                const currentCredits = creditsRes.rows[0]?.credits ?? 0;

                if (message_type === "template" && currentCredits < 0.01) {
                  throw new Error("Insufficient credits left to send message");
                }

                // Check 24 hour window for text messages
                if (message_type === "text" && customer.last_user_message_time) {
                  const now = new Date();
                  const lastTime = new Date(customer.last_user_message_time);
                  const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

                  if (hoursSince > 24) {
                    throw new Error("Cannot send free-text message after 24h window (template required)");
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
                  whatsappPayload = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: normalizedPhone,
                    type: "text",
                    text: { body: message },
                  };
                } else {
                  // Template payload building
                  let components: any[] = [];
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

                  if (header_params && header_params.length > 0) {
                    components.push({
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
                const messageText = message_type === "text" ? message : template_name;
                const { rows: insertedMessageRows } = await pgClient.query(
                  `INSERT INTO ${agentPrefix}_messages (customer_id, message, direction, timestamp, is_read) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                  [
                    customer.id,
                    messageText,
                    "outbound",
                    new Date(),
                    true,
                  ]
                );

                // Deduct credits if template
                if (message_type === "template") {
                  await pgClient.query(
                    "UPDATE agents SET credits = credits - 0.01 WHERE id = $1",
                    [agent.id]
                  );
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
                    media_type: "none",
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
            }

            // Mark campaign as completed
            const finalStatus = failedCount === targetCustomers.length ? "failed" : "completed";
            await pgClient.query(
              `UPDATE ${agentPrefix}_broadcasts SET status = $1, updated_at = now() WHERE id = $2`,
              [finalStatus, broadcastId]
            );

          })();

          break;
        }

        case "DELETE": {
          const id = url.searchParams.get("id");

          if (!id) {
            return reply.code(400).send({
              success: false,
              message: "Broadcast campaign ID is required",
            });
          }

          // Check if broadcast exists
          const checkQuery = `SELECT status FROM ${agentPrefix}_broadcasts WHERE id = $1`;
          const { rows: campaigns } = await pgClient.query(checkQuery, [id]);

          if (campaigns.length === 0) {
            return reply.code(404).send({
              success: false,
              message: "Broadcast campaign not found",
            });
          }

          if (campaigns[0].status === "processing") {
            return reply.code(400).send({
              success: false,
              message: "Cannot delete a campaign that is currently processing messages",
            });
          }

          // Delete the broadcast campaign record (will cascade delete recipients)
          const deleteQuery = `DELETE FROM ${agentPrefix}_broadcasts WHERE id = $1`;
          await pgClient.query(deleteQuery, [id]);

          return reply.code(200).send({
            success: true,
            message: "Broadcast campaign deleted successfully",
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
