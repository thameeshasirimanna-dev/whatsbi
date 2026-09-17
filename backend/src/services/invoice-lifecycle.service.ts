import { generateAndUploadInvoicePdf } from './invoice-pdf.js';
import { dispatchCustomerInvoicePdf } from './whatsapp-outbound.service.js';
import { deleteMediaFromR2, getS3KeyFromUrl } from '../utils/s3.js';
import { CacheService } from '../utils/cache.js';

export interface MarkPaidOptions {
  agent: { id: number; agent_prefix: string; user_id?: number; [key: string]: any };
  invoiceId: number;
  advanceAmount?: number;
  orderId?: number | null;
  pgClient: any;
  emitNewMessage?: (agentId: number, messageData: any) => void;
  cacheService?: CacheService;
}

export interface MarkPaidResult {
  success: boolean;
  invoice: any;
  whatsappDispatched: boolean;
}

/**
 * Transitions an invoice to 'paid' status:
 * 1. Preserves the same invoice ID and invoice number (no duplicate invoice record created).
 * 2. Deletes the old unpaid PDF from Cloudflare R2.
 * 3. Generates a new PDF showing 'Status: Paid' and zero balance due.
 * 4. Updates the existing database record with the new PDF URL and 'paid' status.
 * 5. Re-dispatches the updated paid invoice PDF to the customer on WhatsApp.
 */
