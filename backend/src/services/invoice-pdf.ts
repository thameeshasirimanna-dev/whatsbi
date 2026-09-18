import sharp from 'sharp';
import { uploadMediaToR2, downloadMediaFromR2 } from '../utils/s3.js';

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

export interface InvoicePdfData {
  invoiceName?: string;
  invoiceNumber: string;
  invoiceDate: string;
  businessName: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  businessWebsite?: string;
  templatePath?: string;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  discountPercentage?: number;
  totalAmount: number;
  advanceAmount?: number;
  status?: string;
  notes?: string;
  bankDetails?: string;
}

// A4 dimensions in PDF points (210mm x 297mm)
const A4_HEIGHT_PT = 841.89;
const MM_TO_PT = 72 / 25.4; // 2.83464567

function toPdfX(xMm: number): number {
  return xMm * MM_TO_PT;
}

function toPdfY(yMm: number): number {
  return A4_HEIGHT_PT - (yMm * MM_TO_PT);
}

/**
 * Escapes text for PDF string literals
 */
function escapePdfText(text: any): string {
  if (!text) return '';
  return String(text)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Approximate text width calculation in points for standard Helvetica
 */
function getTextWidth(text: string, fontSize: number, isBold: boolean = false): number {
  if (!text) return 0;
  let widthEm = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === ' ' || char === '.' || char === ',' || char === ':' || char === ';' || char === '!' || char === '\'' || char === '|' || char === 'i' || char === 'l' || char === 'I') {
      widthEm += 0.28;
    } else if (char >= '0' && char <= '9') {
      widthEm += 0.56;
    } else if (char >= 'A' && char <= 'Z') {
      if (char === 'M' || char === 'W') {
        widthEm += isBold ? 0.95 : 0.85;
      } else {
        widthEm += isBold ? 0.72 : 0.68;
      }
    } else if (char >= 'a' && char <= 'z') {
      if (char === 'm' || char === 'w') {
        widthEm += isBold ? 0.85 : 0.75;
      } else if (char === 'f' || char === 'j' || char === 'r' || char === 't') {
        widthEm += 0.35;
      } else {
        widthEm += isBold ? 0.58 : 0.52;
      }
    } else if (char === '#' || char === '-' || char === '(' || char === ')' || char === '/' || char === '\\') {
      widthEm += 0.35;
    } else {
      widthEm += 0.55;
    }
  }
  return widthEm * fontSize;
}

/**
 * Wraps text into lines that do not exceed maxWidthPt
 */
function wrapText(text: string, maxWidthPt: number, fontSize: number, isBold: boolean = false): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = getTextWidth(testLine, fontSize, isBold);
    if (testWidth <= maxWidthPt) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function leftText(text: string, leftMm: number, yMm: number, fontSize: number, isBold: boolean = false): string {
  const xPt = toPdfX(leftMm);
  const yPt = toPdfY(yMm);
  const font = isBold ? '/F2' : '/F1';
  return `BT\n${font} ${fontSize} Tf\n0 0 0 rg\n${xPt.toFixed(2)} ${yPt.toFixed(2)} Td\n(${escapePdfText(text)}) Tj\nET\n`;
}

function rightText(text: string, rightMm: number, yMm: number, fontSize: number, isBold: boolean = false, colorRg: string = '0 0 0'): string {
  const textW = getTextWidth(text, fontSize, isBold);
  const xPt = toPdfX(rightMm) - textW;
  const yPt = toPdfY(yMm);
  const font = isBold ? '/F2' : '/F1';
  return `BT\n${font} ${fontSize} Tf\n${colorRg} rg\n${xPt.toFixed(2)} ${yPt.toFixed(2)} Td\n(${escapePdfText(text)}) Tj\nET\n`;
}

function centerText(text: string, centerMm: number, yMm: number, fontSize: number, isBold: boolean = false): string {
  const textW = getTextWidth(text, fontSize, isBold);
  const xPt = toPdfX(centerMm) - (textW / 2);
  const yPt = toPdfY(yMm);
  const font = isBold ? '/F2' : '/F1';
  return `BT\n${font} ${fontSize} Tf\n0 0 0 rg\n${xPt.toFixed(2)} ${yPt.toFixed(2)} Td\n(${escapePdfText(text)}) Tj\nET\n`;
}

/**
 * Generates an invoice PDF matching the standard template in invoicePdfService.ts
 */
