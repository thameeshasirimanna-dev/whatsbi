export { executeCreateAppointment, ensureInvoiceTableSchema } from './ai-agent-db.js';

/**
 * Detects and extracts requested quantity from user message or context
 */
export function extractRequestedQuantity(text?: string): number | null {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim();

  // 1. Explicit qty patterns: "qty: 2", "qty 2", "quantity: 2", "quantity 2", "count: 2", "count 2"
  const explicitMatch = t.match(/\b(?:qty|quantity|count)\s*[:=]?\s*(\d+)\b/i);
  if (explicitMatch) {
    const q = parseInt(explicitMatch[1], 10);
    if (q > 0 && q <= 100000) return q;
  }

  // 2. Units patterns: "2 nos", "2 pcs", "2 pieces", "2 items", "2 packages", "2 cards", "2 units", "2 sets"
  const unitMatch = t.match(/\b(\d+)\s*(?:nos|pcs|pieces|items|packages|units|cards|copies|sets|services|prints)\b/i);
  if (unitMatch) {
    const q = parseInt(unitMatch[1], 10);
    if (q > 0 && q <= 100000) return q;
  }

  // 3. Sinhala / Singlish patterns: "2ක්", "2 k", "2k", "dekak", "deka"
  const sinhalaMatch = t.match(/\b(\d+)\s*(?:ක්|k|ට|ka|kuth)\b/i);
  if (sinhalaMatch) {
    const q = parseInt(sinhalaMatch[1], 10);
    if (q > 0 && q <= 100000) return q;
  }
  if (/\b(?:dekak|deka|දෙකක්|දෙක)\b/i.test(t)) return 2;
  if (/\b(?:thunak|thuna|තුනක්|තුන)\b/i.test(t)) return 3;
  if (/\b(?:hatharak|hathara|හතරක්|හතර)\b/i.test(t)) return 4;
  if (/\b(?:pahak|paha|පහක්|පහ)\b/i.test(t)) return 5;

  // 4. Intent verbs: "need 2", "want 2", "give me 2", "send 2", "order 2", "buy 2", "take 2"
  const verbMatch = t.match(/\b(?:need|want|give\s*me|send|order|buy|take|make|print|get|for)\s*(\d+)\b/i);
  if (verbMatch) {
    const q = parseInt(verbMatch[1], 10);
    if (q > 0 && q <= 100000) return q;
  }

  // 5. Standalone number at start/end or word numbers: "two", "three"
  if (/\b(?:two|two\s*of\s*them)\b/i.test(t)) return 2;
  if (/\b(?:three|three\s*of\s*them)\b/i.test(t)) return 3;
  if (/\b(?:four|four\s*of\s*them)\b/i.test(t)) return 4;
  if (/\b(?:five|five\s*of\s*them)\b/i.test(t)) return 5;

  // 6. Standalone digit if message is short like "2" or "2 please"
  const shortMatch = t.match(/^(\d+)\s*(?:please|plz)?$/i);
  if (shortMatch) {
    const q = parseInt(shortMatch[1], 10);
    if (q > 0 && q <= 100000) return q;
  }

  return null;
}

/**
 * Strips prompt placeholder text like [Customer Name], [Item/Service], etc.
 */
