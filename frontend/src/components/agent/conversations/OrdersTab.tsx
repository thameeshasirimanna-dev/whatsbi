import React from "react";
import { getToken } from "../../../lib/auth";
import { Order } from "../../../types/index";
import { Eye, Pencil, FileText, Trash2, CheckCircle, ShoppingBag } from "lucide-react";
import { useDialog } from "../shared/DialogProvider";
import { deleteOrder } from "../../../lib/api";

interface OrdersTabProps {
  orders: Order[];
  customerId: number | null;
  loading: boolean;
  agentPrefix: string | null;
  agentId: number | null;
  customerName: string;
  customerPhone: string | null;
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onGenerateInvoice: (orderId: number, defaultName: string) => void;
  onDeleteOrder: (orderId: number) => void;
  onRefresh: () => void;
}

const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  customerId,
  loading,
  agentPrefix,
  agentId,
  customerName,
  customerPhone,
  onViewOrder,
  onEditOrder,
  onGenerateInvoice,
  onDeleteOrder,
  onRefresh,
}) => {
  const { toast, confirm: dlgConfirm } = useDialog();

  const handleDelete = async (orderId: number) => {
    if (!await dlgConfirm(`Are you sure you want to delete Order #${orderId}? This action cannot be undone.`, { danger: true })) return;
    try {
      await deleteOrder(orderId);
      toast("Order deleted successfully", "success");
      onDeleteOrder(orderId);
    } catch (err: any) {
      toast(err.message || "Failed to delete order", "error");
    }
  };

  const handleMarkAsPaid = async (order: Order) => {
    if (!await dlgConfirm(`Mark Order #${order.id} as fully paid?`, { title: "Confirm Payment" })) return;
    try {
      const token = getToken();
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/orders/${order.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_status: "paid",
          advance_amount: order.total_amount
        })
      });
      if (!res.ok) throw new Error("Failed to update order payment status");
      toast("Order marked as fully paid", "success");
      onRefresh();
    } catch (err: any) {
      toast(err.message || "Failed to update payment status", "error");
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'delivered') return "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
    if (s === 'processing' || s === 'in_production') return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
    if (s === 'shipped') return "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]";
    if (s === 'cancelled') return "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]";
    return "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]";
  };

  const getPaymentBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'paid') return "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
    if (s === 'partially_paid') return "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]";
    if (s === 'unpaid') return "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]";
    return "bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-[#16281D]/20 border-t-[#16281D] animate-spin" />
      </div>
    );
  }

  return (
    <>
      {orders.length === 0 ? (
        <div className="text-center py-14 px-4 bg-white rounded-2xl border border-dashed border-[#EAEAEA] flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#F4F7F4] flex items-center justify-center text-[#71717A] mb-3">
            <ShoppingBag size={20} />
          </div>
          <p className="font-sans text-sm font-bold text-[#16281D] mb-1">No orders found</p>
          <p className="font-sans text-xs text-[#71717A]">No orders placed for this customer yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {orders.map((order) => {
            const totalAmount = Number(order.total_amount || 0);
            const advanceAmount = Number(order.advance_amount || 0);
            const balanceAmount = Math.max(0, totalAmount - advanceAmount);

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#EAEAEA] p-5 shadow-xs hover:border-[#16281D]/20 transition-all flex flex-col gap-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-sans text-sm font-bold text-[#16281D] block">
                      Order #{order.id.toString().padStart(4, "0")}
                    </span>
                    <span className="font-mono text-xs text-[#71717A] mt-0.5 block">
                      Placed on {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <span className={`text-[11px] font-semibold font-sans px-2.5 py-0.5 rounded-full border ${getStatusBadge(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace("_", " ")}
                    </span>
                    <span className={`text-[11px] font-semibold font-sans px-2.5 py-0.5 rounded-full border ${getPaymentBadge(order.payment_status || "unpaid")}`}>
                      {order.payment_status === 'partially_paid' ? 'Partially Paid' : order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>

                {/* Telemetry Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2.5 px-3.5 bg-[#F4F7F4] rounded-xl border border-[#EAEAEA]/80">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-sans text-xs text-[#71717A] font-medium">Total:</span>
                    <span className="font-mono text-sm font-bold text-[#16281D]">
                      Rs. {totalAmount.toFixed(2)}
                    </span>
                    {advanceAmount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                        Adv: Rs. {advanceAmount.toFixed(2)}
                      </span>
                    )}
                    {balanceAmount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
                        Bal: Rs. {balanceAmount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {order.estimated_delivery_date && (
                    <div className="font-sans text-[11px] text-[#71717A] flex items-center gap-1">
                      <span>Est. Delivery:</span>
                      <span className="font-mono font-semibold text-[#15803D]">{new Date(order.estimated_delivery_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons following Style Guide Section 6 */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#F4F7F4]">
                  <button
                    onClick={() => onViewOrder(order)}
                    className="h-8 px-3 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border-0"
                  >
                    <Eye size={13} strokeWidth={2.2} />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => onEditOrder(order)}
                    className="h-8 px-3 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border-0"
                  >
                    <Pencil size={13} strokeWidth={2.2} />
                    <span>Edit</span>
                  </button>

                  {order.payment_status !== 'paid' && (
                    <button
                      onClick={() => handleMarkAsPaid(order)}
                      className="h-8 px-3 rounded-full bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <CheckCircle size={13} strokeWidth={2.2} />
                      <span>Paid Fully</span>
                    </button>
                  )}

                  <button
                    onClick={() =>
                      onGenerateInvoice(
                        order.id,
                        `Invoice for Order #${order.id.toString().padStart(4, "0")}`
                      )
                    }
                    className="h-8 px-3.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_2px_8px_rgba(159,232,112,0.25)] flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border-0"
                  >
                    <FileText size={13} strokeWidth={2.2} />
                    <span>Generate Invoice</span>
                  </button>

                  <button
                    onClick={() => handleDelete(order.id)}
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

export default OrdersTab;

