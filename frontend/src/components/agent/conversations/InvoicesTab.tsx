import React from "react";
import { downloadInvoice } from "../../../lib/api";
import { Eye, Download, Send, CheckCircle2, Trash2, Package } from "lucide-react";
import { useDialog } from "../shared/DialogProvider";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export interface Invoice {
  id: number;
  order_id?: number | null;
  customer_id?: number;
  name: string;
  pdf_url: string;
  total_amount?: number;
  total?: number;
  advance_amount?: number;
  status: string;
  created_at?: string;
  generated_at?: string;
  linked_order_id?: number | null;
}

interface InvoicesTabProps {
  invoices: Invoice[];
  agentPrefix: string | null;
  customerPhone: string | null;
  agentId: number | null;
  customerName: string;
  updatingId: number | null;
  onRefresh: () => void;
  onSendInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onMarkPaid: (invoice: Invoice) => void;
  onMarkPaidFull?: (invoice: Invoice) => void;
}

const InvoicesTab: React.FC<InvoicesTabProps> = ({
  invoices,
  agentPrefix,
  customerPhone,
  agentId,
  customerName,
  updatingId,
  onRefresh,
  onSendInvoice,
  onDeleteInvoice,
  onMarkPaid,
  onMarkPaidFull,
}) => {
  const { toast } = useDialog();

  const handleDownload = async (invoice: Invoice) => {
    try {
      await downloadInvoice(invoice.id);
    } catch (err) {
      console.error("Download error:", err);
      toast("Failed to download invoice. Please try again.", "error");
    }
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    if (status === "paid") return { background: "rgba(34,197,94,0.1)", color: "#059669", border: "1px solid rgba(34,197,94,0.2)" };
    if (status === "partially_paid") return { background: "rgba(245,158,11,0.1)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)" };
    if (status === "sent") return { background: "rgba(217,119,6,0.1)", color: "#d97706", border: "1px solid rgba(217,119,6,0.2)" };
    if (status === "generated") return { background: "rgba(8,145,178,0.1)", color: "#0891b2", border: "1px solid rgba(8,145,178,0.2)" };
    return { background: "#f4f4f5", color: "#71717a", border: "1px solid #ebebeb" };
  };

  return (
    <>
      {invoices.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            ...DM,
            fontSize: 14,
            color: "#71717a",
          }}
        >
          No invoices found for this customer.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {invoices.map((invoice) => {
            const finalTotal = Number(invoice.total_amount || invoice.total || 0);
            const linkedOrderId = invoice.order_id || invoice.linked_order_id;
            const createdDate = invoice.created_at || invoice.generated_at;

            return (
              <div
                key={invoice.id}
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: "1px solid #ebebeb",
                  padding: "16px 18px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)")
                }
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <span style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: "#0c1a0e", display: "block" }}>
                      {invoice.name}
                    </span>
                    <span style={{ ...DM, fontSize: 11, color: "#71717a" }}>
                      #INV-{invoice.id.toString().padStart(4, "0")}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {linkedOrderId ? (
                      <span
                        style={{
                          ...DM,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: 6,
                          background: "rgba(8,145,178,0.08)",
                          color: "#0891b2",
                          border: "1px solid rgba(8,145,178,0.18)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Package size={11} />
                        Order #{linkedOrderId.toString().padStart(4, "0")}
                      </span>
                    ) : null}

                    <span
                      style={{
                        ...DM,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 6,
                        ...getStatusStyle(invoice.status),
                      }}
                    >
                      {invoice.status === 'partially_paid' ? 'Partially Paid' : (invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1))}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
                  <p style={{ ...DM, fontSize: 13, color: "#3f3f46", margin: 0 }}>
                    Total:{" "}
                    <span style={{ fontWeight: 700, color: "#0c1a0e" }}>
                      LKR {finalTotal.toFixed(2)}
                    </span>
                  </p>
                  {invoice.advance_amount !== undefined && Number(invoice.advance_amount) > 0 && (
                    <p style={{ ...DM, fontSize: 12, color: "#059669", margin: 0 }}>
                      Advance: LKR {Number(invoice.advance_amount).toFixed(2)}
                    </p>
                  )}
                </div>

                {createdDate && (
                  <p style={{ ...DM, fontSize: 12, color: "#a1a1aa", marginBottom: 12 }}>
                    Generated on: {new Date(createdDate).toLocaleDateString()}
                  </p>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    onClick={() => window.open(invoice.pdf_url, "_blank")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      background: "rgba(8,145,178,0.08)",
                      color: "#0891b2",
                      border: "1px solid rgba(8,145,178,0.15)",
                      borderRadius: 8,
                      cursor: "pointer",
                      ...DM,
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(8,145,178,0.14)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(8,145,178,0.08)")}
                  >
                    <Eye size={13} />
                    View
                  </button>

                  <button
                    onClick={() => handleDownload(invoice)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      background: "rgba(34,197,94,0.08)",
                      color: "#059669",
                      border: "1px solid rgba(34,197,94,0.15)",
                      borderRadius: 8,
                      cursor: "pointer",
                      ...DM,
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.14)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.08)")}
                  >
                    <Download size={13} />
                    Download
                  </button>

                  <button
                    onClick={() => onSendInvoice(invoice)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      background: "rgba(34,197,94,0.08)",
                      color: "#059669",
                      border: "1px solid rgba(34,197,94,0.15)",
                      borderRadius: 8,
                      cursor: "pointer",
                      ...DM,
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.14)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.08)")}
                  >
                    <Send size={13} />
                    Send via WhatsApp
                  </button>

                  {/* If only advance paid / partially paid, provide button to Mark as Paid Full */}
                  {(invoice.status === "partially_paid" || (Number(invoice.advance_amount) > 0 && Number(invoice.advance_amount) < finalTotal && invoice.status !== "paid")) && (
                    <button
                      onClick={() => onMarkPaidFull ? onMarkPaidFull(invoice) : onMarkPaid(invoice)}
                      disabled={updatingId === invoice.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 12px",
                        background: updatingId === invoice.id ? "rgba(16,185,129,0.04)" : "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: updatingId === invoice.id ? "not-allowed" : "pointer",
                        opacity: updatingId === invoice.id ? 0.6 : 1,
                        ...DM,
                        fontSize: 12,
                        fontWeight: 600,
                        boxShadow: "0 2px 8px rgba(16,185,129,0.25)",
                        transition: "opacity 0.15s",
                      }}
                    >
                      <CheckCircle2 size={13} />
                      {updatingId === invoice.id ? "Updating…" : "Mark as Paid Full"}
                    </button>
                  )}

                  {/* Mark Paid & Create Order action for unpaid invoices without advance */}
                  {(invoice.status === "generated" || invoice.status === "sent") && !(Number(invoice.advance_amount) > 0) && (
                    <button
                      onClick={() => onMarkPaid(invoice)}
                      disabled={updatingId === invoice.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 12px",
                        background: updatingId === invoice.id ? "rgba(34,197,94,0.04)" : "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: updatingId === invoice.id ? "not-allowed" : "pointer",
                        opacity: updatingId === invoice.id ? 0.6 : 1,
                        ...DM,
                        fontSize: 12,
                        fontWeight: 600,
                        boxShadow: "0 2px 8px rgba(34,197,94,0.25)",
                        transition: "opacity 0.15s",
                      }}
                    >
                      <CheckCircle2 size={13} />
                      {updatingId === invoice.id ? "Creating Order…" : "Mark Paid & Create Order"}
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteInvoice(invoice)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      background: "rgba(244,63,94,0.06)",
                      color: "#f43f5e",
                      border: "1px solid rgba(244,63,94,0.15)",
                      borderRadius: 8,
                      cursor: "pointer",
                      ...DM,
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.06)")}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default InvoicesTab;
