import { isBankDetailsMessage, isPaymentSlipOrPaidMessage } from './ai-formatters.js';
import { extractRequestedQuantity } from './ai-agent-schema.js';

export interface CatalogMatchResult {
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  invoiceName: string;
}

/**
 * Matches line items against the agent's active service catalog or inventory.
 * Supports multiple items, resolves accurate unit prices, and computes totalAmount.
 */
export async function matchCatalogItems({
  agent,
  pgClient,
  items: initialItems,
  fullSearchText,
  customerName,
}: {
  agent: any;
  pgClient: any;
  items: Array<{ name: string; quantity: number; price: number }>;
  fullSearchText: string;
  customerName: string;
}): Promise<CatalogMatchResult> {
  let items = [...initialItems];

  try {
    const searchText = (fullSearchText || '').toLowerCase();

    if (agent.business_type === 'service') {
      const servicesTable = `${agent.agent_prefix}_services`;
      const packagesTable = `${agent.agent_prefix}_service_packages`;
      const { rows: catalogRows } = await pgClient.query(`
        SELECT s.service_name, p.package_name, p.price, p.description as package_desc
        FROM ${servicesTable} s
        LEFT JOIN ${packagesTable} p ON s.id = p.service_id
        WHERE (s.is_active = true OR s.is_active IS NULL)
        ORDER BY s.id ASC, p.id ASC
      `);

      if (catalogRows.length > 0) {
        const matchServiceRow = (text: string) => {
          const tLower = (text || '').toLowerCase();
          let best: any = null;
          let highest = 0;
          for (const row of catalogRows) {
            const pkg = (row.package_name || '').trim().toLowerCase();
            const srv = (row.service_name || '').trim().toLowerCase();
            let score = 0;
            if (pkg && tLower.includes(pkg)) score += pkg.length * 3;
            if (srv && tLower.includes(srv)) score += srv.length * 2;
            const tokens = pkg.split(/\W+/).filter((t: string) => t.length > 2);
            for (const tok of tokens) {
              if (tLower.includes(tok)) score += tok.length;
            }
            if (score > highest) {
              highest = score;
              best = row;
            }
          }
          return highest > 0 ? best : null;
        };

        // Match EACH item independently
        for (const it of items) {
          const matched = matchServiceRow(it.name) || matchServiceRow(`${it.name} ${searchText}`);
          if (matched) {
            const catName = (matched.package_name || matched.service_name || '').trim();
            const catPrice = Number(matched.price);
            if (catName) it.name = catName;
            if (!isNaN(catPrice) && catPrice > 0) it.price = catPrice;
          }
        }

        // If items has only 1 item, check if customer ordered multiple distinct catalog packages
        if (items.length === 1) {
          const matchedDistinct: any[] = [];
          for (const row of catalogRows) {
            const pkg = (row.package_name || '').trim().toLowerCase();
            if (pkg && pkg.length >= 4 && searchText.includes(pkg)) {
              if (!matchedDistinct.some((r) => r.package_name === row.package_name)) {
                matchedDistinct.push(row);
              }
            }
          }
          if (matchedDistinct.length > 1) {
            items = matchedDistinct.map((row) => ({
              name: (row.package_name || row.service_name || 'Service Package').trim(),
              quantity: 1,
              price: Number(row.price) || 0,
            }));
          }
        }
      }
    } else {
      const itemsTable = `${agent.agent_prefix}_inventory_items`;
      const { rows: productRows } = await pgClient.query(`
        SELECT name, price FROM ${itemsTable}
        WHERE is_active = true OR is_active IS NULL
        ORDER BY id ASC
      `);

      if (productRows.length > 0) {
        const matchProductRow = (text: string) => {
          const tLower = (text || '').toLowerCase();
          let best: any = null;
          let highest = 0;
          for (const row of productRows) {
            const prod = (row.name || '').trim().toLowerCase();
            let score = 0;
            if (prod && tLower.includes(prod)) score += prod.length * 3;
            const tokens = prod.split(/\W+/).filter((t: string) => t.length > 2);
            for (const tok of tokens) {
              if (tLower.includes(tok)) score += tok.length;
            }
            if (score > highest) {
              highest = score;
              best = row;
            }
          }
          return highest > 0 ? best : null;
        };

        for (const it of items) {
          const matched = matchProductRow(it.name) || matchProductRow(`${it.name} ${searchText}`);
          if (matched) {
            const catName = (matched.name || '').trim();
            const catPrice = Number(matched.price);
            if (catName) it.name = catName;
            if (!isNaN(catPrice) && catPrice > 0) it.price = catPrice;
          }
        }

        if (items.length === 1) {
          const matchedDistinct: any[] = [];
          for (const row of productRows) {
            const prod = (row.name || '').trim().toLowerCase();
            if (prod && prod.length >= 3 && searchText.includes(prod)) {
              if (!matchedDistinct.some((r) => r.name === row.name)) {
                matchedDistinct.push(row);
              }
            }
          }
          if (matchedDistinct.length > 1) {
            items = matchedDistinct.map((row) => ({
              name: (row.name || 'Product Item').trim(),
              quantity: 1,
              price: Number(row.price) || 0,
            }));
          }
        }
      }
    }
  } catch (catErr) {
    console.warn('[AI Catalog Matcher] Notice during catalog matching:', catErr);
  }

  // Recompute total amount as sum of all line item totals
  const reconciledSum = items.reduce((sum, it) => sum + ((it.quantity || 1) * (it.price || 0)), 0);
  const totalAmount = reconciledSum > 0 ? reconciledSum : (items[0]?.price ? items[0].price * (items[0].quantity || 1) : 0);

  // Multi-item invoice name
  let invoiceName = '';
  if (items.length === 1) {
    invoiceName = `Invoice for ${customerName} - ${items[0]?.name || 'Service'}`;
  } else if (items.length === 2) {
    invoiceName = `Invoice for ${customerName} - ${items[0]?.name} & ${items[1]?.name}`;
  } else {
    invoiceName = `Invoice for ${customerName} - ${items[0]?.name} + ${items.length - 1} items`;
  }

  return { items, totalAmount, invoiceName };
}

