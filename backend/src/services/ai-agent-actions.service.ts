import { generateAndUploadInvoicePdf, InvoiceItem } from './invoice-pdf.js';
import {
  formatBankDetails,
  sanitizeWhatsAppFormatting,
  cleanIncompleteTrailingSentence,
  isPaymentSlipOrPaidMessage,
} from './ai-formatters.js';
import {
  executeCreateAppointment,
  ensureInvoiceTableSchema,
  extractRequestedQuantity,
  sanitizePlaceholderText,
  safeParseJson,
  insertInvoiceRecord,
  extractAgentActions,
  sanitizeLeakedActionArtifacts,
  reconcileInvoicePayload,
} from './ai-agent-schema.js';
import {
  matchCatalogItems,
  detectAndGenerateFallbackInvoice,
} from './ai-catalog-matcher.js';

export interface AgentActionPayload {
  action: string;
  [key: string]: any;
}

export interface ActionResult {
  cleanReply: string;
  actionsExecuted: Array<{ type: string; success: boolean; data?: any; error?: string }>;
}

export {
  executeCreateAppointment,
  ensureInvoiceTableSchema,
  extractRequestedQuantity,
  sanitizePlaceholderText,
  safeParseJson,
  extractAgentActions,
  sanitizeLeakedActionArtifacts,
  reconcileInvoicePayload,
  detectAndGenerateFallbackInvoice,
};

/**
 * Creates a real invoice in {agent_prefix}_orders_invoices and line items in {agent_prefix}_orders_items
 */
export async function executeCreateInvoice({
  agent,
  customer,
  payload,
  incomingText,
  replyText,
  pgClient,
}: {
  agent: any;
  customer: any;
  payload: any;
  incomingText?: string;
  replyText?: string;
  pgClient: any;
}) {
  const invoicesTable = `${agent.agent_prefix}_orders_invoices`;
  const itemsTable = `${agent.agent_prefix}_orders_items`;

  // Ensure table schema is compatible with invoice-first flow
  await ensureInvoiceTableSchema(pgClient, agent.agent_prefix);

  // 1. Reconcile item name, quantity, unit price, total amount, customer name, notes
  const reconciled = reconcileInvoicePayload(payload, customer, incomingText, replyText);
  const { advanceAmount, customerName, notes } = reconciled;

  // 2. Authoritative catalog matching: ensure item name, unit price, and total are accurate for all items
  const fullSearchText = `${incomingText || ''} ${replyText || ''} ${payload?.name || ''}`;
  const catalogResult = await matchCatalogItems({
    agent,
    pgClient,
    items: reconciled.items,
    fullSearchText,
    customerName,
  });

  const items = catalogResult.items;
  const totalAmount = catalogResult.totalAmount;
  const invoiceName = catalogResult.invoiceName;


  // 2. Insert preliminary invoice record to reserve ID
  const tempPdfUrl = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/invoices`;
  const invoice = await insertInvoiceRecord(pgClient, invoicesTable, {
    customerId: customer.id,
    name: invoiceName,
    pdfUrl: tempPdfUrl,
    totalAmount,
    advanceAmount,
    notes,
  });

  if (!invoice || !invoice.id) {
    throw new Error(`Failed to insert invoice into ${invoicesTable}`);
  }
  const invoiceNumber = `#INV-${invoice.id.toString().padStart(4, '0')}`;

  // 3. Insert items linked to this invoice
  for (const it of items) {
    try {
      await pgClient.query(
        `INSERT INTO ${itemsTable} (invoice_id, name, quantity, price) VALUES ($1, $2, $3, $4)`,
        [invoice.id, it.name, it.quantity, it.price]
      );
    } catch (itErr) {
      console.warn('[AI Agent Actions] Could not insert order item:', itErr);
    }
  }

  // 4. Format invoice date
  const now = new Date();
  const invoiceDateStr = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // 5. If customer name was gathered or updated, save to customer record
  if (customerName && customerName !== 'Valued Customer' && customerName !== customer.phone) {
    if (!customer.name || customer.name === 'Valued Customer' || customer.name === customer.phone) {
      try {
        await pgClient.query(
          `UPDATE ${agent.agent_prefix}_customers SET name = $1, updated_at = NOW() WHERE id = $2`,
          [customerName, customer.id]
        );
        customer.name = customerName;
      } catch (cErr) {
        console.warn('[AI Agent Actions] Could not update customer name:', cErr);
      }
    }
  }

  // 6. Generate & upload invoice PDF with retries
  let publicPdfUrl: string | null = null;
  let isGenerated = false;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const uploadedUrl = await generateAndUploadInvoicePdf(agent.agent_prefix, customer.id, {
        invoiceName,
        invoiceNumber,
        invoiceDate: invoiceDateStr,
        businessName: agent.business_name || agent.name || 'Our Business',
        businessEmail: agent.business_email || undefined,
        businessPhone: agent.contact_number || undefined,
        businessAddress: agent.address || undefined,
        businessWebsite: agent.website || undefined,
        templatePath: agent.invoice_template_path || undefined,
        customerName,
        customerPhone: customer.phone || 'N/A',
        items,
        totalAmount,
        advanceAmount,
        notes: notes || undefined,
        bankDetails: payload?.bank_details || agent.bank_details || undefined,
      });

      if (uploadedUrl && uploadedUrl.startsWith('http') && !uploadedUrl.endsWith('/invoices')) {
        publicPdfUrl = uploadedUrl;
        isGenerated = true;
        await pgClient.query(
          `UPDATE ${invoicesTable} SET pdf_url = $1 WHERE id = $2`,
          [publicPdfUrl, invoice.id]
        );
        invoice.pdf_url = publicPdfUrl;
        break;
      }
    } catch (pdfErr) {
      console.error(`[AI Agent Actions] Attempt ${attempt} failed to generate/upload invoice PDF:`, pdfErr);
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 500));
      }
    }
  }

  return {
    ...invoice,
    invoice_number: invoiceNumber,
    items,
    total_amount: totalAmount,
    advance_amount: advanceAmount,
    is_generated: isGenerated,
  };
}

