import React from "react";
import { X, CheckCircle2 } from "lucide-react";
import Portal from "../shared/Portal";
import { InvoiceWithDetails } from "./types";
import { SYNE, DM } from "./constants";

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
          zIndex: 70,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid #ebebeb",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            width: "100%",
            maxWidth: "min(480px, 90vw)",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: "18px 22px 14px",
              borderBottom: "1px solid #ebebeb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(34,197,94,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={15} style={{ color: "#059669" }} />
              </div>
              <div>
                <span
                  style={{
                    ...SYNE,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#0c1a0e",
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
                width: 28,
                height: 28,
                background: "rgba(0,0,0,0.06)",
                border: "none",
                borderRadius: 7,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#71717a",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Modal Form Body */}
          <div
            style={{
              padding: 22,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                background: "#f9f9fb",
                border: "1px solid #ebebeb",
                borderRadius: 12,
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ ...DM, fontSize: 12, color: "#71717a" }}>
                  Customer:
                </span>
                <span
                  style={{
                    ...DM,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#0c1a0e",
                  }}
                >
                  {payingInvoice.customer_name || "Valued Customer"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ ...DM, fontSize: 12, color: "#71717a" }}>
                  Invoice:
                </span>
                <span
                  style={{
                    ...DM,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#0c1a0e",
                  }}
                >
                  #{payingInvoice.id.toString().padStart(4, "0")} —{" "}
                  {payingInvoice.name}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ ...DM, fontSize: 12, color: "#71717a" }}>
                  Invoice Total:
                </span>
                <span
                  style={{
                    ...SYNE,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#059669",
                  }}
                >
                  LKR {invoiceTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label
                style={{
                  ...DM,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#3f3f46",
                  display: "block",
                  marginBottom: 5,
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
                  padding: "8px 12px",
                  ...DM,
                  fontSize: 13,
                  border: "1px solid #ebebeb",
                  borderRadius: 8,
                  outline: "none",
                  background: "#f9f9f9",
                }}
              />
              <span
                style={{
                  ...DM,
                  fontSize: 11,
                  color: "#71717a",
                  marginTop: 3,
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
                  ...DM,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#3f3f46",
                  display: "block",
                  marginBottom: 5,
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
                  padding: "8px 12px",
                  ...DM,
                  fontSize: 13,
                  border: "1px solid #ebebeb",
                  borderRadius: 8,
                  outline: "none",
                  background: "#f9f9f9",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  ...DM,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#3f3f46",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Estimated Delivery Date (Optional)
              </label>
              <input
                type="date"
                value={orderEstimatedDelivery}
                onChange={(e) => setOrderEstimatedDelivery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  ...DM,
                  fontSize: 13,
                  border: "1px solid #ebebeb",
                  borderRadius: 8,
                  outline: "none",
                  background: "#f9f9f9",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  ...DM,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#3f3f46",
                  display: "block",
                  marginBottom: 5,
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
                  padding: "8px 12px",
                  ...DM,
                  fontSize: 13,
                  border: "1px solid #ebebeb",
                  borderRadius: 8,
                  outline: "none",
                  background: "#f9f9f9",
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: "14px 22px",
              borderTop: "1px solid #ebebeb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
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
                ...DM,
                fontSize: 12,
                textDecoration: "underline",
                cursor: creatingOrderFromInv ? "not-allowed" : "pointer",
              }}
            >
              Quick Confirm (Auto-create Order)
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={creatingOrderFromInv}
                style={{
                  padding: "8px 14px",
                  background: "rgba(0,0,0,0.06)",
                  color: "#3f3f46",
                  border: "none",
                  borderRadius: 8,
                  cursor: creatingOrderFromInv ? "not-allowed" : "pointer",
                  ...DM,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmAndCreateOrder}
                disabled={creatingOrderFromInv}
                style={{
                  padding: "8px 18px",
                  background: creatingOrderFromInv
                    ? "rgba(34,197,94,0.3)"
                    : "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: creatingOrderFromInv ? "not-allowed" : "pointer",
                  ...DM,
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 10px rgba(34,197,94,0.25)",
                }}
              >
                <CheckCircle2 size={14} />
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
