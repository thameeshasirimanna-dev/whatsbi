import { verifyJWT } from '../utils/helpers';
export default async function authenticatedMessagesStreamRoutes(fastify, supabaseClient) {
    fastify.get('/authenticated-messages-stream', async (request, reply) => {
        try {
            // Verify JWT and get user
            const user = await verifyJWT(request, supabaseClient);
            const query = request.query;
            const agentId = query.agentId;
            if (!agentId) {
                return reply.code(400).send('Agent ID required');
            }
            // Verify agent ownership
            const { data: agentData, error: agentError } = await supabaseClient
                .from('agents')
                .select('agent_prefix, id')
                .eq('id', parseInt(agentId))
                .eq('user_id', user.id)
                .single();
            if (agentError || !agentData) {
                return reply.code(403).send('Agent not found or access denied');
            }
            const messagesTable = `${agentData.agent_prefix}_messages`;
            // Get agent's customers from dynamic table
            const dynamicCustomersTable = `${agentData.agent_prefix}_customers`;
            console.log(`Looking for customers in table: ${dynamicCustomersTable}`);
            const { data: agentCustomers, error: customersError } = await supabaseClient
                .from(dynamicCustomersTable)
                .select('id')
                .eq('agent_id', parseInt(agentId));
            if (customersError) {
                console.error('Error fetching customers:', customersError);
            }
            else if (!agentCustomers || agentCustomers.length === 0) {
                console.log(`No customers found in ${dynamicCustomersTable} for agent ${agentId}`);
            }
            else {
                console.log(`Found ${agentCustomers.length} customers:`, agentCustomers.map((c) => c.id));
            }
            const customerIds = agentCustomers?.map((ac) => ac.id) || [];
            // Log the filter that will be used
            const filter = customerIds.length > 0 ? `customer_id=in.(${customerIds.join(',')})` : '*';
            console.log(`Using filter for messages: ${filter}`);
            // Set up SSE headers
            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization',
                'Access-Control-Expose-Headers': 'Content-Length,Content-Range',
                'X-Accel-Buffering': 'no' // Disable nginx buffering if used
            });
            // Send initial connection message
            reply.raw.write(`data: ${JSON.stringify({ type: 'connected', agentId: parseInt(agentId) })}\n\n`);
            // Set up database notification channel for dynamic messages table
            console.log(`Setting up subscription on table: ${messagesTable}`);
            const filterStr = customerIds.length > 0 ? `customer_id=in.(${customerIds.join(',')})` : '*';
            console.log(`Subscription filter: ${filterStr}`);
            const channel = supabaseClient
                .channel(`messages-stream-${agentId}`)
                .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: messagesTable,
                filter: filterStr
            }, async (payload) => {
                console.log('CHANGE EVENT RECEIVED:', JSON.stringify(payload, null, 2));
                const newMessage = payload.new;
                console.log('New message payload:', newMessage);
                // Fetch full message details from dynamic table
                const { data: fullMessage, error: messageError } = await supabaseClient
                    .from(messagesTable)
                    .select('*')
                    .eq('id', newMessage.id)
                    .single();
                if (messageError || !fullMessage) {
                    console.error('Error fetching message from dynamic table:', messageError);
                    return;
                }
                console.log('Full message details:', fullMessage);
                // Fetch customer info from dynamic customers table
                const { data: customer } = await supabaseClient
                    .from(dynamicCustomersTable)
                    .select('name, phone')
                    .eq('id', fullMessage.customer_id)
                    .single();
                const messageData = {
                    id: fullMessage.id,
                    customer_id: fullMessage.customer_id,
                    message: fullMessage.message, // Use 'message' to match frontend expectation
                    sender_type: fullMessage.direction === 'inbound' ? 'customer' : 'agent', // Map from actual column
                    timestamp: fullMessage.timestamp
                };
                // Send via SSE
                try {
                    reply.raw.write(`data: ${JSON.stringify(messageData)}\n\n`);
                }
                catch (error) {
                    console.error('Error sending SSE data:', error);
                }
            })
                .subscribe((status) => {
                console.log(`Subscription status for agent ${agentId} on ${messagesTable}:`, status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to messages table');
                }
                else if (status === 'CLOSED') {
                    console.log('❌ Subscription closed unexpectedly');
                }
                else if (status === 'CHANNEL_ERROR') {
                    console.log('❌ Subscription channel error');
                }
            });
            // Keep connection alive with heartbeat
            const heartBeatInterval = setInterval(() => {
                try {
                    reply.raw.write(':\n\n');
                }
                catch (error) {
                    console.error('Heartbeat error:', error);
                    clearInterval(heartBeatInterval);
                }
            }, 15000);
            // Handle connection close
            request.raw.on('close', () => {
                clearInterval(heartBeatInterval);
                channel.unsubscribe();
                console.log(`Stream closed for agent ${agentId}`);
            });
            request.raw.on('aborted', () => {
                clearInterval(heartBeatInterval);
                channel.unsubscribe();
                console.log(`Stream aborted for agent ${agentId}`);
            });
        }
        catch (error) {
            console.error('SSE stream error:', error);
            return reply.code(500).send('Internal Server Error');
        }
    });
}
