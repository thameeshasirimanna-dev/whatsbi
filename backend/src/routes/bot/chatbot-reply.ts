import { FastifyInstance } from 'fastify';
import { uploadMediaToR2 } from '../../utils/s3';
import { downloadWhatsAppMedia, uploadMediaToStorage } from '../../utils/helpers';

const CHATBOT_SECRET = process.env.CHATBOT_SECRET ?? 'default-secret-change-in-prod';

export default async function chatbotReplyRoutes(fastify: FastifyInstance, supabaseClient: any) {
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
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', user_id)
        .single();

      if (userError || !user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Get WhatsApp config
      const { data: whatsappConfig, error: configError } = await supabaseClient
        .from('whatsapp_configuration')
        .select('api_key, phone_number_id, user_id')
        .eq('user_id', user_id)
        .eq('is_active', true)
        .single();

      if (configError || !whatsappConfig) {
        return reply.code(404).send({ error: 'WhatsApp configuration not found' });
      }

      // Get agent
      const { data: agent, error: agentError } = await supabaseClient
        .from('agents')
        .select('id, agent_prefix')
        .eq('user_id', user_id)
        .single();

      if (agentError || !agent) {
        return reply.code(404).send({ error: 'Agent not found' });
      }

      const customersTable = `${agent.agent_prefix}_customers`;
      const messagesTable = `${agent.agent_prefix}_messages`;

      // Find customer
      const { data: customer, error: customerError } = await supabaseClient
        .from(customersTable)
        .select('id, phone')
        .eq('phone', customer_phone)
        .single();

      if (customerError || !customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

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

      let mediaUrl: string | null = null;
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
            supabaseClient,
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
      const messageData = {
        customer_id: customer.id,
        message: message || `[${type.toUpperCase()}] Media file`,
        direction: 'outbound',
        timestamp: new Date().toISOString(),
        is_read: true,
        media_type: type === 'text' ? 'none' : type,
        media_url: storedMediaUrl,
        caption: caption,
        sent_by: 'chatbot', // Mark as sent by chatbot
      };

      const { error: insertError } = await supabaseClient
        .from(messagesTable)
        .insert(messageData);

      if (insertError) {
        console.error('Error storing chatbot message:', insertError);
      }

      // Log to whatsapp_message_logs
      if (messageId) {
        const { error: logError } = await supabaseClient
          .from('whatsapp_message_logs')
          .insert({
            user_id: user_id,
            agent_id: agent.id,
            customer_phone: customer_phone,
            message_type: type,
            category: 'chatbot',
            status: 'sent',
            whatsapp_message_id: messageId,
          });

        if (logError) {
          console.error('Error logging chatbot message:', logError);
        }
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