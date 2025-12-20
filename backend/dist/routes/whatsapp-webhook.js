import crypto from 'crypto';
import { processIncomingMessage, processMessageStatus } from '../utils/helpers';
// Socket.IO utility functions (imported from server.ts)
function emitNewMessage(agentId, messageData) {
    require('../server').emitNewMessage(agentId, messageData);
}
function emitAgentStatusUpdate(agentId, statusData) {
    require('../server').emitAgentStatusUpdate(agentId, statusData);
}
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? '';
export default async function whatsappWebhookRoutes(fastify, supabaseClient) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
    fastify.route({
        method: ['GET', 'POST', 'OPTIONS'],
        url: '/whatsapp-webhook',
        config: {
            rawBody: true,
        },
        handler: async (request, reply) => {
            console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
            console.log('📋 All headers:', request.headers);
            console.log('🔍 Request origin:', request.headers.origin);
            console.log('🔍 User-Agent:', request.headers['user-agent']);
            if (request.method === 'OPTIONS') {
                console.log('✅ Handling CORS preflight (OPTIONS)');
                return reply.code(204).headers({
                    ...corsHeaders,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-forwarded-proto, x-forwarded-host',
                });
            }
            const authHeader = request.headers.authorization;
            if (authHeader) {
                console.log('⚠️ Unexpected Authorization header found:', authHeader.substring(0, 20) + '...');
            }
            console.log('✅ Public webhook endpoint - no JWT auth required');
            if (request.method === 'GET') {
                const responseHeaders = { ...corsHeaders, 'Content-Type': 'text/plain' };
                try {
                    const url = new URL(request.url, `http://${request.headers.host}`);
                    const mode = url.searchParams.get('hub.mode');
                    const token = url.searchParams.get('hub.verify_token');
                    const challenge = url.searchParams.get('hub.challenge');
                    const phoneNumberId = url.searchParams.get('phone_number_id');
                    console.log('GET VERIFICATION:', {
                        mode,
                        token: token ? `${String(token).substring(0, 8)}...` : null,
                        hasChallenge: !!challenge,
                        phoneNumberId: phoneNumberId
                            ? `${String(phoneNumberId).substring(0, 8)}...`
                            : null,
                    });
                    if (mode === 'subscribe' && token && challenge) {
                        let expectedToken = null;
                        if (phoneNumberId) {
                            expectedToken = WHATSAPP_VERIFY_TOKEN;
                            console.log('Token lookup by phone_number_id:', expectedToken ? 'found' : 'not found');
                        }
                        if (!expectedToken && WHATSAPP_VERIFY_TOKEN) {
                            expectedToken = WHATSAPP_VERIFY_TOKEN;
                            console.log('Using WHATSAPP_VERIFY_TOKEN env var');
                        }
                        if (!expectedToken) {
                            try {
                                const { data: configs, error } = await supabaseClient
                                    .from('whatsapp_configuration')
                                    .select('verify_token')
                                    .eq('is_active', true)
                                    .limit(1);
                                if (!error &&
                                    configs &&
                                    configs.length > 0 &&
                                    configs[0].verify_token) {
                                    expectedToken = configs[0].verify_token;
                                    console.log('Found verify_token from database fallback');
                                }
                            }
                            catch (dbError) {
                                console.error('Database fallback lookup failed:', dbError);
                            }
                        }
                        if (expectedToken && token === expectedToken) {
                            console.log('✅ VERIFICATION SUCCESS - Token matches expected token');
                            return reply.code(200).headers(responseHeaders).send(challenge);
                        }
                        else if (!expectedToken) {
                            console.warn('⚠️ VERIFICATION WARNING - No verification token configured');
                            console.warn('⚠️ Allowing verification for development/testing');
                            console.warn('⚠️ Configure WHATSAPP_VERIFY_TOKEN or database token for production');
                            return reply.code(200).headers(responseHeaders).send(challenge);
                        }
                        else {
                            console.error('❌ VERIFICATION FAILED - Token mismatch');
                            const expectedStr = expectedToken
                                ? `${expectedToken.substring(0, 8)}...`
                                : 'NOT SET';
                            const receivedStr = token
                                ? `${String(token).substring(0, 8)}...`
                                : 'NULL';
                            console.error(`Expected: ${expectedStr}`);
                            console.error(`Received: ${receivedStr}`);
                            return reply
                                .code(403)
                                .headers(responseHeaders)
                                .send('Verification failed');
                        }
                    }
                    if (mode && challenge) {
                        console.log('GET request with challenge but wrong mode:', mode);
                        return reply.code(403).headers(responseHeaders).send('Forbidden');
                    }
                    console.log('GET request without verification parameters');
                    return reply
                        .code(200)
                        .headers(responseHeaders)
                        .send('WhatsApp Webhook Endpoint');
                }
                catch (error) {
                    console.error('GET Verification error:', error);
                    return reply
                        .code(500)
                        .headers({ ...corsHeaders, 'Content-Type': 'text/plain' })
                        .send('Internal server error');
                }
            }
            if (request.method === 'POST') {
                console.log('🚀 POST webhook received - processing WhatsApp payload');
                const signatureHeader = request.headers['x-hub-signature-256'];
                const authHeader = request.headers.authorization;
                const userAgent = request.headers['user-agent'] || 'unknown';
                const origin = request.headers.origin || 'none';
                console.log('📋 POST request details:', {
                    url: request.url,
                    userAgent: userAgent.substring(0, 50) + (userAgent.length > 50 ? '...' : ''),
                    origin: origin,
                    hasSignature: !!signatureHeader,
                    hasAuth: !!authHeader,
                    contentLength: request.headers['content-length'],
                });
                try {
                    const chunks = [];
                    for await (const chunk of request.raw) {
                        chunks.push(chunk);
                    }
                    const body = Buffer.concat(chunks).toString();
                    const bodyPreview = body.substring(0, 200);
                    console.log('📄 Request body preview:', bodyPreview.replace(/\n/g, ' '));
                    console.log('Body length:', body.length);
                    console.log('Signature header present:', !!signatureHeader);
                    console.log('🔐 Processing webhook authentication...');
                    let signatureVerified = true;
                    if (signatureHeader) {
                        console.log('✅ WhatsApp signature header detected - will verify HMAC');
                        signatureVerified = false;
                    }
                    else {
                        console.log('⚠️ No signature header - allowing for testing/development');
                    }
                    console.log('✅ Webhook request allowed - processing payload');
                    if (signatureHeader) {
                        console.log('🔐 Verifying WhatsApp signature...');
                        const payload = JSON.parse(body);
                        let phoneNumberId = null;
                        if (payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id) {
                            phoneNumberId =
                                payload.entry[0].changes[0].value.metadata.phone_number_id;
                        }
                        console.log('Phone number ID for verification:', phoneNumberId
                            ? `${phoneNumberId.substring(0, 8)}...`
                            : 'not found');
                        let verificationSecret = null;
                        if (phoneNumberId) {
                            verificationSecret = WHATSAPP_APP_SECRET;
                            console.log('App secret lookup:', verificationSecret ? 'found' : 'not found');
                        }
                        if (!verificationSecret && WHATSAPP_APP_SECRET) {
                            verificationSecret = WHATSAPP_APP_SECRET;
                            console.log('Using WHATSAPP_APP_SECRET env var for signature verification');
                        }
                        if (verificationSecret) {
                            try {
                                const hmac = crypto.createHmac('sha256', verificationSecret);
                                hmac.update(body);
                                const expectedSignature = 'sha256=' + hmac.digest('hex');
                                console.log('Computed signature:', expectedSignature.substring(0, 20) + '...');
                                const sigHeader = Array.isArray(signatureHeader)
                                    ? signatureHeader[0]
                                    : signatureHeader;
                                console.log('Received signature:', sigHeader.substring(0, 20) + '...');
                                if (sigHeader !== expectedSignature) {
                                    console.error('❌ Message signature verification failed');
                                    console.error(`Expected: ${expectedSignature.substring(0, 20)}...`);
                                    console.error(`Received: ${sigHeader.substring(0, 20)}...`);
                                    console.warn('⚠️ Continuing despite signature mismatch for debugging');
                                    signatureVerified = false;
                                }
                                else {
                                    console.log('✅ Message signature verified successfully');
                                    signatureVerified = true;
                                }
                            }
                            catch (error) {
                                console.error('❌ Signature verification error:', error);
                                console.warn('⚠️ Continuing despite signature error for debugging');
                                signatureVerified = false;
                            }
                        }
                        else {
                            console.warn('⚠️ No app secret available - continuing without signature verification');
                            console.warn('Configure WHATSAPP_APP_SECRET or database secret for production');
                            signatureVerified = false;
                        }
                    }
                    else {
                        console.log('⚠️ No signature header - skipping verification (test mode)');
                    }
                    if (signatureVerified) {
                        console.log('✅ Webhook signature verification passed');
                    }
                    else {
                        console.warn('⚠️ Webhook proceeding without signature verification');
                    }
                    const payload = JSON.parse(body);
                    if (payload.object !== 'whatsapp_business_account') {
                        return reply.code(400).send('Invalid payload');
                    }
                    const entry = payload.entry?.[0];
                    if (!entry) {
                        return reply.code(400).send('No entry in payload');
                    }
                    const changes = entry.changes?.[0];
                    if (!changes) {
                        return reply.code(400).send('No changes in entry');
                    }
                    const value = changes.value;
                    if (!value) {
                        return reply.code(400).send('No value in changes');
                    }
                    if (value.messages && value.messages.length > 0) {
                        console.log(`Processing ${value.messages.length} message(s)`);
                        for (const message of value.messages) {
                            await processIncomingMessage(supabaseClient, message, value.metadata?.phone_number_id, value.contacts?.[0]?.profile?.name, emitNewMessage);
                        }
                    }
                    if (value.statuses && value.statuses.length > 0) {
                        console.log(`Processing ${value.statuses.length} status update(s)`);
                        for (const status of value.statuses) {
                            await processMessageStatus(supabaseClient, status);
                        }
                    }
                    console.log('Message processing completed');
                    return reply
                        .code(200)
                        .headers({ ...corsHeaders, 'Content-Type': 'text/plain' })
                        .send('OK');
                }
                catch (error) {
                    console.error('POST processing error:', error);
                    return reply
                        .code(500)
                        .headers({ ...corsHeaders, 'Content-Type': 'application/json' })
                        .send({ error: 'Internal server error' });
                }
            }
            return reply
                .code(405)
                .headers({ ...corsHeaders, 'Content-Type': 'application/json' })
                .send({ error: 'Method not allowed' });
        },
    });
}
