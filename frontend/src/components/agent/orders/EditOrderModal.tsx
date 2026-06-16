
import React, { useState, useEffect } from 'react';
import { getToken } from "../../../lib/auth";
import { getCurrentAgent } from "../../../lib/agent";
import { Order, OrderItem } from "../../../types/index";
import { X, Plus, Trash2 } from 'lucide-react';
import { useDialog } from '../shared/DialogProvider';

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
    position: 'fixed', inset: 0, zIndex: 60,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  };

  if (!order || fetchLoading || businessTypeLoading) {
    return (
      <div style={overlayStyle}>
        <style>{`@keyframes eom-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(34,197,94,0.2)', borderTopColor: '#22c55e', animation: 'eom-spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (businessTypeError) {
    return (
      <div style={overlayStyle}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', padding: '32px 24px', maxWidth: 360, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <p style={{ ...DM, fontSize: 14, color: '#f43f5e' }}>Unable to load business type: {businessTypeError}</p>
          <button onClick={onClose} style={{ padding: '9px 20px', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 10, ...DM, fontSize: 13, fontWeight: 600, color: '#3f3f46', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    );
  }

  const itemRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px',
    background: '#f9f9f9',
    borderRadius: 10,
    border: '1px solid #ebebeb',
  };

  return (
    <div style={overlayStyle}>
      <style>{`@keyframes eom-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '18px 24px 14px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...SYNE, fontSize: 17, fontWeight: 700, color: '#0c1a0e' }}>Edit Order #{order.id}</span>
          <button onClick={onClose} style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} style={{ color: '#71717a' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Status */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Order Status</label>
              <select value={editStatus} onChange={handleStatusChange} style={inputStyle} onFocus={onFocusG} onBlur={onBlurG}>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>Order Items</span>
                {items.length > 0 && <span style={{ ...DM, fontSize: 12, color: '#a1a1aa' }}>{items.length} item(s)</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {items.map((item, index) => (
                  <div key={index} style={itemRowStyle}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => businessType === 'service' ? handleItemNameChange(index, e.target.value) : undefined}
                        placeholder="Item name"
                        readOnly={businessType === 'product'}
                        style={{ ...inputStyle, background: businessType === 'product' ? '#f4f4f5' : '#f9f9f9', cursor: businessType === 'product' ? 'not-allowed' : 'text', color: businessType === 'product' ? '#71717a' : '#3f3f46' }}
                        onFocus={onFocusG}
                        onBlur={onBlurG}
                      />
                    </div>
                    <div style={{ width: 68 }}>
                      <input type="number" value={item.quantity} onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 1)} min="1" placeholder="Qty" style={{ ...inputStyle, textAlign: 'center' }} onFocus={onFocusG} onBlur={onBlurG} />
                    </div>
                    <div style={{ width: 88 }}>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => businessType === 'service' ? handleItemPriceChange(index, parseFloat(e.target.value) || 0) : undefined}
                        min="0" step="0.01" placeholder="Price"
                        readOnly={businessType === 'product'}
                        style={{ ...inputStyle, textAlign: 'right', background: businessType === 'product' ? '#f4f4f5' : '#f9f9f9', cursor: businessType === 'product' ? 'not-allowed' : 'text', color: businessType === 'product' ? '#71717a' : '#3f3f46' }}
                        onFocus={onFocusG}
                        onBlur={onBlurG}
                      />
                    </div>
                    <div style={{ width: 88, ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', textAlign: 'right', flexShrink: 0 }}>
                      LKR {(item.quantity * item.price).toFixed(2)}
                    </div>
                    <button onClick={() => removeItem(index)} style={{ width: 30, height: 30, background: 'rgba(244,63,94,0.08)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add item / Inventory picker */}
              {businessType === 'service' ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '12px 14px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10 }}>
                  <div style={{ flex: 1 }}>
                    <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="New item name" style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div style={{ width: 68 }}>
                    <input type="number" value={newItemQuantity} onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)} min="1" placeholder="Qty" style={{ ...inputStyle, textAlign: 'center' }} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div style={{ width: 88 }}>
                    <input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)} min="0" step="0.01" placeholder="Price" style={{ ...inputStyle, textAlign: 'right' }} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <button
                    onClick={addItem}
                    disabled={!newItemName.trim() || newItemQuantity <= 0 || newItemPrice <= 0}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: (!newItemName.trim() || newItemQuantity <= 0 || newItemPrice <= 0) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 8, cursor: (!newItemName.trim() || newItemQuantity <= 0 || newItemPrice <= 0) ? 'not-allowed' : 'pointer', ...DM, fontSize: 13, fontWeight: 600, flexShrink: 0 }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              ) : businessType === 'product' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46' }}>Add from Inventory</label>
                  <input type="text" placeholder="Search by name or SKU…" value={inventorySearchTerm} onChange={(e) => setInventorySearchTerm(e.target.value)} style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46' }}>Default Qty:</span>
                    <input type="number" min="1" value={defaultAddQuantity} onChange={(e) => setDefaultAddQuantity(parseInt(e.target.value) || 1)} style={{ ...inputStyle, width: 72 }} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  {filteredInventory.length > 0 ? (
                    <div style={{ border: '1px solid #ebebeb', borderRadius: 10, maxHeight: 180, overflowY: 'auto' }}>
                      {filteredInventory.map((invItem) => (
                        <div key={invItem.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f4f4f5', transition: 'background 0.1s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(34,197,94,0.04)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            {invItem.image_urls?.[0] && (
                              <img src={invItem.image_urls[0]} alt={invItem.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invItem.name}</div>
                              <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>LKR {invItem.price.toFixed(2)}</div>
                            </div>
                          </div>
                          <button type="button" onClick={() => addFromInventory(invItem, defaultAddQuantity)} style={{ flexShrink: 0, marginLeft: 8, padding: '4px 10px', background: 'rgba(34,197,94,0.1)', color: '#059669', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 7, cursor: 'pointer', ...DM, fontSize: 12, fontWeight: 600 }}>
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px 0', ...DM, fontSize: 13, color: '#a1a1aa', border: '1px solid #ebebeb', borderRadius: 10 }}>
                      {inventorySearchTerm ? 'No products found' : 'No inventory items available.'}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Notes */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Order notes or special instructions…" style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocusG} onBlur={onBlurG} />
            </div>

            {/* Shipping address */}
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Shipping Address (Optional)</label>
              <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} rows={3} placeholder="Enter shipping address…" style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocusG} onBlur={onBlurG} />
            </div>

            {/* Total */}
            <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...DM, fontSize: 14, fontWeight: 600, color: '#3f3f46' }}>Total Amount</span>
              <span style={{ ...SYNE, fontSize: 20, fontWeight: 700, color: '#059669' }}>LKR {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '16px 24px', borderTop: '1px solid #ebebeb', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', ...DM, fontSize: 13, fontWeight: 600, opacity: loading ? 0.5 : 1 }}>
            Cancel
          </button>
          <button onClick={handleUpdateOrder} disabled={loading || items.length === 0}
            style={{ padding: '10px 20px', background: (loading || items.length === 0) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, cursor: (loading || items.length === 0) ? 'not-allowed' : 'pointer', ...DM, fontSize: 13, fontWeight: 600, boxShadow: (loading || items.length === 0) ? 'none' : '0 4px 14px rgba(34,197,94,0.3)' }}>
            {loading ? 'Updating…' : 'Update Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
