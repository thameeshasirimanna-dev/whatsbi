import React, { useState, useEffect } from "react";
import { getToken } from "../../../lib/auth";
import { getCurrentAgent } from "../../../lib/agent";
import { X, FileText } from "lucide-react";
import jsPDF from "jspdf";
import { Order } from "../../../types/index";
import { useDialog } from "../shared/DialogProvider";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: "#3f3f46",
  background: "#f9f9f9",
  border: "1px solid #ebebeb",
  borderRadius: 9,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};
const onFocusGreen = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "#22c55e";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.1)";
};
const onBlurGreen = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "#ebebeb";
  e.currentTarget.style.boxShadow = "none";
};

interface AgentDetails {
  name: string;
  address: string;
  business_email: string;
  contact_number: string;
  website: string;
}

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrderId?: number;
  orders: Order[];
  customerName: string;
  customerId: number | null;
  agentPrefix: string | null;
  agentId: number | null;
  agentDetails: AgentDetails;
  invoiceTemplatePath: string | null;
  onSuccess: () => void;
}

const GenerateInvoiceModal: React.FC<GenerateInvoiceModalProps> = ({
  isOpen,
  onClose,
  selectedOrderId: propSelectedOrderId,
  orders,
  customerName,
  customerId,
  agentPrefix,
  agentId,
  agentDetails,
  invoiceTemplatePath,
  onSuccess,
}) => {
  const { toast } = useDialog();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [invoiceName, setInvoiceName] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capitalizeFirst = (str: string): string => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  useEffect(() => {
    if (isOpen && propSelectedOrderId) {
      setSelectedOrderId(propSelectedOrderId);
      const order = orders.find((o) => o.id === propSelectedOrderId);
      if (order) {
        setInvoiceName(`Invoice for Order #${order.id.toString().padStart(4, "0")}`);
      }
      setDiscountPercentage(0);
      setInvoiceNotes("");
      setError(null);
    } else if (isOpen && !propSelectedOrderId) {
      setSelectedOrderId(null);
      setInvoiceName("");
      setDiscountPercentage(0);
      setInvoiceNotes("");
      setError(null);
    }
  }, [isOpen, propSelectedOrderId, orders]);

  const handleGenerateInvoice = async () => {
    if (!customerId || !agentPrefix || !agentId || !selectedOrderId || !invoiceName.trim()) {
      setError("Missing required information");
      return;
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      setError("Discount percentage must be between 0 and 100");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        setError("User not authenticated");
        return;
      }

      const order = orders.find((o) => o.id === selectedOrderId);
      if (!order) {
        throw new Error("Order not found");
      }

      const agent = await getCurrentAgent();
      if (agent) {
        // Update invoiceTemplatePath if needed
      }

      const itemsResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=items&order_id=${order.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!itemsResponse.ok) {
        throw new Error("Failed to fetch order items");
      }

      const itemsData = await itemsResponse.json();
      if (!itemsData.success) {
        throw new Error("Failed to fetch order items");
      }

      const items: any[] = (itemsData.items || []).map((item: any) => ({
        name: item.name,
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        total: item.total
          ? Number(item.total)
          : (Number(item.quantity) || 0) * (Number(item.price) || 0),
      }));

      let templateBase64: string | null = null;
      if (agent?.invoice_template_path || invoiceTemplatePath) {
        const currentPath = agent?.invoice_template_path || invoiceTemplatePath;
        try {
          if (!currentPath) {
            console.warn("No template path available");
          } else {
            const templateResponse = await fetch(
              `${import.meta.env.VITE_BACKEND_URL}/get-invoice-template?path=${encodeURIComponent(currentPath)}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (templateResponse.ok) {
              const templateBlob = await templateResponse.blob();
              const img = new Image();
              const url = URL.createObjectURL(templateBlob);
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
                img.onerror = () => {
                  console.error("Failed to load template image");
                  reject(new Error("Image load failed"));
                };
              });
            } else {
              console.warn("Failed to fetch template");
            }
          }
        } catch (err) {
          console.error("Error fetching template:", err);
        }
      }

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

      try {
        const regularFontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf";
        const boldFontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf";
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
        // Continue with default fonts
      }
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      if (templateBase64) {
        doc.addImage(templateBase64, "JPEG", 0, 0, pageWidth, pageHeight);
      }

      doc.setFontSize(16);
      doc.setFont("Poppins", "bold");
      doc.text(invoiceName, pageWidth / 2, 20, { align: "center" });

      // Agent details
      doc.setFontSize(10);
      doc.setFont("Poppins", "normal");
      let currentY = 80;
      if (agentDetails.name.trim()) {
        doc.setFont("Poppins", "bold");
        doc.text(agentDetails.name, 20, currentY);
        doc.setFont("Poppins", "normal");
        currentY += 8;
      }
      if (agentDetails.address.trim()) {
        doc.text(agentDetails.address, 20, currentY);
        currentY += 8;
      }
      if (agentDetails.business_email.trim()) {
        doc.text(`Email: ${agentDetails.business_email}`, 20, currentY);
        currentY += 8;
      }
      if (agentDetails.contact_number.trim()) {
        doc.text(`Phone: ${agentDetails.contact_number}`, 20, currentY);
        currentY += 8;
      }
      if (agentDetails.website.trim()) {
        doc.text(`Website: ${agentDetails.website}`, 20, currentY);
        currentY += 8;
      }

      const rightX = doc.internal.pageSize.getWidth() - 20;
      doc.setFont("Poppins", "bold");
      doc.text("Invoice Details", rightX, 80, { align: "right" });
      doc.setFont("Poppins", "normal");
      doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, rightX, 88, { align: "right" });
      doc.text(`Order #: #${order.id.toString().padStart(4, "0")}`, rightX, 96, { align: "right" });
      doc.text(`Status: ${capitalizeFirst(order.status)}`, rightX, 104, { align: "right" });

      doc.setFont("Poppins", "bold");
      doc.text("Bill To:", 20, 120);
      doc.setFont("Poppins", "normal");
      doc.text(customerName || "Unknown Customer", 20, 130);

      let yPosition = 145;
      const colPositions = { desc: 20, qty: 90, price: 120, total: 150 };
      const descWidth = 55;
      const rowHeight = 10;
      const lineSpacing = 6;

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
        const effectiveRowHeight = Math.max(rowHeight, (maxDescLines - 1) * lineSpacing + rowHeight);
        const itemY = yPosition + ((maxDescLines - 1) * lineSpacing) / 2;
        doc.text(item.quantity.toString(), colPositions.qty + 5, itemY);
        doc.text(`LKR ${item.price.toFixed(2)}`, colPositions.price, itemY);
        doc.text(`LKR ${(item.total || item.quantity * item.price).toFixed(2)}`, 190, itemY, { align: "right" });

        yPosition += effectiveRowHeight + 2;
      });

      doc.setLineWidth(0.1);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 5;

      const subtotal = items.reduce((sum, item) => sum + (item.total || item.quantity * item.price), 0);
      const discountAmount = subtotal * (discountPercentage / 100);
      const total = subtotal - discountAmount;

      let totalsY = yPosition + 5;

      doc.setFont("Poppins", "normal");
      doc.setFontSize(9);
      doc.text(`Discount (${discountPercentage.toFixed(2)}%):`, 120, totalsY);
      doc.text(`-LKR ${discountAmount.toFixed(2)}`, 190, totalsY, { align: "right" });
      totalsY += 8;

      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.text("Total Amount:", 120, totalsY);
      doc.text(`LKR ${total.toFixed(2)}`, 190, totalsY, { align: "right" });
      totalsY += 8;

      // Advance Amount/Paid
      const advancePaid = Number(order.advance_amount || 0);
      doc.setFont("Poppins", "normal");
      doc.setFontSize(9);
      const advanceLabel = order.payment_status === "unpaid" ? "Advance Amount:" : "Advance Paid:";
      doc.text(advanceLabel, 120, totalsY);
      doc.text(`LKR ${advancePaid.toFixed(2)}`, 190, totalsY, { align: "right" });
      totalsY += 8;

      // Balance Due
      const balanceDue = Math.max(0, total - advancePaid);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.text("Balance Due:", 120, totalsY);
      doc.text(`LKR ${balanceDue.toFixed(2)}`, 190, totalsY, { align: "right" });

      yPosition = totalsY + 12;

      if (invoiceNotes.trim()) {
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

      const footerY = pageHeight - 20;
      doc.setFontSize(10);
      doc.setFont("Poppins", "normal");
      doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

      const pdfBlob = doc.output("blob");

      const sanitizeFileName = (name: string): string => {
        return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      };
      const sanitizedFileName = sanitizeFileName(invoiceName);

      const pdfBase64 = arrayBufferToBase64(await pdfBlob.arrayBuffer());
      const uploadResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/upload-invoice`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: order.id,
            invoiceName,
            agentPrefix,
            customerId: customerId,
            discountPercentage,
            pdfBase64,
          }),
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload invoice");
      }

      const uploadData = await uploadResponse.json();
      if (!uploadData.success) {
        throw new Error("Failed to upload invoice");
      }

      toast("Invoice generated successfully!", 'success');
      onClose();
      onSuccess();
    } catch (err: any) {
      setError("Failed to generate invoice: " + err.message);
      console.error("Error generating invoice:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedOrderId(null);
    setInvoiceName("");
    setDiscountPercentage(0);
    setInvoiceNotes("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentOrder = orders.find((o) => o.id === selectedOrderId);
  const submitDisabled = generating || !invoiceName.trim() || !selectedOrderId;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #ebebeb", boxShadow: "0 24px 64px rgba(0,0,0,0.15)", width: "100%", maxWidth: 460, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: "20px 24px 16px", borderBottom: "1px solid #ebebeb", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <span style={{ ...SYNE, fontSize: 17, fontWeight: 700, color: "#0c1a0e", display: "block", marginBottom: 4 }}>Generate Invoice</span>
            <span style={{ ...DM, fontSize: 12, color: "#71717a" }}>Fill details to generate an invoice for the selected order.</span>
          </div>
          <button onClick={handleClose} style={{ width: 30, height: 30, background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 12 }}>
            <X size={15} style={{ color: "#71717a" }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {error && (
            <div style={{ padding: "10px 14px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)", borderRadius: 9, ...DM, fontSize: 13, color: "#f43f5e", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Order selection */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 6 }}>Select Order</label>
              <select
                value={selectedOrderId || ""}
                onChange={(e) => setSelectedOrderId(parseInt(e.target.value) || null)}
                disabled={propSelectedOrderId !== undefined}
                style={{ ...inputStyle, background: propSelectedOrderId !== undefined ? "#f4f4f5" : "#f9f9f9", cursor: propSelectedOrderId !== undefined ? "not-allowed" : "pointer" }}
                onFocus={onFocusGreen}
                onBlur={onBlurGreen}
              >
                {propSelectedOrderId ? (
                  currentOrder ? (
                    <option value={currentOrder.id}>
                      Order #{currentOrder.id.toString().padStart(4, "0")} — LKR {Number(currentOrder.total_amount)?.toFixed(2) || "0.00"}
                    </option>
                  ) : (
                    <option value="">No order selected</option>
                  )
                ) : (
                  <>
                    <option value="">Choose an order…</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        Order #{order.id.toString().padStart(4, "0")} — LKR {Number(order.total_amount)?.toFixed(2) || "0.00"}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Customer display */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 6 }}>Customer</label>
              <input type="text" value={customerName} disabled readOnly style={{ ...inputStyle, background: "#f4f4f5", cursor: "not-allowed", color: "#71717a" }} />
            </div>

            {/* Invoice name */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 6 }}>Invoice Name</label>
              <input type="text" value={invoiceName} onChange={(e) => setInvoiceName(e.target.value)} placeholder="e.g., Invoice for Order #0001" required style={inputStyle} onFocus={onFocusGreen} onBlur={onBlurGreen} />
            </div>

            {/* Discount */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 6 }}>Discount Percentage (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={discountPercentage} onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)} placeholder="0" style={inputStyle} onFocus={onFocusGreen} onBlur={onBlurGreen} />
            </div>

            {/* Invoice Notes */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 6 }}>Invoice Notes</label>
              <textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Notes to print on the invoice..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                onFocus={onFocusGreen as any}
                onBlur={onBlurGreen as any}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerateInvoice}
              disabled={submitDisabled}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "11px 20px",
                background: submitDisabled ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                cursor: submitDisabled ? "not-allowed" : "pointer",
                ...DM,
                fontSize: 14,
                fontWeight: 600,
                boxShadow: submitDisabled ? "none" : "0 4px 14px rgba(34,197,94,0.3)",
                marginTop: 4,
              }}
            >
              <FileText size={16} />
              {generating ? "Generating…" : "Generate Invoice"}
            </button>

            <button
              onClick={handleClose}
              disabled={generating}
              style={{ padding: "10px 20px", background: "rgba(0,0,0,0.06)", color: "#3f3f46", border: "none", borderRadius: 10, cursor: generating ? "not-allowed" : "pointer", ...DM, fontSize: 13, fontWeight: 600, opacity: generating ? 0.5 : 1 }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateInvoiceModal;
