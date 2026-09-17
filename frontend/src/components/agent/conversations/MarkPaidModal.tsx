import React from "react";
import { X, CheckCircle2 } from "lucide-react";
import Portal from "../shared/Portal";
import { DatePicker } from "../shared/DatePicker";

export interface Invoice {
  id: number;
  order_id?: number | null;
  customer_id?: number;
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
      <div className="fixed inset-0 z-[110] bg-[#16281D]/65 flex items-center justify-center p-4 animate-modal-backdrop font-sans">
        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-modal-card">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#16281D] text-[#9FE870] flex items-center justify-center">
              <CheckCircle2 size={16} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-[#16281D]">
                Mark Paid & Create Order
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={creatingOrderFromInv}
            className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717A] hover:text-[#16281D] transition-colors border-0 cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl space-y-1.5">
            <div className="flex justify-between items-center text-xs text-[#71717A]">
              <span>Invoice:</span>
              <span className="font-sans font-bold text-[#16281D] truncate max-w-[220px]">
                #{payingInvoice.id.toString().padStart(4, "0")} — {payingInvoice.name}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-[#71717A]">
              <span>Invoice Total:</span>
              <span className="font-mono text-sm font-bold text-[#15803D]">
                LKR {invoiceTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
              Confirmed Paid / Advance Amount (LKR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={orderPaidAmount}
              onChange={(e) => setOrderPaidAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-sm font-mono text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all"
            />
            <span className="block font-sans text-[11px] text-[#71717A] mt-1">
              {orderPaidAmount >= invoiceTotal
                ? "Full payment received (Payment status: Paid)"
                : orderPaidAmount > 0
                ? "Partial deposit received (Payment status: Partially Paid)"
                : "Unpaid order"}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
              Shipping / Delivery Address <span className="text-[10px] font-medium text-[#71717A]">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="Enter customer shipping address..."
              value={orderShippingAddress}
              onChange={(e) => setOrderShippingAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-sans text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all placeholder:text-[#A1A1AA]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
              Estimated Delivery Date <span className="text-[10px] font-medium text-[#71717A]">(Optional)</span>
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
            <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
              Order Notes <span className="text-[10px] font-medium text-[#71717A]">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Notes, delivery instructions or terms..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-sans text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all resize-none placeholder:text-[#A1A1AA]"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-4 border-t border-[#EAEAEA] bg-white flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onQuickConfirm}
            disabled={creatingOrderFromInv}
            className="font-sans text-xs font-semibold text-[#71717A] hover:text-[#16281D] underline cursor-pointer bg-transparent border-0 disabled:opacity-50"
          >
            Quick Confirm
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creatingOrderFromInv}
              className="h-10 px-4 rounded-full bg-white border border-[#E4E4E7] hover:bg-[#F4F7F4] active:scale-[0.98] text-[#52525B] text-xs font-bold font-sans transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmAndCreate}
              disabled={creatingOrderFromInv}
              className="h-10 px-5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_14px_rgba(159,232,112,0.35)] active:scale-[0.98] transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer border-0"
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
