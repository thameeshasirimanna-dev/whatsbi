import React, { useState, useEffect } from 'react';
import { getToken } from "../../../lib/auth";
import { X, Plus, Trash2 } from 'lucide-react';
import Portal from "../shared/Portal";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: '#3f3f46',
  background: '#f9f9f9',
  border: '1px solid #ebebeb',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  category?: string;
  sku?: string;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
}

interface CreateOrderModalProps {
  customer: {
    id: number;
    name: string;
    phone: string;
  };
  agentPrefix: string;
  agentId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  customer,
  agentPrefix,
  agentId,
  onClose,
  onSuccess,
}) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partially_paid' | 'paid'>('unpaid');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [businessType, setBusinessType] = useState<'service' | 'product' | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [defaultAddQuantity, setDefaultAddQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinessType = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error('Failed to fetch agent profile');
          return;
        }

        const agentProfile = await response.json();
        if (agentProfile.success && agentProfile.agent) {
          setBusinessType(agentProfile.agent.business_type as 'service' | 'product');
        }
      } catch (err) {
        console.error('Error fetching business type:', err);
      }
    };

    fetchBusinessType();
  }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      if (businessType !== 'product') return;
      try {
        const token = getToken();
        if (!token) return;
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-inventory`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setInventoryItems(data.items || []);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
        setError('Failed to load inventory items');
      }
    };

    fetchInventory();
  }, [businessType]);

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1 || businessType === 'product') {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addFromInventory = (item: InventoryItem, quantity: number = 1) => {
    setItems([...items, { name: item.name, quantity, price: item.price }]);
  };

  const filteredInventory = inventoryItems.filter(
    (item) =>
      item.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(inventorySearchTerm.toLowerCase())
  );

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.quantity * item.price, 0);
  };

  const CURRENCY_SYMBOL = 'LKR';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPrefix || !agentId) {
      setError('Agent configuration missing');
      return;
    }

    const validItems = items.filter((item) => item.name.trim() && item.price > 0 && item.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid item');
      return;
    }

    const totalAmount = calculateTotal();
    const orderNotes = notes.trim() || null;
    const orderShippingAddress = shippingAddress.trim() || null;

    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const orderItems = validItems.map((item) => ({
        name: item.name.trim(),
        quantity: Math.floor(Number(item.quantity)) || 1,
        price: Number(item.price) || 0,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: customer.id,
            notes: orderNotes,
            shipping_address: orderShippingAddress,
            items: orderItems,
            advance_amount: Number(advanceAmount) || 0,
            payment_status: paymentStatus,
            estimated_delivery_date: estimatedDeliveryDate || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to create order');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      setError(`Failed to create order: ${errorMessage}`);
      console.error('Order creation error:', {
        message: errorMessage,
        code: err.code,
        details: err.details,
        hint: err.hint,
        stack: err.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const itemRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    padding: '12px 14px',
    background: '#f9f9f9',
    borderRadius: 10,
    border: '1px solid #ebebeb',
  };

  return (
    <Portal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <span style={{ ...SYNE, fontSize: 17, fontWeight: 700, color: '#0c1a0e', display: 'block', marginBottom: 4 }}>Create Order</span>
            <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>
              For <strong style={{ color: '#3f3f46' }}>{customer.name}</strong> · {customer.phone}
            </span>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
            <X size={15} style={{ color: '#71717a' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Currency */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Currency</label>
            <div style={{ ...DM, fontSize: 13, color: '#71717a', padding: '9px 12px', background: '#f4f4f5', border: '1px solid #ebebeb', borderRadius: 8 }}>LKR</div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Items section */}
            {businessType === 'service' ? (
              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 10 }}>Order Items</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((item, index) => (
                    <div key={index} style={itemRowStyle}>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Item Name</div>
                        <input type="text" value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} placeholder="Item name" required style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                      </div>
                      <div style={{ width: 68 }}>
                        <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Qty</div>
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} required style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                      </div>
                      <div style={{ width: 90 }}>
                        <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Price (LKR)</div>
                        <input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)} placeholder="0.00" required style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                      </div>
                      <div style={{ width: 80 }}>
                        <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Total</div>
                        <input type="number" value={(item.quantity * item.price).toFixed(2)} readOnly style={{ ...inputStyle, background: '#f4f4f5', cursor: 'not-allowed', color: '#71717a' }} />
                      </div>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} style={{ width: 30, height: 30, background: 'rgba(244,63,94,0.08)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', flexShrink: 0, marginBottom: 2 }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, ...DM, fontSize: 13, fontWeight: 600, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Plus size={15} /> Add Item
                </button>
              </div>
            ) : businessType === 'product' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 8 }}>Select Products from Inventory</label>
                  <input type="text" placeholder="Search by name or SKU…" value={inventorySearchTerm} onChange={(e) => setInventorySearchTerm(e.target.value)} style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46' }}>Default Quantity:</span>
                  <input type="number" min="1" value={defaultAddQuantity} onChange={(e) => setDefaultAddQuantity(parseInt(e.target.value) || 1)} style={{ ...inputStyle, width: 72 }} onFocus={onFocusG} onBlur={onBlurG} />
                </div>
                {filteredInventory.length > 0 ? (
                  <div style={{ border: '1px solid #ebebeb', borderRadius: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {filteredInventory.map((invItem) => (
                      <div key={invItem.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #f4f4f5', transition: 'background 0.12s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(34,197,94,0.04)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          {invItem.image_urls?.[0] && (
                            <img src={invItem.image_urls[0]} alt={invItem.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invItem.name}</div>
                            <div style={{ ...DM, fontSize: 12, color: '#71717a' }}>LKR {invItem.price.toFixed(2)}</div>
                          </div>
                        </div>
                        <button type="button" onClick={() => addFromInventory(invItem, defaultAddQuantity)} style={{ flexShrink: 0, marginLeft: 10, padding: '5px 12px', background: 'rgba(34,197,94,0.1)', color: '#059669', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, cursor: 'pointer', ...DM, fontSize: 12, fontWeight: 600 }}>
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', ...DM, fontSize: 13, color: '#a1a1aa', border: '1px solid #ebebeb', borderRadius: 10 }}>
                    {inventorySearchTerm ? 'No products found' : 'No inventory items available. Add some in the Inventory page.'}
                  </div>
                )}
                {items.length > 0 && (
                  <div>
                    <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 8 }}>Added Items</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map((item, index) => (
                        <div key={index} style={itemRowStyle}>
                          <div style={{ flex: 1 }}>
                            <input type="text" value={item.name} readOnly style={{ ...inputStyle, background: '#f4f4f5', cursor: 'not-allowed', color: '#71717a' }} />
                          </div>
                          <div style={{ width: 68 }}>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                          </div>
                          <div style={{ width: 90 }}>
                            <input type="number" value={item.price} readOnly style={{ ...inputStyle, background: '#f4f4f5', cursor: 'not-allowed', color: '#71717a' }} />
                          </div>
                          <div style={{ width: 80 }}>
                            <input type="number" value={(item.quantity * item.price).toFixed(2)} readOnly style={{ ...inputStyle, background: '#f4f4f5', cursor: 'not-allowed', color: '#71717a' }} />
                          </div>
                          <button type="button" onClick={() => removeItem(index)} style={{ width: 30, height: 30, background: 'rgba(244,63,94,0.08)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', flexShrink: 0 }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(34,197,94,0.2)', borderTopColor: '#22c55e', animation: 'com-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ ...DM, fontSize: 13, color: '#a1a1aa' }}>Loading business type…</p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Order notes or special instructions…" style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocusG} onBlur={onBlurG} />
            </div>

            {/* Shipping */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Shipping Address (Optional)</label>
              <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} rows={3} placeholder="Enter shipping address…" style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocusG} onBlur={onBlurG} />
            </div>

            {/* Estimated Delivery Date */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Estimated Delivery Date (Optional)</label>
              <input
                type="date"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                style={inputStyle}
                onFocus={onFocusG}
                onBlur={onBlurG}
              />
            </div>

            {/* Advance Payment and Payment Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Advance Payment (LKR) (Optional)</label>
                <input
                  type="number"
                  min="0"
                  max={calculateTotal()}
                  step="0.01"
                  value={advanceAmount === 0 ? '' : advanceAmount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const newAdvance = isNaN(val) ? 0 : val;
                    setAdvanceAmount(newAdvance);
                    
                    if (newAdvance >= calculateTotal() && calculateTotal() > 0) {
                      setPaymentStatus('paid');
                    } else if (newAdvance === 0) {
                      setPaymentStatus('unpaid');
                    }
                  }}
                  placeholder="0.00"
                  style={inputStyle}
                  onFocus={onFocusG}
                  onBlur={onBlurG}
                />
              </div>
              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => {
                    const status = e.target.value as 'unpaid' | 'partially_paid' | 'paid';
                    setPaymentStatus(status);
                    if (status === 'paid') {
                      setAdvanceAmount(calculateTotal());
                    } else if (status === 'unpaid') {
                      setAdvanceAmount(0);
                    }
                  }}
                  style={inputStyle}
                  onFocus={onFocusG}
                  onBlur={onBlurG}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid (Fully)</option>
                </select>
              </div>
            </div>

            {/* Total and Balance Due */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#3f3f46' }}>Total Amount</span>
                <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>LKR {calculateTotal().toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(34,197,94,0.1)', paddingTop: 8 }}>
                <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#3f3f46' }}>Balance Due</span>
                <span style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#059669' }}>LKR {Math.max(0, calculateTotal() - advanceAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '12px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading || calculateTotal() === 0}
                style={{ flex: 1, background: (loading || calculateTotal() === 0) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: (loading || calculateTotal() === 0) ? 'not-allowed' : 'pointer', boxShadow: (loading || calculateTotal() === 0) ? 'none' : '0 4px 14px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loading ? 'Creating…' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Portal>
  );
};

export default CreateOrderModal;
