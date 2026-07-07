import React, { useState, useEffect } from 'react';
import { getToken } from "../../../lib/auth";
import { Order, OrderItem } from '../../../types/index';
import { X, MessageCircle, Package, User } from 'lucide-react';
import { useDialog } from '../shared/DialogProvider';
import { SkeletonBase } from '../shared/Skeleton';
import Portal from '../shared/Portal';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const getPaymentStatusStyle = (paymentStatus: string): React.CSSProperties => {
  const s = paymentStatus?.toLowerCase();
  if (s === 'paid') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'partially_paid') return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
  if (s === 'unpaid') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

const getStatusStyle = (status: string): React.CSSProperties => {
  const s = status?.toLowerCase();
  if (s === 'completed') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'pending') return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  if (s === 'cancelled') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

const capitalizeFirst = (str: string): string => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

interface ViewOrderModalProps {
  order: Order | null;
  onClose: () => void;
  onSuccess?: () => void;
  agentPrefix: string | null;
  agentId: number | null;
}

const orderDetailsCache: Record<number, Order> = {};

const ViewOrderModal: React.FC<ViewOrderModalProps> = ({
  order,
  onClose,
  onSuccess,
  agentPrefix,
  agentId
}) => {
  const { toast } = useDialog();
  const [fullOrderDetails, setFullOrderDetails] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const handleMarkAsPaid = async () => {
    if (!fullOrderDetails || !fullOrderDetails.id) return;
    try {
      setUpdatingPayment(true);
      const token = getToken();
      if (!token) {
        toast('User not authenticated', 'error');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: fullOrderDetails.id,
            payment_status: 'paid',
            advance_amount: fullOrderDetails.total_amount,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update payment status');
      }

      toast('Order marked as fully paid', 'success');
      
      const updatedOrder = {
        ...fullOrderDetails,
        payment_status: 'paid' as const,
        advance_amount: fullOrderDetails.total_amount,
      };
      orderDetailsCache[fullOrderDetails.id] = updatedOrder;
      setFullOrderDetails(updatedOrder);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      toast('Error: ' + err.message, 'error');
    } finally {
      setUpdatingPayment(false);
    }
  };

  useEffect(() => {
    if (order && order.id && agentPrefix && agentId) {
      fetchFullOrderDetails();
    }
  }, [order, agentPrefix, agentId]);

  const fetchFullOrderDetails = async () => {
    if (!order || !order.id || !agentPrefix || !agentId) return;

    if (orderDetailsCache[order.id]) {
      setFullOrderDetails(orderDetailsCache[order.id]);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let orderItems: OrderItem[] = order.parsed_order_details?.items || [];
      if (orderItems.length === 0 && order.id) {
        const token = getToken();
        if (!token) {
          setError('User not authenticated');
          return;
        }

        const itemsResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=items&order_id=${order.id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (itemsResponse.ok) {
          const itemsDataResult = await itemsResponse.json();
          if (itemsDataResult.success) {
            orderItems = (itemsDataResult.items || []).map(
              (item: any) =>
                ({
                  name: item.name,
                  quantity: parseFloat(item.quantity) || 0,
                  price: parseFloat(item.price) || 0,
                  total:
                    (parseFloat(item.quantity) || 0) *
                    (parseFloat(item.price) || 0),
                } as OrderItem)
            );
          }
        }
      }

      const fullDetails: Order = {
        ...order,
        customer_name: order.customer_name || 'Unknown Customer',
        customer_phone: order.customer_phone || '',
        parsed_order_details: {
          ...order.parsed_order_details,
          items: orderItems,
        },
      };

      orderDetailsCache[order.id] = fullDetails;
      setFullOrderDetails(fullDetails);
    } catch (err) {
      setError('Failed to load order details');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppMessage = () => {
    if (!fullOrderDetails || !fullOrderDetails.customer_phone) {
      toast('Customer phone number not available', 'error');
      return;
    }

    const phoneNumber = fullOrderDetails.customer_phone.replace(/\D/g, '');
    const message = `Order #${fullOrderDetails.id.toString().padStart(4, '0')} Update

Customer: ${fullOrderDetails.customer_name}
Status: ${fullOrderDetails.status}

Items:
${fullOrderDetails.parsed_order_details?.items?.map((item: OrderItem) =>
  `${item.name} - Qty: ${item.quantity} x LKR ${item.price.toFixed(2)} = LKR ${item.total.toFixed(2)}`
).join('\n') || 'No items'}

Total: LKR ${fullOrderDetails.total_amount?.toFixed(2) || '0.00'}

${fullOrderDetails.notes ? `Notes: ${fullOrderDetails.notes}` : ''}

Thank you!`;

    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 60,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 20,
    border: '1px solid #ebebeb',
    boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  if (loading && !fullOrderDetails) {
    return (
      <Portal>
        <div style={overlayStyle}>
        <div
          style={{
            ...cardStyle,
            maxWidth: 900,
            maxHeight: '95vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ flexShrink: 0, padding: '18px 24px 14px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <SkeletonBase style={{ width: 36, height: 36, borderRadius: 10 }} />
              <div>
                <SkeletonBase style={{ width: 120, height: 16, borderRadius: 4, marginBottom: 6 }} />
                <SkeletonBase style={{ width: 70, height: 12, borderRadius: 9999 }} />
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} style={{ color: '#71717a' }} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
              {/* Left column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Customer info */}
                <div style={{ background: 'rgba(34,197,94,0.02)', border: '1px solid #ebebeb', borderRadius: 12, padding: '12px 14px' }}>
                  <SkeletonBase style={{ width: 80, height: 12, borderRadius: 4, marginBottom: 12 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <SkeletonBase style={{ width: '90%', height: 11, borderRadius: 3 }} />
                    <SkeletonBase style={{ width: '80%', height: 11, borderRadius: 3 }} />
                    <SkeletonBase style={{ width: '70%', height: 11, borderRadius: 3 }} />
                  </div>
                </div>
                {/* Actions */}
                <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, padding: '12px 14px' }}>
                  <SkeletonBase style={{ width: 60, height: 12, borderRadius: 4, marginBottom: 12 }} />
                  <SkeletonBase style={{ width: '100%', height: 32, borderRadius: 8 }} />
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <SkeletonBase style={{ width: 60, height: 16, borderRadius: 4 }} />
                      <SkeletonBase style={{ width: 40, height: 10, borderRadius: 3 }} />
                    </div>
                  ))}
                </div>

                {/* Items table */}
                <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #f4f4f5', background: '#fafafa' }}>
                    <SkeletonBase style={{ width: 140, height: 14, borderRadius: 4 }} />
                  </div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <SkeletonBase style={{ width: '40%', height: 12, borderRadius: 3 }} />
                      <SkeletonBase style={{ width: '20%', height: 12, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <SkeletonBase style={{ width: '50%', height: 12, borderRadius: 3 }} />
                      <SkeletonBase style={{ width: '15%', height: 12, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f4f4f5', paddingTop: 12 }}>
                      <SkeletonBase style={{ width: '30%', height: 14, borderRadius: 4 }} />
                      <SkeletonBase style={{ width: '25%', height: 14, borderRadius: 4 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #ebebeb', display: 'flex', justifyContent: 'flex-end' }}>
            <SkeletonBase style={{ width: 80, height: 34, borderRadius: 10 }} />
          </div>
        </div>
        </div>
      </Portal>
    );
  }

  if (error || !fullOrderDetails || !fullOrderDetails.id || typeof fullOrderDetails.id !== 'number' || fullOrderDetails.id <= 0) {
    return (
      <Portal>
        <div style={overlayStyle}>
        <div style={{ ...cardStyle, maxWidth: 360, padding: 32, alignItems: 'center', gap: 16 }}>
          <p style={{ ...DM, fontSize: 14, color: '#f43f5e', textAlign: 'center' }}>{error || 'Order not found or invalid'}</p>
          <button onClick={onClose} style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 10, ...DM, fontSize: 13, fontWeight: 600, color: '#3f3f46', cursor: 'pointer' }}>
            Close
          </button>
        </div>
        </div>
      </Portal>
    );
  }

  const itemCount = fullOrderDetails.parsed_order_details?.items?.length || 0;
  const totalQty = fullOrderDetails.parsed_order_details?.items?.reduce((sum: number, item: OrderItem) => sum + (item.quantity || 0), 0) || 0;

  return (
    <Portal>
      <div style={overlayStyle}>
      <style>{`@keyframes vom-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ ...cardStyle, maxWidth: 900, maxHeight: '95vh' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '18px 24px 14px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, background: 'rgba(34,197,94,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} style={{ color: '#059669' }} />
            </div>
            <div>
              <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e', display: 'block' }}>
                Order #{fullOrderDetails.id.toString().padStart(4, '0')}
              </span>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <span style={{ ...DM, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, ...getStatusStyle(fullOrderDetails.status) }}>
                  {fullOrderDetails.status}
                </span>
                <span style={{ ...DM, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, ...getPaymentStatusStyle(fullOrderDetails.payment_status || 'unpaid') }}>
                  {fullOrderDetails.payment_status === 'partially_paid' ? 'Partially Paid' : fullOrderDetails.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} style={{ color: '#71717a' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>

            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Customer info */}
              <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <User size={13} style={{ color: '#059669' }} />
                  <span style={{ ...DM, fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Name</span>
                    <span style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#0c1a0e' }}>{fullOrderDetails.customer_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Phone</span>
                    <span style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#0c1a0e' }}>{fullOrderDetails.customer_phone || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Date</span>
                    <span style={{ ...DM, fontSize: 11, color: '#0c1a0e' }}>
                      {new Date(fullOrderDetails.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {fullOrderDetails.estimated_delivery_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Est. Delivery</span>
                      <span style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#059669' }}>
                        {new Date(fullOrderDetails.estimated_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, padding: '12px 14px' }}>
                <span style={{ ...DM, fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Actions</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={sendWhatsAppMessage}
                    disabled={!fullOrderDetails.customer_phone}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', background: (!fullOrderDetails.customer_phone) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 8, cursor: (!fullOrderDetails.customer_phone) ? 'not-allowed' : 'pointer', ...DM, fontSize: 12, fontWeight: 600, boxShadow: (!fullOrderDetails.customer_phone) ? 'none' : '0 3px 10px rgba(34,197,94,0.3)' }}
                  >
                    <MessageCircle size={14} />
                    WhatsApp Update
                  </button>
                  {fullOrderDetails.payment_status !== 'paid' && (
                    <button
                      onClick={handleMarkAsPaid}
                      disabled={updatingPayment}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', ...DM, fontSize: 12, fontWeight: 600, boxShadow: '0 3px 10px rgba(2,132,199,0.3)' }}
                    >
                      {updatingPayment ? 'Updating…' : 'Mark as Fully Paid'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[
                  { label: 'Total Amount', value: `LKR ${Number(fullOrderDetails.total_amount || 0).toLocaleString()}` },
                  { label: fullOrderDetails.payment_status === 'unpaid' ? 'Advance Amount' : 'Advance Paid', value: `LKR ${Number(fullOrderDetails.advance_amount || 0).toLocaleString()}` },
                  { label: 'Balance Due', value: `LKR ${Math.max(0, Number(fullOrderDetails.total_amount || 0) - Number(fullOrderDetails.advance_amount || 0)).toLocaleString()}` },
                  { label: 'Items', value: itemCount },
                  { label: 'Total Qty', value: totalQty },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
                    <div style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.value.toString()}>{stat.value}</div>
                    <div style={{ ...DM, fontSize: 9, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Items table */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f4f4f5', background: '#fafafa' }}>
                  <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>Order Items ({itemCount})</span>
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {itemCount === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', ...DM, fontSize: 13, color: '#a1a1aa' }}>No items in this order.</div>
                  ) : (
                    <>
                      {fullOrderDetails.parsed_order_details?.items?.map((item: OrderItem, index: number) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f9f9f9', transition: 'background 0.1s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div>
                            <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', marginBottom: 2 }}>{item.name}</div>
                            <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>Qty: {item.quantity} × LKR {item.price.toFixed(2)}</div>
                          </div>
                          <div style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>LKR {(item.quantity * item.price).toLocaleString()}</div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(34,197,94,0.05)', borderTop: '1px solid rgba(34,197,94,0.1)' }}>
                        <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>Total</span>
                        <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#059669' }}>LKR {(fullOrderDetails.total_amount || 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes / Shipping */}
              {(fullOrderDetails.notes || fullOrderDetails.parsed_order_details?.shipping_address) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {fullOrderDetails.notes && (
                    <div style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ ...DM, fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Notes</div>
                      <p style={{ ...DM, fontSize: 12, color: '#3f3f46', margin: 0 }}>{fullOrderDetails.notes}</p>
                    </div>
                  )}
                  {fullOrderDetails.parsed_order_details?.shipping_address && (
                    <div style={{ background: 'rgba(8,145,178,0.05)', border: '1px solid rgba(8,145,178,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ ...DM, fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Shipping</div>
                      <p style={{ ...DM, fontSize: 12, color: '#3f3f46', margin: 0 }}>{fullOrderDetails.parsed_order_details.shipping_address}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #ebebeb', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 10, ...DM, fontSize: 13, fontWeight: 600, color: '#3f3f46', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
};

export default ViewOrderModal;
