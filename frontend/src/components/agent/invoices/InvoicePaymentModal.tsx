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
          style={{
            background: "#fff",
            borderRadius: 24,
            border: "1px solid #EAEAEA",
            boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
            width: "100%",
            maxWidth: "min(480px, 90vw)",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid #EAEAEA",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              <div>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#16281D",
                    display: "block",
                  }}
                >
                  Mark Paid & Create Order
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={creatingOrderFromInv}
              style={{
                width: 32,
                height: 32,
                background: "#F4F7F4",
                border: "1px solid #EAEAEA",
                borderRadius: 9999,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#71717a",
                transition: "all 0.15s",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Modal Form Body */}
          <div
            style={{
              padding: 24,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
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
                  LKR {invoiceTotal.toFixed(2)}
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
                Confirmed Paid / Advance Amount (LKR)
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
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #EAEAEA",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              background: "#fff",
            }}
          >
            <button
              type="button"
              onClick={onQuickConfirm}
              disabled={creatingOrderFromInv}
              style={{
                background: "none",
                border: "none",
                color: "#71717a",
                fontSize: 12,
                textDecoration: "underline",
                cursor: creatingOrderFromInv ? "not-allowed" : "pointer",
              }}
            >
              Quick Confirm (Auto-create Order)
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={creatingOrderFromInv}
                style={{
                  padding: "9px 20px",
                  background: "#F4F7F4",
                  color: "#16281D",
                  border: "1px solid #EAEAEA",
                  borderRadius: 9999,
                  cursor: creatingOrderFromInv ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.15s",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmAndCreateOrder}
                disabled={creatingOrderFromInv}
                style={{
                  padding: "9px 22px",
                  background: creatingOrderFromInv
                    ? "rgba(159,232,112,0.5)"
                    : "#9FE870",
                  color: "#16281D",
                  border: "none",
                  borderRadius: 9999,
                  cursor: creatingOrderFromInv ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 10px rgba(159,232,112,0.3)",
                  transition: "all 0.15s",
                }}
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
