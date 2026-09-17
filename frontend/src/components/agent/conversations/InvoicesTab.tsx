import React from "react";
import { downloadInvoice } from "../../../lib/api";
import { Eye, Download, Send, CheckCircle2, Trash2, Package } from "lucide-react";
import { useDialog } from "../shared/DialogProvider";

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

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "paid") return "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
    if (s === "partially_paid") return "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]";
    if (s === "sent") return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
    if (s === "generated") return "bg-[#F4F7F4] text-[#16281D] border-[#EAEAEA]";
    return "bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]";
  };

  return (
    <>
      {invoices.length === 0 ? (
        <div className="text-center py-14 px-4 bg-white rounded-2xl border border-dashed border-[#EAEAEA] flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#F4F7F4] flex items-center justify-center text-[#71717A] mb-3">
            <Package size={20} />
          </div>
          <p className="font-sans text-sm font-bold text-[#16281D] mb-1">No invoices found</p>
          <p className="font-sans text-xs text-[#71717A]">No invoices generated for this customer yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {invoices.map((invoice) => {
            const finalTotal = Number(invoice.total_amount || invoice.total || 0);
            const linkedOrderId = invoice.order_id || invoice.linked_order_id;
            const createdDate = invoice.created_at || invoice.generated_at;

            return (
              <div
                key={invoice.id}
                className="bg-white rounded-2xl border border-[#EAEAEA] p-5 shadow-xs hover:border-[#16281D]/20 transition-all flex flex-col gap-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-sans text-sm font-bold text-[#16281D] block">
                      {invoice.name}
                    </span>
                    <span className="font-mono text-xs text-[#71717A] mt-0.5 block">
                      #INV-{invoice.id.toString().padStart(4, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {linkedOrderId ? (
                      <span className="text-[11px] font-medium font-sans px-2.5 py-0.5 rounded-full bg-[#F4F7F4] text-[#16281D] border border-[#EAEAEA] inline-flex items-center gap-1">
                        <Package size={11} strokeWidth={2.2} />
                        Order #{linkedOrderId.toString().padStart(4, "0")}
                      </span>
                    ) : null}

                    <span className={`text-[11px] font-semibold font-sans px-2.5 py-0.5 rounded-full border ${getStatusBadge(invoice.status)}`}>
                      {invoice.status === "partially_paid"
                        ? "Partially Paid"
                        : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2.5 py-2.5 px-3.5 bg-[#F4F7F4] rounded-xl border border-[#EAEAEA]/80">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-sans text-xs text-[#71717A] font-medium">Total:</span>
                    <span className="font-mono text-sm font-bold text-[#16281D]">
                      LKR {finalTotal.toFixed(2)}
                    </span>
                    {invoice.advance_amount !== undefined && Number(invoice.advance_amount) > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                        Advance: LKR {Number(invoice.advance_amount).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {createdDate && (
                    <span className="font-sans text-[11px] text-[#71717A]">
                      Generated on <span className="font-mono font-medium text-[#16281D]">{new Date(createdDate).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>

                {/* Actions following Style Guide Section 6 button hierarchy */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#F4F7F4]">
                  <button
                    onClick={() => window.open(invoice.pdf_url, "_blank")}
                    className="h-8 px-3 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border-0"
                  >
                    <Eye size={13} strokeWidth={2.2} />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => handleDownload(invoice)}
                    className="h-8 px-3 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border-0"
                  >
                    <Download size={13} strokeWidth={2.2} />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => onSendInvoice(invoice)}
                    className="h-8 px-3 rounded-full bg-[#E8F8EE] hover:bg-[#D4F2DE] text-[#16281D] border border-[#16281D]/10 font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Send size={13} strokeWidth={2.2} />
                    <span>Send via WhatsApp</span>
                  </button>

                  {/* If only advance paid / partially paid, provide button to Mark as Paid Full */}
                  {(invoice.status === "partially_paid" ||
                    (Number(invoice.advance_amount) > 0 &&
                      Number(invoice.advance_amount) < finalTotal &&
                      invoice.status !== "paid")) && (
                    <button
                      onClick={() =>
                        onMarkPaidFull ? onMarkPaidFull(invoice) : onMarkPaid(invoice)
                      }
                      disabled={updatingId === invoice.id}
                      className="h-8 px-3.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_2px_8px_rgba(159,232,112,0.25)] flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 size={13} strokeWidth={2.2} />
                      <span>{updatingId === invoice.id ? "Updating…" : "Mark as Paid Full"}</span>
                    </button>
                  )}

                  {/* Mark Paid & Create Order action for unpaid invoices without advance */}
                  {(invoice.status === "generated" || invoice.status === "sent") &&
                    !(Number(invoice.advance_amount) > 0) && (
                      <button
                        onClick={() => onMarkPaid(invoice)}
                        disabled={updatingId === invoice.id}
                        className="h-8 px-3.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_2px_8px_rgba(159,232,112,0.25)] flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 size={13} strokeWidth={2.2} />
                        <span>{updatingId === invoice.id ? "Creating Order…" : "Mark Paid & Create Order"}</span>
                      </button>
                    )}

                  <button
                    onClick={() => onDeleteInvoice(invoice)}
                    className="h-8 px-3 rounded-full bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FECDD3] font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Trash2 size={13} strokeWidth={2.2} />
                    <span>Delete</span>
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
