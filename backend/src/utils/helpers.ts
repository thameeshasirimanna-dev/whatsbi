import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { uploadMediaToR2 } from './s3.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import ffmpegPath from 'ffmpeg-static';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function verifyJWT(request: any, pgClient: any) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('No authorization header or not Bearer token');
    throw new Error('Authorization header required');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Decode the JWT without verification first to get the user ID
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.sub || decoded.sub === 'null' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded.sub)) {
      console.error('Invalid token structure. Raw Token:', token, 'Decoded:', decoded);
      throw new Error('Invalid token structure');
    }

    const userId = decoded.sub;

    // Verify the user exists in the database
    const { rows } = await pgClient.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
    if (rows.length === 0) {
      console.error('User not found in database for userId:', userId);
      throw new Error('User not found');
    }

    return { id: userId, email: rows[0].email, role: rows[0].role };
  } catch (error: any) {
    console.error('JWT verification error. Raw Token:', token, 'Error:', error.message || error);
    throw new Error('Invalid or expired token');
  }
}

export async function verifySocketToken(token: string, agentId: number, pgClient: any): Promise<boolean> {
  try {
    const secret = process.env.JWT_SECRET ?? "";
    
    let decoded: any = null;
    if (secret) {
      try {
        decoded = jwt.verify(token, secret) as any;
      } catch (err) {
        // Fallback to decode without verification (consistent with verifyJWT for Supabase tokens)
        decoded = jwt.decode(token) as any;
      }
    } else {
      decoded = jwt.decode(token) as any;
    }

    if (!decoded || !decoded.sub) {
      return false;
    }
    const userId = decoded.sub;

    // Fetch the user's role from the database
    const { rows: userRows } = await pgClient.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );
    if (userRows.length === 0) {
      return false;
    }

    // Admins have access to all agent rooms
    if (userRows[0].role === "admin") {
      return true;
    }

    // Check if the user exists and belongs to the agent with agentId
    const { rows } = await pgClient.query(
      "SELECT id FROM agents WHERE id = $1 AND (user_id = $2 OR id = (SELECT agent_id FROM users WHERE id = $2))",
      [agentId, userId]
    );
    return rows.length > 0;
  } catch (error) {
    console.error("Socket JWT verification error:", error);
    return false;
  }
}

export function generateJWT(userId: string): string {
  const secret = process.env.JWT_SECRET ?? "";
  if (!secret) {
    throw new Error("JWT_SECRET not configured");
  }

  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };

  return jwt.sign(payload, secret);
}

export function getMediaTypeFromWhatsApp(
  messageType: string,
  mimeType?: string
): 'none' | 'image' | 'video' | 'audio' | 'document' | 'sticker' {
  switch (messageType) {
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'audio':
    case 'voice':
      return 'audio';
    case 'document':
      return 'document';
    case 'sticker':
      return 'sticker';
    default:
      return 'none';
  }
}

