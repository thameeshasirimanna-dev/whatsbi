export default async function getMediaPreviewRoutes(fastify, supabaseClient) {
    fastify.post('/get-media-preview', async (request, reply) => {
        try {
            const body = request.body;
            const { media_id } = body;
            if (!media_id) {
                return reply.code(400).send({ error: 'media_id is required' });
            }
            // Get auth token from Authorization header
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply
                    .code(401)
                    .send({ error: 'Authorization header missing or invalid' });
            }
            const token = authHeader.slice(7);
            // Extract user ID from JWT payload
            let userId;
            try {
                const parts = token.split('.');
                if (parts.length !== 3) {
                    throw new Error('Invalid JWT format');
                }
                let payload = parts[1];
                payload = payload.replace(/-/g, '+').replace(/_/g, '/');
                while (payload.length % 4) {
                    payload += '=';
                }
                const decodedPayload = Buffer.from(payload, 'base64').toString();
                const userData = JSON.parse(decodedPayload);
                if (!userData.sub) {
                    throw new Error('No user ID in JWT payload');
                }
                const currentTime = Math.floor(Date.now() / 1000);
                if (userData.exp && userData.exp < currentTime) {
                    throw new Error('JWT token expired');
                }
                userId = userData.sub;
            }
            catch (jwtError) {
                return reply.code(401).send({
                    error: 'Invalid authentication token',
                    details: jwtError.message,
                });
            }
            // Get agent info
            const { data: agent, error: agentError } = await supabaseClient
                .from('agents')
                .select('id, agent_prefix')
                .eq('user_id', userId)
                .single();
            if (agentError || !agent) {
                return reply
                    .code(403)
                    .send({ error: 'Agent not found for authenticated user' });
            }
            // Get WhatsApp config
            const { data: whatsappConfig, error: configError } = await supabaseClient
                .from('whatsapp_configuration')
                .select('api_key, phone_number_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();
            if (configError || !whatsappConfig) {
                return reply
                    .code(404)
                    .send({ error: 'WhatsApp configuration not found' });
            }
            const accessToken = whatsappConfig.api_key;
            const phoneNumberId = whatsappConfig.phone_number_id;
            if (!accessToken || !phoneNumberId) {
                return reply.code(400).send({ error: 'Invalid WhatsApp configuration' });
            }
            // Fetch media URL
            const mediaUrlResponse = await fetch(`https://graph.facebook.com/v23.0/${media_id}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!mediaUrlResponse.ok) {
                const errorText = await mediaUrlResponse.text();
                return reply.code(500).send({
                    error: 'Failed to fetch media URL',
                    details: errorText,
                });
            }
            const mediaUrlData = await mediaUrlResponse.json();
            const media_download_url = mediaUrlData.url;
            if (!media_download_url) {
                return reply.code(404).send({ error: 'No download URL available' });
            }
            // Download the media
            const mediaResponse = await fetch(media_download_url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!mediaResponse.ok) {
                const errorText = await mediaResponse.text();
                return reply.code(500).send({
                    error: 'Failed to download media',
                    details: errorText,
                });
            }
            const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
            const base64 = mediaBuffer.toString('base64');
            const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream';
            return reply.code(200).send({
                success: true,
                base64: base64,
                content_type: contentType,
                media_id: media_id,
            });
        }
        catch (error) {
            return reply
                .code(500)
                .send({ error: 'Internal server error', details: error.message });
        }
    });
}
