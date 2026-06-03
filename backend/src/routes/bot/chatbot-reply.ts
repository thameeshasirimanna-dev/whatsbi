import { FastifyInstance } from 'fastify';
import { downloadWhatsAppMedia, uploadMediaToStorage } from '../../utils/helpers.js';

const CHATBOT_SECRET = process.env.CHATBOT_SECRET ?? 'default-secret-change-in-prod';

export default async function chatbotReplyRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.post('/chatbot-reply', async (request, reply) => {
    try {
      const body = request.body as any;

      const {
        secret,
        user_id,
        customer_phone,
        message,
        type = 'text',
        media_id,
        caption,
      } = body;

      // Validate secret
      if (!secret || secret !== CHATBOT_SECRET) {
        console.error('Invalid or missing secret for chatbot reply');
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Basic validation
      if (!user_id || !customer_phone || (type === 'text' && !message) || (type !== 'text' && !media_id)) {
        return reply.code(400).send({
          error: 'Missing required fields: user_id, customer_phone, message or media_id',
        });
      }

      // Validate user exists
      const { rows: userRows } = await pgClient.query(
        "SELECT id FROM users WHERE id = $1",
        [user_id]
      );

      if (userRows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Get WhatsApp config
      const { rows: configRows } = await pgClient.query(
        "SELECT api_key, phone_number_id, user_id FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true",
        [user_id]
      );

      if (configRows.length === 0) {
        return reply.code(404).send({ error: 'WhatsApp configuration not found' });
      }

      const whatsappConfig = configRows[0];

      // Get agent
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE user_id = $1",
        [user_id]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({ error: 'Agent not found' });
      }

      const agent = agentRows[0];
      const customersTable = `${agent.agent_prefix}_customers`;
      const messagesTable = `${agent.agent_prefix}_messages`;

      // Find customer
      const { rows: customerRows } = await pgClient.query(
        `SELECT id, phone FROM ${customersTable} WHERE phone = $1`,
        [customer_phone]
      );

      if (customerRows.length === 0) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      const customer = customerRows[0];

      // Normalize phone number
      let normalizedPhone = customer.phone.replace(/\D/g, '');
      if (!normalizedPhone.startsWith('1') && normalizedPhone.length === 10) {
        normalizedPhone = '1' + normalizedPhone;
      }
      normalizedPhone = '+' + normalizedPhone;
      if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
        return reply.code(400).send({ error: 'Invalid phone number format' });
      }

      const accessToken = whatsappConfig.api_key;
      const phoneNumberId = whatsappConfig.phone_number_id;

      let storedMediaUrl: string | null = null;

      // Handle media if present
      if (media_id && type !== 'text') {
        // Download and upload media
        const mediaBuffer = await downloadWhatsAppMedia(media_id, accessToken);
        if (mediaBuffer) {
          let contentType = 'application/octet-stream';
          let filename = `media_${Date.now()}.${type}`;

          // Get media info
          const mediaInfoResponse = await fetch(
            `https://graph.facebook.com/v23.0/${media_id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (mediaInfoResponse.ok) {
            const mediaInfo: any = await mediaInfoResponse.json();
            if (mediaInfo.mime_type) {
              contentType = mediaInfo.mime_type;
              const ext = contentType.split('/')[1] || type;
              filename = `media_${Date.now()}.${ext}`;
            }
          }

          storedMediaUrl = await uploadMediaToStorage(
            pgClient,
            agent.agent_prefix,
            mediaBuffer,
            filename,
            contentType
          );
        }
      }

      // Prepare WhatsApp payload
      let whatsappPayload: any;

      if (type === 'text') {
        whatsappPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: { body: message },
        };
      } else if (type === 'image') {
        whatsappPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'image',
          image: {
            id: media_id,
            ...(caption && { caption }),
          },
        };
      } else if (type === 'document') {
        whatsappPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'document',
          document: {
            id: media_id,
            ...(caption && { caption }),
          },
        };
      } else {
        return reply.code(400).send({ error: `Unsupported message type: ${type}` });
      }

      // Send to WhatsApp
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(whatsappPayload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WhatsApp API error:', errorText);
        return reply.code(500).send({ error: 'Failed to send message to WhatsApp' });
      }

      const result: any = await response.json();
      const messageId = result.messages?.[0]?.id;

      // Store message in database
      const messageText = message || `[${type.toUpperCase()}] Media file`;
      const mediaTypeVal = type === 'text' ? 'none' : type;

      await pgClient.query(
        `INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, true, $4, $5, $6)`,
        [
          customer.id,
          messageText,
          'outbound',
          mediaTypeVal,
          storedMediaUrl,
          caption || null
        ]
      );

      // Log to whatsapp_message_logs
      if (messageId) {
        await pgClient.query(
          `INSERT INTO whatsapp_message_logs (user_id, agent_id, customer_phone, message_type, category, status, whatsapp_message_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            user_id,
            agent.id,
            customer_phone,
            type,
            'chatbot',
            'sent',
            messageId
          ]
        );
      }

      return reply.code(200).send({
        success: true,
        message_id: messageId,
      });
    } catch (error) {
      console.error('Chatbot reply error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}