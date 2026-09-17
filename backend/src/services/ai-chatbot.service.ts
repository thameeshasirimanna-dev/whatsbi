import { downloadMediaFromR2, getS3KeyFromUrl } from '../utils/s3.js';
import { CacheService } from '../utils/cache.js';
import { buildChatbotSystemPrompt } from './ai-prompt-builder.js';
import { fetchCatalogContext } from './ai-catalog-context.js';

import {
  stripEmojis,
  isBankDetailsMessage,
  formatBankDetails,
  sanitizeWhatsAppFormatting,
  parseJsonUrls,
  isSampleRequest,
  cleanIncompleteTrailingSentence,
  isPaymentSlipOrPaidMessage,
} from './ai-formatters.js';
import {
  sendWhatsAppTextMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppDocumentMessage,
  dispatchServiceSampleImages,
  dispatchCustomerInvoicePdf,
} from './whatsapp-outbound.service.js';
import { parseAndExecuteAgentActions } from './ai-agent-actions.service.js';
import {
  calculateDeepSeekCost,
  estimateFallbackCost,
  DeepSeekCostResult,
} from './ai-cost.service.js';

export {
  stripEmojis,
  isBankDetailsMessage,
  formatBankDetails,
  sanitizeWhatsAppFormatting,
  parseJsonUrls,
  isSampleRequest,
  cleanIncompleteTrailingSentence,
  isPaymentSlipOrPaidMessage,
  sendWhatsAppTextMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppDocumentMessage,
  dispatchServiceSampleImages,
  dispatchCustomerInvoicePdf,
  parseAndExecuteAgentActions,
};

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
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
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
        max_tokens: 2500, // Generous token headroom to prevent Sinhala/multilingual token exhaustion
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DeepSeek AI] API error: HTTP ${response.status} - ${errorText}`);
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
      return { reply: null, usage, cost };
    }

    let reply = stripEmojis(content.trim());
    if (isBankDetailsMessage(reply)) {
      reply = formatBankDetails(reply);
    }
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
}> {
  // 1. Fetch catalog data according to business type (encapsulated module)
  const catalogContext = await fetchCatalogContext({ agent, pgClient });

  // 2. Fetch company overview document if provided in R2
  let companyOverview = '';
  if (agent.company_overview_path) {
    try {
      const s3Key = getS3KeyFromUrl(agent.company_overview_path);
      const buffer = await downloadMediaFromR2(s3Key);
      if (buffer) {
        // Read text/markdown up to 3000 chars
        companyOverview = buffer.toString('utf-8').slice(0, 3000);
      }
    } catch (overviewErr) {
      console.error('[DeepSeek AI] Error reading company overview document:', overviewErr);
    }
  }

  // 3. Fetch chronological conversation history
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

  // 4. Check if an invoice or payment request was previously made
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
  const isPaymentReceipt = isPaymentSlipOrPaidMessage(effectiveText, incomingMediaType, hasInvoiceOrBankContext);

  // 5. Construct System Prompt with order confirmation guard and real Sri Lanka time
  const systemPrompt = buildChatbotSystemPrompt({
    agent,
    customer,
    catalogContext,
    companyOverview,
  });

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
  ];

  // If customer submitted a payment slip or notified paid, inject explicit Stage C directive
  if (isPaymentReceipt) {
    messages.push({
      role: 'system',
      content: `[CUSTOMER SENT PAYMENT RECEIPT / NOTIFIED PAID]