export async function markInvoiceAsPaidAndRedispatch({
  agent,
  invoiceId,
  advanceAmount,
  orderId,
  pgClient,
  emitNewMessage,
  cacheService,
}: MarkPaidOptions): Promise<MarkPaidResult> {
  const agentPrefix = agent.agent_prefix;

  // 1. Fetch current invoice record
  const { rows: invRows } = await pgClient.query(
    `SELECT * FROM ${agentPrefix}_orders_invoices WHERE id = $1`,
    [invoiceId]
  );

  if (invRows.length === 0) {
    throw new Error(`Invoice #${invoiceId} not found`);
  }

  const invoice = invRows[0];
  const oldPdfUrl = invoice.pdf_url;
  const linkedOrderId = orderId !== undefined ? orderId : invoice.order_id;

  // 2. Fetch customer details
  let customer: any = null;
  const targetCustId = invoice.customer_id;
  if (targetCustId) {
    const { rows: custRows } = await pgClient.query(
      `SELECT * FROM ${agentPrefix}_customers WHERE id = $1`,
      [targetCustId]
    );
    if (custRows.length > 0) {
      customer = custRows[0];
    }
  }

  // 3. Fetch line items
  const { rows: items } = await pgClient.query(
    `SELECT id, invoice_id, order_id, name, quantity, price, (quantity * price) as total 
     FROM ${agentPrefix}_orders_items 
     WHERE invoice_id = $1 OR (order_id IS NOT NULL AND order_id = $2)
     ORDER BY id ASC`,
    [invoice.id, linkedOrderId || -1]
  );

  // 4. Fetch full agent record & WhatsApp config
  const { rows: agentFullRows } = await pgClient.query(
    `SELECT * FROM agents WHERE id = $1`,
    [agent.id]
  );
  const agentFull = agentFullRows[0] || agent;

  const { rows: waRows } = await pgClient.query(
    `SELECT * FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true`,
    [agentFull.user_id]
  );
  const whatsappConfig = waRows.length > 0 ? waRows[0] : null;

  // 5. Compute totals
  const subtotal = items.reduce((sum: number, it: any) => sum + (parseFloat(it.total) || 0), 0);
  const discountPct = parseFloat(invoice.discount_percentage) || 0;
  const computedTotal = subtotal * (1 - discountPct / 100);
  const totalAmount = (invoice.total_amount && parseFloat(invoice.total_amount) > 0)
    ? parseFloat(invoice.total_amount)
    : computedTotal;

  const existingAdvance = parseFloat(invoice.advance_amount) || 0;
  const hasInputAdvance = advanceAmount !== undefined && advanceAmount !== null && !isNaN(Number(advanceAmount));
  const paidAmount = hasInputAdvance
    ? Number(advanceAmount)
    : (existingAdvance > 0 ? existingAdvance : totalAmount);

  const isFullPaid = paidAmount >= totalAmount;
  const newStatus = isFullPaid ? 'paid' : 'partially_paid';
  const remainingBalance = Math.max(0, totalAmount - paidAmount);

  // 6. Generate new PDF with updated status
  const invNumber = `#INV-${invoice.id.toString().padStart(4, '0')}`;
  console.log(`[Invoice Lifecycle] Generating updated PDF (${newStatus}) for invoice ${invNumber}...`);

  const paidPdfUrl = await generateAndUploadInvoicePdf(
    agentPrefix,
    invoice.customer_id,
    {
      invoiceName: invoice.name || 'INVOICE',
      invoiceNumber: invNumber,
      invoiceDate: new Date(invoice.generated_at || Date.now()).toLocaleDateString('en-GB'),
      businessName: agentFull.business_name || agentFull.name || 'Our Business',
      businessEmail: agentFull.business_email,
      businessPhone: agentFull.business_phone,
      businessAddress: agentFull.business_address,
      businessWebsite: agentFull.business_website,
      templatePath: agentFull.invoice_template_path,
      customerName: customer?.name || 'Valued Customer',
      customerPhone: customer?.phone || 'N/A',
      items: items.map((it: any) => ({
        name: it.name,
        quantity: it.quantity || 1,
        price: parseFloat(it.price) || 0,
      })),
      discountPercentage: discountPct,
      totalAmount: totalAmount,
      advanceAmount: paidAmount,
      status: newStatus,
      notes: invoice.notes,
      bankDetails: agentFull.bank_details,
    }
  );

  // 7. Delete old unpaid PDF from Cloudflare R2 now that the new paid PDF is ready
  if (paidPdfUrl && oldPdfUrl && paidPdfUrl !== oldPdfUrl) {
    const oldKey = getS3KeyFromUrl(oldPdfUrl);
    if (oldKey) {
      console.log(`[Invoice Lifecycle] Deleting old unpaid PDF from R2: key=${oldKey}`);
      await deleteMediaFromR2(oldKey).catch((delErr) => {
        console.warn('[Invoice Lifecycle] Failed to delete old unpaid invoice PDF from R2:', delErr);
      });
    }
  }

  const finalPdfUrl = paidPdfUrl || invoice.pdf_url;

  // 8. Ensure an Order exists in ${agentPrefix}_orders (when customer paid advance or full, order should create)
  let activeOrderId = linkedOrderId || invoice.order_id;
  const orderPayStatus = isFullPaid ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid');

  if (!activeOrderId) {
    console.log(`[Invoice Lifecycle] Invoice #${invoice.id} has no linked order. Automatically creating order...`);
    try {
      const { rows: orderRows } = await pgClient.query(
        `INSERT INTO ${agentPrefix}_orders (customer_id, invoice_id, total_amount, advance_amount, payment_status, status, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW())
         RETURNING id`,
        [
          invoice.customer_id,
          invoice.id,
          totalAmount,
          paidAmount,
          orderPayStatus,
          invoice.notes || null,
        ]
      );
      if (orderRows.length > 0) {
        activeOrderId = orderRows[0].id;
        console.log(`[Invoice Lifecycle] Automatically created Order #${activeOrderId} for Invoice #${invoice.id}`);
        // Link existing invoice items to the new order
        await pgClient.query(
          `UPDATE ${agentPrefix}_orders_items SET order_id = $1 WHERE invoice_id = $2 AND order_id IS NULL`,
          [activeOrderId, invoice.id]
        ).catch((linkErr: any) => {
          console.warn('[Invoice Lifecycle] Could not link order items to new order:', linkErr);
        });
      }
    } catch (orderErr: any) {
      console.error('[Invoice Lifecycle] Failed to auto-create order for invoice:', orderErr);
    }
  } else {
    // Sync linked order payment_status and advance_amount in CRM
    await pgClient.query(
      `UPDATE ${agentPrefix}_orders 
       SET advance_amount = $1, payment_status = $2, updated_at = NOW() 
       WHERE id = $3`,
      [paidAmount, orderPayStatus, activeOrderId]
    ).catch((oErr: any) => {
      console.warn('[Invoice Lifecycle] Could not sync linked order payment status:', oErr);
    });
  }

  // 9. Update existing invoice database row (No duplicate invoice created!)
  // Note: DB column status is constrained to ('generated', 'sent', 'paid').
  // Partial payments are represented by status = 'paid' with advance_amount < total_amount.
  let queryText = '';
  let queryParams: any[] = [];
  if (activeOrderId) {
    queryText = `UPDATE ${agentPrefix}_orders_invoices
      SET status = 'paid', pdf_url = $1, advance_amount = $2, order_id = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *`;
    queryParams = [finalPdfUrl, paidAmount, activeOrderId, invoice.id];
  } else {
    queryText = `UPDATE ${agentPrefix}_orders_invoices
      SET status = 'paid', pdf_url = $1, advance_amount = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *`;
    queryParams = [finalPdfUrl, paidAmount, invoice.id];
  }

  const { rows: updatedInvRows } = await pgClient.query(queryText, queryParams);

  const updatedInvoice = {
    ...updatedInvRows[0],
    status: newStatus,
    order_id: activeOrderId || invoice.order_id,
  };
  console.log(`[Invoice Lifecycle] Invoice #${invoice.id} successfully updated to '${newStatus}' with URL: ${finalPdfUrl}`);

  // 10. Re-dispatch the updated invoice PDF to the customer via WhatsApp
  let whatsappDispatched = false;
  if (customer && customer.phone && finalPdfUrl && whatsappConfig) {
    try {
      console.log(`[Invoice Lifecycle] Re-dispatching invoice ${invNumber} (${newStatus}) to customer ${customer.phone}...`);
      const formatLkr = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const caption = isFullPaid
        ? `*Invoice ${invNumber}* - Paid in Full. Thank you! We have started the work. Our project manager will contact you soon for gathering requirements.`
        : `*Invoice ${invNumber}* - Advance Payment Received (LKR ${formatLkr(paidAmount)}). Balance Due: LKR ${formatLkr(remainingBalance)}. We have started the work. Our project manager will contact you soon for gathering requirements.`;

      whatsappDispatched = await dispatchCustomerInvoicePdf({
        agent: agentFull,
        customer,
        invoice: {
          id: invoice.id,
          invoice_number: invNumber,
          name: updatedInvoice.name,
          pdf_url: finalPdfUrl,
          status: newStatus,
          total_amount: totalAmount,
          advance_amount: paidAmount,
        },
        caption,
        whatsappConfig,
        pgClient,
        emitNewMessage,
        cacheService,
      });
      console.log(`[Invoice Lifecycle] WhatsApp re-dispatch status for invoice ${invNumber}: ${whatsappDispatched}`);
    } catch (dispErr) {
      console.error(`[Invoice Lifecycle] Failed to re-dispatch invoice ${invNumber} to WhatsApp:`, dispErr);
    }
  } else {
    console.log(`[Invoice Lifecycle] Skipping WhatsApp dispatch: customer=${Boolean(customer)}, phone=${customer?.phone}, pdf=${Boolean(finalPdfUrl)}, waConfig=${Boolean(whatsappConfig)}`);
  }

  return {
    success: true,
    invoice: updatedInvoice,
    whatsappDispatched,
  };
}

