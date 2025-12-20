import crypto from 'crypto';
import { uploadMediaToR2 } from './s3';

export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function verifyJWT(request: any, supabaseClient: any) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header required');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    console.error('Auth error:', authError);
    throw new Error('Invalid or expired token');
  }

  return user;
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
  supabaseClient: any,
  agentPrefix: string,
  mediaBuffer: Buffer,
  originalFilename: string,
  contentType: string
): Promise<string | null> {
  // Use R2 instead of Supabase Storage
  return uploadMediaToR2(agentPrefix, mediaBuffer, originalFilename, contentType, 'incoming');
}

export async function processIncomingMessage(
  supabaseClient: any,
  message: any,
  phoneNumberId: string,
  contactName: string,
  emitNewMessage?: (agentId: number, messageData: any) => void,
  cacheService?: any
) {
  try {
    console.log('Processing message:', message.id, message.type);

    const { data: whatsappConfig } = await supabaseClient
      .from('whatsapp_configuration')
      .select('user_id, api_key, webhook_url')
      .eq('phone_number_id', phoneNumberId)
      .eq('is_active', true)
      .single();

    if (!whatsappConfig) {
      console.log('No config for phone:', phoneNumberId);
      return;
    }

    const { data: agent } = await supabaseClient
      .from('agents')
      .select('id, agent_prefix')
      .eq('user_id', whatsappConfig.user_id)
      .single();

    if (!agent) {
      console.log('No agent for user:', whatsappConfig.user_id);
      return;
    }

    const customersTable = `${agent.agent_prefix}_customers`;
    const messagesTable = `${agent.agent_prefix}_messages`;

    const fromPhone = message.from;
    let customerId;

    const { data: existingCustomer } = await supabaseClient
      .from(customersTable)
      .select('id')
      .eq('phone', fromPhone)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: insertError } = await supabaseClient
        .from(customersTable)
        .insert({
          phone: fromPhone,
          name: contactName || fromPhone,
          agent_id: agent.id,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting new customer:', insertError);
        return;
      }

      if (!newCustomer || !newCustomer.id) {
        console.error('Failed to create customer - no ID returned');
        return;
      }

      customerId = newCustomer.id;
      console.log('New customer created successfully');
    }

    let { data: customer, error: customerError } = await supabaseClient
      .from(customersTable)
      .select('id, name, ai_enabled, language')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      console.log(
        'Warning: Could not fetch customer ai_enabled, assuming false'
      );
      customer = {
        id: customerId,
        name: contactName || fromPhone,
        ai_enabled: false,
        language: 'english',
      };
    }

    const { error: updateError } = await supabaseClient
      .from(customersTable)
      .update({ last_user_message_time: new Date().toISOString() })
      .eq('id', customerId);

    if (updateError) {
      console.error('Error updating last_user_message_time:', updateError);
    } else {
      console.log(`Updated last_user_message_time for customer ${customerId}`);
    }

    const messageDate = new Date(message.timestamp * 1000);
    const messageTimestamp = messageDate.toISOString();

    console.log('Timestamp conversion:', {
      whatsappTimestamp: message.timestamp,
      convertedDate: messageDate.toISOString(),
      localString: messageDate.toLocaleString(),
    });

    let messageText = '';
    let mediaType: 'none' | 'image' | 'video' | 'audio' | 'document' | 'sticker' = 'none';
    let mediaUrl: string | null = null;
    let caption: string | null = null;

    if (message.type === 'text') {
      messageText = message.text.body;
    } else if (['image', 'video', 'audio', 'document'].includes(message.type)) {
      mediaType = getMediaTypeFromWhatsApp(message.type);
      caption = message[message.type]?.caption || null;
      messageText = caption || `[${message.type.toUpperCase()}] Media file`;

      if (message[message.type]?.id && whatsappConfig.api_key) {
        console.log(
          `Downloading ${message.type} media: ${message[message.type].id}`
        );

        const mediaBuffer = await downloadWhatsAppMedia(
          message[message.type].id,
          whatsappConfig.api_key
        );

        if (mediaBuffer && mediaBuffer.length > 0) {
          let contentType = 'application/octet-stream';
          let filename = `media_${Date.now()}.${message.type}`;

          if (message[message.type].mime_type) {
            contentType = message[message.type].mime_type;
            const ext = contentType.split('/')[1] || message.type;
            filename = `media_${Date.now()}.${ext}`;
          }

          mediaUrl = await uploadMediaToStorage(
            supabaseClient,
            agent.agent_prefix,
            mediaBuffer,
            filename,
            contentType
          );

          if (mediaUrl) {
            console.log(`Media uploaded successfully: ${mediaUrl}`);
          } else {
            console.error('Failed to upload media to storage');
          }
        } else {
          console.error(
            `Failed to download media: ${message[message.type].id}`
          );
        }
      }
    } else if (message.type === 'sticker') {
      mediaType = 'sticker';
      messageText = '[STICKER] Sticker message';

      if (message.sticker?.id && whatsappConfig.api_key) {
        const mediaBuffer = await downloadWhatsAppMedia(
          message.sticker.id,
          whatsappConfig.api_key
        );
        if (mediaBuffer && mediaBuffer.length > 0) {
          mediaUrl = await uploadMediaToStorage(
            supabaseClient,
            agent.agent_prefix,
            mediaBuffer,
            `sticker_${Date.now()}.webp`,
            'image/webp'
          );
        }
      }
    } else if (message.type === 'button') {
      console.log(
        '🔍 DEBUG: Full button message payload:',
        JSON.stringify(message, null, 2)
      );
      console.log('🔍 DEBUG: Button reply details:', message.button?.reply);

      messageText =
        message.button?.reply?.title ||
        message.button?.reply?.id ||
        'Button clicked';
    } else if (message.type === 'interactive') {
      console.log(
        '🔍 DEBUG: Full interactive message payload:',
        JSON.stringify(message, null, 2)
      );
      console.log('🔍 DEBUG: Interactive type:', message.interactive?.type);
      console.log(
        '🔍 DEBUG: Button reply details:',
        message.interactive?.button_reply
      );

      if (message.interactive?.type === 'button_reply') {
        messageText =
          message.interactive.button_reply?.title || 'Button clicked';
      } else {
        messageText = `[INTERACTIVE_${
          message.interactive?.type?.toUpperCase() || 'UNKNOWN'
        }] Interactive message`;
      }
    } else {
      messageText = `[${message.type.toUpperCase()}] Unsupported message type`;
    }

    const messageData = {
      customer_id: customerId,
      message: messageText,
      direction: 'inbound',
      timestamp: messageTimestamp,
      is_read: false,
      media_type: mediaType,
      media_url: mediaUrl,
      caption: caption,
    };

    const { data: insertedMessage, error: insertError } = await supabaseClient
      .from(messagesTable)
      .insert(messageData)
      .select()
      .single();

    if (insertError) {
      console.error('Error storing message:', insertError);
    } else {
      console.log('Message stored successfully in dynamic table:', {
        id: insertedMessage.id,
        type: message.type,
        mediaType,
        hasMediaUrl: !!mediaUrl,
      });

      // Invalidate cache for chat list and recent messages
      if (cacheService) {
        await cacheService.invalidateChatList(agent.id);
        await cacheService.invalidateRecentMessages(agent.id, customerId);
        console.log('Cache invalidated for agent', agent.id, 'customer', customerId);
      }

      // Emit socket event for new message
      if (emitNewMessage) {
        const messageDataForSocket = {
          id: insertedMessage.id,
          customer_id: insertedMessage.customer_id,
          message: insertedMessage.message,
          sender_type: 'customer',
          timestamp: insertedMessage.timestamp,
          media_type: insertedMessage.media_type,
          media_url: insertedMessage.media_url,
          caption: insertedMessage.caption,
        };
        emitNewMessage(agent.id, messageDataForSocket);
      }

      if (customer.ai_enabled && whatsappConfig?.webhook_url) {
        console.log(
          `Triggering agent webhook for AI-enabled customer ${customer.id}`
        );
        const payload = {
          event: 'message_received',
          data: {
            ...insertedMessage,
            customer_phone: fromPhone,
            customer_name: customer.name,
            customer_language: customer.language || 'english',
            agent_prefix: agent.agent_prefix,
            agent_user_id: whatsappConfig.user_id,
            phone_number_id: phoneNumberId,
            chatbot_secret: process.env.CHATBOT_SECRET ?? 'default-secret-change-in-prod',
            chatbot_reply_url: `${process.env.BACKEND_URL ?? 'http://localhost:8080'}/chatbot-reply`,
          },
        };
        try {
          const response = await fetch(whatsappConfig.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `Agent webhook failed: HTTP ${response.status} - ${errorText}`
            );
          } else {
            console.log('Agent webhook triggered successfully');
          }
        } catch (webhookError) {
          console.error('Error triggering agent webhook:', webhookError);
        }
      }
    }
  } catch (error) {
    console.error('Message processing error:', error);
  }
}

export async function processMessageStatus(supabaseClient: any, status: any) {
  try {
    console.log(
      '📨 Processing message status update:',
      status.id,
      status.status
    );

    const statusDate = new Date(status.timestamp * 1000);
    const statusTimestamp = statusDate.toISOString();

    console.log('Status timestamp conversion:', {
      whatsappTimestamp: status.timestamp,
      convertedDate: statusDate.toISOString(),
      localString: statusDate.toLocaleString(),
    });

    console.log(
      `📨 Message ${status.id} status: "${status.status}" at ${statusTimestamp}`
    );

    // Update the status in whatsapp_message_logs
    const { error: updateError } = await supabaseClient
      .from('whatsapp_message_logs')
      .update({
        status: status.status,
        timestamp: statusTimestamp,
      })
      .eq('whatsapp_message_id', status.id);

    if (updateError) {
      console.error('Error updating message status in logs:', updateError);
    } else {
      console.log(`✅ Updated status for message ${status.id} to ${status.status}`);
    }
  } catch (error) {
    console.error('Status processing error:', error);
  }
}