import React from "react";
import { Eye, Download, Send, CheckCircle, CheckCircle2, Trash2, Package, Pencil } from "lucide-react";
import { InvoiceWithDetails } from "./types";
import { getStatusStyle, getStatusDotColor, capitalizeFirst } from "./constants";

interface InvoiceMobileListProps {
  invoices: InvoiceWithDetails[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onView: (invoice: InvoiceWithDetails) => void;
  onDownload: (invoice: InvoiceWithDetails) => void;
  onSend: (invoice: InvoiceWithDetails) => void;
  onEdit?: (invoice: InvoiceWithDetails) => void;
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
  onEdit,
  onMarkPaid,
  onMarkPaidFull,
  onDelete,
  updatingId,
}) => {
  return (
    <div className="block lg:hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex flex-col divide-y divide-[#EAEAEA]">
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
                background: isSelected ? "rgba(159,232,112,0.08)" : "transparent",
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
                      accentColor: "#16281D",
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: "#16281D",
                          background: "#F4F7F4",
                          border: "1px solid #EAEAEA",
                          padding: "2px 8px",
                          borderRadius: 9999,
                          flexShrink: 0,
                        }}
                      >
                        {invoice.invoice_number ||
                          `#INV-${invoice.id.toString().padStart(4, "0")}`}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#16281D",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={invoice.name}
                      >
                        {invoice.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#71717a", marginTop: 3 }}>
                      {invoice.order_id || invoice.linked_order_id ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#16281D",
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
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 9999,
                    ...getStatusStyle(invoice.status),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: getStatusDotColor(invoice.status),
                    }}
                  />
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
                  background: isSelected ? "rgba(255,255,255,0.7)" : "#F4F7F4",
                  border: "1px solid #EAEAEA",
                  padding: "10px 14px",
                  borderRadius: 12,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 11, color: "#71717a" }}>Customer</span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#16281D",
                      fontWeight: 600,
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
                  <span style={{ fontSize: 11, color: "#71717a" }}>Total</span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      color: "#16281D",
                      fontWeight: 700,
                    }}
                  >
                    Rs. {invoice.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Date & Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
                <span style={{ fontSize: 11, color: "#71717a" }}>
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
                      padding: "6px 12px",
                      borderRadius: 9999,
                      border: "1px solid #EAEAEA",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      background: "#F4F7F4",
                      color: "#16281D",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s",
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
                      padding: "6px 12px",
                      borderRadius: 9999,
                      border: "1px solid #EAEAEA",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      background: "#F4F7F4",
                      color: "#16281D",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s",
                    }}
                  >
                    <Download size={12} /> Download
                  </button>

                  {/* Edit */}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(invoice)}
                      disabled={updatingId === invoice.id}
                      title="Edit Invoice"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 12px",
                        borderRadius: 9999,
                        border: "1px solid #EAEAEA",
                        cursor: updatingId === invoice.id ? "not-allowed" : "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        background: updatingId === invoice.id ? "#F4F4F5" : "#F4F7F4",
                        color: "#16281D",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s",
                      }}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  )}

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
                        padding: "6px 12px",
                        borderRadius: 9999,
                        border: "1px solid #EAEAEA",
                        cursor:
                          updatingId === invoice.id ? "not-allowed" : "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          updatingId === invoice.id
                            ? "#F4F7F4"
                            : "rgba(245,158,11,0.1)",
                        color:
                          updatingId === invoice.id ? "#a1a1aa" : "#B45309",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s",
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
                        padding: "6px 12px",
                        borderRadius: 9999,
                        border: "none",
                        cursor:
                          updatingId === invoice.id ? "not-allowed" : "pointer",
                        fontSize: 11,
                        fontWeight: 700,
                        background:
                          updatingId === invoice.id
                            ? "#F4F7F4"
                            : "#9FE870",
                        color:
                          updatingId === invoice.id ? "#a1a1aa" : "#16281D",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 6px rgba(159,232,112,0.25)",
                        transition: "all 0.15s",
                      }}
                    >
                      <CheckCircle2 size={12} /> Mark Paid & Order
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
                        padding: "6px 12px",
                        borderRadius: 9999,
                        border: "none",
                        cursor:
                          updatingId === invoice.id ? "not-allowed" : "pointer",
                        fontSize: 11,
                        fontWeight: 700,
                        background:
                          updatingId === invoice.id
                            ? "#F4F7F4"
                            : "#9FE870",
                        color:
                          updatingId === invoice.id ? "#a1a1aa" : "#16281D",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 6px rgba(159,232,112,0.25)",
                        transition: "all 0.15s",
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
                      padding: "6px 12px",
                      borderRadius: 9999,
                      border: "1px solid #fee2e2",
                      cursor:
                        updatingId === invoice.id ? "not-allowed" : "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      background:
                        updatingId === invoice.id
                          ? "#F4F7F4"
                          : "rgba(239,68,68,0.06)",
                      color:
                        updatingId === invoice.id ? "#a1a1aa" : "#EF4444",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s",
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
