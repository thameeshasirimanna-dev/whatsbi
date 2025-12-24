import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { uploadMediaToR2 } from './s3';

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
  console.log('JWT token received, length:', token.length);

  try {
    // Decode the JWT without verification first to get the user ID
    const decoded = jwt.decode(token) as any;
    console.log('Decoded JWT:', decoded);
    if (!decoded || !decoded.sub) {
      console.error('Invalid token structure - decoded:', decoded);
      throw new Error('Invalid token structure');
    }

    const userId = decoded.sub;
    console.log('Extracted userId:', userId);

    // Verify the user exists in the database
    const { rows } = await pgClient.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
    if (rows.length === 0) {
      console.error('User not found in database for userId:', userId);
      throw new Error('User not found');
    }

    return { id: userId, email: rows[0].email, role: rows[0].role };
  } catch (error) {
    console.error('JWT verification error:', error);
    throw new Error('Invalid or expired token');
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
    let isNewCustomer = false;

    const { rows: whatsappConfigRows } = await pgClient.query(
      "SELECT user_id, api_key, webhook_url FROM whatsapp_configuration WHERE phone_number_id = $1 AND is_active = true",
      [phoneNumberId]
    );

    if (whatsappConfigRows.length === 0) {
      return;
    }

    const whatsappConfig = whatsappConfigRows[0];

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

    const { rows: existingCustomerRows } = await pgClient.query(
      `SELECT id FROM ${customersTable} WHERE phone = $1`,
      [fromPhone]
    );

    if (existingCustomerRows.length > 0) {
      customerId = existingCustomerRows[0].id;
    } else {
      const { rows: newCustomerRows, rowCount } = await pgClient.query(
        `INSERT INTO ${customersTable} (phone, name, agent_id) VALUES ($1, $2, $3) RETURNING id`,
        [fromPhone, contactName || fromPhone, agent.id]
      );

      if (rowCount === 0) {
        return;
      }

      customerId = newCustomerRows[0].id;
      isNewCustomer = true;
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
        language: "english",
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
    } else if (["image", "video", "audio", "document"].includes(message.type)) {
      mediaType = getMediaTypeFromWhatsApp(message.type);
      caption = message[message.type]?.caption || null;
      messageText = caption || `[${message.type.toUpperCase()}] Media file`;

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
            const ext = contentType.split("/")[1] || message.type;
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
      console.log(
        "🔍 DEBUG: Full button message payload:",
        JSON.stringify(message, null, 2)
      );
      console.log("🔍 DEBUG: Button reply details:", message.button?.reply);

      messageText =
        message.button?.reply?.title ||
        message.button?.reply?.id ||
        "Button clicked";
    } else if (message.type === "interactive") {
      console.log(
        "🔍 DEBUG: Full interactive message payload:",
        JSON.stringify(message, null, 2)
      );
      console.log("🔍 DEBUG: Interactive type:", message.interactive?.type);
      console.log(
        "🔍 DEBUG: Button reply details:",
        message.interactive?.button_reply
      );

      if (message.interactive?.type === "button_reply") {
        messageText =
          message.interactive.button_reply?.title || "Button clicked";
      } else {
        messageText = `[INTERACTIVE_${
          message.interactive?.type?.toUpperCase() || "UNKNOWN"
        }] Interactive message`;
      }
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
      return;
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

    // Debug logging for webhook trigger conditions
    console.log(
      `DEBUG: Customer ${customer.id} ai_enabled: ${customer.ai_enabled}, webhook_url: ${whatsappConfig.webhook_url}`
    );

    // Trigger agent webhook if ai_enabled
    if (customer.ai_enabled && whatsappConfig.webhook_url) {
      console.log(
        `Triggering agent webhook for AI-enabled customer ${customer.id}`
      );
      const jwtToken = generateJWT(whatsappConfig.user_id);
      const payload = {
        event: "message_received",
        jwt_token: jwtToken,
        data: {
          ...insertedMessage,
          customer_phone: fromPhone,
          customer_name: customer.name,
          customer_language: customer.language || "english",
          agent_prefix: agent.agent_prefix,
          agent_user_id: whatsappConfig.user_id,
          phone_number_id: phoneNumberId,
        },
      };
      try {
        const response = await fetch(whatsappConfig.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Agent webhook failed: HTTP ${response.status} - ${errorText}`
          );
        } else {
          console.log("Agent webhook triggered successfully");
        }
      } catch (webhookError) {
        console.error("Error triggering agent webhook:", webhookError);
      }
    }
  } catch (error) {
    console.error('Message processing error:', error);
  }
}

export async function processMessageStatus(pgClient: any, status: any) {
  try {
    // Process message status updates silently
    const statusDate = new Date(status.timestamp * 1000);
    const statusTimestamp = statusDate.toISOString();

    // Status processing is now silent - no logging needed
  } catch (error) {
    console.error('Status processing error:', error);
  }
}