export function sanitizePlaceholderText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[\s*(?:Customer Name|Customer|Name)\s*\]/gi, '')
    .replace(/\[\s*(?:Item\/Service|Item\/Package Name|Item Name|Service Name|Package Name|Service|Item|Package)\s*\]/gi, 'Service Item')
    .replace(/\[\s*(?:PriceNumber|Price|Unit Price)\s*\]/gi, '')
    .replace(/\[\s*(?:TotalNumber|Total|TotalCalculatedNumber)\s*\]/gi, '')
    .replace(/\[\s*(?:Any notes or requirements|Notes)\s*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safely parses raw JSON from DeepSeek output, handling markdown blocks, single quotes, and trailing commas.
 */
export function safeParseJson(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {}
  try {
    const fixed = cleaned
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
      .replace(/:\s*'([^']*)'/g, ':"$1"');
    return JSON.parse(fixed);
  } catch {}
  return null;
}

/**
 * Inserts preliminary invoice record into table with fallback handling
 */
export async function insertInvoiceRecord(
  pgClient: any,
  invoicesTable: string,
  data: {
    customerId: number | string;
    name: string;
    pdfUrl: string;
    totalAmount: number;
    advanceAmount: number;
    notes: string | null;
  }
) {
  const { customerId, name, pdfUrl, totalAmount, advanceAmount, notes } = data;
  try {
    const insertQuery = `
      INSERT INTO ${invoicesTable} (customer_id, name, pdf_url, status, discount_percentage, total_amount, advance_amount, notes, generated_at, updated_at)
      VALUES ($1, $2, $3, 'sent', 0, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    const res = await pgClient.query(insertQuery, [
      customerId,
      name,
      pdfUrl,
      totalAmount,
      advanceAmount,
      notes,
    ]);
    return res.rows[0];
  } catch (insertErr: any) {
    const fallbackQuery = `
      INSERT INTO ${invoicesTable} (customer_id, order_id, name, pdf_url, status, total_amount, advance_amount, notes, generated_at, updated_at)
      VALUES ($1, NULL, $2, $3, 'sent', $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    const res = await pgClient.query(fallbackQuery, [
      customerId,
      name,
      pdfUrl,
      totalAmount,
      advanceAmount,
      notes,
    ]);
    return res.rows[0];
  }
}

export interface ExtractedAction {
  type: string;
  rawJson: string;
  payload: any;
  fullMatch: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Extracts [ACTION:TYPE:{...}] blocks using balanced brace/bracket tracking.
 * Accurately extracts JSON payloads containing nested arrays like items: [...] without truncating.
 */
export function extractAgentActions(text: string): ExtractedAction[] {
  if (!text || typeof text !== 'string') return [];
  const actions: ExtractedAction[] = [];
  const actionPrefixRegex = /\[\s*ACTION\s*:\s*([A-Z_]+)\s*:/gi;
  let match: RegExpExecArray | null;

  while ((match = actionPrefixRegex.exec(text)) !== null) {
    const actionType = match[1].toUpperCase();
    const startIndex = match.index;
    let cursor = actionPrefixRegex.lastIndex;

    // Skip whitespace to find start of JSON payload
    while (cursor < text.length && /\s/.test(text[cursor])) {
      cursor++;
    }

    if (cursor >= text.length) break;

    const openChar = text[cursor];
    let jsonPayload = '';
    let endIndex = -1;

    if (openChar === '{' || openChar === '[') {
      const closeChar = openChar === '{' ? '}' : ']';
      let depth = 0;
      let inString = false;
      let escape = false;
      const jsonStart = cursor;

      for (let i = cursor; i < text.length; i++) {
        const ch = text[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (ch === openChar) {
            depth++;
          } else if (ch === closeChar) {
            depth--;
            if (depth === 0) {
              jsonPayload = text.slice(jsonStart, i + 1);
              // Find the closing bracket ']' of the [ACTION:...] tag
              let afterJson = i + 1;
              while (afterJson < text.length && /\s/.test(text[afterJson])) {
                afterJson++;
              }
              if (afterJson < text.length && text[afterJson] === ']') {
                endIndex = afterJson + 1;
              } else {
                endIndex = i + 1;
              }
              break;
            }
          }
        }
      }
    }

    // Fallback: search for closing bracket if brace tracking was not triggered
    if (endIndex === -1) {
      const nextBracket = text.indexOf(']', cursor);
      if (nextBracket !== -1) {
        jsonPayload = text.slice(cursor, nextBracket).trim();
        endIndex = nextBracket + 1;
      }
    }

    if (endIndex !== -1 && jsonPayload) {
      const parsed = safeParseJson(jsonPayload) || {};

      // If a trailing notes snippet was appended immediately outside the closing tag,
      // harvest it into parsed.notes and extend endIndex so it is cleanly removed from text.
      const trailingSnippet = text.slice(endIndex);
      const trailingNotesMatch = trailingSnippet.match(/^\s*,?\s*"notes"\s*:\s*(?:"([^"]*)"?|'([^']*)'?|([^\n\r}\]]+))/i);
      if (trailingNotesMatch) {
        const harvested = (trailingNotesMatch[1] || trailingNotesMatch[2] || trailingNotesMatch[3] || '').trim();
        if (harvested && (!parsed.notes || parsed.notes.length < harvested.length)) {
          parsed.notes = harvested;
        }
        endIndex += trailingNotesMatch[0].length;
        while (endIndex < text.length && /["'\}\]\s]/.test(text[endIndex])) {
          endIndex++;
        }
      }

      const fullMatch = text.slice(startIndex, endIndex);
      actions.push({
        type: actionType,
        rawJson: jsonPayload,
        payload: parsed,
        fullMatch,
        startIndex,
        endIndex,
      });
      actionPrefixRegex.lastIndex = endIndex;
    }
  }

  return actions;
}

/**
 * Strips orphaned JSON fragments and action tag remnants from user-facing text.
 * Ensures snippets like ',"notes":"..."' or ',"totalamount":...' never leak into WhatsApp.
 */
export function sanitizeLeakedActionArtifacts(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;

  // 1. Remove any remaining [ACTION:...:...] blocks
  cleaned = cleaned.replace(/\[\s*ACTION\s*:\s*[A-Z_]+[\s\S]*?\]/gi, '');

  // 2. Remove orphaned action tag prefix remnants like [ACTION:... up to end of text
  cleaned = cleaned.replace(/\[\s*ACTION\s*:[^\]]*$/gi, '');

  // 3. Remove orphaned JSON key-value pairs anywhere in text
  cleaned = cleaned.replace(/,?\s*"(?:total_?amount|advance_?amount|notes|customer_?name|items|bank_?details|name|unit_?price|price|quantity|qty)"\s*:\s*(?:"[^"\n\r]*"?|'[^'\n\r]*'?|\d+[\d.]*|\[[^\]]*\]?|\{[^}]*\}?)/gi, '');

  // 4. Remove any orphaned "notes": "..." multi-line or unclosed snippets anywhere in text
  cleaned = cleaned.replace(/,?\s*"notes"\s*:\s*(?:"[\s\S]*?(?:"|$)|'[\s\S]*?(?:'|$)|[^\n\r]+)/gi, '');

  // 5. Remove any dangling notes or JSON tails before invoice link or end
  cleaned = cleaned.replace(/,?\s*"notes"\s*:\s*[\s\S]*?(?=\n\n|\*Download|$)/gi, '');

  // 6. Clean lingering trailing JSON braces, quotes, brackets at end of lines or text
  cleaned = cleaned.replace(/["'\}\]]+$/gm, '');
  cleaned = cleaned.replace(/^[,\s\}\]]+/gm, '');
  cleaned = cleaned.replace(/["'\}\]\s]+$/g, '');

  // 7. Clean up excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

export interface ReconciledInvoiceData {
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  advanceAmount: number;
  customerName: string;
  invoiceName: string;
  notes: string | null;
}

/**
 * Reconciles invoice details, normalizing keys, item names, quantities, unit prices, and totals.
 */
export function reconcileInvoicePayload(
  payload: any,
  customer: any,
  incomingText?: string,
  replyText?: string
): ReconciledInvoiceData {
  const p = payload || {};
  const requestedQty = extractRequestedQuantity(incomingText) || extractRequestedQuantity(replyText);

  // Extract total and advance amounts supporting all naming conventions (snake_case, lower, camelCase)
  const rawTotalAmount = p.total_amount ?? p.totalamount ?? p.totalAmount ?? p.total ?? p.amount;
  let totalAmount = rawTotalAmount !== undefined && rawTotalAmount !== null
    ? Number(String(rawTotalAmount).replace(/[^\d.]/g, ''))
    : NaN;

  const rawAdvanceAmount = p.advance_amount ?? p.advanceamount ?? p.advanceAmount ?? p.advance ?? 0;
  let advanceAmount = rawAdvanceAmount !== undefined && rawAdvanceAmount !== null
    ? Number(String(rawAdvanceAmount).replace(/[^\d.]/g, ''))
    : 0;

  // Clean and sanitize item name helper
  const cleanItemName = (raw: string): string => {
    let name = sanitizePlaceholderText(String(raw || '').trim());
    // Strip redundant "Invoice for [Customer] - " or "Invoice - " prefix if LLM passed invoice title as item name
    name = name.replace(/^Invoice\s+(?:for\s+[^-\n]+-\s*|-?\s*)/i, '').trim();
    // Strip leading quantity like "1 x ", "4x ", "1 ", "4 "
    name = name.replace(/^(\d+)\s*(?:x|-|\*|\.)?\s+/i, '').trim();
    // Strip trailing duration descriptors e.g. ", 30s-1 minute"
    name = name.replace(/,\s*\d+\s*(?:s|sec|secs|second|seconds|min|mins|minute|minutes)[^,\n]*$/i, '').trim();
    return name || 'Service Item';
  };


  let items: Array<{ name: string; quantity: number; price: number }> = [];

  let rawItems = p.items;
  if (rawItems && !Array.isArray(rawItems) && typeof rawItems === 'object') {
    rawItems = [rawItems];
  }

  if (Array.isArray(rawItems) && rawItems.length > 0) {
    items = rawItems.map((it: any, idx: number) => {
      // For multi-item arrays, only fall back to top-level requestedQty for the first item if not specified
      const rawQty = it.quantity ?? it.qty ?? it.count ?? (idx === 0 ? (p.quantity ?? p.qty ?? requestedQty) : 1) ?? 1;
      let q = Number(String(rawQty).replace(/[^\d.]/g, '')) || 1;

      const rawPrice = it.price ?? it.unit_price ?? it.unitprice ?? it.unitPrice ?? it.rate ?? it.amount;
      let unitPrice = rawPrice !== undefined && rawPrice !== null
        ? Number(String(rawPrice).replace(/[^\d.]/g, ''))
        : 0;

      const name = cleanItemName(it.name || it.item_name || it.item || it.title || it.service_name || p.name);

      if (rawItems.length === 1 && q > 1 && !isNaN(totalAmount) && totalAmount > 0 && Math.abs(unitPrice - totalAmount) < 0.01) {
        unitPrice = totalAmount / q;
      }

      return { name, quantity: q, price: unitPrice };
    });

    if (items.length === 1 && items[0].quantity === 1 && requestedQty && requestedQty > 1) {
      items[0].quantity = requestedQty;
      if (!isNaN(totalAmount) && totalAmount > 0 && Math.abs(items[0].price - totalAmount) < 0.01) {
        items[0].price = totalAmount / items[0].quantity;
      }
    }
  } else {
    // Single item from top-level payload
    const rawQty = p.quantity ?? p.qty ?? p.count ?? requestedQty ?? 1;
    let q = Number(String(rawQty).replace(/[^\d.]/g, '')) || 1;

    let unitPrice = Number(p.unit_price ?? p.unitprice ?? p.unitPrice ?? p.price ?? p.rate) || 0;
    let totalAmt = !isNaN(totalAmount) && totalAmount > 0 ? totalAmount : 0;

    if (unitPrice > 0 && totalAmt <= 0) {
      totalAmt = unitPrice * q;
    } else if (unitPrice <= 0 && totalAmt > 0) {
      unitPrice = totalAmt / q;
    } else if (unitPrice > 0 && totalAmt > 0 && q > 1 && Math.abs(unitPrice - totalAmt) < 0.01) {
      unitPrice = totalAmt / q;
    }

    if (isNaN(totalAmount) || totalAmount <= 0) {
      totalAmount = totalAmt;
    }

    const name = cleanItemName(p.service_name || p.package_name || p.item_name || p.name || 'Service Package');
    items = [{ name, quantity: q, price: unitPrice }];
  }

  // Detect and split single compound item e.g. "Package 1 + Package 2" or "Video Ad & Logo Design"
  const compoundSplitter = /\s+(?:\+|&|and|saha)\s+/i;
  if (items.length === 1 && compoundSplitter.test(items[0].name)) {
    const parts = items[0].name.split(compoundSplitter).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      const splitPrice = items[0].price > 0 ? (items[0].price / parts.length) : 0;
      items = parts.map(part => ({
        name: cleanItemName(part),
        quantity: 1,
        price: splitPrice,
      }));
    }
  }

  // Calculate and reconcile line totals
  const calculatedTotal = items.reduce((sum, it) => sum + ((it.quantity || 1) * (it.price || 0)), 0);
  if (items.length > 1) {
    totalAmount = calculatedTotal > 0 ? calculatedTotal : (totalAmount > 0 ? totalAmount : 5000);
  } else {
    if (isNaN(totalAmount) || totalAmount <= 0) {
      totalAmount = calculatedTotal > 0 ? calculatedTotal : 5000;
    } else if (items[0].price === 0 && totalAmount > 0) {
      items[0].price = totalAmount / (items[0].quantity || 1);
    } else if (calculatedTotal > 0 && Math.abs(calculatedTotal - totalAmount) > 0.01) {
      totalAmount = calculatedTotal;
    }
  }

  if (isNaN(advanceAmount) || advanceAmount < 0) {
    advanceAmount = 0;
  } else if (advanceAmount > totalAmount) {
    advanceAmount = totalAmount;
  }

  // Sanitize customer name
  let rawCustomerName = String(p.customer_name || '').trim();
  rawCustomerName = sanitizePlaceholderText(rawCustomerName);
  let customerName = rawCustomerName;
  if (!customerName || customerName.toLowerCase() === 'valued customer' || customerName === customer?.phone) {
    if (customer?.name && customer.name !== customer.phone && customer.name.toLowerCase() !== 'valued customer') {
      customerName = customer.name;
    } else {
      const nameMatch = (incomingText || '').match(/(?:my name is|i am|i'm|name\s*[:=])\s*([a-zA-Z\s]{2,30})/i);
      customerName = nameMatch ? nameMatch[1].trim() : (customer?.name || 'Valued Customer');
    }
  }

  // Sanitize invoice name
  let invoiceName = sanitizePlaceholderText(String(p.name || '').trim());
  if (!invoiceName || invoiceName.toLowerCase() === 'invoice for' || invoiceName.toLowerCase() === 'invoice') {
    if (items.length === 1) {
      invoiceName = `Invoice for ${customerName} - ${items[0]?.name || 'Service'}`;
    } else if (items.length === 2) {
      invoiceName = `Invoice for ${customerName} - ${items[0]?.name} & ${items[1]?.name}`;
    } else {
      invoiceName = `Invoice for ${customerName} - ${items[0]?.name} + ${items.length - 1} items`;
    }
  }

  // Sanitize notes
  let notes = p.notes ? sanitizePlaceholderText(String(p.notes).trim()) : null;
  if (notes && /^(none|null|n\/a|no notes)$/i.test(notes)) {
    notes = null;
  }

  return {
    items,
    totalAmount,
    advanceAmount,
    customerName,
    invoiceName,
    notes,
  };
}



