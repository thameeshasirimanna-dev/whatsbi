import { sanitizeWhatsAppFormatting, parseJsonUrls, isSampleRequest, isBankDetailsMessage } from './ai-formatters.js';
import { CacheService } from '../utils/cache.js';

/**
 * Normalizes phone number to E.164 international format
 */
export function normalizeE164(recipientPhone: string): string | null {
  let normalized = (recipientPhone || '').replace(/\D/g, '');
  if (!normalized) return null;
  // Sri Lankan local numbers: 07XXXXXXXX (10 digits starting with 0) -> 947XXXXXXXX
  if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = '94' + normalized.slice(1);
  } else if (!normalized.startsWith('94') && normalized.length === 9) {
    // 9 digits e.g. 771234567 -> 94771234567
    normalized = '94' + normalized;
  }
  // Standard Meta WhatsApp Cloud API accepts 10-15 digits
  if (!/^\d{10,15}$/.test(normalized)) return null;
  return normalized;
}

async function postMetaGraphMessage(
  phoneNumberId: string,
  accessToken: string,
  payload: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[WhatsApp Cloud API] Outbound send failed:', errText);
      return { success: false, error: errText };
    }

    const result: any = await res.json();
    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (err: any) {
    console.error('[WhatsApp Cloud API] Error dispatching message:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends outbound text message via WhatsApp Cloud API v23.0
 */
export async function sendWhatsAppTextMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  textMessage: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const normalizedPhone = normalizeE164(recipientPhone);
  if (!normalizedPhone) return { success: false, error: `Invalid or missing phone: ${recipientPhone}` };

  const formattedText = sanitizeWhatsAppFormatting(textMessage);

  return await postMetaGraphMessage(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'text',
    text: { body: formattedText },
  });
}

/**
 * Sends outbound image message via WhatsApp Cloud API v23.0
 */
export async function sendWhatsAppImageMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  imageUrl: string,
  caption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const normalizedPhone = normalizeE164(recipientPhone);
  if (!normalizedPhone) return { success: false, error: `Invalid or missing phone: ${recipientPhone}` };

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'image',
    image: { link: imageUrl },
  };
  if (caption) payload.image.caption = sanitizeWhatsAppFormatting(caption);

  return await postMetaGraphMessage(phoneNumberId, accessToken, payload);
}

/**
 * Sends outbound document message (e.g. Invoice PDF) via WhatsApp Cloud API v23.0
 */
export async function sendWhatsAppDocumentMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  documentUrl: string,
  filename: string,
  caption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const normalizedPhone = normalizeE164(recipientPhone);
  if (!normalizedPhone) return { success: false, error: `Invalid or missing phone: ${recipientPhone}` };

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'document',
    document: { link: documentUrl, filename },
  };
  if (caption) payload.document.caption = sanitizeWhatsAppFormatting(caption);

  return await postMetaGraphMessage(phoneNumberId, accessToken, payload);
}

/**
 * Dispatches sample images to the customer on WhatsApp if the customer requested samples and the service has images.
 */
