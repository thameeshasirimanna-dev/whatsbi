import React, { useState, useEffect } from 'react';
import { getToken } from "../../../lib/auth";
import { Order, OrderItem } from '../../../types/index';
import { X, MessageCircle, Package, User } from 'lucide-react';
import { useDialog } from '../shared/DialogProvider';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const getStatusStyle = (status: string): React.CSSProperties => {
  const s = status.toLowerCase();
  if (s === 'pending') return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  if (s === 'processing') return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
  if (s === 'shipped') return { background: 'rgba(147,51,234,0.08)', color: '#9333ea' };
  if (s === 'delivered' || s === 'completed') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'cancelled') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

interface ViewOrderModalProps {
  order: Order | null;
  onClose: () => void;
  agentPrefix: string | null;
  agentId: number | null;
}

const ViewOrderModal: React.FC<ViewOrderModalProps> = ({
  order,
  onClose,
  agentPrefix,
  agentId
}) => {
  const { toast } = useDialog();
  const [fullOrderDetails, setFullOrderDetails] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order && order.id && agentPrefix && agentId) {
      fetchFullOrderDetails();
    }
  }, [order, agentPrefix, agentId]);

  const fetchFullOrderDetails = async () => {
    if (!order || !order.id || !agentPrefix || !agentId) return;

    try {
      setLoading(true);
      setError(null);

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

  if (loading) {
    return (
      <div style={overlayStyle}>
        <style>{`@keyframes vom-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ ...cardStyle, maxWidth: 400, padding: 48, alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(34,197,94,0.2)', borderTopColor: '#22c55e', animation: 'vom-spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (error || !fullOrderDetails || !fullOrderDetails.id || typeof fullOrderDetails.id !== 'number' || fullOrderDetails.id <= 0) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...cardStyle, maxWidth: 360, padding: 32, alignItems: 'center', gap: 16 }}>
          <p style={{ ...DM, fontSize: 14, color: '#f43f5e', textAlign: 'center' }}>{error || 'Order not found or invalid'}</p>
          <button onClick={onClose} style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 10, ...DM, fontSize: 13, fontWeight: 600, color: '#3f3f46', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const itemCount = fullOrderDetails.parsed_order_details?.items?.length || 0;
  const totalQty = fullOrderDetails.parsed_order_details?.items?.reduce((sum: number, item: OrderItem) => sum + (item.quantity || 0), 0) || 0;

  return (
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
              <span style={{ ...DM, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, ...getStatusStyle(fullOrderDetails.status) }}>
                {fullOrderDetails.status}
              </span>
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
                </div>
              </div>

              {/* Actions */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, padding: '12px 14px' }}>
                <span style={{ ...DM, fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Actions</span>
                <button
                  onClick={sendWhatsAppMessage}
                  disabled={!fullOrderDetails.customer_phone}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', background: (!fullOrderDetails.customer_phone) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 8, cursor: (!fullOrderDetails.customer_phone) ? 'not-allowed' : 'pointer', ...DM, fontSize: 12, fontWeight: 600, boxShadow: (!fullOrderDetails.customer_phone) ? 'none' : '0 3px 10px rgba(34,197,94,0.3)' }}
                >
                  <MessageCircle size={14} />
                  WhatsApp Update
                </button>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { label: 'Total Amount', value: `LKR ${(fullOrderDetails.total_amount || 0).toLocaleString()}` },
                  { label: 'Items', value: itemCount },
                  { label: 'Total Qty', value: totalQty },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e', marginBottom: 3 }}>{stat.value}</div>
                    <div style={{ ...DM, fontSize: 10, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
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
  );
};

export default ViewOrderModal;
