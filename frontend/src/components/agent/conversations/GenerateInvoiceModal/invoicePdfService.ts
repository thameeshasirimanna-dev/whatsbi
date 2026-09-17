import jsPDF from "jspdf";
import { AgentDetails, LineItem } from "./types";

export interface GenerateInvoiceParams {
  token: string;
  templatePath: string | null;
  invoiceName: string;
  agentDetails: AgentDetails;
  selectedOrderId?: number;
  customerName: string;
  customerPhone?: string | null;
  customerId: number;
  agentPrefix: string;
  items: LineItem[];
  discountPercentage: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  advanceAmount: number;
  balanceDue: number;
  status?: "generated" | "sent" | "paid";
  invoiceNotes: string;
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const loadPoppinsFonts = async (doc: jsPDF): Promise<void> => {
  try {
    const regularFontUrl =
      "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf";
    const boldFontUrl =
      "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf";
    const [regularFontBuffer, boldFontBuffer] = await Promise.all([
      fetch(regularFontUrl).then((res) => res.arrayBuffer()),
      fetch(boldFontUrl).then((res) => res.arrayBuffer()),
    ]);
    const regularFontBase64 = arrayBufferToBase64(regularFontBuffer);
    const boldFontBase64 = arrayBufferToBase64(boldFontBuffer);
    doc.addFileToVFS("Poppins-Regular.ttf", regularFontBase64);
    doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
    doc.addFileToVFS("Poppins-Bold.ttf", boldFontBase64);
    doc.addFont("Poppins-Bold.ttf", "Poppins", "bold");
  } catch (fontError) {
    console.warn("Could not load Poppins font, continuing with default fonts:", fontError);
  }
};

const loadTemplateImage = async (templatePath: string, token: string): Promise<string | null> => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/get-invoice-template?path=${encodeURIComponent(templatePath)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;

    const templateBlob = await res.blob();
    const img = new Image();
    const url = URL.createObjectURL(templateBlob);
    img.src = url;

    return await new Promise<string | null>((resolve) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }

        const DPI = 150;
        const a4WidthPt = 595;
        const a4HeightPt = 842;
        const scaleFactor = DPI / 72;
        const canvasWidth = a4WidthPt * scaleFactor;
        const canvasHeight = a4HeightPt * scaleFactor;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const scaleX = canvasWidth / img.width;
        const scaleY = canvasHeight / img.height;
        const scale = Math.min(scaleX, scaleY);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (canvasWidth - scaledWidth) / 2;
        const offsetY = (canvasHeight - scaledHeight) / 2;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        const base64 = canvas.toDataURL("image/jpeg", 0.95);
        URL.revokeObjectURL(url);
        resolve(base64);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn("Could not load invoice template image:", err);
    return null;
  }
};