/**
 * Generates an invoice if customer confirmed order but no action tag was provided by LLM.
 */
export async function detectAndGenerateFallbackInvoice({
  agent,
  customer,
  incomingText,
  replyText,
  pgClient,
  createInvoiceFn,
}: {
  agent: any;
  customer: any;
  incomingText?: string;
  replyText: string;
  pgClient: any;
  createInvoiceFn: (args: any) => Promise<any>;
}) {
  if (isPaymentSlipOrPaidMessage(incomingText, undefined, true)) return null;

  const replyOffersInvoice = /{{INVOICE_NUMBER}}|\*Invoice:\*|\*බිල්පත:\*|#INV-|\bINV-?\d{3,}\b|Invoice එක මෙන්න|ඔබගේ Invoice PDF|official\s*invoice/i.test(replyText);
  const confirmationKeywords = /\b(confirm|confirmed|proceed|order|book|yes|sure|send (?:the )?(?:bill|invoice)|danna|gannawa|ow|hari|ha|haa|okk|okey|හරි|ඔව්|හා|හ්ම්|තහවුරු|ඕන|එවන්න|දාන්න|ගන්නම්|කරන්න|කෝ|ko)\b/i;
  const isOrderConfirmed = Boolean(incomingText && confirmationKeywords.test(incomingText));
  const replyHasBankDetails = isBankDetailsMessage(replyText);

  // If the reply itself generated an invoice layout, OR customer confirmed and reply provided bank details:
  if (!replyOffersInvoice && (!isOrderConfirmed || !replyHasBankDetails)) {
    return null;
  }

  let fallbackItems: Array<{ name: string; quantity: number; price: number }> = [];

  // 1. First attempt: directly parse structured invoice line items from replyText
  const itemLineMatch = replyText.match(/\*Item:\*\s*([^\r\n]+)/i);
  if (itemLineMatch) {
    let fullItemLine = itemLineMatch[1].trim();
    let qty = 1;
    const qtyMatch = fullItemLine.match(/\((?:Qty|Quantity):\s*(\d+)\)/i);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10) || 1;
      fullItemLine = fullItemLine.replace(/\((?:Qty|Quantity):\s*(\d+)\)/i, '').trim();
    }
    const itemName = fullItemLine || 'Order Item';
    const unitPriceMatch = replyText.match(/\*Unit Price:\*\s*(?:Rs\.?|LKR)?\s*([\d,]+(?:\.\d{2})?)/i);
    const totalAmountMatch = replyText.match(/\*Total Amount:\*\s*(?:Rs\.?|LKR)?\s*([\d,]+(?:\.\d{2})?)/i);
    let price = unitPriceMatch ? parseFloat(unitPriceMatch[1].replace(/,/g, '')) : 0;
    let total = totalAmountMatch ? parseFloat(totalAmountMatch[1].replace(/,/g, '')) : 0;
    if (!price && total) price = total / qty;
    if (!total && price) total = price * qty;
    fallbackItems.push({ name: itemName, quantity: qty, price });
  }

  if (fallbackItems.length === 0) {
    const multiItemLines = replyText.split('\n').filter((l) => /^[•\-\*]\s+/.test(l.trim()));
    for (const rawLine of multiItemLines) {
      const line = rawLine.trim().replace(/^[•\-\*]\s+/, '');
      if (/^(item|invoice|bank|account|branch|customer|total)/i.test(line)) continue;
      const priceMatch = line.match(/[-–—:]\s*(?:Rs\.?|LKR)?\s*([\d,]+(?:\.\d{2})?)\s*$/i);
      if (priceMatch) {
        const itPrice = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;
        let itName = line.slice(0, priceMatch.index).trim();
        let itQty = 1;
        const qtyMatch = itName.match(/\((?:Qty|Quantity):\s*(\d+)\)/i);
        if (qtyMatch) {
          itQty = parseInt(qtyMatch[1], 10) || 1;
          itName = itName.replace(/\((?:Qty|Quantity):\s*(\d+)\)/i, '').trim();
        }
        if (itName) {
          fallbackItems.push({ name: itName, quantity: itQty, price: itPrice });
        }
      }
    }
  }

  // 2. Second attempt: match against database catalog (services/packages or inventory items)
  try {
    const fullContext = `${incomingText || ''} ${replyText}`.toLowerCase();
    if (agent.business_type === 'service') {
      const servicesTable = `${agent.agent_prefix}_services`;
      const packagesTable = `${agent.agent_prefix}_service_packages`;
      const { rows } = await pgClient.query(`
        SELECT s.service_name, p.package_name, p.price
        FROM ${servicesTable} s
        LEFT JOIN ${packagesTable} p ON s.id = p.service_id
        WHERE s.is_active = true OR s.is_active IS NULL
        ORDER BY s.id ASC
      `);
      if (rows.length > 0) {
        if (fallbackItems.length > 0) {
          // Reconcile prices from DB if price was 0
          for (const fb of fallbackItems) {
            if (fb.price === 0) {
              const matchedRow = rows.find((r: any) =>
                (r.package_name && fb.name.toLowerCase().includes(r.package_name.toLowerCase())) ||
                (r.service_name && fb.name.toLowerCase().includes(r.service_name.toLowerCase()))
              );
              if (matchedRow && matchedRow.price) {
                fb.price = Number(matchedRow.price);
              }
            }
          }
        } else {
          const matched = rows.filter((r: any) =>
            (r.package_name && fullContext.includes(r.package_name.toLowerCase())) ||
            (r.service_name && fullContext.includes(r.service_name.toLowerCase()))
          );
          if (matched.length > 0) {
            const uniqueMap = new Map();
            matched.forEach((m: any) => {
              const key = (m.package_name || m.service_name).trim().toLowerCase();
              if (!uniqueMap.has(key)) uniqueMap.set(key, m);
            });
            fallbackItems = Array.from(uniqueMap.values()).map((c: any) => ({
              name: (c.package_name || c.service_name || 'Standard Package').trim(),
              quantity: 1,
              price: Number(c.price) || 0,
            }));
          } else {
            fallbackItems = [{
              name: rows[0].package_name || rows[0].service_name || 'Standard Package',
              quantity: 1,
              price: Number(rows[0].price) || 0,
            }];
          }
        }
      }
    } else {
      const itemsTable = `${agent.agent_prefix}_inventory_items`;
      const { rows } = await pgClient.query(`
        SELECT name, price FROM ${itemsTable}
        WHERE is_active = true OR is_active IS NULL
        ORDER BY id ASC
      `);
      if (rows.length > 0) {
        if (fallbackItems.length > 0) {
          for (const fb of fallbackItems) {
            if (fb.price === 0) {
              const matchedRow = rows.find((r: any) => r.name && fb.name.toLowerCase().includes(r.name.toLowerCase()));
              if (matchedRow && matchedRow.price) {
                fb.price = Number(matchedRow.price);
              }
            }
          }
        } else {
          const matched = rows.filter((r: any) => r.name && fullContext.includes(r.name.toLowerCase()));
          if (matched.length > 0) {
            const uniqueMap = new Map();
            matched.forEach((m: any) => {
              const key = m.name.trim().toLowerCase();
              if (!uniqueMap.has(key)) uniqueMap.set(key, m);
            });
            fallbackItems = Array.from(uniqueMap.values()).map((c: any) => ({
              name: c.name.trim(),
              quantity: 1,
              price: Number(c.price) || 0,
            }));
          } else {
            fallbackItems = [{
              name: rows[0].name.trim(),
              quantity: 1,
              price: Number(rows[0].price) || 0,
            }];
          }
        }
      }
    }
  } catch (cErr) {
    console.warn('[AI Catalog Matcher] Catalog query notice for fallback:', cErr);
  }

  if (fallbackItems.length === 0) {
    fallbackItems = [{ name: 'Order Item', quantity: 1, price: 0 }];
  }

  if (fallbackItems.length === 1) {
    const priceMatch = replyText.match(/(?:LKR|Rs\.?)\s*([\d,]+(?:\.\d{2})?)/i);
    if (priceMatch) {
      const parsed = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) fallbackItems[0].price = parsed;
    }
    const fallbackQty = extractRequestedQuantity(incomingText) || extractRequestedQuantity(replyText) || 1;
    fallbackItems[0].quantity = fallbackQty;
  }

  const fallbackTotal = fallbackItems.reduce((sum, it) => sum + (it.quantity * it.price), 0);
  const fallbackTitle = fallbackItems.length === 1
    ? fallbackItems[0].name
    : `${fallbackItems[0].name} & ${fallbackItems[1].name}`;

  console.log(`[AI Catalog Matcher] Fallback invoice with ${fallbackItems.length} items (Total: LKR ${fallbackTotal}) for customer ${customer.id}`);
  return await createInvoiceFn({
    agent,
    customer,
    payload: {
      name: `Invoice for ${customer.name || customer.phone} - ${fallbackTitle}`,
      customer_name: customer.name,
      items: fallbackItems,
      total_amount: fallbackTotal,
      advance_amount: 0,
      notes: 'Generated automatically from order request',
    },
    incomingText,
    replyText,
    pgClient,
  });
}
