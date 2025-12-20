import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

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
  onSuccess 
}) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [businessType, setBusinessType] = useState<'service' | 'product' | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [defaultAddQuantity, setDefaultAddQuantity] = useState(1);
  // Hardcoded to LKR
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinessType = async () => {
      if (!agentId) return;
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('business_type')
          .eq('id', agentId)
          .single();
        if (error) {
          console.error('Failed to fetch business type:', error);
          return;
        }
        if (data) {
          setBusinessType(data.business_type as 'service' | 'product');
        }
      } catch (err) {
        console.error('Error fetching business type:', err);
      }
    };

    fetchBusinessType();
  }, [agentId]);

  useEffect(() => {
    const fetchInventory = async () => {
      if (businessType !== 'product') return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-inventory`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
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

  const filteredInventory = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(inventorySearchTerm.toLowerCase())
  );

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  // Hardcoded to LKR
  const CURRENCY_SYMBOL = 'LKR';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPrefix || !agentId) {
      setError('Agent configuration missing');
      return;
    }
  
    const validItems = items.filter(
      (item) => item.name.trim() && item.price > 0 && item.quantity > 0
    );
    if (validItems.length === 0) {
      setError("Please add at least one valid item");
      return;
    }

    const totalAmount = calculateTotal();
    const orderNotes = notes.trim() || null;
    const orderShippingAddress = shippingAddress.trim() || null;

    try {
      setLoading(true);
      setError(null);

      const ordersTable = `${agentPrefix}_orders`;
      const orderItemsTable = `${agentPrefix}_orders_items`;

      // Step 1: Insert the main order record
      const { data: orderData, error: orderError } = await supabase
        .from(ordersTable)
        .insert({
          customer_id: customer.id,
          total_amount: totalAmount,
          status: "pending",
          notes: orderNotes,
          shipping_address: orderShippingAddress,
        })
        .select("id")
        .single();

      if (orderError) {
        throw orderError;
      }

      if (!orderData?.id) {
        throw new Error(
          "Failed to get order ID - orderData: " + JSON.stringify(orderData)
        );
      }

      const orderId = orderData.id;

      // Step 2: Prepare all order items with sanitization
      const orderItemsData = validItems.map((item) => {
        // Enhanced sanitization for SQL special characters - remove rather than escape to avoid SQL generation issues
        const safeName = item.name
          .trim()
          .replace(/,/g, " - ")
          .replace(/"/g, "'") // Replace double quotes with single quotes
          .replace(/'/g, "''") // Escape single quotes by doubling them
          .replace(/\n/g, " ") // Replace newlines with spaces
          .replace(/\r/g, " ") // Replace carriage returns
          .replace(/--/g, "-") // Prevent SQL comment sequences
          .replace(/;/g, "") // Remove semicolons
          .replace(/\//g, "-") // Replace slashes
          .substring(0, 100); // Limit length to prevent very long names

        // Strict type conversion to match schema
        const insertQuantity = Math.floor(Number(item.quantity)) || 1;
        const insertPrice = Number(item.price) || 0;

        // Additional validation
        if (insertQuantity <= 0 || insertPrice <= 0 || !safeName.trim()) {
          throw new Error(
            `Invalid item data: quantity=${insertQuantity}, price=${insertPrice}, name="${safeName}"`
          );
        }

        return {
          order_id: parseInt(orderId.toString()),
          name: safeName,
          quantity: insertQuantity,
          price: parseFloat(insertPrice.toFixed(2)),
          original_name: item.name, // For logging only
        };
      });

      // Bulk insert all order items at once - more reliable than individual inserts for dynamic tables
      const { error: itemError } = await supabase.from(orderItemsTable).insert(
        orderItemsData.map((item) => {
          const { original_name, ...insertData } = item;
          return insertData;
        })
      );

      if (itemError) {
        // Fallback: Try individual inserts
        let allItemsInserted = true;
        for (const itemData of orderItemsData) {
          const { original_name, ...insertData } = itemData;
          const { error: singleError } = await supabase
            .from(orderItemsTable)
            .insert(insertData);

          if (singleError) {
            allItemsInserted = false;
            break;
          }
        }

        if (!allItemsInserted) {
          throw new Error(
            "Failed to insert order items even with individual inserts"
          );
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      setError(`Failed to create order: ${errorMessage}`);
      console.error("Order creation error:", {
        message: errorMessage,
        code: err.code,
        details: err.details,
        hint: err.hint,
        stack: err.stack
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Create Order for {customer.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">Customer: <span className="font-medium">{customer.name}</span></p>
          <p className="text-sm text-gray-600">Phone: <span className="font-medium">{customer.phone}</span></p>
        </div>

        {/* Currency hardcoded to LKR */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <p className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">LKR</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Items */}
          {businessType === 'service' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Items</label>
              {items.map((item, index) => (
                <div key={index} className="flex space-x-3 items-end bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Item Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Item name"
                      required
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Price (LKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
                    <input
                      type="number"
                      value={(item.quantity * item.price).toFixed(2)}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                      prefix="LKR"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800 -mt-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                + Add Item
              </button>
            </div>
          ) : businessType === 'product' ? (
            <>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Products from Inventory</label>
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={inventorySearchTerm}
                  onChange={(e) => setInventorySearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-3 mb-3">
                  <label className="text-sm font-medium text-gray-700">Default Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    value={defaultAddQuantity}
                    onChange={(e) => setDefaultAddQuantity(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {filteredInventory.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {filteredInventory.map((invItem) => (
                      <div key={invItem.id} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {invItem.image_urls?.[0] && (
                            <img
                              src={invItem.image_urls[0]}
                              alt={invItem.name}
                              className="w-10 h-10 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{invItem.name}</div>
                            <div className="text-sm text-gray-500">LKR {invItem.price.toFixed(2)}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addFromInventory(invItem, defaultAddQuantity)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm ml-2 flex-shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 border rounded-lg">
                    {inventorySearchTerm ? 'No products found' : 'No inventory items available. Add some in the Inventory page.'}
                  </div>
                )}
              </div>
              {items.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Added Order Items</label>
                  {items.map((item, index) => (
                    <div key={index} className="flex space-x-3 items-end bg-gray-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Item Name</label>
                        <input
                          type="text"
                          value={item.name}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Price (LKR)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
                        <input
                          type="number"
                          value={(item.quantity * item.price).toFixed(2)}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800 -mt-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-500">Loading business type...</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Order notes or special instructions..."
            />
          </div>

          {/* Shipping Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Address (Optional)</label>
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter shipping address..."
            />
          </div>

          {/* Order Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">
                Total: LKR {calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || calculateTotal() === 0}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
              ) : (
                <span>Create Order</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;