import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getToken, getCurrentUser } from "../../../lib/auth";
import { getCurrentAgent } from "../../../lib/agent";
import { ArrowLeft, MessageSquare, Printer, Package } from 'lucide-react';
import { useDialog } from '../shared/DialogProvider';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface OrderDetails {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  order_details: {
    items: OrderItem[];
    total_amount: number;
    notes?: string;
    shipping_address?: string;
  };
  advance_amount?: number;
  payment_status?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

const getStatusStyle = (status: string): React.CSSProperties => {
  const s = status.toLowerCase();
  if (s === 'pending') return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  if (s === 'processing') return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
  if (s === 'shipped') return { background: 'rgba(124,58,237,0.1)', color: '#7c3aed' };
  if (s === 'delivered' || s === 'completed') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'cancelled') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

const getPaymentStatusStyle = (paymentStatus: string): React.CSSProperties => {
  const s = paymentStatus?.toLowerCase() || 'unpaid';
  if (s === 'paid') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'partially_paid') return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
  if (s === 'unpaid') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

const capitalizeFirst = (str: string): string => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46',
  background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  appearance: 'none', cursor: 'pointer',
};

const infoRow = (label: string, value: string | React.ReactNode) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
    <div style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#0c1a0e' }}>{value}</div>
  </div>
);