export async function dispatchServiceSampleImages({
  agent,
  customer,
  incomingText,
  replyText,
  whatsappConfig,
  pgClient,
  emitNewMessage,
  cacheService,
}: {
  agent: any;
  customer: any;
  incomingText?: string;
  replyText?: string;
  whatsappConfig: any;
  pgClient: any;
  emitNewMessage?: (agentId: number, messageData: any) => void;
  cacheService?: CacheService;
}): Promise<number> {
  const isProduct = agent.business_type === 'product';
  if (incomingText && !isSampleRequest(incomingText)) return 0;

  const messagesTable = `${agent.agent_prefix}_messages`;
  let dispatchedCount = 0;

  try {
    let servicesList: any[] = [];
    if (isProduct) {
      const itemsTable = `${agent.agent_prefix}_inventory_items`;
      try {
        const { rows } = await pgClient.query(
          `SELECT id, name AS service_name, image_urls, image_url, description FROM ${itemsTable} WHERE is_active = true OR is_active IS NULL ORDER BY id ASC`
        );
        servicesList = (rows || []).map((r: any) => ({
          ...r,
          image_urls: r.image_urls || (r.image_url ? [r.image_url] : []),
        }));
      } catch {
        servicesList = [];
      }
    } else {
      try {
        const { rows } = await pgClient.query(
          "SELECT * FROM get_agent_services($1, null, null, 'created_at', 'desc')",
          [agent.id]
        );
        servicesList = rows || [];
      } catch {
        const servicesTable = `${agent.agent_prefix}_services`;
        const { rows } = await pgClient.query(
          `SELECT id, service_name, image_urls, service_links FROM ${servicesTable} WHERE is_active = true OR is_active IS NULL ORDER BY id ASC`
        );
        servicesList = rows || [];
      }
    }

    if (servicesList.length === 0) return 0;

    // Canonical keyword clusters for service domain identification
    const SERVICE_CLUSTERS: Record<string, string[]> = {
      web: ['web', 'website', 'websites', 'site', 'sites', 'web development', 'web design', 'web dev', 'web application', 'web app'],
      video: ['video', 'videos', 'video ad', 'video ads', 'reels', 'commercial', 'presenting', 'presentation'],
      photo: ['photo', 'photos', 'photography', 'product image', 'product images', 'photoshoot', 'product photos'],
      graphic: ['graphic', 'graphics', 'logo', 'flyer', 'banner', 'poster', 'branding'],
    };

    // Helper: calculate service relevance score based on cluster and token matching
    const calculateServiceScore = (text: string, serviceName: string): number => {
      if (!text || !serviceName) return 0;
      const tLower = text.toLowerCase();
      const sLower = serviceName.toLowerCase();

      // Direct full match or substring in either direction
      if (tLower.includes(sLower)) return 100;
      if (sLower.includes(tLower) && tLower.length >= 4) return 80;

      let score = 0;

      // Check domain clusters (e.g. "web development samples" vs "Web Development")
      for (const cluster of Object.values(SERVICE_CLUSTERS)) {
        const sMatchesCluster = cluster.some((k) => sLower.includes(k));
        const tMatchesCluster = cluster.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(tLower));
        if (sMatchesCluster && tMatchesCluster) {
          score += 70;
          break;
        }
      }

      // Token overlap matching
      const stopWords = new Set(['and', 'the', 'for', 'with', 'our', 'all', 'service', 'services', 'package', 'packages', 'sample', 'samples', 'wala', 'thiyenawada', 'thiyeda', 'ewanna', 'danna', 'karanna', 'ona']);
      const sTokens = sLower.split(/[\s,/\-_&]+/).filter((w: string) => w.length >= 3 && !stopWords.has(w));
      const tTokens = tLower.split(/[\s,/\-_&?!.]+/).filter((w: string) => w.length >= 3 && !stopWords.has(w));

      for (const sToken of sTokens) {
        for (const tToken of tTokens) {
          if (sToken === tToken) {
            score += 25;
          } else if (sToken.startsWith(tToken) || tToken.startsWith(sToken)) {
            score += 15;
          }
        }
      }
      return score;
    };

    // 1. PRIMARY SOURCE OF TRUTH: Evaluate the customer's incoming message first
    let targetService: any = null;
    let highestScore = 0;

    if (incomingText) {
      for (const s of servicesList) {
        const score = calculateServiceScore(incomingText, s.service_name || '');
        if (score > highestScore) {
          highestScore = score;
          targetService = s;
        }
      }
    }

    // If incoming message explicitly matched a service (score >= 35):
    // LOCK ONTO THIS SERVICE! Never allow replyText or previous history to override it!
    if (targetService && highestScore >= 35) {
      const sampleImages = parseJsonUrls(targetService.image_urls);
      if (sampleImages.length === 0) {
        console.log(`[WhatsApp Outbound] Customer requested samples for "${targetService.service_name}", but this service has no sample images (links only). Skipping image dispatch (do not send other services).`);
        return 0;
      }
    } else {
      // 2. Customer request was generic (e.g. "samples ewanna", "send samples").
      // Inspect recent INBOUND messages from customer only (never bot outbound captions)
      targetService = null;
      highestScore = 0;

      try {
        const { rows: historyRows } = await pgClient.query(
          `SELECT message FROM ${messagesTable}
           WHERE customer_id = $1 AND direction = 'inbound'
           ORDER BY timestamp DESC LIMIT 5`,
          [customer.id]
        );
        for (const hRow of historyRows) {
          if (!hRow.message) continue;
          for (const s of servicesList) {
            const hScore = calculateServiceScore(hRow.message, s.service_name || '');
            if (hScore >= 35 && hScore > highestScore) {
              highestScore = hScore;
              targetService = s;
            }
          }
          if (targetService && highestScore >= 50) break;
        }
      } catch (histErr) {
        console.warn('[WhatsApp Outbound] Error inspecting inbound conversation history for service matching:', histErr);
      }

      // If still not matched, check replyText as a last resort
      if (!targetService || highestScore < 35) {
        if (replyText) {
          for (const s of servicesList) {
            const rScore = calculateServiceScore(replyText, s.service_name || '');
            if (rScore >= 50 && rScore > highestScore) {
              highestScore = rScore;
              targetService = s;
            }
          }
        }
      }

      // If still no confident match, send NOTHING
      if (!targetService || highestScore < 35) {
        console.log(`[WhatsApp Outbound] No specific service matched for generic sample request. Skipping sample images to avoid sending unrelated services.`);
        return 0;
      }

      const sampleImages = parseJsonUrls(targetService.image_urls);
      if (sampleImages.length === 0) {
        console.log(`[WhatsApp Outbound] Service "${targetService.service_name}" matched, but has no sample images. Skipping image dispatch (do not send other services).`);
        return 0;
      }
    }

    const sampleImages = parseJsonUrls(targetService.image_urls);
    if (sampleImages.length === 0) return 0;

    // Dispatch up to 2 sample images
    const imagesToSend = sampleImages.slice(0, 2);
    for (const imgUrl of imagesToSend) {
      const imgCaption = isProduct
        ? `*${targetService.service_name}*`
        : `*${targetService.service_name}* - Sample Work`;
      const imgSendResult = await sendWhatsAppImageMessage(
        whatsappConfig.phone_number_id,
        whatsappConfig.api_key,
        customer.phone,
        imgUrl,
        imgCaption
      );

      if (imgSendResult.success) {
        dispatchedCount++;
        const { rows: imgInsertedRows } = await pgClient.query(
          `INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption)
           VALUES ($1, $2, 'outbound', CURRENT_TIMESTAMP, true, 'image', $3, $4) RETURNING *`,
          [customer.id, imgCaption, imgUrl, imgCaption]
        );

        if (emitNewMessage && imgInsertedRows.length > 0) {
          const msg = imgInsertedRows[0];
          emitNewMessage(agent.id, {
            id: msg.id,
            customer_id: customer.id,
            customer_name: customer.name || customer.phone,
            customer_phone: customer.phone,
            message: msg.message,
            sender_type: 'agent',
            direction: 'outbound',
            timestamp: msg.timestamp,
            media_type: 'image',
            media_url: imgUrl,
            caption: imgCaption,
          });
        }

        if (imgSendResult.messageId) {
          try {
            await pgClient.query(
              `INSERT INTO whatsapp_message_logs (user_id, agent_id, customer_phone, message_type, category, status, whatsapp_message_id)
               VALUES ($1, $2, $3, 'image', 'chatbot', 'sent', $4)`,
              [whatsappConfig.user_id, agent.id, customer.phone, imgSendResult.messageId]
            );
          } catch {}
        }
      }
    }

    if (cacheService && dispatchedCount > 0) {
      await cacheService.invalidateRecentMessages(agent.id, customer.id);
      await cacheService.invalidateChatList(agent.id);
    }
  } catch (sampleErr) {
    console.error('[WhatsApp Outbound] Error dispatching sample images:', sampleErr);
  }

  return dispatchedCount;
}

