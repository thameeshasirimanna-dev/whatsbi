import React from "react";
import { X, CheckCircle2 } from "lucide-react";
import Portal from "../shared/Portal";
import { DatePicker } from "../shared/DatePicker";
import { InvoiceWithDetails } from "./types";

interface InvoicePaymentModalProps {
  payingInvoice: InvoiceWithDetails | null;
  onClose: () => void;
  orderPaidAmount: number;
  setOrderPaidAmount: (val: number) => void;
  orderShippingAddress: string;
  setOrderShippingAddress: (val: string) => void;
  orderEstimatedDelivery: string;
  setOrderEstimatedDelivery: (val: string) => void;
  orderNotes: string;
  setOrderNotes: (val: string) => void;
  creatingOrderFromInv: boolean;
  onQuickConfirm: () => void;
  onConfirmAndCreateOrder: () => void;
}

export const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  payingInvoice,
  onClose,
  orderPaidAmount,
  setOrderPaidAmount,
  orderShippingAddress,
  setOrderShippingAddress,
  orderEstimatedDelivery,
  setOrderEstimatedDelivery,
  orderNotes,
  setOrderNotes,
  creatingOrderFromInv,
  onQuickConfirm,
  onConfirmAndCreateOrder,
}) => {
  if (!payingInvoice) return null;

  const invoiceTotal = Number(
    payingInvoice.total_amount || payingInvoice.total || 0
  );

  return (
    <Portal>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(22, 40, 29, 0.45)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-2xl w-full max-w-[min(480px,95vw)] sm:max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {/* Modal Header */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  background: "rgba(159,232,112,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={16} style={{ color: "#16281D" }} />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-bold text-[#16281D] block truncate">
                  Mark Paid & Create Order
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={creatingOrderFromInv}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] border border-[#EAEAEA] flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          {/* Modal Form Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4">
            <div
              style={{
                background: "#F4F7F4",
                border: "1px solid #EAEAEA",
                borderRadius: 16,
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12, color: "#71717a" }}>
                  Customer:
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#16281D",
                  }}
                >
                  {payingInvoice.customer_name || "Valued Customer"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12, color: "#71717a" }}>
                  Invoice:
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#16281D",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  #{payingInvoice.id.toString().padStart(4, "0")} —{" "}
                  {payingInvoice.name}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#71717a" }}>
                  Invoice Total:
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#16281D",
                  }}
                >
                  Rs. {invoiceTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#16281D",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Confirmed Paid / Advance Amount (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={orderPaidAmount}
                onChange={(e) =>
                  setOrderPaidAmount(parseFloat(e.target.value) || 0)
                }
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  border: "1px solid #EAEAEA",
                  borderRadius: 12,
                  outline: "none",
                  background: "#fff",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: "#71717a",
                  marginTop: 4,
                  display: "block",
                }}
              >
                {orderPaidAmount >= invoiceTotal
                  ? "Full payment received (Payment status: Paid)"
                  : orderPaidAmount > 0
                  ? "Partial deposit received (Payment status: Partially Paid)"
                  : "Unpaid order"}
              </span>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#16281D",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Shipping / Delivery Address (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter customer shipping address..."
                value={orderShippingAddress}
                onChange={(e) => setOrderShippingAddress(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  fontSize: 13,
                  border: "1px solid #EAEAEA",
                  borderRadius: 12,
                  outline: "none",
                  background: "#fff",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#16281D",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Estimated Delivery Date (Optional)
              </label>
              <DatePicker
                value={orderEstimatedDelivery || null}
                onChange={(val) => setOrderEstimatedDelivery(val || "")}
                placeholder="Select estimated delivery date..."
                className="w-full"
                variant="white"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#16281D",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Order Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Notes, delivery instructions or terms..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  fontSize: 13,
                  border: "1px solid #EAEAEA",
                  borderRadius: 12,
                  outline: "none",
                  background: "#fff",
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-3 sm:px-6 sm:py-4 border-t border-[#EAEAEA] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
            <button
              type="button"
              onClick={onQuickConfirm}
              disabled={creatingOrderFromInv}
              className="text-center sm:text-left text-xs text-gray-500 underline py-1 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Quick Confirm (Auto-create Order)
            </button>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={creatingOrderFromInv}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#F4F7F4] text-[#16281D] border border-[#EAEAEA] rounded-full text-xs sm:text-sm font-semibold hover:bg-gray-100 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmAndCreateOrder}
                disabled={creatingOrderFromInv}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#9FE870] hover:bg-[#8ee05b] text-[#16281D] rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-[0_2px_10px_rgba(159,232,112,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
              >
                <CheckCircle2 size={15} />
                {creatingOrderFromInv ? "Creating Order…" : "Confirm & Create Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default InvoicePaymentModal;