const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useDialog();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (!id) { setError("Order ID not provided"); setLoading(false); return; }

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const user = await getCurrentUser();
        if (!user.success || !user.user) { setError("User not authenticated"); setLoading(false); return; }

        const agent = await getCurrentAgent();
        if (!agent) { setError("Agent not found"); setLoading(false); return; }

        setAgentId(parseInt(agent.id));
        setAgentPrefix(agent.agent_prefix);
        if (!agent.agent_prefix) { setError("Agent prefix not found"); setLoading(false); return; }

        const orderResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders?id=${id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        });
        if (!orderResponse.ok) { setError("Order not found"); setLoading(false); return; }
        const orderDataResult = await orderResponse.json();
        if (!orderDataResult.success || !orderDataResult.orders || orderDataResult.orders.length === 0) {
          setError("Order not found"); setLoading(false); return;
        }

        const orderData = orderDataResult.orders[0];

        const customerResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-customers?id=${orderData.customer_id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        });
        let customerData = { name: "Unknown Customer", phone: "" };
        if (customerResponse.ok) {
          const customerDataResult = await customerResponse.json();
          if (customerDataResult.success && customerDataResult.customers?.length > 0) {
            customerData = customerDataResult.customers[0];
          }
        }

        const itemsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=items&order_id=${id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        });
        let orderItems: OrderItem[] = [];
        if (itemsResponse.ok) {
          const itemsDataResult = await itemsResponse.json();
          if (itemsDataResult.success) {
            orderItems = (itemsDataResult.items || []).map((item: any) => ({
              name: item.name, quantity: item.quantity, price: item.price,
              total: item.quantity * item.price,
            } as OrderItem));
          }
        } else {
          console.warn("Failed to fetch order items");
        }

        const orderDetails: OrderDetails = {
          id: (orderData as any).id,
          customer_id: (orderData as any).customer_id,
          customer_name: customerData?.name || "Unknown Customer",
          customer_phone: customerData?.phone || "",
          order_details: {
            items: orderItems,
            total_amount: (orderData as any).total_amount || 0,
            notes: (orderData as any).notes || "",
            shipping_address: (orderData as any).shipping_address || "",
          },
          advance_amount: Number((orderData as any).advance_amount) || 0,
          payment_status: (orderData as any).payment_status || "unpaid",
          status: (orderData as any).status,
          created_at: (orderData as any).created_at,
          updated_at: (orderData as any).updated_at,
        };

        setOrder(orderDetails);
        setNewStatus(orderDetails.status);
      } catch (err) {
        setError("Failed to load order details");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  const updateOrderStatus = async () => {
    if (!id || !agentId || !agentPrefix || newStatus === order?.status) return;
    try {
      setUpdatingStatus(true);
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }

      const updateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(id), status: newStatus }),
      });
      if (!updateResponse.ok) { setError("Failed to update order status"); return; }
      const updateData = await updateResponse.json();
      if (!updateData.success) { setError("Failed to update order status"); return; }

      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      toast("Order status updated successfully", 'success');
    } catch (err) {
      setError("Failed to update order status");
      console.error("Update error:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const markAsFullyPaid = async () => {
    if (!id || !agentId || !agentPrefix || !order) return;
    try {
      setUpdatingStatus(true);
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }

      const updateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(id),
          payment_status: "paid",
          advance_amount: order.order_details.total_amount,
        }),
      });
      if (!updateResponse.ok) { setError("Failed to update payment status"); return; }
      const updateData = await updateResponse.json();
      if (!updateData.success) { setError("Failed to update payment status"); return; }

      setOrder(prev => prev ? {
        ...prev,
        payment_status: "paid",
        advance_amount: prev.order_details.total_amount,
      } : null);
      toast("Order marked as fully paid successfully", 'success');
    } catch (err) {
      setError("Failed to update payment status");
      console.error("Update payment error:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const sendWhatsAppMessage = () => {
    if (!order || !order.customer_phone) { toast('Customer phone number not available', 'error'); return; }
    const phoneNumber = order.customer_phone.replace(/\D/g, '');
    const message = `Order #${order.id.toString().padStart(4, '0')} Update\n\nCustomer: ${order.customer_name}\nStatus: ${order.status}\n\nItems:\n${order.order_details.items.map(item => `${item.name} - Qty: ${item.quantity} x LKR ${item.price.toFixed(2)} = LKR ${item.total.toFixed(2)}`).join('\n')}\n\nTotal: LKR ${order.order_details.total_amount.toFixed(2)}\n\n${order.order_details.notes ? `Notes: ${order.order_details.notes}` : ''}\n\nThank you!`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 320 }}>
        <style>{`@keyframes odp-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(34,197,94,0.15)', borderTopColor: '#22c55e', animation: 'odp-spin 0.8s linear infinite' }} />
          <span style={{ ...DM, fontSize: 13, color: '#71717a' }}>Loading order…</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e', marginBottom: 16 }}>
          {error || 'Order not found'}
        </div>
        <button onClick={() => navigate('/agent/orders')} style={{ background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 9, padding: '9px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Back to Orders
        </button>
      </div>
    );
  }

  const totalQty = order.order_details.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <style>{`@keyframes odp-spin { to { transform: rotate(360deg); } }`}</style>
      <div className="no-print" style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => navigate('/agent/orders')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 9, padding: '8px 14px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <div style={{ ...SYNE, fontSize: 22, fontWeight: 800, color: '#0c1a0e' }}>Order #{order.id.toString().padStart(4, '0')}</div>
              <div style={{ ...DM, fontSize: 12, color: '#71717a' }}>Order details and customer information</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ ...DM, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, ...getStatusStyle(order.status) }}>
              Status: {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            <span style={{ ...DM, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, ...getPaymentStatusStyle(order.payment_status || 'unpaid') }}>
              Payment: {order.payment_status === 'partially_paid' ? 'Partially Paid' : order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
            </span>
            <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 9, padding: '8px 14px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Printer size={14} /> Print Receipt
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Customer + Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Customer Info */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={13} style={{ color: '#22c55e' }} />
                </div>
                <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>Customer Information</span>
              </div>

              {/* Avatar */}
              <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f4f4f5' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#fff' }}>{order.customer_name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <div style={{ ...DM, fontSize: 14, fontWeight: 600, color: '#0c1a0e' }}>{order.customer_name}</div>
                  <div style={{ ...DM, fontSize: 12, color: '#71717a' }}>{order.customer_phone}</div>
                </div>
              </div>

              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {infoRow('Order Date', new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}
                {order.updated_at && infoRow('Last Updated', new Date(order.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))}
              </div>
            </div>

            {/* Update Status */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '16px 18px' }}>
              <div style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e', marginBottom: 14 }}>Update Status</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  style={selectStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button onClick={updateOrderStatus} disabled={updatingStatus || newStatus === order.status}
                  style={{ background: (updatingStatus || newStatus === order.status) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: (updatingStatus || newStatus === order.status) ? 'not-allowed' : 'pointer', boxShadow: (updatingStatus || newStatus === order.status) ? 'none' : '0 4px 12px rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {updatingStatus ? (
                    <><div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'odp-spin 0.7s linear infinite' }} />Updating…</>
                  ) : 'Update Status'}
                </button>
                {order.payment_status !== 'paid' && (
                  <button onClick={markAsFullyPaid} disabled={updatingStatus}
                    style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 12px rgba(2,132,199,0.25)' }}
                  >
                    Mark as Fully Paid
                  </button>
                )}
                <button onClick={sendWhatsAppMessage}
                  style={{ background: 'rgba(34,197,94,0.08)', color: '#059669', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9, padding: '10px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.12)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.08)'}
                >
                  <MessageSquare size={14} /> Send WhatsApp Update
                </button>
              </div>
            </div>
          </div>

          {/* Right: Summary + Items + Notes */}
          <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Summary Stats */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f4f4f5' }}>
                <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>Order Summary</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3" style={{ padding: '20px 24px' }}>
                {[
                  { value: `LKR ${Number(order.order_details.total_amount).toFixed(2)}`, label: 'Total Amount', color: '#22c55e' },
                  { value: `LKR ${Number(order.advance_amount || 0).toFixed(2)}`, label: 'Advance Paid', color: '#0891b2' },
                  { value: `LKR ${Math.max(0, Number(order.order_details.total_amount) - Number(order.advance_amount || 0)).toFixed(2)}`, label: 'Balance Due', color: '#ef4444' },
                  { value: order.order_details.items.length, label: 'Line Items', color: '#4f46e5' },
                  { value: totalQty, label: 'Total Qty', color: '#7c3aed' },
                ].map((stat, i) => (
                  <div key={stat.label} style={{ textAlign: 'center', padding: '4px 6px', borderRight: i < 4 ? '1px solid #f4f4f5' : 'none' }}>
                    <div style={{ ...SYNE, fontSize: 15, fontWeight: 800, color: stat.color, lineHeight: 1, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.value}</div>
                    <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Items */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f4f4f5' }}>
                <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>Order Items</span>
              </div>
              {order.order_details.items.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', ...DM, fontSize: 13, color: '#71717a' }}>No items in this order</div>
              ) : (
                <div>
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {order.order_details.items.map((item, index) => (
                      <div key={index} style={{ padding: '12px 18px', borderBottom: '1px solid #f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{item.name}</div>
                          <div style={{ ...DM, fontSize: 12, color: '#71717a' }}>Qty: {item.quantity} × LKR {item.price.toFixed(2)}</div>
                        </div>
                        <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', flexShrink: 0 }}>LKR {item.total.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #ebebeb', display: 'flex', justifyContent: 'space-between', background: 'rgba(34,197,94,0.04)' }}>
                    <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>Total</span>
                    <span style={{ ...SYNE, fontSize: 14, fontWeight: 800, color: '#059669' }}>LKR {order.order_details.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes / Shipping */}
            {(order.order_details.notes || order.order_details.shipping_address) && (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '16px 18px' }}>
                <div style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e', marginBottom: 14 }}>Additional Information</div>
                {order.order_details.notes && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Notes</div>
                    <div style={{ background: '#f9f9f9', borderRadius: 9, padding: '10px 12px', ...DM, fontSize: 13, color: '#3f3f46' }}>{order.order_details.notes}</div>
                  </div>
                )}
                {order.order_details.shipping_address && (
                  <div>
                    <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Shipping Address</div>
                    <div style={{ background: '#f9f9f9', borderRadius: 9, padding: '10px 12px', ...DM, fontSize: 13, color: '#3f3f46' }}>{order.order_details.shipping_address}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-receipt, #print-receipt * { visibility: visible; }
          #print-receipt { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 20px; font-family: Arial, sans-serif; font-size: 12pt; }
          .no-print { display: none !important; }
          @page { margin: 0.5in; size: A4; }
        }
      `}</style>

      <div id="print-receipt" className="hidden print:block">
        <div style={{ border: '1px solid #ccc', padding: 24, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>ORDER RECEIPT</h1>
            <p style={{ fontSize: 16 }}>Order #{order.id.toString().padStart(4, '0')}</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Date: {new Date(order.created_at).toLocaleDateString('en-US')}</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Customer Information</h3>
            <p><strong>Name:</strong> {order.customer_name}</p>
            <p><strong>Phone:</strong> {order.customer_phone}</p>
            {order.order_details.shipping_address && <p style={{ marginTop: 8 }}><strong>Shipping:</strong> {order.order_details.shipping_address}</p>}
          </div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Order Items</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  {['Item', 'Qty', 'Price', 'Total'].map(h => <th key={h} style={{ textAlign: h === 'Item' ? 'left' : 'right', padding: '6px 8px', border: '1px solid #ccc' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {order.order_details.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 8px', border: '1px solid #ccc' }}>{item.name}</td>
                    <td style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc' }}>LKR {item.price.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc', fontWeight: 600 }}>LKR {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc', fontWeight: 700 }}>TOTAL:</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc', fontWeight: 700 }}>LKR {order.order_details.total_amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {order.order_details.notes && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600, marginBottom: 6 }}>Notes</h3>
              <p style={{ fontStyle: 'italic', border: '1px solid #ccc', padding: 8 }}>{order.order_details.notes}</p>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #ccc' }}>
            <p style={{ fontSize: 12 }}>Status: <strong>{order.status.toUpperCase()}</strong></p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Thank you for your business!</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetailsPage;
