import jwt from 'jsonwebtoken';
import { uploadMediaToR2 } from './s3';
export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export async function verifyJWT(request, pgClient) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Authorization header required');
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    try {
        // Decode the JWT without verification first to get the user ID
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.sub) {
            throw new Error('Invalid token structure');
        }
        const userId = decoded.sub;
        // Verify the user exists in the database
        const { rows } = await pgClient.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
        if (rows.length === 0) {
            throw new Error('User not found');
        }
        return { id: userId, email: rows[0].email, role: rows[0].role };
    }
    catch (error) {
        console.error('JWT verification error:', error);
        throw new Error('Invalid or expired token');
    }
}
export function getMediaTypeFromWhatsApp(messageType, mimeType) {
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
export async function downloadWhatsAppMedia(mediaId, accessToken) {
    try {
        const response = await fetch(`https://graph.facebook.com/v23.0/${mediaId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            console.error(`Failed to download media ${mediaId}: ${response.status} ${response.statusText}`);
            return null;
        }
        const mediaData = await response.json();
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
            console.error(`Failed to download media file: ${fileResponse.status} ${fileResponse.statusText}`);
            return null;
        }
        const mediaBuffer = Buffer.from(await fileResponse.arrayBuffer());
        return mediaBuffer;
    }
    catch (error) {
        console.error('Error downloading WhatsApp media:', error);
        return null;
    }
}
export async function uploadMediaToStorage(pgClient, agentPrefix, mediaBuffer, originalFilename, contentType) {
    // Use R2 instead of Supabase Storage
    return uploadMediaToR2(agentPrefix, mediaBuffer, originalFilename, contentType, 'incoming');
}
export async function processIncomingMessage(pgClient, message, phoneNumberId, contactName, emitNewMessage, cacheService) {
    try {
        console.log('Processing message:', message.id, message.type);
        const { rows: whatsappConfigRows } = await pgClient.query('SELECT user_id, api_key, webhook_url FROM whatsapp_configuration WHERE phone_number_id = $1 AND is_active = true', [phoneNumberId]);
        if (whatsappConfigRows.length === 0) {
            console.log('No config for phone:', phoneNumberId);
            return;
        }
        const whatsappConfig = whatsappConfigRows[0];
        const { rows: agentRows } = await pgClient.query('SELECT id, agent_prefix FROM agents WHERE user_id = $1', [whatsappConfig.user_id]);
        if (agentRows.length === 0) {
            console.log('No agent for user:', whatsappConfig.user_id);
            return;
        }
        const agent = agentRows[0];
        const customersTable = `${agent.agent_prefix}_customers`;
        const messagesTable = `${agent.agent_prefix}_messages`;
        const fromPhone = message.from;
        let customerId;
        const { rows: existingCustomerRows } = await pgClient.query(`SELECT id FROM ${customersTable} WHERE phone = $1`, [fromPhone]);
        if (existingCustomerRows.length > 0) {
            customerId = existingCustomerRows[0].id;
        }
        else {
            const { rows: newCustomerRows, rowCount } = await pgClient.query(`INSERT INTO ${customersTable} (phone, name, agent_id) VALUES ($1, $2, $3) RETURNING id`, [fromPhone, contactName || fromPhone, agent.id]);
            if (rowCount === 0) {
                console.error('Error inserting new customer');
                return;
            }
            customerId = newCustomerRows[0].id;
            console.log('New customer created successfully');
        }
        const { rows: customerRows } = await pgClient.query(`SELECT id, name, ai_enabled, language FROM ${customersTable} WHERE id = $1`, [customerId]);
        let customer;
        if (customerRows.length === 0) {
            console.log('Warning: Could not fetch customer ai_enabled, assuming false');
            customer = {
                id: customerId,
                name: contactName || fromPhone,
                ai_enabled: false,
                language: 'english',
            };
        }
        else {
            customer = customerRows[0];
        }
        const { rowCount: updateCount } = await pgClient.query(`UPDATE ${customersTable} SET last_user_message_time = $1 WHERE id = $2`, [new Date().toISOString(), customerId]);
        if (updateCount > 0) {
            console.log(`Updated last_user_message_time for customer ${customerId}`);
        }
        else {
            console.error('Error updating last_user_message_time');
        }
        const messageDate = new Date(message.timestamp * 1000);
        const messageTimestamp = messageDate.toISOString();
        console.log('Timestamp conversion:', {
            whatsappTimestamp: message.timestamp,
            convertedDate: messageDate.toISOString(),
            localString: messageDate.toLocaleString(),
        });
        let messageText = '';
        let mediaType = 'none';
        let mediaUrl = null;
        let caption = null;
        if (message.type === 'text') {
            messageText = message.text.body;
        }
        else if (['image', 'video', 'audio', 'document'].includes(message.type)) {
            mediaType = getMediaTypeFromWhatsApp(message.type);
            caption = message[message.type]?.caption || null;
            messageText = caption || `[${message.type.toUpperCase()}] Media file`;
            if (message[message.type]?.id && whatsappConfig.api_key) {
                console.log(`Downloading ${message.type} media: ${message[message.type].id}`);
                const mediaBuffer = await downloadWhatsAppMedia(message[message.type].id, whatsappConfig.api_key);
                if (mediaBuffer && mediaBuffer.length > 0) {
                    let contentType = 'application/octet-stream';
                    let filename = `media_${Date.now()}.${message.type}`;
                    if (message[message.type].mime_type) {
                        contentType = message[message.type].mime_type;
                        const ext = contentType.split('/')[1] || message.type;
                        filename = `media_${Date.now()}.${ext}`;
                    }
                    mediaUrl = await uploadMediaToStorage(pgClient, agent.agent_prefix, mediaBuffer, filename, contentType);
                    if (mediaUrl) {
                        console.log(`Media uploaded successfully: ${mediaUrl}`);
                    }
                    else {
                        console.error('Failed to upload media to storage');
                    }
                }
                else {
                    console.error(`Failed to download media: ${message[message.type].id}`);
                }
            }
        }
        else if (message.type === 'sticker') {
            mediaType = 'sticker';
            messageText = '[STICKER] Sticker message';
            if (message.sticker?.id && whatsappConfig.api_key) {
                const mediaBuffer = await downloadWhatsAppMedia(message.sticker.id, whatsappConfig.api_key);
                if (mediaBuffer && mediaBuffer.length > 0) {
                    mediaUrl = await uploadMediaToStorage(pgClient, agent.agent_prefix, mediaBuffer, `sticker_${Date.now()}.webp`, 'image/webp');
                }
            }
        }
        else if (message.type === 'button') {
            console.log('🔍 DEBUG: Full button message payload:', JSON.stringify(message, null, 2));
            console.log('🔍 DEBUG: Button reply details:', message.button?.reply);
            messageText =
                message.button?.reply?.title ||
                    message.button?.reply?.id ||
                    'Button clicked';
        }
        else if (message.type === 'interactive') {
            console.log('🔍 DEBUG: Full interactive message payload:', JSON.stringify(message, null, 2));
            console.log('🔍 DEBUG: Interactive type:', message.interactive?.type);
            console.log('🔍 DEBUG: Button reply details:', message.interactive?.button_reply);
            if (message.interactive?.type === 'button_reply') {
                messageText =
                    message.interactive.button_reply?.title || 'Button clicked';
            }
            else {
                messageText = `[INTERACTIVE_${message.interactive?.type?.toUpperCase() || 'UNKNOWN'}] Interactive message`;
            }
        }
        else {
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
        const { rows: insertedMessageRows, rowCount } = await pgClient.query(`INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [messageData.customer_id, messageData.message, messageData.direction, messageData.timestamp, messageData.is_read, messageData.media_type, messageData.media_url, messageData.caption]);
        if (rowCount === 0) {
            console.error('Error storing message');
        }
        else {
            const insertedMessage = insertedMessageRows[0];
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
                console.log(`Triggering agent webhook for AI-enabled customer ${customer.id}`);
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
                        console.error(`Agent webhook failed: HTTP ${response.status} - ${errorText}`);
                    }
                    else {
                        console.log('Agent webhook triggered successfully');
                    }
                }
                catch (webhookError) {
                    console.error('Error triggering agent webhook:', webhookError);
                }
            }
        }
    }
    catch (error) {
        console.error('Message processing error:', error);
    }
}
export async function processMessageStatus(pgClient, status) {
    try {
        console.log('📨 Processing message status update:', status.id, status.status);
        const statusDate = new Date(status.timestamp * 1000);
        const statusTimestamp = statusDate.toISOString();
        console.log('Status timestamp conversion:', {
            whatsappTimestamp: status.timestamp,
            convertedDate: statusDate.toISOString(),
            localString: statusDate.toLocaleString(),
        });
        console.log(`📨 Message ${status.id} status: "${status.status}" at ${statusTimestamp}`);
        // Update the status in whatsapp_message_logs
        const { rowCount } = await pgClient.query('UPDATE whatsapp_message_logs SET status = $1, timestamp = $2 WHERE whatsapp_message_id = $3', [status.status, statusTimestamp, status.id]);
        if (rowCount === 0) {
            console.error('Error updating message status in logs: no rows affected');
        }
        else {
            console.log(`✅ Updated status for message ${status.id} to ${status.status}`);
        }
    }
    catch (error) {
        console.error('Status processing error:', error);
    }
}
