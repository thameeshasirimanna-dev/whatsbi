import { verifyJWT } from '../utils/helpers';
export default async function uploadMediaRoutes(fastify, supabaseClient) {
    fastify.post('/upload-media', async (request, reply) => {
        console.log(`🚀 Upload-media function invoked - Method: ${request.method}`);
        console.log('📋 Request headers:', request.headers);
        const startTime = Date.now();
        try {
            // Verify JWT and get authenticated user
            const authenticatedUser = await verifyJWT(request, supabaseClient);
            const userId = authenticatedUser.id;
            console.log('✅ User authenticated:', userId);
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