The customer has submitted a payment slip image/receipt or reported that they have paid.
Execute STAGE C (PAYMENT RECEIPT / CUSTOMER PAID STAGE):
- Warmly acknowledge receipt of the payment/slip in 1-2 short, natural spoken sentences.
- Explicitly inform the customer that our team will verify the payment and update the status manually shortly.
- Explain the full flow: Once the advance or full payment is verified/received, we start the work immediately and our project manager will contact them soon for gathering requirements.
- Spoken natural Sinhala: "ස්තූතියි! අපගේ team එක payment slip එක verify කරලා බලලා, ඉක්මනින්ම manually update කරන්නම්. Advance එක හෝ full payment එක confirm වුණු ගමන්ම අපි වැඩේ පටන් ගන්නවා. අපේ project manager අවශ්‍යතා (requirements) ලබා ගන්න ඉක්මනින්ම ඔයාට contact කරයි." (or in customer's preferred language).
- STRICT PROHIBITIONS:
  * STRICT BAN on Singlish: NEVER output any Singlish words or Latin-script Sinhala under any circumstances! Always write in pure Sinhala script (සිංහල අකුරෙන්) or pure English.
  * Do NOT output any [ACTION:CREATE_INVOICE] action tag!
  * Do NOT generate another invoice!
  * Do NOT send bank details or invoice summaries again!
  * Do NOT ask if they want to confirm the order!
  * Do NOT claim the order is already marked as paid automatically; always specify manual verification by the team.`
    });
  }

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
  if (!finalReply && isPaymentReceipt) {
    const custLang = customer.language || 'sinhala';
    if (custLang === 'english') {
      finalReply = "Thank you! Our team will verify your payment slip and update the status manually shortly.";
    } else {
      finalReply = "ස්තූතියි! අපගේ team එක payment slip එක verify කරලා බලලා, ඉක්මනින්ම manually update කරලා ඔයාට දන්වන්නම්.";
    }
  }
  return {
    reply: finalReply,
    cost: chatResult.cost,
    usage: chatResult.usage,
  };
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
  if (!customer.ai_enabled) {
    return;
  }

  // 2. Check agent DeepSeek AI balance
  let currentAiBalance = 4.0;
  try {
    const { rows: creditRows } = await pgClient.query(
      'SELECT ai_balance FROM agents WHERE id = $1',
      [agent.id]
    );
    currentAiBalance = creditRows.length > 0 ? parseFloat(creditRows[0].ai_balance ?? '4.0') : 4.0;
  } catch (colErr: any) {
    // Column not migrated yet, default to starting balance
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

  // 6. Send message via Meta WhatsApp Cloud API
  const sendResult = await sendWhatsAppTextMessage(
    whatsappConfig.phone_number_id,
    whatsappConfig.api_key,
    customer.phone,
    cleanReply
  );

  if (!sendResult.success) {
    console.error('[DeepSeek AI] Failed to send AI response to WhatsApp:', sendResult.error);
    return;
  }

  // 7. Insert outbound message into {prefix}_messages
  const messagesTable = `${agent.agent_prefix}_messages`;
  const { rows: insertedRows } = await pgClient.query(
    `INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption)
     VALUES ($1, $2, 'outbound', CURRENT_TIMESTAMP, true, 'none', NULL, NULL) RETURNING *`,
    [customer.id, cleanReply]
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
    emitAgentStatusUpdate(agent.id, {
      type: 'ai_balance_updated',
      ai_balance: newBalance,
      balance: newBalance,
    });
  }

  // 8. Emit Socket.IO event so agent UI updates in real time
  if (emitNewMessage && insertedRows.length > 0) {
    const msg = insertedRows[0];
    emitNewMessage(agent.id, {
      id: msg.id,
      customer_id: customer.id,
      customer_name: customer.name || customer.phone,
      customer_phone: customer.phone,
      message: msg.message,
      sender_type: 'agent',
      direction: 'outbound',
      timestamp: msg.timestamp,
      media_type: 'none',
      media_url: null,
      caption: null,
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
        [
          whatsappConfig.user_id,
          agent.id,
          customer.phone,
          sendResult.messageId,
        ]
      );
    } catch (logErr: any) {
      console.warn('Notice: could not record in whatsapp_message_logs:', logErr.message);
    }
  }

  // 11. If an invoice was legitimately generated, dispatch the invoice PDF document
  const invoiceAction = actionsExecuted.find(
    (a) => a.type === 'CREATE_INVOICE' && a.success && a.data?.pdf_url && a.data?.is_generated
  );
  if (invoiceAction?.data) {
    console.log(`[DeepSeek AI] Found generated invoice #${invoiceAction.data.id} (${invoiceAction.data.pdf_url}), triggering WhatsApp PDF document dispatch...`);
    await dispatchCustomerInvoicePdf({
      agent,
      customer,
      invoice: invoiceAction.data,
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