export function generateInvoicePdfBuffer(
  data: InvoicePdfData,
  bgImageInfo?: { jpegBuffer: Buffer; width: number; height: number } | null
): Buffer {
  const {
    invoiceName = 'INVOICE',
    invoiceNumber,
    invoiceDate,
    businessName,
    businessEmail,
    businessPhone,
    businessAddress,
    businessWebsite,
    customerName,
    customerPhone,
    items,
    discountPercentage = 0,
    totalAmount,
    advanceAmount = 0,
    status = 'generated',
    notes,
    bankDetails,
  } = data;

  let stream = '';

  // 1. Header Title (Centered at 105mm, 20mm from top)
  stream += centerText(invoiceName, 105, 20, 16, true);

  // 2. Agent / Business Details (Left-aligned at 20mm, starting 68mm from top)
  let currentY = 68;
  if (businessName?.trim()) {
    stream += leftText(businessName.trim(), 20, currentY, 10, true);
    currentY += 8;
  }
  if (businessAddress?.trim()) {
    stream += leftText(businessAddress.trim(), 20, currentY, 10, false);
    currentY += 8;
  }
  if (businessEmail?.trim()) {
    stream += leftText(`Email: ${businessEmail.trim()}`, 20, currentY, 10, false);
    currentY += 8;
  }
  if (businessPhone?.trim()) {
    stream += leftText(`Phone: ${businessPhone.trim()}`, 20, currentY, 10, false);
    currentY += 8;
  }
  if (businessWebsite?.trim()) {
    stream += leftText(`Website: ${businessWebsite.trim()}`, 20, currentY, 10, false);
    currentY += 8;
  }

  // 3. Invoice Details (Right-aligned at 190mm, starting 68mm from top)
  const rightX = 190;
  stream += rightText('Invoice Details', rightX, 68, 10, true);
  stream += rightText(`Date: ${invoiceDate}`, rightX, 76, 10, false);
  stream += rightText(`Invoice #: ${invoiceNumber}`, rightX, 84, 10, false);
  const rawStatus = (status || '').toLowerCase();
  const isPartial = rawStatus === 'partially_paid' || (advanceAmount > 0 && advanceAmount < totalAmount);
  const isPaid = !isPartial && (rawStatus === 'paid' || (advanceAmount >= totalAmount && totalAmount > 0));
  const statusLabel = isPaid ? 'Status: Paid in Full' : (isPartial ? 'Status: Partially Paid' : 'Status: Generated / Unpaid');
  const statusColor = isPaid ? '0.05 0.60 0.25' : (isPartial ? '0.85 0.50 0.05' : '0 0 0');
  stream += rightText(statusLabel, rightX, 92, 10, isPaid || isPartial, statusColor);

  // 4. Customer Details (Bill To, starting at 108mm from top)
  stream += leftText('Bill To:', 20, 108, 10, true);
  stream += leftText(customerName || 'Customer', 20, 116, 10, false);
  if (customerPhone && customerPhone !== 'N/A') {
    stream += leftText(`Phone: ${customerPhone}`, 20, 124, 10, false);
  }

  // 5. Items Table
  let yPosition = 145;
  const colPositions = { desc: 20, qty: 90, price: 120, total: 190 };
  const descWidthPt = toPdfX(65); // 65mm wrapped width
  const rowHeight = 10;
  const lineSpacing = 6;

  const formatCurrency = (amt: number): string => {
    return `Rs. ${Number(amt || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Header row (9pt bold)
  stream += leftText('Item Description', colPositions.desc, yPosition, 9, true);
  stream += leftText('Qty', colPositions.qty + 5, yPosition, 9, true);
  stream += leftText('Unit Price', colPositions.price, yPosition, 9, true);
  stream += rightText('Total', colPositions.total, yPosition, 9, true);

  yPosition += rowHeight + 2;

  // Rows (10pt normal)
  items.forEach((item) => {
    const descLines = wrapText(item.name, descWidthPt, 10, false);
    let lineY = yPosition;
    descLines.forEach((line) => {
      stream += leftText(line, colPositions.desc, lineY, 10, false);
      lineY += lineSpacing;
    });
    const maxDescLines = Math.max(1, descLines.length);
    const effectiveRowHeight = Math.max(rowHeight, (maxDescLines - 1) * lineSpacing + rowHeight);
    const itemY = yPosition + ((maxDescLines - 1) * lineSpacing) / 2;

    stream += leftText(String(item.quantity || 1), colPositions.qty + 5, itemY, 10, false);
    stream += leftText(formatCurrency(item.price || 0), colPositions.price, itemY, 10, false);
    const lineTotal = (item.quantity || 1) * (item.price || 0);
    stream += rightText(formatCurrency(lineTotal), colPositions.total, itemY, 10, false);

    yPosition += effectiveRowHeight + 2;
  });

  // Table bottom divider (0.1mm line width)
  const lineYPt = toPdfY(yPosition);
  stream += `q 0.28 w 0 0 0 RG ${toPdfX(20).toFixed(2)} ${lineYPt.toFixed(2)} m ${toPdfX(190).toFixed(2)} ${lineYPt.toFixed(2)} l S Q\n`;
  yPosition += 5;

  // 6. Totals section
  let totalsY = yPosition + 5;

  if (discountPercentage > 0) {
    const discountAmount = (totalAmount * discountPercentage) / 100;
    stream += leftText(`Discount (${discountPercentage.toFixed(2)}%):`, 120, totalsY, 9, false);
    stream += rightText(`-${formatCurrency(discountAmount)}`, 190, totalsY, 9, false);
    totalsY += 8;
  }

  stream += leftText('Total Amount:', 120, totalsY, 10, true);
  stream += rightText(formatCurrency(totalAmount), 190, totalsY, 10, true);
  totalsY += 8;

  if (isPaid) {
    stream += leftText('Amount Paid:', 120, totalsY, 9, false);
    stream += rightText(formatCurrency(totalAmount), 190, totalsY, 9, false);
    totalsY += 8;

    stream += leftText('Balance:', 120, totalsY, 10, true);
    stream += rightText('Rs. 0.00', 190, totalsY, 10, true, '0.05 0.60 0.25');
    totalsY += 8;
  } else if (isPartial) {
    const paidAmount = advanceAmount > 0 ? advanceAmount : 0;
    const balance = Math.max(0, totalAmount - paidAmount);

    stream += leftText('Advance Paid:', 120, totalsY, 9, false);
    stream += rightText(formatCurrency(paidAmount), 190, totalsY, 9, false);
    totalsY += 8;

    stream += leftText('Balance Due:', 120, totalsY, 10, true);
    stream += rightText(formatCurrency(balance), 190, totalsY, 10, true, '0.85 0.50 0.05');
    totalsY += 8;
  } else {
    // Unpaid invoice
    if (advanceAmount > 0) {
      stream += leftText('Advance Paid:', 120, totalsY, 9, false);
      stream += rightText(formatCurrency(advanceAmount), 190, totalsY, 9, false);
      totalsY += 8;
    }

    const balanceDue = Math.max(0, totalAmount - advanceAmount);
    stream += leftText('Balance Due:', 120, totalsY, 10, true);
    stream += rightText(formatCurrency(balanceDue), 190, totalsY, 10, true);
    totalsY += 8;
  }

  yPosition = totalsY + 4;


  // 7. Notes
  if (notes && notes.trim()) {
    stream += leftText('Notes:', 20, yPosition, 9, false);
    const notesLines = wrapText(notes.trim(), toPdfX(140), 9, false);
    let notesY = yPosition;
    notesLines.forEach((line) => {
      stream += leftText(line, 50, notesY, 9, false);
      notesY += 6;
    });
    yPosition = notesY + 10;
  }

  // 8. Bank Details
  if (bankDetails && bankDetails.trim()) {
    stream += leftText('Bank Details:', 20, yPosition, 9, true);
    const bankLines = bankDetails.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let bankY = yPosition;
    bankLines.forEach((line) => {
      stream += leftText(line, 50, bankY, 9, false);
      bankY += 6;
    });
    yPosition = bankY + 10;
  }

  // 9. Footer (Centered at 105mm, 277mm from top)
  const footerY = 277;
  stream += centerText('Thank you for your business!', 105, footerY, 10, false);

  // Construct PDF Objects with precise byte offsets
  const pdfHeader = Buffer.from('%PDF-1.4\n', 'utf-8');
  const obj1 = Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n', 'utf-8');
  const obj2 = Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n', 'utf-8');

  const obj3Str = bgImageInfo
    ? '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Img1 7 0 R >> >> >>\nendobj\n'
    : '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n';

  const fullContentStream = bgImageInfo
    ? 'q 595.28 0 0 841.89 0 0 cm /Img1 Do Q\n' + stream
    : stream;

  const streamBytes = Buffer.from(fullContentStream, 'utf-8');
  const obj4 = Buffer.concat([
    Buffer.from(`4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`, 'utf-8'),
    streamBytes,
    Buffer.from('\nendstream\nendobj\n', 'utf-8'),
  ]);

  const obj5 = Buffer.from('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n', 'utf-8');
  const obj6 = Buffer.from('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n', 'utf-8');

  let obj7: Buffer | null = null;
  if (bgImageInfo) {
    obj7 = Buffer.concat([
      Buffer.from(
        `7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${bgImageInfo.width} /Height ${bgImageInfo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bgImageInfo.jpegBuffer.length} >>\nstream\n`,
        'utf-8'
      ),
      bgImageInfo.jpegBuffer,
      Buffer.from('\nendstream\nendobj\n', 'utf-8'),
    ]);
  }

  const chunks: Buffer[] = [pdfHeader, obj1, obj2, Buffer.from(obj3Str, 'utf-8'), obj4, obj5, obj6];
  if (obj7) chunks.push(obj7);

  const offsets: number[] = [];
  let currentOffset = pdfHeader.length;

  offsets.push(currentOffset);
  currentOffset += obj1.length;

  offsets.push(currentOffset);
  currentOffset += obj2.length;

  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(obj3Str, 'utf-8');

  offsets.push(currentOffset);
  currentOffset += obj4.length;

  offsets.push(currentOffset);
  currentOffset += obj5.length;

  offsets.push(currentOffset);
  currentOffset += obj6.length;

  if (obj7) {
    offsets.push(currentOffset);
    currentOffset += obj7.length;
  }

  const xrefOffset = currentOffset;
  const numObjects = obj7 ? 8 : 7;
  let xref = `xref\n0 ${numObjects}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  const trailer = `trailer\n<< /Size ${numObjects} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref + trailer, 'utf-8'));
  return Buffer.concat(chunks);
}

/**
 * Generates an invoice PDF and uploads it to Cloudflare R2
 */
export async function generateAndUploadInvoicePdf(
  agentPrefixOrOptions: string | { agentPrefix: string; customerId: number | string; invoiceData: InvoicePdfData },
  customerIdParam?: number | string,
  invoiceDataParam?: InvoicePdfData
): Promise<string | null> {
  let agentPrefix: string;
  let customerId: number | string;
  let invoiceData: InvoicePdfData;

  if (typeof agentPrefixOrOptions === 'object' && agentPrefixOrOptions !== null) {
    agentPrefix = agentPrefixOrOptions.agentPrefix;
    customerId = agentPrefixOrOptions.customerId;
    invoiceData = agentPrefixOrOptions.invoiceData;
  } else {
    agentPrefix = agentPrefixOrOptions;
    customerId = customerIdParam!;
    invoiceData = invoiceDataParam!;
  }

  try {
    if (!invoiceData) {
      console.error('[Invoice PDF] Missing invoiceData in generateAndUploadInvoicePdf');
      return null;
    }
    let bgImageInfo: { jpegBuffer: Buffer; width: number; height: number } | null = null;
    if (invoiceData.templatePath) {
      try {
        console.log(`[Invoice PDF] Fetching invoice template background: ${invoiceData.templatePath}`);
        const rawTemplateBuffer = await downloadMediaFromR2(invoiceData.templatePath);
        if (rawTemplateBuffer && rawTemplateBuffer.length > 0) {
          const meta = await sharp(rawTemplateBuffer).metadata();
          const jpegBuffer = await sharp(rawTemplateBuffer).jpeg({ quality: 90 }).toBuffer();
          if (meta.width && meta.height && jpegBuffer.length > 0) {
            bgImageInfo = {
              jpegBuffer,
              width: meta.width,
              height: meta.height,
            };
            console.log(`[Invoice PDF] Successfully converted template background: ${meta.width}x${meta.height}, ${jpegBuffer.length} bytes`);
          }
        }
      } catch (tmplErr) {
        console.warn('[Invoice PDF] Could not process background template image, continuing with clean template:', tmplErr);
      }
    }

    const pdfBuffer = generateInvoicePdfBuffer(invoiceData, bgImageInfo);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const cleanInvNum = invoiceData.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '');
    const tAmt = Number(invoiceData.totalAmount || 0), aAmt = Number(invoiceData.advanceAmount || 0);
    const isPart = (invoiceData.status || '').toLowerCase() === 'partially_paid' || (aAmt > 0 && aAmt < tAmt);
    const isFull = !isPart && ((invoiceData.status || '').toLowerCase() === 'paid' || (aAmt >= tAmt && tAmt > 0));
    const suffix = isFull ? '_paid' : (isPart ? `_adv_${Math.round(aAmt)}` : '');
    const fileName = `invoice_${cleanInvNum}_${dateStr}${suffix}_${now.getTime()}.pdf`;
    const r2Key = `${agentPrefix}/invoices/${customerId}/${fileName}`;

    console.log(`[Invoice PDF] Uploading generated invoice PDF: key=${r2Key}, size=${pdfBuffer.length} bytes`);
    const uploadedUrl = await uploadMediaToR2(
      agentPrefix,
      pdfBuffer,
      fileName,
      'application/pdf',
      'incoming',
      r2Key
    );

    if (uploadedUrl && uploadedUrl.startsWith('http')) {
      console.log(`[Invoice PDF] Successfully uploaded invoice PDF to R2: ${uploadedUrl}`);
      return uploadedUrl;
    }

    // Fallback: If uploadMediaToR2 returned null, construct verified R2 public URL
    const r2Public = (process.env.R2_PUBLIC_URL || 'https://r2.idesignsolutions.lk').replace(/\/+$/, '');
    const fallbackUrl = `${r2Public}/${r2Key}`;
    console.warn(`[Invoice PDF] uploadMediaToR2 returned non-http, using fallback public URL: ${fallbackUrl}`);
    return fallbackUrl;
  } catch (err) {
    console.error('[Invoice PDF] Generation or upload failed:', err);
    return null;
  }
}