/**
 * Parses [ACTION:TYPE:{...}] blocks from DeepSeek output, executes database updates,
 * substitutes dynamic tokens, and returns sanitized customer-facing text.
 */
export async function parseAndExecuteAgentActions({
  agent,
  customer,
  rawReply,
  incomingText,
  pgClient,
}: {
  agent: any;
  customer: any;
  rawReply: string;
  incomingText?: string;
  pgClient: any;
}): Promise<ActionResult> {
  if (!rawReply || typeof rawReply !== 'string') {
    return { cleanReply: '', actionsExecuted: [] };
  }

  const actionsExecuted: Array<{ type: string; success: boolean; data?: any; error?: string }> = [];
  let processedText = rawReply;

  // 1. Extract all [ACTION:TYPE:{...}] blocks using balanced brace tracking
  const extractedActions = extractAgentActions(rawReply);

  for (const act of extractedActions) {
    const { type: actionType, payload, fullMatch } = act;

    // If customer submitted a payment slip or notified paid, ignore any duplicate CREATE_INVOICE action
    if (actionType === 'CREATE_INVOICE' && isPaymentSlipOrPaidMessage(incomingText, undefined, true)) {
      console.log('[AI Agent Actions] Customer submitted payment slip or reported paid; skipping redundant CREATE_INVOICE action.');
      if (fullMatch) {
        processedText = processedText.replace(fullMatch, '');
      }
      continue;
    }

    try {
      if (actionType === 'CREATE_APPOINTMENT') {
        const appointment = await executeCreateAppointment({
          agent,
          customer,
          payload,
          pgClient,
        });
        actionsExecuted.push({ type: 'CREATE_APPOINTMENT', success: true, data: appointment });

        const aptNumber = `#APT-${appointment.id.toString().padStart(4, '0')}`;
        processedText = processedText
          .replace(/\{\{APPOINTMENT_ID\}\}/g, aptNumber)
          .replace(/\{\{APPOINTMENT_NUMBER\}\}/g, aptNumber);
      } else if (actionType === 'CREATE_INVOICE') {
        const invoice = await executeCreateInvoice({
          agent,
          customer,
          payload,
          incomingText,
          replyText: rawReply,
          pgClient,
        });
        const hasValidPdf = Boolean(
          invoice &&
          invoice.id &&
          invoice.is_generated &&
          invoice.pdf_url &&
          invoice.pdf_url.startsWith('http') &&
          !invoice.pdf_url.endsWith('/invoices')
        );
        actionsExecuted.push({ type: 'CREATE_INVOICE', success: hasValidPdf, data: invoice });

        if (hasValidPdf) {
          processedText = processedText
            .replace(/\{\{INVOICE_ID\}\}/g, invoice.invoice_number)
            .replace(/\{\{INVOICE_NUMBER\}\}/g, invoice.invoice_number);

          // Synchronize quantity and item details
          if (invoice.items && invoice.items[0] && invoice.items[0].quantity > 1) {
            const realQty = invoice.items[0].quantity;
            processedText = processedText
              .replace(/(\*Quantity:\*)\s*1\b/gi, `$1 ${realQty}`)
              .replace(/(\*Qty:\*)\s*1\b/gi, `$1 ${realQty}`)
              .replace(/(Qty:\s*)1\b/gi, `$1${realQty}`);
          }
        }
      }
    } catch (err: any) {
      console.error(`[AI Agent Actions] Error executing ${actionType}:`, err.message || err);
      actionsExecuted.push({ type: actionType, success: false, error: err.message });
    }

    // Remove the full matched tag from processed text
    if (fullMatch) {
      processedText = processedText.replace(fullMatch, '');
    }
  }

  // 2. Fallback check: If no CREATE_INVOICE action was executed, but invoice was requested or promised
  const hasInvoice = actionsExecuted.some((a) => a.type === 'CREATE_INVOICE' && a.success);
  if (!hasInvoice) {
    try {
      const fallbackInvoice = await detectAndGenerateFallbackInvoice({
        agent,
        customer,
        incomingText,
        replyText: processedText,
        pgClient,
        createInvoiceFn: executeCreateInvoice,
      });

      if (
        fallbackInvoice &&
        fallbackInvoice.id &&
        fallbackInvoice.is_generated &&
        fallbackInvoice.pdf_url &&
        fallbackInvoice.pdf_url.startsWith('http') &&
        !fallbackInvoice.pdf_url.endsWith('/invoices')
      ) {
        actionsExecuted.push({ type: 'CREATE_INVOICE', success: true, data: fallbackInvoice });
        processedText = processedText
          .replace(/\{\{INVOICE_ID\}\}/g, fallbackInvoice.invoice_number)
          .replace(/\{\{INVOICE_NUMBER\}\}/g, fallbackInvoice.invoice_number);
      }
    } catch (fbErr: any) {
      console.error('[AI Agent Actions] Fallback invoice generation error:', fbErr.message || fbErr);
    }
  }

  // 3. Strip all action blocks and any leaked action artifacts / JSON tails
  let cleanText = sanitizeLeakedActionArtifacts(processedText);

  // If customer is reporting payment or sending a slip, strip redundant bank details if leaked
  if (isPaymentSlipOrPaidMessage(incomingText, undefined, true)) {
    cleanText = cleanText.replace(/(?:\n\s*)?\*?Bank\s*Details\*?[\s\S]*?(?=\n\n|$)/gi, '');
  }

  // 4. Populate invoice number. Do NOT append invoice download URL to text message (sent as WhatsApp PDF document).
  const activeInvoice = actionsExecuted.find(
    (a) => a.type === 'CREATE_INVOICE' && a.success && a.data?.pdf_url && a.data?.is_generated
  )?.data;

  if (activeInvoice) {
    cleanText = cleanText
      .replace(/\{\{INVOICE_ID\}\}/g, activeInvoice.invoice_number)
      .replace(/\{\{INVOICE_NUMBER\}\}/g, activeInvoice.invoice_number)
      .replace(/\{\{INVOICE_URL\}\}/g, '');
  }

  // Strip any leaked or raw invoice download URLs from message text
  cleanText = cleanText
    .replace(/(?:\n\s*)?\*?Download\s*Invoice\s*PDF\*?\s*[:\-–—]?\s*https?:\/\/[^\s]+/gi, '')
    .replace(/(?:\n\s*)?https?:\/\/[^\s]+\/invoices\/[^\s]+/gi, '');

  // 5. Ensure customer-facing text has no dangling or incomplete trailing sentences
  cleanText = cleanIncompleteTrailingSentence(cleanText);

  // Clean remaining unreplaced placeholder tags

  cleanText = cleanText
    .replace(/\{\{INVOICE_ID\}\}/g, 'INV-Ready')
    .replace(/\{\{INVOICE_NUMBER\}\}/g, 'INV-Ready')
    .replace(/\{\{INVOICE_URL\}\}/g, '')
    .replace(/\{\{APPOINTMENT_ID\}\}/g, 'APT-Confirmed')
    .replace(/\{\{APPOINTMENT_NUMBER\}\}/g, 'APT-Confirmed');

  // Format bank details and WhatsApp markdown
  cleanText = formatBankDetails(cleanText);
  cleanText = sanitizeWhatsAppFormatting(cleanText);

  return {
    cleanReply: cleanText,
    actionsExecuted,
  };
}

