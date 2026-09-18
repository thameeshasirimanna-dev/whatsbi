
import React, { useState, useEffect } from 'react';
import { getToken } from "../../../lib/auth";
import { getCurrentAgent } from "../../../lib/agent";
import { Order, OrderItem } from "../../../types/index";
import { X, Plus, Trash2 } from 'lucide-react';
import { useDialog } from '../shared/DialogProvider';
import Portal from '../shared/Portal';
import CustomDropdown from '../shared/CustomDropdown';
import { DatePicker } from '../shared/DatePicker';

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

interface EditOrderModalProps {
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
  agentPrefix: string | null;
  agentId: number | null;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  onClose,
  onSuccess,
  agentPrefix,
  agentId,
}) => {
  const { toast } = useDialog();
  const [editStatus, setEditStatus] = useState(order?.status || '');
  const [shippingAddress, setShippingAddress] = useState(order?.shipping_address || '');
  const [notes, setNotes] = useState(order?.notes || '');
  const [advanceAmount, setAdvanceAmount] = useState<number>(Number(order?.advance_amount || 0));
  const [paymentStatus, setPaymentStatus] = useState<string>(order?.payment_status || 'unpaid');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [businessType, setBusinessType] = useState<'service' | 'product' | null>(null);
  const [businessTypeLoading, setBusinessTypeLoading] = useState(true);
  const [businessTypeError, setBusinessTypeError] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [defaultAddQuantity, setDefaultAddQuantity] = useState(1);

  useEffect(() => {
    if (order && agentPrefix) {
      setShippingAddress(order.shipping_address || '');
      setNotes(order.notes || '');
      setAdvanceAmount(Number(order.advance_amount || 0));
      setPaymentStatus(order.payment_status || 'unpaid');
      if (order.estimated_delivery_date) {
        const d = new Date(order.estimated_delivery_date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setEstimatedDeliveryDate(`${year}-${month}-${day}`);
      } else {
        setEstimatedDeliveryDate('');
      }
      fetchOrderItems();
    }
  }, [order, agentPrefix]);

  useEffect(() => {
    const fetchBusinessType = async () => {
      try {
        setBusinessTypeLoading(true);
        setBusinessTypeError(null);

        const agent = await getCurrentAgent();
        if (!agent) {
          setBusinessTypeError('Agent not found');
          return;
        }

        setBusinessType(agent.business_type as 'service' | 'product');
      } catch (err: any) {
        console.error('Error fetching business type:', err);
        setBusinessTypeError(err.message || 'Failed to load business type');
      } finally {
        setBusinessTypeLoading(false);
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
      }
    };

    fetchInventory();
  }, [businessType]);

  const fetchOrderItems = async () => {
    if (!order || !agentPrefix) {
      setFetchLoading(false);
      return;
    }

    try {
      setFetchLoading(true);
      const token = getToken();
      if (!token) {
        setFetchLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=items&order_id=${order.id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch order items');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Failed to fetch order items');
      }

      setItems(
        (data.items || []).map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price) || 0,
          total: item.quantity * (parseFloat(item.price) || 0),
        })) as OrderItem[]
      );
    } catch (err) {
      console.error('Failed to fetch order items:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditStatus(e.target.value);
  };

  const handleItemNameChange = (index: number, value: string) => {
    const newItems = [...items];
    if (newItems[index]) {
      newItems[index].name = value;
      newItems[index].total = newItems[index].quantity * newItems[index].price;
      setItems(newItems);
    }
  };

  const handleItemQuantityChange = (index: number, value: number) => {
    const newItems = [...items];
    if (newItems[index]) {
      newItems[index].quantity = Math.max(1, value);
      newItems[index].total = newItems[index].quantity * newItems[index].price;
      setItems(newItems);
    }
  };

  const handleItemPriceChange = (index: number, value: number) => {
    const newItems = [...items];
    if (newItems[index]) {
      const validValue = isNaN(value) ? 0 : Math.max(0, value);
      newItems[index].price = validValue;
      newItems[index].total = newItems[index].quantity * newItems[index].price;
      setItems(newItems);
    }
  };

  const addItem = () => {
    if (businessType === 'service') {
      if (!newItemName.trim() || newItemQuantity <= 0 || newItemPrice <= 0) return;

      const newItem = {
        id: 0,
        order_id: order!.id,
        name: newItemName.trim(),
        quantity: newItemQuantity,
        price: newItemPrice,
        total: newItemQuantity * newItemPrice,
        created_at: new Date().toISOString(),
      } as OrderItem;

      setItems([...items, newItem]);
      setNewItemName('');
      setNewItemQuantity(1);
      setNewItemPrice(0);
    }
  };

  const addFromInventory = (item: InventoryItem, quantity: number = 1) => {
    const newItem = {
      id: 0,
      order_id: order!.id,
      name: item.name,
      quantity,
      price: item.price,
      total: quantity * item.price,
      created_at: new Date().toISOString(),
    } as OrderItem;
    setItems([...items, newItem]);
  };

  const filteredInventory = inventoryItems.filter(
    (item) =>
      item.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(inventorySearchTerm.toLowerCase())
  );

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateOrder = async () => {
    if (!order) return;

    let currentAgentPrefix = agentPrefix;
    let currentAgentId = agentId;

    if (!currentAgentPrefix || !currentAgentId) {
      try {
        const agent = await getCurrentAgent();
        if (!agent) {
          toast('Agent information not available', 'error');
          return;
        }
        currentAgentPrefix = agent.agent_prefix;
        currentAgentId = parseInt(agent.id);
      } catch (err) {
        toast('Failed to get agent information', 'error');
        return;
      }
    }

    for (const item of items) {
      if (!item.name || item.name.trim().length === 0) {
        toast('All items must have a name', 'error');
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        toast('All items must have a valid quantity', 'error');
        return;
      }
      if (typeof item.price !== 'number' || isNaN(item.price) || item.price < 0) {
        toast('All items must have a valid price', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        toast('User not authenticated', 'error');
        return;
      }

      const orderResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: order.id,
            status: editStatus,
            total_amount: items.reduce((sum, item) => sum + item.quantity * item.price, 0),
            notes: notes.trim() || null,
            shipping_address: shippingAddress.trim() || null,
            advance_amount: Number(advanceAmount) || 0,
            payment_status: paymentStatus,
            estimated_delivery_date: estimatedDeliveryDate || null,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!orderResponse.ok) {
        throw new Error('Failed to update order');
      }

      const orderData = await orderResponse.json();
      if (!orderData.success) {
        throw new Error('Failed to update order');
      }

      const deleteResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=delete-items&order_id=${order.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        throw new Error('Failed to delete old order items');
      }

      if (items.length > 0) {
        const insertResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=insert-items`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_id: order.id,
              items: items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              })),
            }),
          }
        );

        if (!insertResponse.ok) {
          throw new Error('Failed to insert order items');
        }

        const insertData = await insertResponse.json();
        if (!insertData.success) {
          throw new Error('Failed to insert order items');
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update order error:', err);
      toast('Failed to update order: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 110,
    background: 'rgba(15, 23, 18, 0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  };

  if (!order || fetchLoading || businessTypeLoading) {
    return (
      <Portal>
        <div style={overlayStyle} className="animate-modal-backdrop">
          <style>{`@keyframes eom-spin { to { transform: rotate(360deg); } }`}</style>
          <div className="animate-modal-card" style={{ background: '#fff', borderRadius: 24, border: '1px solid #EAEAEA', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(159,232,112,0.3)', borderTopColor: '#9FE870', animation: 'eom-spin 0.8s linear infinite' }} />
          </div>
        </div>
      </Portal>
    );
  }

  if (businessTypeError) {
    return (
      <Portal>
        <div style={overlayStyle}>
          <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #EAEAEA', padding: '32px 24px', maxWidth: 360, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <p style={{ ...PJS, fontSize: 14, color: '#EF4444' }}>Unable to load business type: {businessTypeError}</p>
            <button onClick={onClose} style={{ padding: '9px 22px', background: '#F4F7F4', border: '1px solid #EAEAEA', borderRadius: 9999, ...PJS, fontSize: 13, fontWeight: 600, color: '#16281D', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      </Portal>
    );
  }

  const itemRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px',
    background: '#F4F7F4',
    borderRadius: 14,
    border: '1px solid #EAEAEA',
  };

  return (
    <Portal>
      <div style={overlayStyle} className="animate-modal-backdrop">
      <style>{`@keyframes eom-spin { to { transform: rotate(360deg); } }`}</style>
      <div className="animate-modal-card" style={{ background: '#fff', borderRadius: 24, border: '1px solid #EAEAEA', boxShadow: '0 24px 64px rgba(22,40,29,0.18)', width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #EAEAEA', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <span style={{ ...PJS, fontSize: 17, fontWeight: 700, color: '#16281D', display: 'block', marginBottom: 4 }}>Edit Order #{order.id.toString().padStart(4, '0')}</span>
            {(order.customer_name || order.customer_phone) && (
              <span style={{ ...PJS, fontSize: 12, color: '#71717A' }}>
                For <strong style={{ color: '#16281D' }}>{order.customer_name || 'Customer'}</strong> {order.customer_phone && `· ${order.customer_phone}`}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#F4F7F4', border: '1px solid #EAEAEA', borderRadius: 9999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
            <X size={15} style={{ color: '#71717A' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Status */}
            <div>
              <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Order Status</label>
              <CustomDropdown
                value={editStatus}
                onChange={(val) => setEditStatus(val)}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'shipped', label: 'Shipped' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                className="w-full"
              />
            </div>

            {/* Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ ...PJS, fontSize: 14, fontWeight: 700, color: '#16281D' }}>Order Items</span>
                {items.length > 0 && <span style={{ ...PJS, fontSize: 12, color: '#71717A' }}>{items.length} item(s)</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {items.map((item, index) => (
                  <div key={index} className="p-3 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="w-full sm:flex-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => businessType === 'service' ? handleItemNameChange(index, e.target.value) : undefined}
                        placeholder="Item name"
                        readOnly={businessType === 'product'}
                        style={{ ...inputStyle, background: businessType === 'product' ? '#EAEAEA' : '#FFFFFF', cursor: businessType === 'product' ? 'not-allowed' : 'text', color: businessType === 'product' ? '#71717A' : '#16281D' }}
                        onFocus={onFocusG}
                        onBlur={onBlurG}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="flex-1 sm:w-[68px]">
                        <input type="number" value={item.quantity} onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 1)} min="1" placeholder="Qty" style={{ ...inputStyle, background: '#FFFFFF', textAlign: 'center', ...MONO }} onFocus={onFocusG} onBlur={onBlurG} />
                      </div>
                      <div className="flex-1 sm:w-[88px]">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => businessType === 'service' ? handleItemPriceChange(index, parseFloat(e.target.value) || 0) : undefined}
                          min="0" step="0.01" placeholder="Price"
                          readOnly={businessType === 'product'}
                          style={{ ...inputStyle, textAlign: 'right', background: businessType === 'product' ? '#EAEAEA' : '#FFFFFF', cursor: businessType === 'product' ? 'not-allowed' : 'text', color: businessType === 'product' ? '#71717A' : '#16281D', ...MONO }}
                          onFocus={onFocusG}
                          onBlur={onBlurG}
                        />
                      </div>
                      <div className="min-w-[70px] sm:w-[96px] font-mono text-xs sm:text-[13px] font-semibold text-[#16281D] text-right shrink-0">
                        Rs. {(item.quantity * item.price).toFixed(2)}
                      </div>
                      <button onClick={() => removeItem(index)} className="w-8 h-8 rounded-full bg-[#FEE2E2] hover:bg-[#FECACA] flex items-center justify-center text-[#EF4444] shrink-0 border-0 cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add item / Inventory picker */}
              {businessType === 'service' ? (
                <div className="p-3 sm:p-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl flex flex-col sm:flex-row sm:items-end gap-2.5">
                  <div className="w-full sm:flex-1">
                    <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="New item name" style={{ ...inputStyle, background: '#FFFFFF' }} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:w-[68px]">
                      <input type="number" value={newItemQuantity} onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)} min="1" placeholder="Qty" style={{ ...inputStyle, background: '#FFFFFF', textAlign: 'center', ...MONO }} onFocus={onFocusG} onBlur={onBlurG} />
                    </div>
                    <div className="flex-1 sm:w-[88px]">
                      <input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)} min="0" step="0.01" placeholder="Price" style={{ ...inputStyle, background: '#FFFFFF', textAlign: 'right', ...MONO }} onFocus={onFocusG} onBlur={onBlurG} />
                    </div>
                    <button
                      onClick={addItem}
                      disabled={!newItemName.trim() || newItemQuantity <= 0 || newItemPrice <= 0}
                      className="px-4 py-2.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_2px_8px_rgba(159,232,112,0.35)] disabled:bg-[#EAEAEA] disabled:text-[#A1A1AA] disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 border-0 cursor-pointer"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              ) : businessType === 'product' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D' }}>Add from Inventory</label>
                  <input type="text" placeholder="Search by name or SKU…" value={inventorySearchTerm} onChange={(e) => setInventorySearchTerm(e.target.value)} style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D' }}>Default Qty:</span>
                    <input type="number" min="1" value={defaultAddQuantity} onChange={(e) => setDefaultAddQuantity(parseInt(e.target.value) || 1)} style={{ ...inputStyle, width: 72, background: '#FFFFFF', ...MONO }} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  {filteredInventory.length > 0 ? (
                    <div style={{ border: '1px solid #EAEAEA', borderRadius: 14, maxHeight: 180, overflowY: 'auto' }}>
                      {filteredInventory.map((invItem) => (
                        <div key={invItem.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #EAEAEA', transition: 'background 0.1s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#F4F7F4')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            {invItem.image_urls?.[0] && (
                              <img src={invItem.image_urls[0]} alt={invItem.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ ...PJS, fontSize: 13, fontWeight: 600, color: '#16281D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invItem.name}</div>
                              <div style={{ ...MONO, fontSize: 11, color: '#71717A' }}>Rs. {invItem.price.toFixed(2)}</div>
                            </div>
                          </div>
                          <button type="button" onClick={() => addFromInventory(invItem, defaultAddQuantity)} style={{ flexShrink: 0, marginLeft: 8, padding: '4px 12px', background: 'rgba(159,232,112,0.2)', color: '#16281D', border: '1px solid #9FE870', borderRadius: 9999, cursor: 'pointer', ...PJS, fontSize: 12, fontWeight: 700 }}>
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px 0', ...PJS, fontSize: 13, color: '#71717A', border: '1px solid #EAEAEA', borderRadius: 14 }}>
                      {inventorySearchTerm ? 'No products found' : 'No inventory items available.'}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Notes */}
            <div>
              <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Order notes or special instructions…" style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocusG} onBlur={onBlurG} />
            </div>

            {/* Shipping address */}
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
                <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Advance Payment (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  step="0.01"
                  value={advanceAmount === 0 ? '' : advanceAmount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const newAdvance = isNaN(val) ? 0 : val;
                    setAdvanceAmount(newAdvance);
                    // Dynamically set payment status
                    if (newAdvance >= totalAmount && totalAmount > 0) {
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
                    setPaymentStatus(val);
                    if (val === 'paid') {
                      setAdvanceAmount(totalAmount);
                    } else if (val === 'unpaid') {
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
                <span style={{ ...MONO, fontSize: 15, fontWeight: 700, color: '#16281D' }}>Rs. {totalAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EAEAEA', paddingTop: 8 }}>
                <span style={{ ...PJS, fontSize: 13, fontWeight: 600, color: '#71717A' }}>Balance Due</span>
                <span style={{ ...MONO, fontSize: 18, fontWeight: 700, color: '#16281D' }}>Rs. {Math.max(0, totalAmount - advanceAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-[#EAEAEA] bg-white flex gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-full bg-white border border-[#EAEAEA] hover:bg-[#F4F7F4] font-sans text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateOrder}
            disabled={loading || items.length === 0}
            className="flex-1 py-2.5 px-4 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer border-0"
          >
            {loading ? 'Updating…' : 'Update Order'}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
};

export default EditOrderModal;