export interface SendInvoiceOptions {
  agent: { id: number; agent_prefix: string; user_id?: number; [key: string]: any };
  invoiceId: number;
  pgClient: any;
  emitNewMessage?: (agentId: number, messageData: any) => void;
  cacheService?: CacheService;
}

export interface SendInvoiceResult {
  success: boolean;
  message?: string;
  invoice: any;
  whatsappDispatched: boolean;
}

/**
 * Sends or resends an existing invoice PDF to the customer via WhatsApp:
 * 1. Retrieves the invoice and customer records atomically.
 * 2. Ensures a valid PDF exists (generates one if missing).
 * 3. Builds a clean, professional Singlish-free caption based on payment state.
 * 4. Dispatches the PDF document to WhatsApp via Meta Cloud API v23.0.
 * 5. Updates invoice status from 'generated' to 'sent'.
 * 6. Records the message in messages table and emits Socket.IO event.
 */
export async function sendOrResendInvoiceViaWhatsApp({
  agent,
  invoiceId,
  pgClient,
  emitNewMessage,
  cacheService,
}: SendInvoiceOptions): Promise<SendInvoiceResult> {
  const agentPrefix = agent.agent_prefix;

  // 1. Fetch current invoice record
  const { rows: invRows } = await pgClient.query(
    `SELECT * FROM ${agentPrefix}_orders_invoices WHERE id = $1`,
    [invoiceId]
  );

  if (invRows.length === 0) {
    throw new Error(`Invoice #${invoiceId} not found`);
  }

  const invoice = invRows[0];

  // 2. Fetch customer details
  let customer: any = null;
  let targetCustId = invoice.customer_id;

  if (!targetCustId && invoice.order_id) {
    const { rows: ordRows } = await pgClient.query(
      `SELECT customer_id FROM ${agentPrefix}_orders WHERE id = $1`,
      [invoice.order_id]
    );
    if (ordRows.length > 0 && ordRows[0].customer_id) {
      targetCustId = ordRows[0].customer_id;
    }
  }

  if (targetCustId) {
    const { rows: custRows } = await pgClient.query(
      `SELECT * FROM ${agentPrefix}_customers WHERE id = $1`,
      [targetCustId]
    );
    if (custRows.length > 0) {
      customer = custRows[0];
    }
  }

  if (!customer) {
    throw new Error(`Customer for invoice #${invoiceId} not found`);
  }

  if (!customer.phone) {
    throw new Error(`Customer has no phone number recorded`);
  }

  // 3. Fetch agent record & WhatsApp config
  const { rows: agentFullRows } = await pgClient.query(
    `SELECT * FROM agents WHERE id = $1`,
    [agent.id]
  );
  const agentFull = agentFullRows[0] || agent;

  const { rows: waRows } = await pgClient.query(
    `SELECT * FROM whatsapp_configuration WHERE user_id = $1 AND is_active = true`,
    [agentFull.user_id]
  );

  if (waRows.length === 0) {
    throw new Error(`Active WhatsApp configuration not found for business`);
  }
  const whatsappConfig = waRows[0];

  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const advanceAmount = parseFloat(invoice.advance_amount) || 0;
  const remainingBalance = Math.max(0, totalAmount - advanceAmount);
  const invNumber = `#INV-${invoice.id.toString().padStart(4, '0')}`;

  // 4. Ensure PDF URL exists
  let finalPdfUrl = invoice.pdf_url;
  if (!finalPdfUrl || !finalPdfUrl.startsWith('http')) {
    console.log(`[Invoice Lifecycle] Invoice ${invNumber} missing valid PDF URL. Generating PDF now...`);
    const { rows: items } = await pgClient.query(
      `SELECT id, invoice_id, order_id, name, quantity, price, (quantity * price) as total 
       FROM ${agentPrefix}_orders_items 
       WHERE invoice_id = $1 OR (order_id IS NOT NULL AND order_id = $2)
       ORDER BY id ASC`,
      [invoice.id, invoice.order_id || -1]
    );

    finalPdfUrl = await generateAndUploadInvoicePdf(
      agentPrefix,
      customer.id,
      {
        invoiceName: invoice.name || 'INVOICE',
        invoiceNumber: invNumber,
        invoiceDate: new Date(invoice.generated_at || Date.now()).toLocaleDateString('en-GB'),
        businessName: agentFull.business_name || agentFull.name || 'Our Business',
        businessEmail: agentFull.business_email,
        businessPhone: agentFull.business_phone,
        businessAddress: agentFull.business_address,
        businessWebsite: agentFull.business_website,
        templatePath: agentFull.invoice_template_path,
        customerName: customer.name || 'Valued Customer',
        customerPhone: customer.phone || 'N/A',
        items: items.map((it: any) => ({
          name: it.name,
          quantity: it.quantity || 1,
          price: parseFloat(it.price) || 0,
        })),
        discountPercentage: parseFloat(invoice.discount_percentage) || 0,
        totalAmount,
        advanceAmount,
        status: invoice.status,
        notes: invoice.notes,
        bankDetails: agentFull.bank_details,
      }
    );

    if (finalPdfUrl) {
      await pgClient.query(
        `UPDATE ${agentPrefix}_orders_invoices SET pdf_url = $1 WHERE id = $2`,
        [finalPdfUrl, invoice.id]
      );
      invoice.pdf_url = finalPdfUrl;
    }
  }

  // 5. Build clean caption (Zero Singlish)
  const formatLkr = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isPaid = (invoice.status || '').toLowerCase() === 'paid';
  const isPartial = (invoice.status || '').toLowerCase() === 'partially_paid' || (isPaid && advanceAmount > 0 && advanceAmount < totalAmount);

  let caption = '';
  if (isPaid && !isPartial) {
    caption = `*Invoice ${invNumber}* - Paid in Full. Thank you! We have started the work. Our project manager will contact you soon for gathering requirements.`;
  } else if (isPartial) {
    caption = `*Invoice ${invNumber}* - Advance Payment Received (LKR ${formatLkr(advanceAmount)}). Balance Due: LKR ${formatLkr(remainingBalance)}. We have started the work. Our project manager will contact you soon for gathering requirements.`;
  } else {
    caption = `*Invoice ${invNumber}* - ${agentFull.business_name || agentFull.name || 'Invoice'}\nTotal Amount: LKR ${formatLkr(totalAmount)}\nOnce you make the advance or full payment at once, we start the work immediately. Our project manager will contact you soon for gathering requirements.`;
  }

  // 6. Dispatch PDF document to WhatsApp
  console.log(`[Invoice Lifecycle] Sending invoice ${invNumber} via WhatsApp to ${customer.phone}...`);
  const whatsappDispatched = await dispatchCustomerInvoicePdf({
    agent: agentFull,
    customer,
    invoice: {
      id: invoice.id,
      invoice_number: invNumber,
      name: invoice.name,
      pdf_url: finalPdfUrl,
      status: invoice.status,
      total_amount: totalAmount,
      advance_amount: advanceAmount,
    },
    caption,
    whatsappConfig,
    pgClient,
    emitNewMessage,
    cacheService,
  });

  if (!whatsappDispatched) {
    throw new Error('Failed to dispatch invoice PDF via WhatsApp Cloud API. Check recipient phone format and WhatsApp credentials.');
  }

  // 7. Update status to 'sent' if it was 'generated'
  let updatedInvoice = invoice;
  if (invoice.status === 'generated') {
    const { rows: updatedRows } = await pgClient.query(
      `UPDATE ${agentPrefix}_orders_invoices SET status = 'sent', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [invoice.id]
    );
    if (updatedRows.length > 0) {
      updatedInvoice = updatedRows[0];
    }
  }

  return {
    success: true,
    message: 'Invoice sent via WhatsApp successfully',
    invoice: updatedInvoice,
    whatsappDispatched,
  };
}

