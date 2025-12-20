export default async function uploadMediaRoutes(fastify, supabaseClient) {
    fastify.post('/upload-media', async (request, reply) => {
        console.log(`🚀 Upload-media function invoked - Method: ${request.method}`);
        console.log('📋 Request headers:', request.headers);
        const startTime = Date.now();
        try {
            // Get auth token from Authorization header
            const authHeader = request.headers.authorization;
            console.log('📋 Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'MISSING');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.error('❌ Authorization header missing or invalid');
                return reply
                    .code(401)
                    .send({ error: 'Authorization header missing or invalid' });
            }
            const token = authHeader.slice(7);
            console.log('🔑 Token extracted, length:', token.length);
            // Extract user ID from JWT
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
                console.log('📊 JWT payload extracted:', {
                    userId: userData.sub,
                    email: userData.email,
                    exp: userData.exp
                        ? new Date(userData.exp * 1000).toISOString()
                        : undefined,
                });
                if (!userData.sub) {
                    throw new Error('No user ID in JWT payload');
                }
                const currentTime = Math.floor(Date.now() / 1000);
                if (userData.exp && userData.exp < currentTime) {
                    throw new Error('JWT token expired');
                }
                userId = userData.sub;
                console.log('✅ User ID extracted from JWT:', userId);
            }
            catch (jwtError) {
                console.error('❌ JWT parsing failed:', jwtError);
                return reply.code(401).send({
                    error: 'Invalid authentication token',
                    details: jwtError.message,
                });
            }
            // Get agent info
            console.log('🏢 Fetching agent information for user:', userId);
            const { data: agent, error: agentError } = await supabaseClient
                .from('agents')
                .select('id, agent_prefix')
                .eq('user_id', userId)
                .single();
            console.log('📊 Agent result:', {
                agentId: agent?.id,
                agentPrefix: agent?.agent_prefix,
                agentError: agentError ? agentError.message : null,
            });
            if (agentError || !agent) {
                console.error('❌ Agent not found for user', userId, ':', agentError?.message);
                return reply
                    .code(403)
                    .send({ error: 'Agent not found for authenticated user' });
            }
            const agentPrefix = agent.agent_prefix;
            if (!agentPrefix) {
                console.error('❌ Agent prefix not configured for agent', agent.id);
                return reply.code(400).send({ error: 'Agent prefix not configured' });
            }
            console.log('✅ Agent found:', { agentId: agent.id, prefix: agentPrefix });
            // Get WhatsApp config
            console.log('🏢 Fetching WhatsApp configuration for user:', userId);
            const { data: whatsappConfig, error: configError } = await supabaseClient
                .from('whatsapp_configuration')
                .select('api_key, phone_number_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();
            if (configError || !whatsappConfig) {
                console.error('❌ WhatsApp config not found:', configError?.message);
                return reply
                    .code(404)
                    .send({ error: 'WhatsApp configuration not found' });
            }
            const accessToken = whatsappConfig.api_key;
            const phoneNumberId = whatsappConfig.phone_number_id;
            if (!accessToken || !phoneNumberId) {
                console.error('❌ Invalid WhatsApp configuration');
                return reply.code(400).send({ error: 'Invalid WhatsApp configuration' });
            }
            console.log('✅ WhatsApp config loaded:', {
                phoneNumberId: phoneNumberId.substring(0, 10) + '...',
                hasToken: !!accessToken,
            });
            // Parse form data - simplified for now
            console.log('📥 Parsing FormData...');
            // Note: In a real implementation, you'd use multipart parsing
            // For now, assuming the body is parsed as JSON or form data
            const formData = request.body; // This needs proper multipart handling
            const files = []; // Placeholder
            const caption = formData?.caption || '';
            console.log('📁 Files info:', files.length > 0
                ? {
                    count: files.length,
                    types: files.map((f) => f.type),
                    sizes: files.map((f) => f.size),
                    caption: caption,
                }
                : 'NO FILES');
            if (files.length === 0) {
                console.error('❌ No files provided in request');
                return reply.code(400).send({ error: 'No files provided' });
            }
            // Validate files and upload logic would go here
            // This is a placeholder - the full implementation needs multipart parsing
            const totalDuration = Date.now() - startTime;
            console.log(`🏁 Function completed in ${totalDuration}ms`);
            return reply.code(200).send({
                success: true,
                uploaded: 0, // placeholder
                total: files.length,
                media: [], // placeholder
                errors: [],
            });
        }
        catch (error) {
            const totalDuration = Date.now() - startTime;
            console.error(`💥 Upload-media function failed after ${totalDuration}ms:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return reply
                .code(500)
                .send({ error: 'Internal server error', details: errorMessage });
        }
    });
}
