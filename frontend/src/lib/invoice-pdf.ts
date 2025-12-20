import jsPDF from "jspdf";
import { supabase } from "./supabase";

export interface AgentDetails {
  name: string;
  address: string;
  business_email: string;
  contact_number: string;
  website: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderData {
  id: number;
  customer_id: number;
  status: string;
  notes?: string;
  created_at: string;
}

export interface GeneratePDFParams {
  orderData: OrderData;
  items: InvoiceItem[];
  invoiceName: string;
  customerName: string;
  agentDetails: AgentDetails;
  invoiceTemplatePath: string | null;
  discountPercentage: number;
  agentPrefix: string;
  customerId: number;
}

export const generateInvoicePDF = async (params: GeneratePDFParams): Promise<Blob> => {
  const {
    orderData,
    items,
    invoiceName,
    customerName,
    agentDetails,
    invoiceTemplatePath,
    discountPercentage,
    agentPrefix,
    customerId,
  } = params;

  const doc = new jsPDF();
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const now = new Date();
  const formattedDate = `${now.getFullYear()}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(
    now.getHours()
  ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds()
  ).padStart(2, "0")}`;

  // Load Poppins fonts
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add background template if available
  let templateBase64: string | null = null;
  if (invoiceTemplatePath) {
    try {
      const { data: templateData } = await supabase.storage
        .from("agent-templates")
        .download(invoiceTemplatePath);

      if (templateData) {
        const img = new Image();
        const url = URL.createObjectURL(templateData);
        img.src = url;
        await new Promise((resolve, reject) => {
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;
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
            templateBase64 = canvas.toDataURL("image/jpeg", 0.95);
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.onerror = () => reject(new Error("Image load failed"));
        });
      }
    } catch (err) {
      console.error("Error fetching template:", err);
    }
  }

  if (templateBase64) {
    doc.addImage(templateBase64, "JPEG", 0, 0, pageWidth, pageHeight);
  }

  // Header
  doc.setFontSize(16);
  doc.setFont("Poppins", "bold");
  doc.text(invoiceName, pageWidth / 2, 20, { align: "center" });

  // Agent details
  doc.setFontSize(10);
  doc.setFont("Poppins", "normal");
  let currentY = 60;
  if (agentDetails.name.trim()) {
    doc.setFont("Poppins", "bold");
    doc.text(agentDetails.name, 20, currentY);
    doc.setFont("Poppins", "normal");
    currentY += 10;
  }
  if (agentDetails.address.trim()) {
    doc.text(agentDetails.address, 20, currentY);
    currentY += 10;
  }
  if (agentDetails.business_email.trim()) {
    doc.text(`Email: ${agentDetails.business_email}`, 20, currentY);
    currentY += 10;
  }
  if (agentDetails.contact_number.trim()) {
    doc.text(`Phone: ${agentDetails.contact_number}`, 20, currentY);
    currentY += 10;
  }
  if (agentDetails.website.trim()) {
    doc.text(`Website: ${agentDetails.website}`, 20, currentY);
    currentY += 10;
  }

  // Invoice details (right aligned)
  const rightX = doc.internal.pageSize.getWidth() - 20;
  doc.setFont("Poppins", "bold");
  doc.text("Invoice Details", rightX, 60, { align: "right" });
  doc.setFont("Poppins", "normal");
  doc.text(
    `Date: ${new Date(orderData.created_at).toLocaleDateString()}`,
    rightX,
    80,
    { align: "right" }
  );
  doc.text(
    `Order #: #${orderData.id.toString().padStart(4, "0")}`,
    rightX,
    90,
    { align: "right" }
  );
  doc.text(`Status: ${orderData.status}`, rightX, 100, { align: "right" });

  // Customer details
  doc.setFont("Poppins", "bold");
  doc.text("Bill To:", 20, 120);
  doc.setFont("Poppins", "normal");
  doc.text(customerName, 20, 130);

  // Items table
  let yPosition = 145;
  const colPositions = { desc: 20, qty: 90, price: 120, total: 150 };
  const descWidth = 55;
  const rowHeight = 10;
  const lineSpacing = 6;

  // Header
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
    if (yPosition > 750) {
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
    let currentY = yPosition;
    descLines.forEach((line: string) => {
      doc.text(line, colPositions.desc, currentY);
      currentY += lineSpacing;
    });
    const maxDescLines = Math.max(1, descLines.length);
    const effectiveRowHeight = Math.max(
      rowHeight,
      (maxDescLines - 1) * lineSpacing + rowHeight
    );
    const itemY = yPosition + ((maxDescLines - 1) * lineSpacing) / 2;
    doc.text(item.quantity.toString(), colPositions.qty + 5, itemY);
    doc.text(`LKR ${item.price.toFixed(2)}`, colPositions.price, itemY);
    doc.text(
      `LKR ${(item.total || item.quantity * item.price).toFixed(2)}`,
      190,
      itemY,
      { align: "right" }
    );

    yPosition += effectiveRowHeight + 2;
  });