export const generateAndUploadInvoice = async (params: GenerateInvoiceParams): Promise<void> => {
  const {
    token,
    templatePath,
    invoiceName,
    agentDetails,
    selectedOrderId,
    customerName,
    customerPhone,
    customerId,
    agentPrefix,
    items,
    discountPercentage,
    discountAmount,
    total,
    advanceAmount,
    balanceDue,
    status,
    invoiceNotes,
  } = params;

  // 1. Fetch template image if configured
  let templateBase64: string | null = null;
  if (templatePath) {
    templateBase64 = await loadTemplateImage(templatePath, token);
  }

  // 2. Generate PDF using jsPDF (standard mm layout from previous template)
  const doc = new jsPDF();

  // Load Poppins font
  await loadPoppinsFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  if (templateBase64) {
    doc.addImage(templateBase64, "JPEG", 0, 0, pageWidth, pageHeight);
  }

  // Header Title
  doc.setFontSize(16);
  doc.setFont("Poppins", "bold");
  doc.text(invoiceName, pageWidth / 2, 20, { align: "center" });

  // Agent details (Left)
  doc.setFontSize(10);
  doc.setFont("Poppins", "normal");
  let currentY = 68;
  if (agentDetails.name.trim()) {
    doc.setFont("Poppins", "bold");
    doc.text(agentDetails.name, 20, currentY);
    doc.setFont("Poppins", "normal");
    currentY += 8;
  }
  if (agentDetails.address?.trim()) {
    doc.text(agentDetails.address, 20, currentY);
    currentY += 8;
  }
  if (agentDetails.business_email?.trim()) {
    doc.text(`Email: ${agentDetails.business_email}`, 20, currentY);
    currentY += 8;
  }
  if (agentDetails.contact_number?.trim()) {
    doc.text(`Phone: ${agentDetails.contact_number}`, 20, currentY);
    currentY += 8;
  }
  if (agentDetails.website?.trim()) {
    doc.text(`Website: ${agentDetails.website}`, 20, currentY);
    currentY += 8;
  }

  // Invoice details (Right aligned)
  const rightX = pageWidth - 20;
  doc.setFont("Poppins", "bold");
  doc.text("Invoice Details", rightX, 68, { align: "right" });
  doc.setFont("Poppins", "normal");
  doc.text(`Date: ${new Date().toLocaleDateString()}`, rightX, 76, { align: "right" });
  const statusLabel = status === "paid" ? "Status: Paid" : "Status: Generated / Unpaid";
  if (selectedOrderId) {
    doc.text(`Order #: #${selectedOrderId.toString().padStart(4, "0")}`, rightX, 84, { align: "right" });
    doc.text(statusLabel, rightX, 92, { align: "right" });
  } else {
    doc.text(statusLabel, rightX, 84, { align: "right" });
  }

  // Customer details (Bill To)
  doc.setFont("Poppins", "bold");
  doc.text("Bill To:", 20, 108);
  doc.setFont("Poppins", "normal");
  doc.text(customerName || "Customer", 20, 116);
  if (customerPhone) {
    doc.text(`Phone: ${customerPhone}`, 20, 124);
  }

  // Items table
  let yPosition = 145;
  const colPositions = { desc: 20, qty: 90, price: 120, total: 150 };
  const descWidth = 55;
  const rowHeight = 10;
  const lineSpacing = 6;

  // Header row
  doc.setFontSize(9);
  doc.setFont("Poppins", "bold");
  doc.text("Item Description", colPositions.desc, yPosition);
  doc.text("Qty", colPositions.qty + 5, yPosition);
  doc.text("Unit Price", colPositions.price, yPosition);
  doc.text("Total", 190, yPosition, { align: "right" });

  yPosition += rowHeight + 2;

  doc.setFont("Poppins", "normal");
  doc.setFontSize(10);
  items.forEach((item) => {
    if (yPosition > 240) {
      doc.addPage();
      if (templateBase64) {
        doc.addImage(templateBase64, "JPEG", 0, 0, pageWidth, pageHeight);
      }
      yPosition = 35;
      doc.setFont("Poppins", "bold");
      doc.text("Item Description", colPositions.desc, yPosition);
      doc.text("Qty", colPositions.qty + 5, yPosition);
      doc.text("Unit Price", colPositions.price, yPosition);
      doc.text("Total", 195, yPosition, { align: "right" });
      yPosition += rowHeight + 2;
      doc.setFont("Poppins", "normal");
    }

    const descLines = doc.splitTextToSize(item.name, descWidth);
    let lineY = yPosition;
    descLines.forEach((line: string) => {
      doc.text(line, colPositions.desc, lineY);
      lineY += lineSpacing;
    });
    const maxDescLines = Math.max(1, descLines.length);
    const effectiveRowHeight = Math.max(
      rowHeight,
      (maxDescLines - 1) * lineSpacing + rowHeight
    );
    const itemY = yPosition + ((maxDescLines - 1) * lineSpacing) / 2;
    doc.text(item.quantity.toString(), colPositions.qty + 5, itemY);
    doc.text(`LKR ${item.price.toFixed(2)}`, colPositions.price, itemY);
    doc.text(`LKR ${(item.quantity * item.price).toFixed(2)}`, 190, itemY, { align: "right" });

    yPosition += effectiveRowHeight + 2;
  });

  // Table bottom divider
  doc.setLineWidth(0.1);
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 5;

  // Totals section
  let totalsY = yPosition + 5;

  if (discountPercentage > 0) {
    doc.setFont("Poppins", "normal");
    doc.setFontSize(9);
    doc.text(`Discount (${discountPercentage.toFixed(2)}%):`, 120, totalsY);
    doc.text(`-LKR ${discountAmount.toFixed(2)}`, 190, totalsY, { align: "right" });
    totalsY += 8;
  }

  doc.setFont("Poppins", "bold");
  doc.setFontSize(10);
  doc.text("Total Amount:", 120, totalsY);
  doc.text(`LKR ${total.toFixed(2)}`, 190, totalsY, { align: "right" });
  totalsY += 8;

  // Advance Paid / Amount
  if (advanceAmount > 0) {
    doc.setFont("Poppins", "normal");
    doc.setFontSize(9);
    doc.text("Advance Amount:", 120, totalsY);
    doc.text(`LKR ${Number(advanceAmount).toFixed(2)}`, 190, totalsY, { align: "right" });
    totalsY += 8;
  }

  // Balance Due / Balance
  doc.setFont("Poppins", "bold");
  doc.setFontSize(10);
  if (balanceDue > 0) {
    doc.text("Balance Due:", 120, totalsY);
    doc.text(`LKR ${balanceDue.toFixed(2)}`, 190, totalsY, { align: "right" });
  } else {
    doc.text("Balance:", 120, totalsY);
    doc.text("LKR 0.00", 190, totalsY, { align: "right" });
  }
  totalsY += 8;

  yPosition = totalsY + 4;

  // Notes
  if (invoiceNotes && invoiceNotes.trim()) {
    doc.setFont("Poppins", "normal");
    doc.setFontSize(9);
    doc.text("Notes:", 20, yPosition);
    const notesLines = doc.splitTextToSize(invoiceNotes.trim(), 170);
    let notesY = yPosition;
    notesLines.forEach((line: string) => {
      doc.text(line, 50, notesY);
      notesY += 6;
    });
    yPosition = notesY + 10;
  }

  // Footer
  const footerY = pageHeight - 20;
  doc.setFontSize(10);
  doc.setFont("Poppins", "normal");
  doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

  // 3. Output Base64
  const pdfBlob = doc.output("blob");
  const pdfBase64 = arrayBufferToBase64(await pdfBlob.arrayBuffer());

  // 4. Upload to backend
  const uploadRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-invoice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerId,
      agentPrefix,
      orderId: selectedOrderId || null,
      invoiceName: invoiceName.trim(),
      discountPercentage,
      totalAmount: total,
      advanceAmount: Number(advanceAmount) || 0,
      notes: invoiceNotes.trim() || null,
      items: items.map((it) => ({
        name: it.name.trim(),
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
      })),
      pdfBase64,
    }),
  });

  if (!uploadRes.ok) {
    const errJson = await uploadRes.json().catch(() => ({}));
    throw new Error(errJson.error || "Server failed to save invoice");
  }
};
