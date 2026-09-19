import React from "react";
import { X, CheckCircle2, Zap } from "lucide-react";
import Portal from "../shared/Portal";
import { DatePicker } from "../shared/DatePicker";

export interface Invoice {
  id: number;
  order_id?: number | null;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  name: string;
  pdf_url: string;
  total_amount?: number;
  total?: number;
  advance_amount?: number;
  discount_percentage?: number;
  notes?: string;
  status: string;
  created_at?: string;
  generated_at?: string;
  linked_order_id?: number | null;
}

interface MarkPaidModalProps {
  payingInvoice: Invoice;
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
  onConfirmAndCreate: () => void;
}

export const MarkPaidModal: React.FC<MarkPaidModalProps> = ({
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
  onConfirmAndCreate,
}) => {
  const invoiceTotal = Number(payingInvoice.total_amount || payingInvoice.total || 0);

  return (
    <Portal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && !creatingOrderFromInv) {
            onClose();
          }
        }}
        className="fixed inset-0 z-[110] bg-[#16281D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-sans animate-fade-in select-none"
      >
        <div
          className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-2xl w-full max-w-[min(540px,calc(100vw-32px))] max-h-[92vh] flex flex-col overflow-hidden animate-modal-card"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {/* Header */}
          <div className="shrink-0 px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 mr-2">
              <div className="w-9 h-9 rounded-2xl bg-[#9FE870]/25 flex items-center justify-center text-[#16281D] shrink-0">
                <CheckCircle2 size={18} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <h3 className="font-sans text-sm sm:text-base font-extrabold text-[#16281D] tracking-tight truncate">
                  Mark Paid & Create Order
                </h3>
                <p className="text-[11px] sm:text-xs text-[#71717A] truncate">
                  Record customer payment and initialize a linked order
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={creatingOrderFromInv}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] border border-[#EAEAEA] flex items-center justify-center text-[#71717A] hover:text-[#16281D] transition-all cursor-pointer disabled:opacity-50 shrink-0"
              aria-label="Close modal"
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </div>

          {/* Modal Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
            {/* Invoice & Customer Summary Card */}
            <div className="p-3.5 sm:p-4 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-0.5">
                    Customer
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-[#16281D] truncate">
                    {payingInvoice.customer_name || "Valued Customer"}
                  </div>
                  {payingInvoice.customer_phone && (
                    <div className="text-[11px] font-mono text-[#71717A] truncate mt-0.5">
                      {payingInvoice.customer_phone}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-0.5">
                    Invoice Total
                  </span>
                  <div className="font-mono text-sm sm:text-base font-extrabold text-[#16281D]">
                    Rs. {invoiceTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#EAEAEA]/80 flex items-center justify-between text-xs text-[#71717A] gap-2">
                <span className="truncate font-mono font-medium text-[11px] text-[#52525B]">
                  #{payingInvoice.id.toString().padStart(4, "0")} — {payingInvoice.name}
                </span>
                {(payingInvoice.generated_at || payingInvoice.created_at) && (
                  <span className="shrink-0 text-[10.5px] font-mono text-[#71717A]">
                    {new Date(payingInvoice.generated_at || payingInvoice.created_at!).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Confirmed Paid / Advance Amount with Live Status & Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <label className="text-xs font-bold text-[#16281D]">
                  Confirmed Paid / Advance Amount
                </label>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-tight ${
                    orderPaidAmount >= invoiceTotal && invoiceTotal > 0
                      ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                      : orderPaidAmount > 0
                      ? "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                      : "bg-[#F4F4F5] text-[#71717A] border border-[#E4E4E7]"
                  }`}
                >
                  {orderPaidAmount >= invoiceTotal && invoiceTotal > 0
                    ? "Fully Paid"
                    : orderPaidAmount > 0
                    ? "Partial Deposit"
                    : "Unpaid Order"}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-[#71717A]">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderPaidAmount || ""}
                  placeholder="0.00"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOrderPaidAmount(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  className="w-full h-10 pl-10 pr-3.5 text-sm font-mono font-bold text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:bg-white focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all"
                />
              </div>

              {/* Quick Amount Presets */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setOrderPaidAmount(invoiceTotal)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border shrink-0 ${
                    orderPaidAmount === invoiceTotal
                      ? "bg-[#16281D] text-[#9FE870] border-[#16281D]"
                      : "bg-[#F4F7F4] text-[#52525B] border-[#EAEAEA] hover:bg-[#E8ECE8]"
                  }`}
                >
                  Full (Rs. {invoiceTotal.toFixed(2)})
                </button>
                {invoiceTotal > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderPaidAmount(Number((invoiceTotal / 2).toFixed(2)))}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border shrink-0 ${
                      orderPaidAmount === Number((invoiceTotal / 2).toFixed(2))
                        ? "bg-[#16281D] text-[#9FE870] border-[#16281D]"
                        : "bg-[#F4F7F4] text-[#52525B] border-[#EAEAEA] hover:bg-[#E8ECE8]"
                    }`}
                  >
                    50% (Rs. {(invoiceTotal / 2).toFixed(2)})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOrderPaidAmount(0)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border shrink-0 ${
                    orderPaidAmount === 0
                      ? "bg-[#16281D] text-[#9FE870] border-[#16281D]"
                      : "bg-[#F4F7F4] text-[#52525B] border-[#EAEAEA] hover:bg-[#E8ECE8]"
                  }`}
                >
                  Rs. 0 (Unpaid)
                </button>
              </div>
            </div>

            {/* 2-Column Row for Shipping Address & Delivery Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#16281D] mb-1.5">
                  Shipping Address <span className="text-[10.5px] font-normal text-[#71717A]">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Customer address..."
                  value={orderShippingAddress}
                  onChange={(e) => setOrderShippingAddress(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-sans text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:bg-white focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all placeholder:text-[#A1A1AA]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#16281D] mb-1.5">
                  Est. Delivery Date <span className="text-[10.5px] font-normal text-[#71717A]">(Optional)</span>
                </label>
                <DatePicker
                  value={orderEstimatedDelivery || null}
                  onChange={(val) => setOrderEstimatedDelivery(val || "")}
                  placeholder="Select date..."
                  className="w-full"
                  variant="white"
                  triggerClassName="!h-10 !rounded-xl !border-[#EAEAEA] !bg-[#F4F7F4] focus:!bg-white text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Order Notes */}
            <div>
              <label className="block text-xs font-bold text-[#16281D] mb-1.5">
                Order Notes <span className="text-[10.5px] font-normal text-[#71717A]">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Notes, instructions or payment references..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm font-sans text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:bg-white focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all resize-none placeholder:text-[#A1A1AA]"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="shrink-0 p-3.5 sm:px-6 sm:py-4 border-t border-[#EAEAEA] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="order-2 sm:order-1 flex justify-center sm:justify-start">
              <button
                type="button"
                onClick={onQuickConfirm}
                disabled={creatingOrderFromInv}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#71717A] hover:text-[#16281D] underline decoration-dotted transition-colors cursor-pointer bg-transparent border-0 disabled:opacity-50 py-1"
                title="Mark as paid without additional order details"
              >
                <Zap size={13} strokeWidth={2.2} />
                <span>Quick Confirm</span>
              </button>
            </div>

            <div className="order-1 sm:order-2 flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={creatingOrderFromInv}
                className="flex-1 sm:flex-none h-10 px-4 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#52525B] text-xs font-bold font-sans transition-all border border-[#EAEAEA] cursor-pointer disabled:opacity-50 flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmAndCreate}
                disabled={creatingOrderFromInv}
                className="flex-1 sm:flex-none h-10 px-5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_2px_10px_rgba(159,232,112,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
              >
                <CheckCircle2 size={14} strokeWidth={2.4} />
                <span>{creatingOrderFromInv ? "Creating Order…" : "Confirm & Create Order"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default MarkPaidModal;
