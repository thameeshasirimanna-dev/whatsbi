import React, { useState, useEffect } from 'react';
import { getToken } from "../../../lib/auth";
import { X, Plus, Trash2 } from 'lucide-react';
import Portal from "../shared/Portal";
import CustomDropdown from "../shared/CustomDropdown";
import { DatePicker } from "../shared/DatePicker";

const PJS: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  color: '#16281D',
  background: '#F4F7F4',
  border: '1px solid #EAEAEA',
  borderRadius: 12,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#9FE870';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(159,232,112,0.25)';
};
const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#EAEAEA';
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

  const CURRENCY_SYMBOL = 'Rs.';

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
    background: '#F4F7F4',
    borderRadius: 14,
    border: '1px solid #EAEAEA',
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] bg-[#16281D]/65 flex items-center justify-center p-4 animate-modal-backdrop">
        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_24px_64px_rgba(22,40,29,0.18)] w-full max-w-[680px] max-h-[92vh] flex flex-col overflow-hidden animate-modal-card">

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #EAEAEA', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <span style={{ ...PJS, fontSize: 17, fontWeight: 700, color: '#16281D', display: 'block', marginBottom: 4 }}>Create Order</span>
            <span style={{ ...PJS, fontSize: 12, color: '#71717A' }}>
              For <strong style={{ color: '#16281D' }}>{customer.name}</strong> · {customer.phone}
            </span>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#F4F7F4', border: '1px solid #EAEAEA', borderRadius: 9999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
            <X size={15} style={{ color: '#71717A' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Currency */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Currency</label>
            <div style={{ ...MONO, fontSize: 13, color: '#16281D', padding: '9px 12px', background: '#F4F7F4', border: '1px solid #EAEAEA', borderRadius: 12 }}>Rs.</div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 12, ...PJS, fontSize: 13, color: '#EF4444', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Items section */}
            {businessType === 'service' ? (
              <div>
                <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 10 }}>Order Items</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((item, index) => (
                    <div key={index} className="p-3 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] flex flex-col sm:flex-row sm:items-end gap-2.5">
                      <div className="w-full sm:flex-1">
                        <div style={{ ...PJS, fontSize: 11, color: '#71717A', marginBottom: 4 }}>Item Name</div>
                        <input type="text" value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} placeholder="Item name" required style={{ ...inputStyle, background: '#FFFFFF' }} onFocus={onFocusG} onBlur={onBlurG} />
                      </div>
                      <div className="flex items-end gap-2 w-full sm:w-auto">
                        <div className="flex-1 sm:w-[68px]">
                          <div style={{ ...PJS, fontSize: 11, color: '#71717A', marginBottom: 4 }}>Qty</div>
                          <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} required style={{ ...inputStyle, background: '#FFFFFF', textAlign: 'center', ...MONO }} onFocus={onFocusG} onBlur={onBlurG} />
                        </div>
                        <div className="flex-1 sm:w-[90px]">
                          <div style={{ ...PJS, fontSize: 11, color: '#71717A', marginBottom: 4 }}>Price (Rs.)</div>
                          <input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)} placeholder="0.00" required style={{ ...inputStyle, background: '#FFFFFF', textAlign: 'right', ...MONO }} onFocus={onFocusG} onBlur={onBlurG} />
                        </div>
                        <div className="flex-1 sm:w-[88px]">
                          <div style={{ ...PJS, fontSize: 11, color: '#71717A', marginBottom: 4 }}>Total</div>
                          <input type="number" value={(item.quantity * item.price).toFixed(2)} readOnly style={{ ...inputStyle, background: '#EAEAEA', cursor: 'not-allowed', color: '#16281D', textAlign: 'right', ...MONO }} />
                        </div>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="w-8 h-8 rounded-full bg-[#FEE2E2] hover:bg-[#FECACA] flex items-center justify-center text-[#EF4444] shrink-0 border-0 cursor-pointer mb-1">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: 'rgba(159,232,112,0.2)', border: '1px solid #9FE870', borderRadius: 9999, ...PJS, fontSize: 12, fontWeight: 700, color: '#16281D', cursor: 'pointer' }}>
                  <Plus size={14} /> Add Item
                </button>
              </div>
            ) : businessType === 'product' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 8 }}>Select Products from Inventory</label>
                  <input type="text" placeholder="Search by name or SKU…" value={inventorySearchTerm} onChange={(e) => setInventorySearchTerm(e.target.value)} style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D' }}>Default Quantity:</span>
                  <input type="number" min="1" value={defaultAddQuantity} onChange={(e) => setDefaultAddQuantity(parseInt(e.target.value) || 1)} style={{ ...inputStyle, width: 72, background: '#FFFFFF', ...MONO }} onFocus={onFocusG} onBlur={onBlurG} />
                </div>
                {filteredInventory.length > 0 ? (
                  <div style={{ border: '1px solid #EAEAEA', borderRadius: 14, maxHeight: 200, overflowY: 'auto' }}>
                    {filteredInventory.map((invItem) => (
                      <div key={invItem.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #EAEAEA', transition: 'background 0.12s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F4F7F4')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          {invItem.image_urls?.[0] && (
                            <img src={invItem.image_urls[0]} alt={invItem.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ ...PJS, fontSize: 13, fontWeight: 600, color: '#16281D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invItem.name}</div>
                            <div style={{ ...MONO, fontSize: 12, color: '#71717A' }}>Rs. {invItem.price.toFixed(2)}</div>
                          </div>
                        </div>
                        <button type="button" onClick={() => addFromInventory(invItem, defaultAddQuantity)} style={{ flexShrink: 0, marginLeft: 10, padding: '5px 14px', background: 'rgba(159,232,112,0.2)', color: '#16281D', border: '1px solid #9FE870', borderRadius: 9999, cursor: 'pointer', ...PJS, fontSize: 12, fontWeight: 700 }}>
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', ...PJS, fontSize: 13, color: '#71717A', border: '1px solid #EAEAEA', borderRadius: 14 }}>
                    {inventorySearchTerm ? 'No products found' : 'No inventory items available. Add some in the Inventory page.'}
                  </div>
                )}
                {items.length > 0 && (
                  <div>
                    <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 8 }}>Added Items</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map((item, index) => (
                        <div key={index} className="p-3 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] flex flex-col sm:flex-row sm:items-center gap-2.5">
                          <div className="w-full sm:flex-1">
                            <input type="text" value={item.name} readOnly style={{ ...inputStyle, background: '#EAEAEA', cursor: 'not-allowed', color: '#16281D' }} />
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="flex-1 sm:w-[68px]">
                              <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} style={{ ...inputStyle, background: '#FFFFFF', textAlign: 'center', ...MONO }} onFocus={onFocusG} onBlur={onBlurG} />
                            </div>
                            <div className="flex-1 sm:w-[90px]">
                              <input type="number" value={item.price} readOnly style={{ ...inputStyle, background: '#EAEAEA', cursor: 'not-allowed', color: '#16281D', textAlign: 'right', ...MONO }} />
                            </div>
                            <div className="flex-1 sm:w-[88px]">
                              <input type="number" value={(item.quantity * item.price).toFixed(2)} readOnly style={{ ...inputStyle, background: '#EAEAEA', cursor: 'not-allowed', color: '#16281D', textAlign: 'right', ...MONO }} />
                            </div>
                            <button type="button" onClick={() => removeItem(index)} className="w-8 h-8 rounded-full bg-[#FEE2E2] hover:bg-[#FECACA] flex items-center justify-center text-[#EF4444] shrink-0 border-0 cursor-pointer">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(159,232,112,0.3)', borderTopColor: '#9FE870', animation: 'com-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ ...PJS, fontSize: 13, color: '#71717A' }}>Loading business type…</p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Order notes or special instructions…" style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocusG} onBlur={onBlurG} />
            </div>

            {/* Shipping */}
            <div>
              <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Shipping Address (Optional)</label>
              <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} rows={3} placeholder="Enter shipping address…" style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocusG} onBlur={onBlurG} />
            </div>

            {/* Estimated Delivery Date */}
            <div>
              <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Estimated Delivery Date (Optional)</label>
              <DatePicker
                value={estimatedDeliveryDate || null}
                onChange={(val) => setEstimatedDeliveryDate(val || '')}
                placeholder="Select estimated delivery date..."
                className="w-full"
                variant="white"
              />
            </div>

            {/* Advance Payment and Payment Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Advance Payment (Rs.) (Optional)</label>
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
                  style={{ ...inputStyle, ...MONO }}
                  onFocus={onFocusG}
                  onBlur={onBlurG}
                />
              </div>
              <div>
                <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Payment Status</label>
                <CustomDropdown
                  value={paymentStatus}
                  onChange={(val) => {
                    const status = val as 'unpaid' | 'partially_paid' | 'paid';
                    setPaymentStatus(status);
                    if (status === 'paid') {
                      setAdvanceAmount(calculateTotal());
                    } else if (status === 'unpaid') {
                      setAdvanceAmount(0);
                    }
                  }}
                  options={[
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'partially_paid', label: 'Partially Paid' },
                    { value: 'paid', label: 'Paid (Fully)' },
                  ]}
                  className="w-full"
                />
              </div>
            </div>

            {/* Total and Balance Due */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', background: '#F4F7F4', border: '1px solid #EAEAEA', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ ...PJS, fontSize: 13, fontWeight: 600, color: '#71717A' }}>Total Amount</span>
                <span style={{ ...MONO, fontSize: 15, fontWeight: 700, color: '#16281D' }}>Rs. {calculateTotal().toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EAEAEA', paddingTop: 8 }}>
                <span style={{ ...PJS, fontSize: 13, fontWeight: 600, color: '#71717A' }}>Balance Due</span>
                <span style={{ ...MONO, fontSize: 18, fontWeight: 700, color: '#16281D' }}>Rs. {Math.max(0, calculateTotal() - advanceAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-full bg-white border border-[#EAEAEA] hover:bg-[#F4F7F4] font-sans text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || calculateTotal() === 0}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer border-0"
              >
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
