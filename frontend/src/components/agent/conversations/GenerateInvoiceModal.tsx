import React, { useState, useEffect } from "react";
import { getToken } from "../../../lib/auth";
import { getCurrentAgent } from "../../../lib/agent";
import jsPDF from "jspdf";
import { Order } from "../../../types/index";

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
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [invoiceName, setInvoiceName] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(0);
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
        setInvoiceName(
          `Invoice for Order #${order.id.toString().padStart(4, "0")}`
        );
      }
      setDiscountPercentage(0);
      setError(null);
    } else if (isOpen && !propSelectedOrderId) {
      setSelectedOrderId(null);
      setInvoiceName("");
      setDiscountPercentage(0);
      setError(null);
    }
  }, [isOpen, propSelectedOrderId, orders]);

  const handleGenerateInvoice = async () => {
    if (
      !customerId ||
      !agentPrefix ||
      !agentId ||
      !selectedOrderId ||
      !invoiceName.trim()
    ) {
      setError("Missing required information");
      return;
    }

    // Validate discount
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

      // Find order details from props
      const order = orders.find((o) => o.id === selectedOrderId);
      if (!order) {
        throw new Error("Order not found");
      }

      // Refetch latest invoice template path to ensure it's up-to-date
      const agent = await getCurrentAgent();
      if (agent) {
        // Update invoiceTemplatePath if needed
      }

      // Fetch order items
      const itemsResponse = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/manage-orders?type=items&order_id=${order.id}`,
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

      // Fetch template if available
      let templateBase64: string | null = null;
      if (agent?.invoice_template_path || invoiceTemplatePath) {
        const currentPath = agent?.invoice_template_path || invoiceTemplatePath;
        try {
          if (!currentPath) {
            console.warn("No template path available");
          } else {
            const templateResponse = await fetch(
              `${
                import.meta.env.VITE_BACKEND_URL
              }/get-invoice-template?path=${encodeURIComponent(currentPath)}`,
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
                  const DPI = 150; // A4 width at 72 DPI
                  const a4WidthPt = 595; // A4 height at 72 DPI
                  const a4HeightPt = 842;
                  const scaleFactor = DPI / 72;
                  const canvasWidth = a4WidthPt * scaleFactor;
                  const canvasHeight = a4HeightPt * scaleFactor;
                  canvas.width = canvasWidth;
                  canvas.height = canvasHeight;

                  // Calculate scale to fit A4 while preserving aspect ratio at high DPI
                  const scaleX = canvasWidth / img.width;
                  const scaleY = canvasHeight / img.height;
                  const scale = Math.min(scaleX, scaleY);
                  const scaledWidth = img.width * scale;
                  const scaledHeight = img.height * scale;

                  // Center the image
                  const offsetX = (canvasWidth - scaledWidth) / 2;
                  const offsetY = (canvasHeight - scaledHeight) / 2;

                  // Fill canvas with white background for JPEG compatibility
                  ctx.fillStyle = "white";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);

                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = "high";
                  ctx.drawImage(
                    img,
                    offsetX,
                    offsetY,
                    scaledWidth,
                    scaledHeight
                  );
                  templateBase64 = canvas.toDataURL("image/jpeg", 0.95); // JPEG for better compression while maintaining quality
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

      // Create PDF
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

      // Load Poppins fonts (using TTF from GitHub for jsPDF compatibility)
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
        // Continue with default fonts
      }
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Add background template if available
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
        `Date: ${new Date(order.created_at).toLocaleDateString()}`,
        rightX,
        80,
        { align: "right" }
      );
      doc.text(
        `Order #: #${order.id.toString().padStart(4, "0")}`,
        rightX,
        90,
        { align: "right" }
      );
      doc.text(`Status: ${capitalizeFirst(order.status)}`, rightX, 100, {
        align: "right",
      });

      // Customer details
      doc.setFont("Poppins", "bold");
      doc.text("Bill To:", 20, 120);
      doc.setFont("Poppins", "normal");
      doc.text(customerName || "Unknown Customer", 20, 130);

      // Items table without borders - reduced width with wrapping
      let yPosition = 145;
      const colPositions = { desc: 20, qty: 90, price: 120, total: 150 };
      const descWidth = 55; // Width for description wrapping with small right padding
      const rowHeight = 10; // Standard row height
      const lineSpacing = 6; // Tighter spacing for wrapped text lines

      // Header texts
      doc.setFontSize(9);
      doc.setFont("Poppins", "bold");
      doc.text("Item Description", colPositions.desc, yPosition);
      doc.text("Qty", colPositions.qty + 5, yPosition);
      doc.text("Unit Price", colPositions.price, yPosition);
      doc.text("Total", 190, yPosition, { align: "right" });

      yPosition += rowHeight + 2; // Extra padding after header

      doc.setFont("Poppins", "normal");
      doc.setFontSize(10);
      items.forEach((item) => {
        if (yPosition > 750) {
          doc.addPage();
          // Add background to new page
          if (templateBase64) {
            doc.addImage(templateBase64, "JPEG", 0, 0, pageWidth, pageHeight);
          }
          // Redraw table headers
          yPosition = 35; // Adjusted for new page, moved up
          doc.setFont("Poppins", "bold");
          doc.text("Item Description", colPositions.desc, yPosition);
          doc.text("Qty", colPositions.qty + 5, yPosition);
          doc.text("Unit Price", colPositions.price, yPosition);
          doc.text("Total", 195, yPosition, { align: "right" });
          yPosition += rowHeight + 2; // Extra padding after header
          doc.setFont("Poppins", "normal");
        }

        // Row data with wrapping for description
        const descLines = doc.splitTextToSize(item.name, descWidth);
        let currentY = yPosition;
        descLines.forEach((line: string, index: number) => {
          doc.text(line, colPositions.desc, currentY);
          currentY += lineSpacing;
        });
        const maxDescLines = Math.max(1, descLines.length);
        const effectiveRowHeight = Math.max(
          rowHeight,
          (maxDescLines - 1) * lineSpacing + rowHeight
        );
        const itemY = yPosition + ((maxDescLines - 1) * lineSpacing) / 2; // Align other fields to middle of description height
        doc.text(item.quantity.toString(), colPositions.qty + 5, itemY);
        doc.text(`LKR ${item.price.toFixed(2)}`, colPositions.price, itemY);
        doc.text(
          `LKR ${(item.total || item.quantity * item.price).toFixed(2)}`,
          190,
          itemY,
          { align: "right" }
        );

        yPosition += effectiveRowHeight + 2; // Extra padding after row
      });

      // Horizontal line at bottom of table
      doc.setLineWidth(0.1);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 5; // Padding after line

      // Calculate subtotal
      const subtotal = items.reduce(
        (sum, item) => sum + (item.total || item.quantity * item.price),
        0
      );

      const discountAmount = subtotal * (discountPercentage / 100);
      const total = subtotal - discountAmount;

      // Totals section positioned after table with 5 padding
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

      yPosition = totalsY + 20; // Update yPosition for notes

      // Notes
      if (order.notes) {
        doc.setFont("Poppins", "normal");
        doc.setFontSize(9);
        doc.text("Notes:", 20, yPosition);
        const notesLines = doc.splitTextToSize(order.notes, 170);
        let notesY = yPosition;
        notesLines.forEach((line: string) => {
          doc.text(line, 50, notesY);
          notesY += 6;
        });
        yPosition = notesY + 10;
      }

      // Footer at bottom
      const footerY = pageHeight - 20;
      doc.setFontSize(10);
      doc.setFont("Poppins", "normal");
      doc.text("Thank you for your business!", pageWidth / 2, footerY, {
        align: "center",
      });

      // Generate blob for upload
      const pdfBlob = doc.output("blob");

      // Sanitize invoice name for file name
      const sanitizeFileName = (name: string): string => {
        return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      };
      const sanitizedFileName = sanitizeFileName(invoiceName);

      // Upload to storage
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

      // Success
      alert("Invoice generated successfully!");
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
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Generate Invoice
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Fill in the details to generate an invoice for the selected order.
          </p>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            {/* Order Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Order
              </label>
              <select
                value={selectedOrderId || ""}
                onChange={(e) =>
                  setSelectedOrderId(parseInt(e.target.value) || null)
                }
                disabled={propSelectedOrderId !== undefined}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  propSelectedOrderId !== undefined
                    ? "border-gray-300 bg-gray-100 cursor-not-allowed"
                    : "border-gray-300"
                }`}
              >
                {propSelectedOrderId ? (
                  currentOrder ? (
                    <option value={currentOrder.id}>
                      Order #{currentOrder.id.toString().padStart(4, "0")} - LKR{" "}
                      {Number(currentOrder.total_amount)?.toFixed(2) || "0.00"}
                    </option>
                  ) : (
                    <option value="">No order selected</option>
                  )
                ) : (
                  <>
                    <option value="">Choose an order...</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        Order #{order.id.toString().padStart(4, "0")} - LKR{" "}
                        {Number(order.total_amount)?.toFixed(2) || "0.00"}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Customer Display (disabled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer
              </label>
              <input
                type="text"
                value={customerName}
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                readOnly
              />
            </div>

            {/* Invoice Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Name
              </label>
              <input
                type="text"
                value={invoiceName}
                onChange={(e) => setInvoiceName(e.target.value)}
                placeholder="e.g., Invoice for Order #0001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Discount Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountPercentage}
                onChange={(e) =>
                  setDiscountPercentage(parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateInvoice}
              disabled={generating || !invoiceName.trim() || !selectedOrderId}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {generating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              )}
              <span>{generating ? "Generating..." : "Generate Invoice"}</span>
            </button>
          </div>
          <button
            onClick={handleClose}
            disabled={generating}
            className="mt-4 w-full px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 border border-gray-300 rounded-md"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateInvoiceModal;