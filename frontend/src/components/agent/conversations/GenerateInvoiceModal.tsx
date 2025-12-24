import React, { useState, useEffect } from "react";
import { getToken } from "../../../lib/auth";
import { generateInvoicePDF, type InvoiceItem } from "../../../lib/invoice-pdf";
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

  useEffect(() => {
    if (isOpen && propSelectedOrderId) {
      setSelectedOrderId(propSelectedOrderId);
      const order = orders.find(o => o.id === propSelectedOrderId);
      if (order) {
        setInvoiceName(`Invoice for Order #${order.id.toString().padStart(4, "0")}`);
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
      // Find order details from props
      const orderData = orders.find(o => o.id === selectedOrderId);
      if (!orderData) {
        throw new Error("Order not found");
      }

      // Use order items from order data (assuming it's included)
      const items: InvoiceItem[] = (orderData.order_items || []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total || item.quantity * item.price,
      }));

      await generateInvoicePDF({
        orderData,
        items,
        invoiceName: invoiceName.trim(),
        customerName,
        agentDetails,
        invoiceTemplatePath,
        discountPercentage,
        agentPrefix,
        customerId,
      });

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

  const currentOrder = orders.find(o => o.id === selectedOrderId);

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
                onChange={(e) => setSelectedOrderId(parseInt(e.target.value) || null)}
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
                      {currentOrder.total_amount?.toFixed(2) || "0.00"}
                    </option>
                  ) : (
                    <option value="">No order selected</option>
                  )
                ) : (
                  <>
                    <option value="">Choose an order...</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        Order #{order.id.toString().padStart(4, "0")} - LKR {order.total_amount?.toFixed(2) || "0.00"}
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
              <span>
                {generating ? "Generating..." : "Generate Invoice"}
              </span>
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