import { CacheService } from '../utils/cache.js';
import { buildChatbotSystemPrompt } from './ai-prompt-builder.js';
import { fetchFullBusinessContext } from './ai-business-context.js';
import { detectConversationStage, ConversationStage } from './ai-stage-detector.js';

import {
  stripEmojis, isBankDetailsMessage, formatBankDetails, sanitizeWhatsAppFormatting,
  formatMessageWithAI, parseJsonUrls, isSampleRequest, cleanIncompleteTrailingSentence,
  isPaymentSlipOrPaidMessage, extractBankDetails,
} from './ai-formatters.js';
import {
  sendWhatsAppTextMessage, sendWhatsAppImageMessage, sendWhatsAppDocumentMessage,
  dispatchServiceSampleImages, dispatchCustomerInvoicePdf,
} from './whatsapp-outbound.service.js';
import { parseAndExecuteAgentActions } from './ai-agent-actions.service.js';
import { calculateDeepSeekCost, estimateFallbackCost, DeepSeekCostResult } from './ai-cost.service.js';
import { detectAndApplyCustomerLanguageChange } from './ai-language.service.js';

export {
  stripEmojis, isBankDetailsMessage, formatBankDetails, sanitizeWhatsAppFormatting, formatMessageWithAI,
  parseJsonUrls, isSampleRequest, cleanIncompleteTrailingSentence, isPaymentSlipOrPaidMessage,
  sendWhatsAppTextMessage, sendWhatsAppImageMessage, sendWhatsAppDocumentMessage, dispatchServiceSampleImages,
  dispatchCustomerInvoicePdf, parseAndExecuteAgentActions, detectAndApplyCustomerLanguageChange,
  detectConversationStage, ConversationStage, extractBankDetails,
};
export type { ConversationStage as ConversationStageType };

export interface DeepSeekChatResult {
  reply: string | null;
  usage?: any;
  cost: DeepSeekCostResult;
}

/**
 * Calls DeepSeek Chat Completions API with provided message payload and calculates token costs
 */
export async function callDeepSeekChat(
  messages: Array<{ role: string; content: string }>,
  customApiKey?: string
): Promise<DeepSeekChatResult> {
  const configuredModel = process.env.DEEPSEEK_MODEL?.trim();
  const model = (configuredModel && configuredModel !== 'deepseek-flash') ? configuredModel : 'deepseek-chat';
  const apiKey = (customApiKey && customApiKey.trim()) || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn('[DeepSeek AI] No DeepSeek API key found (neither agent configuration nor DEEPSEEK_API_KEY in .env). Skipping AI response.');
    return {
      reply: null,
      cost: estimateFallbackCost('', '', model),
    };
  }

  const rawBaseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');

  const endpoint = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000); // 35-second timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: 3500, // Generous token headroom to prevent token exhaustion
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DeepSeek AI] API error: HTTP ${response.status} - ${errorText}`);
      if ((response.status === 401 || response.status === 403) && customApiKey && process.env.DEEPSEEK_API_KEY && customApiKey !== process.env.DEEPSEEK_API_KEY) {
        console.warn('[DeepSeek AI] Custom API key was rejected. Retrying with system fallback DEEPSEEK_API_KEY...');
        return callDeepSeekChat(messages, process.env.DEEPSEEK_API_KEY);
      }
      return {
        reply: null,
        cost: estimateFallbackCost(JSON.stringify(messages), '', model),
      };
    }

    const data: any = await response.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content;
    const usage = data.usage;
    const cost = usage
      ? calculateDeepSeekCost(usage, model)
      : estimateFallbackCost(JSON.stringify(messages), content || '', model);

    if (!content) {
      console.warn(`[DeepSeek AI] DeepSeek API returned empty content (finish_reason: ${choice?.finish_reason}, reasoning_tokens: ${usage?.completion_tokens_details?.reasoning_tokens || 0})`);
      return { reply: null, usage, cost };
    }

    const reply = stripEmojis(content.trim());
    return {
      reply: sanitizeWhatsAppFormatting(reply),
      usage,
      cost,
    };

  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[DeepSeek AI] Request timed out after 35s');
    } else {
      console.error('[DeepSeek AI] Request failed:', err.message || err);
    }
    return {
      reply: null,
      cost: estimateFallbackCost(JSON.stringify(messages), '', model),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generates an intelligent, grounded reply using DeepSeek
 */
export async function generateCustomerReply({
  agent,
  customer,
  incomingMessage,
  incomingMediaType,
  customPrompt,
  pgClient,
  deepseekApiKey,
}: {
  agent: any;
  customer: any;
  incomingMessage?: string;
  incomingMediaType?: string;
  customPrompt?: string;
  pgClient: any;
  deepseekApiKey?: string;
}): Promise<{
  reply: string | null;
  cost: DeepSeekCostResult;
  usage?: any;
  apiKey?: string;
}> {
  // 1. Fetch chronological conversation history
  const messagesTable = `${agent.agent_prefix}_messages`;
  let conversationHistory: Array<{ role: string; content: string }> = [];
  try {
    const { rows: msgRows } = await pgClient.query(`
      SELECT message, direction, timestamp
      FROM ${messagesTable}
      WHERE customer_id = $1
      ORDER BY timestamp DESC
      LIMIT 12
    `, [customer.id]);

    conversationHistory = msgRows.reverse().map((m: any) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.message,
    }));
  } catch (historyErr) {
    console.error('[DeepSeek AI] Error fetching conversation history:', historyErr);
  }

  // 2. Check if an invoice or payment request was previously made
  const historyText = conversationHistory.map((m) => m.content || '').join('\n');
  const historyHasInvoiceOrBank =
    isBankDetailsMessage(historyText) ||
    /(\*Invoice:\*|INV-\d+|Invoice PDF|payment slip|මුදල් ගෙවා|slip eka|ගෙවීම්)/i.test(historyText);

  let hasExistingInvoice = false;
  try {
    const invoicesTable = `${agent.agent_prefix}_orders_invoices`;
    const { rows: invRows } = await pgClient.query(
      `SELECT id FROM ${invoicesTable} WHERE customer_id = $1 LIMIT 1`,
      [customer.id]
    );
    hasExistingInvoice = invRows.length > 0;
  } catch (invErr) {
    // Ignore if table query fails
  }

  const hasInvoiceOrBankContext = historyHasInvoiceOrBank || hasExistingInvoice;
  const effectiveText = customPrompt || incomingMessage || '';

  // 3. Detect active conversational stage (inquiry, confirmation, paid, appointment)
  // to dynamically load only the required system instructions, saving substantial AI tokens
  const stage = detectConversationStage({
    incomingText: effectiveText,
    incomingMediaType,
    hasInvoiceOrBankContext,
    conversationHistory,
  });

  // 4. Fetch complete business context with stage awareness (omitting catalog when in paid stage)
  const {
    companyOverview,
    aiInstructions,
    catalogContext,
    appointmentsContext,
    invoicesContext,
    ordersContext,
  } = await fetchFullBusinessContext({ agent, customer, pgClient, stage });

  // Check if customer requested a language switch or stated they do not know Sinhala
  await detectAndApplyCustomerLanguageChange({
    agent,
    customer,
    incomingText: effectiveText,
    pgClient,
  });

  const bankDetails = extractBankDetails(companyOverview || agent.company_overview || agent.bank_details);

  // 4. Construct System Prompt with order confirmation guard, multi-tenant isolation, and stage optimization
  const systemPrompt = buildChatbotSystemPrompt({
    agent,
    customer,
    stage,
    catalogContext,
    companyOverview,
    aiInstructions,
    appointmentsContext,
    invoicesContext,
    ordersContext,
    bankDetails,
  });

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
  ];

  // Append user intent / message
  if (customPrompt) {
    messages.push({ role: 'user', content: customPrompt });
  } else if (incomingMessage) {
    // If the latest message is not already in history, add it
    const lastMsg = conversationHistory[conversationHistory.length - 1];
    if (!lastMsg || lastMsg.content !== incomingMessage) {
      messages.push({ role: 'user', content: incomingMessage });
    }
  }

  let activeApiKey = deepseekApiKey?.trim();
  if (!activeApiKey && agent?.user_id) {
    try {
      const { rows: keyRows } = await pgClient.query(
        'SELECT deepseek_api_key FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true',
        [agent.user_id]
      );
      if (keyRows.length > 0 && keyRows[0].deepseek_api_key) {
        activeApiKey = keyRows[0].deepseek_api_key.trim();
      }
    } catch (keyErr) {
      console.warn('[DeepSeek AI] Could not query agent deepseek_api_key:', keyErr);
    }
  }

  const chatResult = await callDeepSeekChat(messages, activeApiKey);
  let finalReply = chatResult.reply;
  if (!finalReply) {
    const custLang = (customer.language || 'sinhala').toLowerCase();
    const isEng = custLang === 'english' || custLang === 'en';
    const isProduct = (agent.business_type || 'service') === 'product';

    if (stage === 'paid') {
      finalReply = isEng
        ? (isProduct ? "Thank you! Our team will verify your payment slip and prepare your order for courier delivery shortly." : "Thank you! Our team will verify your payment slip and update the status manually shortly. Once confirmed, our team will contact you to gather all the work requirements and start your project immediately!")
        : (isProduct ? "ස්තූතියි! අපගේ team එක payment slip එක verify කරලා, ඇණවුම pack කර courier එකට භාර දෙන්න කටයුතු කරනවා." : "ස්තූතියි! අපගේ team එක payment slip එක verify කරලා බලලා, ඉක්මනින්ම manually update කරන්නම්. Payment එක confirm වුණු ගමන්ම අපගේ team එක ඔබව සම්බන්ධ කරගෙන වැඩේට අවශ්‍ය සියලුම requirements සහ විස්තර ලබාගෙන වහාම වැඩ ආරම්භ කරනවා.");
    } else {
      finalReply = isEng
        ? "Thank you for getting in touch! We have received your message. Our team will review the details and get back to you with all the information shortly."
        : "ස්තූතියි අපව සම්බන්ධ කරගත්තාට! ඔබගේ පණිවිඩය අප වෙත ලැබුණා. අපගේ team එක විස්තර බලලා ඉතා ඉක්මනින්ම ඔබට අවශ්‍ය සියලු විස්තර ලබා දෙන්නම්.";
    }
  }
  return { reply: finalReply, cost: chatResult.cost, usage: chatResult.usage, apiKey: activeApiKey };
}

/**
 * Handles inbound WhatsApp messages for autonomous AI chatbot response
 */
export async function handleInboundMessage({
  agent,
  customer,
  incomingMessage,
  whatsappConfig,
  pgClient,
  cacheService,
  emitNewMessage,
  emitAgentStatusUpdate,
}: {
  agent: any;
  customer: any;
  incomingMessage: any;
  whatsappConfig: any;
  pgClient: any;
  cacheService?: CacheService;
  emitNewMessage?: (agentId: number, messageData: any) => void;
  emitAgentStatusUpdate?: (agentId: number, statusData: any) => void;
}) {
  // 1. Verify customer has AI enabled
  if (!customer.ai_enabled) return;

  // 2. Check agent DeepSeek AI balance
  let currentAiBalance = 4.0;
  try {
    const { rows: creditRows } = await pgClient.query('SELECT ai_balance FROM agents WHERE id = $1', [agent.id]);
    currentAiBalance = creditRows.length > 0 ? parseFloat(creditRows[0].ai_balance ?? '4.0') : 4.0;
  } catch (colErr: any) {
    currentAiBalance = 4.0;
  }
  if (currentAiBalance <= 0) {
    console.warn(`[DeepSeek AI] Agent ${agent.id} has depleted AI balance ($${currentAiBalance.toFixed(4)}) for AI reply.`);
    return;
  }

  // 3. Ensure WhatsApp API credentials exist
  if (!whatsappConfig.phone_number_id || !whatsappConfig.api_key) {
    console.warn(`[DeepSeek AI] Agent ${agent.id} missing phone_number_id or api_key in WhatsApp config.`);
    return;
  }

  // 3.1 Check and apply customer language preference if customer indicated non-Sinhala preference
  await detectAndApplyCustomerLanguageChange({
    agent,
    customer,
    incomingText: incomingMessage.message,
    pgClient,
  });

  // 4. Generate intelligent reply via DeepSeek
  const aiResult = await generateCustomerReply({
    agent,
    customer,
    incomingMessage: incomingMessage.message,
    incomingMediaType: incomingMessage.media_type,
    pgClient,
    deepseekApiKey: whatsappConfig?.deepseek_api_key,
  });

  const rawReply = aiResult.reply;
  if (!rawReply) {
    console.warn('[DeepSeek AI] DeepSeek generated empty or null reply.');
    return;
  }

  // 5. Parse and execute any agent actions (appointments, invoices) and obtain clean text
  const { cleanReply, actionsExecuted } = await parseAndExecuteAgentActions({
    agent,
    customer,
    rawReply,
    incomingText: incomingMessage.message,
    pgClient,
  });

  if (!cleanReply) {
    console.warn('[DeepSeek AI] Generated empty reply after action execution.');
    return;
  }

  if (actionsExecuted.length > 0) {
    console.log(`[AI Full Agent] Successfully executed ${actionsExecuted.length} action(s):`, actionsExecuted.map((a) => a.type).join(', '));
  }

  // 6. Format the full message using AI for clean spacing, unbroken sentences, and WhatsApp markdown
  const formattedReply = await formatMessageWithAI(cleanReply, {
    apiKey: aiResult.apiKey || whatsappConfig?.deepseek_api_key || agent?.deepseek_api_key,
  });

  // 7. Send message via Meta WhatsApp Cloud API
  const sendResult = await sendWhatsAppTextMessage(
    whatsappConfig.phone_number_id, whatsappConfig.api_key, customer.phone, formattedReply
  );

  if (!sendResult.success) {
    console.error('[DeepSeek AI] Failed to send AI response to WhatsApp:', sendResult.error);
    return;
  }

  // 8. Insert outbound message into {prefix}_messages
  const messagesTable = `${agent.agent_prefix}_messages`;
  const { rows: insertedRows } = await pgClient.query(
    `INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption)
     VALUES ($1, $2, 'outbound', CURRENT_TIMESTAMP, true, 'none', NULL, NULL) RETURNING *`,
    [customer.id, formattedReply]
  );

  // 8. Deduct 2.0x actual DeepSeek API cost from agents.ai_balance
  const chargedCost = aiResult.cost?.chargedCost || 0.001;
  let newBalance = 4.0;
  try {
    const { rows: updatedRows } = await pgClient.query(
      'UPDATE agents SET ai_balance = GREATEST(0, ai_balance - $1) WHERE id = $2 RETURNING ai_balance',
      [chargedCost, agent.id]
    );
    newBalance = updatedRows.length > 0 ? parseFloat(updatedRows[0].ai_balance) : 0;
  } catch (updateErr: any) {
    console.warn('[DeepSeek AI] ai_balance column not yet present for update:', updateErr.message);
  }
  console.log(`[DeepSeek AI] Agent ${agent.id}: actual cost $${aiResult.cost.actualCost.toFixed(6)}, charged 2x $${chargedCost.toFixed(6)}. New AI balance: $${newBalance.toFixed(4)}`);

  if (emitAgentStatusUpdate) {
    emitAgentStatusUpdate(agent.id, { type: 'ai_balance_updated', ai_balance: newBalance, balance: newBalance });
    const createdAppt = actionsExecuted.find((a) => a.type === 'CREATE_APPOINTMENT' && a.success && a.data)?.data;
    if (createdAppt) {
      emitAgentStatusUpdate(agent.id, { type: 'appointment_created', appointment: createdAppt });
    }
  }

  // 8. Emit Socket.IO event so agent UI updates in real time
  if (emitNewMessage && insertedRows.length > 0) {
    const msg = insertedRows[0];
    emitNewMessage(agent.id, {
      id: msg.id, customer_id: customer.id, customer_name: customer.name || customer.phone,
      customer_phone: customer.phone, message: msg.message, sender_type: 'agent',
      direction: 'outbound', timestamp: msg.timestamp, media_type: 'none', media_url: null, caption: null,
    });
  }

  // 9. Invalidate conversation and chat list caches
  if (cacheService) {
    await cacheService.invalidateRecentMessages(agent.id, customer.id);
    await cacheService.invalidateChatList(agent.id);
  }

  // 10. Record log in whatsapp_message_logs
  if (sendResult.messageId) {
    try {
      await pgClient.query(
        `INSERT INTO whatsapp_message_logs (user_id, agent_id, customer_phone, message_type, category, status, whatsapp_message_id)
         VALUES ($1, $2, $3, 'text', 'chatbot', 'sent', $4)`,
        [whatsappConfig.user_id, agent.id, customer.phone, sendResult.messageId]
      );
    } catch (logErr: any) {
      console.warn('Notice: could not record in whatsapp_message_logs:', logErr.message);
    }
  }

  // 11. If an invoice was legitimately generated, dispatch the invoice PDF document
  let invoiceToDispatch = actionsExecuted.find(
    (a) => a.type === 'CREATE_INVOICE' && a.success && a.data?.pdf_url && a.data?.is_generated
  )?.data;

  // Fallback: If no invoice action ran, but customer asked for invoice OR AI promised PDF in text
  if (!invoiceToDispatch) {
    const incomingText = (incomingMessage.message || '').trim();
    const isAskingInvoice = /ko\s*(?:mage\s*)?invoice|invoice\s*(?:eka\s*)?ko|where\s*(?:is\s*)?(?:my\s*)?invoice|send\s*(?:the\s*)?invoice|කෝ\s*(?:මගේ\s*)?ඉන්වොයිස්|කෝ\s*බිල|invoice\s*eka\s*ewanna/i.test(incomingText);
    const isPromisingPdf = /PDF\s*එක\s*(?:පහළින්\s*)?එව(?:ා\s*ඇත|න්නම්)|sending\s*(?:the\s*)?(?:invoice\s*)?pdf|attached\s*below|Invoice\s*PDF\s*එක/i.test(cleanReply);

    if (isAskingInvoice || isPromisingPdf) {
      try {
        const { rows: recentInvoices } = await pgClient.query(`
          SELECT * FROM ${agent.agent_prefix}_orders_invoices
          WHERE customer_id = $1 AND pdf_url IS NOT NULL AND is_generated = true
          ORDER BY id DESC LIMIT 1
        `, [customer.id]);

        if (recentInvoices.length > 0 && recentInvoices[0].pdf_url?.startsWith('http') && !recentInvoices[0].pdf_url.endsWith('/invoices')) {
          invoiceToDispatch = recentInvoices[0];
          console.log(`[DeepSeek AI] Customer asked or AI promised invoice. Re-dispatching invoice #${invoiceToDispatch.id}...`);
        }
      } catch (invErr: any) {
        console.warn('[DeepSeek AI] Notice: could not fetch recent invoice for PDF dispatch:', invErr.message);
      }
    }
  }

  if (invoiceToDispatch) {
    console.log(`[DeepSeek AI] Found invoice #${invoiceToDispatch.id} (${invoiceToDispatch.pdf_url}), triggering WhatsApp PDF document dispatch...`);
    await dispatchCustomerInvoicePdf({
      agent,
      customer,
      invoice: invoiceToDispatch,
      whatsappConfig,
      pgClient,
      emitNewMessage,
      cacheService,
    });
  }

  // 12. If customer requested samples and agent offers services, dispatch sample images directly
  await dispatchServiceSampleImages({
    agent,
    customer,
    incomingText: incomingMessage.message,
    replyText: cleanReply,
    whatsappConfig,
    pgClient,
    emitNewMessage,
    cacheService,
  });
}
