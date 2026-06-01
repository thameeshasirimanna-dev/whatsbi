import React from "react";
import { downloadInvoice } from "../../../lib/api";
import { Eye, Download, Send, CheckCircle, Trash2 } from "lucide-react";
import { useDialog } from "../shared/DialogProvider";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Invoice {
  id: number;
  order_id: number;
  name: string;
  pdf_url: string;
  total_amount: number;
  status: string;
  created_at: string;
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
}) => {
  const { toast } = useDialog();

  const handleDownload = async (invoice: Invoice) => {
    try {
      await downloadInvoice(invoice.id);
    } catch (err) {
      console.error("Download error:", err);
      toast("Failed to download invoice. Please try again.", 'error');
    }
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    if (status === "paid") return { background: "rgba(34,197,94,0.1)", color: "#059669" };
    if (status === "sent") return { background: "rgba(217,119,6,0.1)", color: "#d97706" };
    if (status === "generated") return { background: "rgba(8,145,178,0.1)", color: "#0891b2" };
    return { background: "#f4f4f5", color: "#71717a" };
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
          {invoices.map((invoice) => (
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
                <span style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: "#0c1a0e" }}>
                  {invoice.name} — #{invoice.id.toString().padStart(4, "0")}
                </span>
                <span
                  style={{
                    ...DM,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: 9999,
                    ...getStatusStyle(invoice.status),
                  }}
                >
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>

              <p style={{ ...DM, fontSize: 13, color: "#3f3f46", marginBottom: 4 }}>
                Total:{" "}
                <span style={{ fontWeight: 600, color: "#0c1a0e" }}>
                  LKR {invoice.total_amount?.toFixed(2) || "0.00"}
                </span>
              </p>
              <p style={{ ...DM, fontSize: 12, color: "#a1a1aa", marginBottom: 12 }}>
                Created on: {new Date(invoice.created_at).toLocaleDateString()}
              </p>

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
                  Send
                </button>

                {(invoice.status === "generated" || invoice.status === "sent") && (
                  <button
                    onClick={() => onMarkPaid(invoice)}
                    disabled={updatingId === invoice.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      background: updatingId === invoice.id ? "rgba(34,197,94,0.04)" : "rgba(34,197,94,0.08)",
                      color: "#059669",
                      border: "1px solid rgba(34,197,94,0.15)",
                      borderRadius: 8,
                      cursor: updatingId === invoice.id ? "not-allowed" : "pointer",
                      opacity: updatingId === invoice.id ? 0.6 : 1,
                      ...DM,
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "background 0.15s",
                    }}
                  >
                    <CheckCircle size={13} />
                    {updatingId === invoice.id ? "Updating…" : "Mark Paid"}
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
          ))}
        </div>
      )}
    </>
  );
};

export default InvoicesTab;
