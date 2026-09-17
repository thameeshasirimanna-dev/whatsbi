import React from "react";
import { Eye, Download, Send, CheckCircle, CheckCircle2, Trash2, Package } from "lucide-react";
import { InvoiceWithDetails } from "./types";
import { DM, getStatusStyle, capitalizeFirst } from "./constants";

interface InvoiceMobileListProps {
  invoices: InvoiceWithDetails[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onView: (invoice: InvoiceWithDetails) => void;
  onDownload: (invoice: InvoiceWithDetails) => void;
  onSend: (invoice: InvoiceWithDetails) => void;
  onMarkPaid: (invoice: InvoiceWithDetails) => void;
  onMarkPaidFull: (invoice: InvoiceWithDetails) => void;
  onDelete: (invoice: InvoiceWithDetails) => void;
  updatingId: number | null;
}

export const InvoiceMobileList: React.FC<InvoiceMobileListProps> = ({
  invoices,
  selectedIds,
  onToggleSelect,
  onView,
  onDownload,
  onSend,
  onMarkPaid,
  onMarkPaidFull,
  onDelete,
  updatingId,
}) => {
  return (
    <div className="block lg:hidden">
      <div className="flex flex-col divide-y divide-[#f4f4f5]">
        {invoices.map((invoice) => {
          const isSelected = selectedIds.includes(invoice.id);
          return (
            <div
              key={invoice.id}
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: isSelected ? "#f0fdf4" : "transparent",
                transition: "background 0.15s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(invoice.id)}
                    style={{
                      cursor: "pointer",
                      accentColor: "#22c55e",
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span
                        style={{
                          ...DM,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#0891b2",
                          background: "rgba(8,145,178,0.08)",
                          padding: "2px 7px",
                          borderRadius: 5,
                          flexShrink: 0,
                        }}
                      >
                        {invoice.invoice_number ||
                          `#INV-${invoice.id.toString().padStart(4, "0")}`}
                      </span>
                      <span
                        style={{
                          ...DM,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0c1a0e",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={invoice.name}
                      >
                        {invoice.name}
                      </span>
                    </div>
                    <div style={{ ...DM, fontSize: 11, color: "#71717a", marginTop: 2 }}>
                      {invoice.order_id || invoice.linked_order_id ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            color: "#059669",
                            fontWeight: 600,
                          }}
                        >
                          <Package size={11} /> Order #
                          {invoice.order_id || invoice.linked_order_id}
                        </span>
                      ) : (
                        <span style={{ color: "#a1a1aa" }}>No order linked yet</span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    ...DM,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: 20,
                    ...getStatusStyle(invoice.status),
                    flexShrink: 0,
                  }}
                >
                  {invoice.status === "partially_paid"
                    ? "Partially Paid"
                    : capitalizeFirst(invoice.status)}
                </span>
              </div>

              {/* Customer and Total */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: isSelected ? "rgba(255,255,255,0.7)" : "#fafafa",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <span style={{ ...DM, fontSize: 11, color: "#71717a" }}>Customer</span>
                  <span
                    style={{
                      ...DM,
                      fontSize: 12,
                      color: "#0c1a0e",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {invoice.customer_name}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ ...DM, fontSize: 11, color: "#71717a" }}>Total</span>
                  <span style={{ ...DM, fontSize: 13, color: "#3f3f46", fontWeight: 600 }}>
                    LKR {invoice.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Date & Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
                <span style={{ ...DM, fontSize: 11, color: "#71717a" }}>
                  Generated:{" "}
                  {new Date(invoice.generated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {/* View */}
                  <button
                    onClick={() => onView(invoice)}
                    title="View PDF"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 9px",
                      borderRadius: 7,
                      border: "none",
                      cursor: "pointer",
                      ...DM,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "rgba(8,145,178,0.08)",
                      color: "#0891b2",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Eye size={12} /> View
                  </button>

                  {/* Download */}
                  <button
                    onClick={() => onDownload(invoice)}
                    title="Download PDF"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 9px",
                      borderRadius: 7,
                      border: "none",
                      cursor: "pointer",
                      ...DM,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "rgba(34,197,94,0.08)",
                      color: "#22c55e",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Download size={12} /> Download
                  </button>

                  {/* Send / Resend */}
                  {invoice.status !== "paid" && (
                    <button
                      onClick={() => onSend(invoice)}
                      disabled={updatingId === invoice.id}
                      title="Send via WhatsApp"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 9px",
                        borderRadius: 7,
                        border: "none",
                        cursor:
                          updatingId === invoice.id ? "not-allowed" : "pointer",
                        ...DM,
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          updatingId === invoice.id
                            ? "#f4f4f5"
                            : "rgba(217,119,6,0.08)",
                        color:
                          updatingId === invoice.id ? "#a1a1aa" : "#d97706",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Send size={12} />{" "}
                      {updatingId === invoice.id
                        ? "Sending…"
                        : invoice.status === "generated"
                        ? "Send"
                        : "Resend"}
                    </button>
                  )}

                  {/* Mark Paid & Create Order */}
                  {(invoice.status === "generated" || invoice.status === "sent") && (
                    <button
                      onClick={() => onMarkPaid(invoice)}
                      disabled={updatingId === invoice.id}
                      title="Mark Paid & Create Order"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 9px",
                        borderRadius: 7,
                        border: "none",
                        cursor:
                          updatingId === invoice.id ? "not-allowed" : "pointer",
                        ...DM,
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          updatingId === invoice.id
                            ? "#f4f4f5"
                            : "rgba(34,197,94,0.08)",
                        color:
                          updatingId === invoice.id ? "#a1a1aa" : "#059669",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <CheckCircle2 size={12} /> Mark Paid & Create Order
                    </button>
                  )}

                  {/* Mark as Paid Full */}
                  {(invoice.status === "partially_paid" ||
                    (Number(invoice.advance_amount) > 0 &&
                      Number(invoice.advance_amount) <
                        Number(invoice.total || invoice.total_amount || 0) &&
                      invoice.status !== "paid")) && (
                    <button
                      onClick={() => onMarkPaidFull(invoice)}
                      disabled={updatingId === invoice.id}
                      title="Mark as Paid Full"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 9px",
                        borderRadius: 7,
                        border: "none",
                        cursor:
                          updatingId === invoice.id ? "not-allowed" : "pointer",
                        ...DM,
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          updatingId === invoice.id
                            ? "#f4f4f5"
                            : "rgba(34,197,94,0.08)",
                        color:
                          updatingId === invoice.id ? "#a1a1aa" : "#059669",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <CheckCircle size={12} /> Mark as Paid Full
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(invoice)}
                    disabled={updatingId === invoice.id}
                    title="Delete invoice"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 9px",
                      borderRadius: 7,
                      border: "none",
                      cursor:
                        updatingId === invoice.id ? "not-allowed" : "pointer",
                        ...DM,
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          updatingId === invoice.id
                            ? "#f4f4f5"
                            : "rgba(244,63,94,0.06)",
                        color:
                          updatingId === invoice.id ? "#a1a1aa" : "#f43f5e",
                        whiteSpace: "nowrap",
                    }}
                  >
                    <Trash2 size={12} />{" "}
                    {updatingId === invoice.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InvoiceMobileList;
