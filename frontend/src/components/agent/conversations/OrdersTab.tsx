import React from "react";
import { getToken } from "../../../lib/auth";
import { Order } from "../../../types/index";
import { Eye, Pencil, FileText, Trash2, CheckCircle } from "lucide-react";
import { useDialog } from "../shared/DialogProvider";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

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
      if (!agentPrefix) throw new Error("Missing agent prefix");
      const token = getToken();
      const deleteResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders?id=${orderId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      const deleteData = await deleteResponse.json();
      if (!deleteResponse.ok || !deleteData.success) {
        throw new Error(deleteData.message || "Failed to delete order");
      }
      onRefresh();
    } catch (err: any) {
      toast("Failed to delete order: " + err.message, 'error');
    }
  };

  const handleMarkAsPaid = async (order: Order) => {
    if (!await dlgConfirm(`Are you sure you want to mark Order #${order.id.toString().padStart(4, "0")} as fully paid?`)) return;
    try {
      if (!agentPrefix) throw new Error("Missing agent prefix");
      const token = getToken();
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: order.id,
            payment_status: "paid",
            advance_amount: Number(order.total_amount || 0),
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update order");
      }
      toast("Order marked as fully paid", 'success');
      onRefresh();
    } catch (err: any) {
      toast("Failed to update payment status: " + err.message, 'error');
    }
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    if (status === "completed") return { background: "rgba(34,197,94,0.1)", color: "#059669" };
    if (status === "pending") return { background: "rgba(217,119,6,0.1)", color: "#d97706" };
    if (status === "cancelled") return { background: "rgba(244,63,94,0.08)", color: "#f43f5e" };
    return { background: "#f4f4f5", color: "#71717a" };
  };

  const getPaymentStatusStyle = (paymentStatus: string): React.CSSProperties => {
    const s = paymentStatus?.toLowerCase() || 'unpaid';
    if (s === 'paid') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
    if (s === 'partially_paid') return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
    if (s === 'unpaid') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
    return { background: '#f4f4f5', color: '#71717a' };
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "48px 0" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid rgba(34,197,94,0.2)",
            borderTopColor: "#22c55e",
            animation: "com-spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <>
      {orders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            ...DM,
            fontSize: 14,
            color: "#71717a",
          }}
        >
          No orders found for this customer.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map((order) => (
            <div
              key={order.id}
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
                  Order #{order.id.toString().padStart(4, "0")}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span
                    style={{
                      ...DM,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 9px",
                      borderRadius: 9999,
                      ...getStatusStyle(order.status),
                    }}
                  >
                    {order.status}
                  </span>
                  <span
                    style={{
                      ...DM,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 9px",
                      borderRadius: 9999,
                      ...getPaymentStatusStyle(order.payment_status || "unpaid"),
                    }}
                  >
                    {order.payment_status === 'partially_paid' ? 'Partially Paid' : order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>

              <p style={{ ...DM, fontSize: 13, color: "#3f3f46", marginBottom: 4 }}>
                Total:{" "}
                <span style={{ fontWeight: 600, color: "#0c1a0e" }}>
                  LKR {Number(order.total_amount)?.toFixed(2) || "0.00"}
                </span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
                <span style={{ ...DM, fontSize: 11, color: "#71717a" }}>
                  Advance: <strong>LKR {Number(order.advance_amount || 0).toFixed(2)}</strong>
                </span>
                <span style={{ ...DM, fontSize: 11, color: "#71717a" }}>
                  Bal: <strong>LKR {Math.max(0, Number(order.total_amount || 0) - Number(order.advance_amount || 0)).toFixed(2)}</strong>
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
                <span style={{ ...DM, fontSize: 12, color: "#a1a1aa" }}>
                  Placed on: {new Date(order.created_at).toLocaleDateString()}
                </span>
                {order.estimated_delivery_date && (
                  <span style={{ ...DM, fontSize: 12, color: "#059669", fontWeight: 500 }}>
                    Est. Delivery: {new Date(order.estimated_delivery_date).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  paddingTop: 12,
                  borderTop: "1px solid #f4f4f5",
                }}
              >
                <button
                  onClick={() => onViewOrder(order)}
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
                  onClick={() => onEditOrder(order)}
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
                  <Pencil size={13} />
                  Edit
                </button>

                {order.payment_status !== 'paid' && (
                  <button
                    onClick={() => handleMarkAsPaid(order)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      background: "rgba(22,163,74,0.08)",
                      color: "#16a34a",
                      border: "1px solid rgba(22,163,74,0.15)",
                      borderRadius: 8,
                      cursor: "pointer",
                      ...DM,
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(22,163,74,0.14)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(22,163,74,0.08)")}
                  >
                    <CheckCircle size={13} />
                    Paid Fully
                  </button>
                )}

                <button
                  onClick={() =>
                    onGenerateInvoice(
                      order.id,
                      `Invoice for Order #${order.id.toString().padStart(4, "0")}`
                    )
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    background: "rgba(217,119,6,0.08)",
                    color: "#d97706",
                    border: "1px solid rgba(217,119,6,0.15)",
                    borderRadius: 8,
                    cursor: "pointer",
                    ...DM,
                    fontSize: 12,
                    fontWeight: 600,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(217,119,6,0.14)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(217,119,6,0.08)")}
                >
                  <FileText size={13} />
                  Generate Invoice
                </button>

                <button
                  onClick={() => handleDelete(order.id)}
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

export default OrdersTab;