export async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken: string
): Promise<Buffer | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        `Failed to download media ${mediaId}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const mediaData: any = await response.json();
    if (!mediaData.url) {
      console.error('No media URL in response:', mediaData);
      return null;
    }

    const fileResponse = await fetch(mediaData.url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!fileResponse.ok) {
      console.error(
        `Failed to download media file: ${fileResponse.status} ${fileResponse.statusText}`
      );
      return null;
    }

    const mediaBuffer = Buffer.from(await fileResponse.arrayBuffer());
    return mediaBuffer;
  } catch (error) {
    console.error('Error downloading WhatsApp media:', error);
    return null;
  }
}

export async function uploadMediaToStorage(
  pgClient: any,
  agentPrefix: string,
  mediaBuffer: Buffer,
  originalFilename: string,
  contentType: string
): Promise<string | null> {
  // Use R2 instead of Supabase Storage
  return uploadMediaToR2(agentPrefix, mediaBuffer, originalFilename, contentType, 'incoming');
}

export async function processIncomingMessage(
  pgClient: any,
  message: any,
  phoneNumberId: string,
  contactName: string,
  emitNewMessage?: (agentId: number, messageData: any) => void,
  cacheService?: any
) {
  try {
    const { rows: whatsappConfigRows } = await pgClient.query(
      "SELECT user_id, api_key, webhook_url FROM whatsapp_configuration WHERE phone_number_id = $1 AND is_active = true",
      [phoneNumberId]
    );

    if (whatsappConfigRows.length === 0) {
      return;
    }

    for (const whatsappConfig of whatsappConfigRows) {
      try {
        let isNewCustomer = false;

        const { rows: agentRows } = await pgClient.query(
          "SELECT id, agent_prefix FROM agents WHERE user_id = $1",
          [whatsappConfig.user_id]
        );

        if (agentRows.length === 0) {
          return;
        }

        const agent = agentRows[0];

        const customersTable = `${agent.agent_prefix}_customers`;
        const messagesTable = `${agent.agent_prefix}_messages`;

        const fromPhone = message.from;
        let customerId;

        const cleanFromPhone = fromPhone.replace(/\D/g, "");

        const { rows: existingCustomerRows } = await pgClient.query(
          `SELECT id FROM ${customersTable} WHERE phone = $1`,
          [cleanFromPhone]
        );

        if (existingCustomerRows.length > 0) {
          customerId = existingCustomerRows[0].id;
        } else {
          try {
            const { rows: newCustomerRows, rowCount } = await pgClient.query(
              `INSERT INTO ${customersTable} (phone, name, agent_id) VALUES ($1, $2, $3) RETURNING id`,
              [cleanFromPhone, contactName || fromPhone, agent.id]
            );

            if (rowCount === 0) {
              continue;
            }

            customerId = newCustomerRows[0].id;
            isNewCustomer = true;
          } catch (insertError: any) {
            // Handle race condition where customer was inserted concurrently
            if (insertError.code === "23505") {
              const { rows: retryRows } = await pgClient.query(
                `SELECT id FROM ${customersTable} WHERE phone = $1`,
                [cleanFromPhone]
              );
              if (retryRows.length > 0) {
                customerId = retryRows[0].id;
              } else {
                throw insertError;
              }
            } else {
              throw insertError;
            }
          }
        }

        const { rows: customerRows } = await pgClient.query(
          `SELECT id, name, ai_enabled, language FROM ${customersTable} WHERE id = $1`,
          [customerId]
        );

        let customer;
        if (customerRows.length === 0) {
          customer = {
            id: customerId,
            name: contactName || fromPhone,
            ai_enabled: false,
            language: "sinhala",
          };
        } else {
          customer = customerRows[0];
        }

        const { rowCount: updateCount } = await pgClient.query(
          `UPDATE ${customersTable} SET last_user_message_time = $1 WHERE id = $2`,
          [new Date().toISOString(), customerId]
        );

        if (updateCount === 0) {
          console.error("Error updating last_user_message_time");
        }

        const messageDate = new Date(message.timestamp * 1000);
        const messageTimestamp = messageDate.toISOString();

        let messageText = "";
        let mediaType:
          | "none"
          | "image"
          | "video"
          | "audio"
          | "document"
          | "sticker" = "none";
        let mediaUrl: string | null = null;
        let caption: string | null = null;

        if (message.type === "text") {
          messageText = message.text.body;
        } else if (["image", "video", "audio", "voice", "document"].includes(message.type)) {
          mediaType = getMediaTypeFromWhatsApp(message.type);
          caption = message[message.type]?.caption || null;
          messageText = caption || (message.type === 'voice' ? '[Voice Message]' : `[${message.type.toUpperCase()}] Media file`);

          if (message[message.type]?.id && whatsappConfig.api_key) {
            const mediaBuffer = await downloadWhatsAppMedia(
              message[message.type].id,
              whatsappConfig.api_key
            );

            if (mediaBuffer && mediaBuffer.length > 0) {
              let contentType = "application/octet-stream";
              let filename = `media_${Date.now()}.${message.type}`;

              if (message[message.type].mime_type) {
                contentType = message[message.type].mime_type;
                const cleanMime = contentType.split(";")[0].trim();
                const ext = cleanMime.split("/")[1] || message.type;
                filename = `media_${Date.now()}.${ext}`;
              }

              mediaUrl = await uploadMediaToStorage(
                pgClient,
                agent.agent_prefix,
                mediaBuffer,
                filename,
                contentType
              );

              if (!mediaUrl) {
                console.error("Failed to upload media to storage");
              }
            }
          }
        } else if (message.type === "sticker") {
          mediaType = "sticker";
          messageText = "[STICKER] Sticker message";

          if (message.sticker?.id && whatsappConfig.api_key) {
            const mediaBuffer = await downloadWhatsAppMedia(
              message.sticker.id,
              whatsappConfig.api_key
            );
            if (mediaBuffer && mediaBuffer.length > 0) {
              mediaUrl = await uploadMediaToStorage(
                pgClient,
                agent.agent_prefix,
                mediaBuffer,
                `sticker_${Date.now()}.webp`,
                "image/webp"
              );
            }
          }
        } else if (message.type === "button") {
          messageText =
            message.button?.reply?.title ||
            message.button?.reply?.id ||
            "Button clicked";
        } else if (message.type === "interactive") {
          if (message.interactive?.type === "button_reply") {
            messageText =
              message.interactive.button_reply?.title || "Button clicked";
          } else {
            messageText = `[INTERACTIVE_${
              message.interactive?.type?.toUpperCase() || "UNKNOWN"
            }] Interactive message`;
          }
        } else if (message.type === "reaction") {
          const emoji = message.reaction?.emoji || "";
          messageText = emoji ? `Reacted ${emoji}` : "Reacted to a message";
        } else {
          messageText = `[${message.type.toUpperCase()}] Unsupported message type`;
        }

        const messageData = {
          customer_id: customerId,
          message: messageText,
          direction: "inbound",
          timestamp: messageTimestamp,
          is_read: false,
          media_type: mediaType,
          media_url: mediaUrl,
          caption: caption,
        };

        const { rows: insertedMessageRows, rowCount } = await pgClient.query(
          `INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            messageData.customer_id,
            messageData.message,
            messageData.direction,
            messageData.timestamp,
            messageData.is_read,
            messageData.media_type,
            messageData.media_url,
            messageData.caption,
          ]
        );

        if (rowCount === 0) {
          console.error("❌ Error storing message: no rows inserted");
          continue;
        }

        const insertedMessage = insertedMessageRows[0];

        // Invalidate cache for chat list and recent messages
        if (cacheService) {
          await cacheService.invalidateChatList(agent.id);
          await cacheService.invalidateRecentMessages(agent.id, customerId);
        }

        // Emit socket event for new message
        if (emitNewMessage) {
          const messageDataForSocket = {
            id: insertedMessage.id,
            customer_id: insertedMessage.customer_id,
            customer_name: customer.name,
            customer_phone: fromPhone,
            message: insertedMessage.message,
            sender_type: "customer",
            timestamp: insertedMessage.timestamp,
            media_type: insertedMessage.media_type,
            media_url: insertedMessage.media_url,
            caption: insertedMessage.caption,
          };
          emitNewMessage(agent.id, messageDataForSocket);
        }

        // Trigger agent webhook if ai_enabled
        if (customer.ai_enabled && whatsappConfig.webhook_url) {
          const jwtToken = generateJWT(whatsappConfig.user_id);
          const payload = {
            event: "message_received",
            jwt_token: jwtToken,
            data: {
              ...insertedMessage,
              customer_phone: fromPhone,
              customer_name: customer.name,
              customer_language: customer.language || "sinhala",
              agent_prefix: agent.agent_prefix,
              agent_user_id: whatsappConfig.user_id,
              phone_number_id: phoneNumberId,
            },
          };
          try {
            let response = await fetch(whatsappConfig.webhook_url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwtToken}`,
              },
              body: JSON.stringify(payload),
            });
            if (response.status === 404 && whatsappConfig.webhook_url.includes('/webhook/')) {
              const testWebhookUrl = whatsappConfig.webhook_url.replace('/webhook/', '/webhook-test/');
              response = await fetch(testWebhookUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${jwtToken}`,
                },
                body: JSON.stringify(payload),
              });
            }
            if (!response.ok) {
              const errorText = await response.text();
              console.error(
                `Agent webhook failed: HTTP ${response.status} - ${errorText}`
              );
            }
          } catch (webhookError) {
            console.error("Error triggering agent webhook:", webhookError);
          }
        }
      } catch (innerError) {
        console.error(`Error processing message for user_id: ${whatsappConfig.user_id}`, innerError);
      }
    }
  } catch (error) {
    console.error('Message processing error:', error);
  }
}

