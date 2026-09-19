import { generateAndUploadInvoicePdf, InvoiceItem } from './invoice-pdf.js';
import { uploadMediaToR2, deleteMediaFromR2 } from '../utils/s3.js';

export interface UpdateInvoiceOptions {
  agent: { id: number; agent_prefix: string; business_name?: string; name?: string; bank_details?: string; invoice_template_path?: string; [key: string]: any };
  invoiceId: number;
  invoiceName?: string;
  items: InvoiceItem[];
  discountPercentage?: number;
  advanceAmount?: number;
  totalAmount?: number;
  notes?: string | null;
  status?: string;
  customerId?: number;
  pdfBase64?: string;
  pgClient: any;
}

export interface UpdateInvoiceResult {
  success: boolean;
  message: string;
  invoice: any;
  items: InvoiceItem[];
  pdfUrl?: string | null;
}

/**
 * Updates an existing invoice, synchronizes line items, regenerates the PDF,
 * uploads the new PDF to Cloudflare R2, and deletes the obsolete previous PDF.
 */
export async function updateInvoiceWithPdfRegeneration({
  agent,
  invoiceId,
  invoiceName,
  items,
  discountPercentage,
  advanceAmount,
  totalAmount: inputTotalAmount,
  notes,
  status,
  customerId,
  pdfBase64,
  pgClient,
}: UpdateInvoiceOptions): Promise<UpdateInvoiceResult> {
  const agentPrefix = agent.agent_prefix;
  const invoicesTable = `${agentPrefix}_orders_invoices`;
  const itemsTable = `${agentPrefix}_orders_items`;
  const customersTable = `${agentPrefix}_customers`;

  // 1. Verify invoice exists
  const { rows: existingRows } = await pgClient.query(
    `SELECT * FROM ${invoicesTable} WHERE id = $1`,
    [invoiceId]
  );

  if (existingRows.length === 0) {
    throw new Error(`Invoice #${invoiceId} not found`);
  }

  const existingInvoice = existingRows[0];
  const oldPdfUrl = existingInvoice.pdf_url;
  const targetCustId = customerId || existingInvoice.customer_id;

  // 2. Compute financial totals
  const validItems = Array.isArray(items) ? items.filter((it) => it.name && it.name.trim().length > 0) : [];
  const calculatedSubtotal = validItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.price) || 0),
    0
  );
  const discountPct = discountPercentage !== undefined ? Number(discountPercentage) || 0 : (Number(existingInvoice.discount_percentage) || 0);
  const calculatedTotal = Number((calculatedSubtotal * (1 - discountPct / 100)).toFixed(2));
  const finalTotal = (inputTotalAmount !== undefined && Number(inputTotalAmount) >= 0 && (discountPct === 0 || Math.abs(Number(inputTotalAmount) - calculatedSubtotal) > 0.01))
    ? Number(inputTotalAmount)
    : calculatedTotal;
  const finalAdvance = advanceAmount !== undefined && Number(advanceAmount) >= 0 ? Number(advanceAmount) : (Number(existingInvoice.advance_amount) || 0);

  const finalName = (invoiceName || existingInvoice.name || `Invoice #${invoiceId}`).trim();
  const finalNotes = notes !== undefined ? (notes ? String(notes).trim() : null) : existingInvoice.notes;
  const finalStatus = status || existingInvoice.status || 'generated';

  // 3. Database transaction: Update invoice and replace line items
  const client = await pgClient.connect();
  let updatedInvoice: any = null;

  try {
    await client.query('BEGIN');

    // Update invoice record
    const updateInvSql = `
      UPDATE ${invoicesTable}
      SET
        customer_id = $1,
        name = $2,
        total_amount = $3,
        advance_amount = $4,
        discount_percentage = $5,
        notes = $6,
        status = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;

    const { rows: updateRows } = await client.query(updateInvSql, [
      targetCustId,
      finalName,
      finalTotal,
      finalAdvance,
      discountPct,
      finalNotes,
      finalStatus,
      invoiceId,
    ]);
    updatedInvoice = updateRows[0];

    // Delete existing line items for this invoice
    await client.query(`DELETE FROM ${itemsTable} WHERE invoice_id = $1`, [invoiceId]);

    // Insert new line items
    if (validItems.length > 0) {
      for (const it of validItems) {
        await client.query(
          `INSERT INTO ${itemsTable} (order_id, invoice_id, name, quantity, price)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            existingInvoice.order_id || null,
            invoiceId,
            it.name.trim(),
            Number(it.quantity) || 1,
            Number(it.price) || 0,
          ]
        );
      }
    }

    await client.query('COMMIT');
  } catch (txErr) {
    await client.query('ROLLBACK');
    throw txErr;
  } finally {
    client.release();
  }

  // 4. Regenerate & upload updated PDF
  let newPdfUrl: string | null = null;
  const invoiceNumber = `#INV-${invoiceId.toString().padStart(4, '0')}`;

  // If frontend already prepared a base64 PDF
  if (pdfBase64 && typeof pdfBase64 === 'string') {
    try {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      const now = new Date();
      const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${now.getTime()}`;
      const fileName = `invoice_cust_${targetCustId}_${formattedDate}.pdf`;
      const r2Key = `${agentPrefix}/invoices/${targetCustId}/${fileName}`;

      const uploadedUrl = await uploadMediaToR2(
        agentPrefix,
        pdfBuffer,
        fileName,
        'application/pdf',
        'incoming',
        r2Key
      );

      if (uploadedUrl && uploadedUrl.startsWith('http')) {
        newPdfUrl = uploadedUrl;
      }
    } catch (b64Err) {
      console.warn('[Invoice Edit Service] Base64 PDF upload failed, falling back to backend PDF generator:', b64Err);
    }
  }

  // Fallback / standard backend PDF generation
  if (!newPdfUrl) {
    try {
      // Fetch customer details for PDF
      let customerName = 'Valued Customer';
      let customerPhone = 'N/A';
      if (targetCustId) {
        const { rows: custRows } = await pgClient.query(
          `SELECT name, phone FROM ${customersTable} WHERE id = $1`,
          [targetCustId]
        );
        if (custRows.length > 0) {
          customerName = custRows[0].name || customerName;
          customerPhone = custRows[0].phone || customerPhone;
        }
      }

      const now = new Date();
      const invoiceDateStr = now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      newPdfUrl = await generateAndUploadInvoicePdf(agentPrefix, targetCustId, {
        invoiceName: finalName,
        invoiceNumber,
        invoiceDate: invoiceDateStr,
        businessName: agent.business_name || agent.name || 'Our Business',
        businessEmail: agent.business_email || undefined,
        businessPhone: agent.contact_number || undefined,
        businessAddress: agent.address || undefined,
        businessWebsite: agent.website || undefined,
        templatePath: agent.invoice_template_path || undefined,
        customerName,
        customerPhone,
        items: validItems,
        discountPercentage: discountPct,
        totalAmount: finalTotal,
        advanceAmount: finalAdvance,
        status: finalStatus,
        notes: finalNotes || undefined,
        bankDetails: agent.bank_details || undefined,
      });
    } catch (genErr) {
      console.error('[Invoice Edit Service] Error generating updated PDF:', genErr);
    }
  }

  // 5. Update pdf_url on invoice and delete previous PDF if URL changed
  if (newPdfUrl && newPdfUrl.startsWith('http') && !newPdfUrl.endsWith('/invoices')) {
    await pgClient.query(
      `UPDATE ${invoicesTable} SET pdf_url = $1 WHERE id = $2`,
      [newPdfUrl, invoiceId]
    );
    updatedInvoice.pdf_url = newPdfUrl;

    // Delete obsolete old PDF from R2
    if (oldPdfUrl && oldPdfUrl !== newPdfUrl) {
      const publicUrl = process.env.R2_PUBLIC_URL;
      if (publicUrl && oldPdfUrl.startsWith(publicUrl)) {
        const oldKey = oldPdfUrl.replace(`${publicUrl}/`, '');
        deleteMediaFromR2(oldKey).catch((delErr) =>
          console.warn('[Invoice Edit Service] Non-critical error deleting old PDF from R2:', delErr.message)
        );
      }
    }
  }

  return {
    success: true,
    message: 'Invoice updated and PDF regenerated successfully',
    invoice: {
      ...updatedInvoice,
      items: validItems,
      invoice_number: invoiceNumber,
    },
    items: validItems,
    pdfUrl: newPdfUrl,
  };
}