/**
 * Dispatches an invoice PDF document to the customer on WhatsApp.
 * STRICT: Only sends when an invoice has been legitimately generated from gathered details!
 * Never sends without generation or unverified fallbacks.
 */
export async function dispatchCustomerInvoicePdf({
  agent,
  customer,
  invoice,
  incomingText,
  replyText,
  caption: customCaption,
  whatsappConfig,
  pgClient,
  emitNewMessage,
  cacheService,
}: {
  agent: any;
  customer: any;
  invoice?: { id: number; invoice_number?: string; name?: string; pdf_url?: string; is_generated?: boolean; total_amount?: number; advance_amount?: number; status?: string };
  incomingText?: string;
  replyText?: string;
  caption?: string;
  whatsappConfig: any;
  pgClient: any;
  emitNewMessage?: (agentId: number, messageData: any) => void;
  cacheService?: CacheService;
}): Promise<boolean> {
  // STRICT RULE: Do NOT send invoice without a valid generated PDF URL!
  if (!invoice || !invoice.pdf_url || !invoice.pdf_url.startsWith('http')) {
    console.warn('[WhatsApp Outbound] No valid invoice PDF URL available to send.');
    return false;
  }

  const messagesTable = `${agent.agent_prefix}_messages`;
  const targetInvoice = invoice;

  const rawNum = targetInvoice.invoice_number || `#INV-${targetInvoice.id.toString().padStart(4, '0')}`;
  const cleanInvNum = rawNum.replace(/[^a-zA-Z0-9]/g, '');
  const totalAmt = Number(targetInvoice.total_amount || 0);
  const advAmt = Number(targetInvoice.advance_amount || 0);
  const hasPartial = advAmt > 0 && advAmt < totalAmt;
  const isPartial = (targetInvoice.status || '').toLowerCase() === 'partially_paid' || hasPartial;
  const isPaid = !isPartial && ((targetInvoice.status || '').toLowerCase() === 'paid' || (advAmt >= totalAmt && totalAmt > 0));
  const filename = `Invoice-${cleanInvNum}${isPaid ? '-Paid' : (isPartial ? '-Advance' : '')}.pdf`;
  const defaultCaption = isPaid
    ? `*Invoice ${rawNum}* - Paid in Full. Thank you for your payment! Your order/service has been confirmed and our team will proceed shortly.`
    : isPartial
    ? `*Invoice ${rawNum}* - Advance Payment Received. Thank you! Your order/service has been confirmed and our team will proceed shortly.`
    : `*Invoice ${rawNum}* - ${agent.business_name || 'Payment Request'}`;
  const caption = customCaption || defaultCaption;

  try {
    console.log(`[WhatsApp Outbound] Dispatching invoice PDF to customer ${customer.phone}: url=${targetInvoice.pdf_url}, filename=${filename}`);
    const docResult = await sendWhatsAppDocumentMessage(
      whatsappConfig.phone_number_id,
      whatsappConfig.api_key,
      customer.phone,
      targetInvoice.pdf_url,
      filename,
      caption
    );

    if (!docResult.success) {
      console.warn('[WhatsApp Outbound] Could not dispatch invoice PDF to WhatsApp:', docResult.error);
      return false;
    }

    console.log(`[WhatsApp Outbound] Successfully sent invoice PDF to WhatsApp! Meta MsgId: ${docResult.messageId}`);

    // Insert into messages table
    const { rows: insertedRows } = await pgClient.query(
      `INSERT INTO ${messagesTable} (customer_id, message, direction, timestamp, is_read, media_type, media_url, caption)
       VALUES ($1, $2, 'outbound', CURRENT_TIMESTAMP, true, 'document', $3, $4) RETURNING *`,
      [customer.id, filename, targetInvoice.pdf_url, caption]
    );

    // Emit Socket.IO event for real-time frontend update
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
        media_type: 'document',
        media_url: targetInvoice.pdf_url,
        caption: caption,
      });
    }

    // Invalidate caches
    if (cacheService) {
      await cacheService.invalidateRecentMessages(agent.id, customer.id);
      await cacheService.invalidateChatList(agent.id);
    }

    // Log message
    if (docResult.messageId) {
      try {
        await pgClient.query(
          `INSERT INTO whatsapp_message_logs (user_id, agent_id, customer_phone, message_type, category, status, whatsapp_message_id)
           VALUES ($1, $2, $3, 'document', 'chatbot', 'sent', $4)`,
          [whatsappConfig.user_id, agent.id, customer.phone, docResult.messageId]
        );
      } catch {}
    }

    return true;
  } catch (err) {
    console.error('[WhatsApp Outbound] Error sending invoice PDF document:', err);
    return false;
  }
}

export { dispatchCustomerInvoicePdf as dispatchInvoicePdfToCustomer };