export async function processMessageStatus(pgClient: any, status: any) {
  try {
    const statusDate = new Date(status.timestamp * 1000);
    const statusTimestamp = statusDate.toISOString();

    console.log(
      `📨 WhatsApp Status Update: id=${status.id}, recipient=${status.recipient_id}, status="${status.status}" at ${statusTimestamp}`
    );

    if (status.status === 'failed' && status.errors) {
      console.error(`❌ Message ${status.id} delivery failed:`, JSON.stringify(status.errors));
    }
  } catch (error) {
    console.error('Status processing error:', error);
  }
}

export async function transcodeWebmToOgg(webmBuffer: Buffer, originalFilename: string = 'input.webm'): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static binary path is not available');
  }

  // Define temp directory locally within backend project workspace
  const tempDir = path.resolve(__dirname, '..', '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const uniqueId = crypto.randomBytes(16).toString('hex');
  const inputExt = path.extname(originalFilename) || '.webm';
  const inputPath = path.join(tempDir, `input_${uniqueId}${inputExt}`);
  const outputPath = path.join(tempDir, `output_${uniqueId}.ogg`);

  try {
    // Write input buffer to temp file with original extension
    await fs.promises.writeFile(inputPath, webmBuffer);

    // Run ffmpeg to convert to OGG/Opus
    // -vn: disable video track
    // -c:a libopus: encode using Opus codec
    // -ar 16000: set sample rate to 16kHz
    // -ac 1: mono channel (required by WhatsApp)
    // -b:a 16k: 16kbps bitrate (optimized to keep files under 512KB for inline play icon support)
    // -y: overwrite output files
    await execFileAsync(ffmpegPath, [
      '-i', inputPath,
      '-map_metadata', '-1',
      '-map_metadata:s:a', '-1',
      '-vn',
      '-c:a', 'libopus',
      '-ar', '16000',
      '-ac', '1',
      '-b:a', '16k',
      '-y',
      outputPath
    ]);

    // Read converted OGG back to buffer
    const oggBuffer = await fs.promises.readFile(outputPath);
    return oggBuffer;
  } catch (error: any) {
    console.error(`Error transcoding ${inputExt} to OGG:`, error);
    throw new Error(`Transcoding failed: ${error.message || error}`);
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(inputPath)) {
        await fs.promises.unlink(inputPath);
      }
    } catch (e) {
      console.error('Error deleting temp input file:', e);
    }
    try {
      if (fs.existsSync(outputPath)) {
        await fs.promises.unlink(outputPath);
      }
    } catch (e) {
      console.error('Error deleting temp output file:', e);
    }
  }
}