  // Horizontal line
  doc.setLineWidth(0.1);
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 5;

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + (item.total || item.quantity * item.price),
    0
  );
  const discountAmount = subtotal * (discountPercentage / 100);
  const total = subtotal - discountAmount;

  // Totals section
  let totalsY = yPosition + 5;

  doc.setFont("Poppins", "bold");
  doc.setFontSize(10);
  doc.text("Subtotal:", 120, totalsY);
  doc.text(`LKR ${subtotal.toFixed(2)}`, 190, totalsY, { align: "right" });
  totalsY += 10;
  doc.setFont("Poppins", "normal");
  doc.setFontSize(9);
  doc.text(`Discount (${discountPercentage.toFixed(2)}%):`, 120, totalsY);
  doc.text(`-LKR ${discountAmount.toFixed(2)}`, 190, totalsY, {
    align: "right",
  });
  totalsY += 10;
  doc.setFont("Poppins", "bold");
  doc.setFontSize(10);
  doc.text("Total Amount:", 120, totalsY);
  doc.text(`LKR ${total.toFixed(2)}`, 190, totalsY, { align: "right" });
  totalsY += 15;

  yPosition = totalsY + 20;

  // Notes
  if (orderData.notes) {
    doc.setFont("Poppins", "normal");
    doc.setFontSize(9);
    doc.text("Notes:", 20, yPosition);
    const notesLines = doc.splitTextToSize(orderData.notes, 170);
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
  doc.text("Thank you for your business!", pageWidth / 2, footerY, {
    align: "center",
  });

  // Generate blob
  const pdfBlob = doc.output("blob");

  // Generate filename with date and time
  const fileName = `invoice_${orderData.id}${formattedDate}.pdf`;
  const storagePath = `${agentPrefix}/${customerId}/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error("Failed to upload invoice: " + uploadError.message);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("invoices").getPublicUrl(storagePath);

  // Insert invoice record
  const invoicesTable = `${agentPrefix}_orders_invoices`;
  const { error: insertError } = await supabase.from(invoicesTable).insert({
    order_id: orderData.id,
    name: invoiceName,
    pdf_url: publicUrl,
    status: "generated",
    discount_percentage: discountPercentage,
  });

  if (insertError) {
    throw new Error(
      "Failed to save invoice record: " + insertError.message
    );
  }

  return pdfBlob; // Return the blob, but note that upload and insert are done here
};

export const uploadAndSaveInvoice = async (
  pdfBlob: Blob,
  orderId: number,
  invoiceName: string,
  agentPrefix: string,
  customerId: number,
  discountPercentage: number
): Promise<string> => {
  const now = new Date();
  const formattedDate = `${now.getFullYear()}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(
    now.getHours()
  ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds()
  ).padStart(2, "0")}`;

  const fileName = `invoice_${orderId}${formattedDate}.pdf`;
  const storagePath = `${agentPrefix}/${customerId}/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error("Failed to upload invoice: " + uploadError.message);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("invoices").getPublicUrl(storagePath);

  // Insert invoice record
  const invoicesTable = `${agentPrefix}_orders_invoices`;
  const { error: insertError } = await supabase.from(invoicesTable).insert({
    order_id: orderId,
    name: invoiceName,
    pdf_url: publicUrl,
    status: "generated",
    discount_percentage: discountPercentage,
  });

  if (insertError) {
    throw new Error(
      "Failed to save invoice record: " + insertError.message
    );
  }

  return publicUrl;
};