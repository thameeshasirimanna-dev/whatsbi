
import React, { useState, useEffect } from 'react';
import { getToken } from "../../../lib/auth";
import { getCurrentAgent } from "../../../lib/agent";
import { Order, OrderItem } from "../../../types/index";

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
  const [editStatus, setEditStatus] = useState(order?.status || "");
  const [shippingAddress, setShippingAddress] = useState(
    order?.shipping_address || ""
  );
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [businessType, setBusinessType] = useState<
    "service" | "product" | null
  >(null);
  const [businessTypeLoading, setBusinessTypeLoading] = useState(true);
  const [businessTypeError, setBusinessTypeError] = useState<string | null>(
    null
  );
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySearchTerm, setInventorySearchTerm] = useState("");
  const [defaultAddQuantity, setDefaultAddQuantity] = useState(1);

  useEffect(() => {
    if (order && agentPrefix) {
      setShippingAddress(order.shipping_address || "");
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
          setBusinessTypeError("Agent not found");
          return;
        }

        setBusinessType(agent.business_type as "service" | "product");
      } catch (err: any) {
        console.error("Error fetching business type:", err);
        setBusinessTypeError(err.message || "Failed to load business type");
      } finally {
        setBusinessTypeLoading(false);
      }
    };

    fetchBusinessType();
  }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      if (businessType !== "product") return;
      try {
        const token = getToken();
        if (!token) return;
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-inventory`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
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
        console.error("Failed to fetch inventory:", err);
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
            'Content-Type': 'application/json'
          }
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
      console.error("Failed to fetch order items:", err);
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
    if (businessType === "service") {
      if (!newItemName.trim() || newItemQuantity <= 0 || newItemPrice <= 0)
        return;

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
      setNewItemName("");
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

    // Get agent info if not provided
    let currentAgentPrefix = agentPrefix;
    let currentAgentId = agentId;

    if (!currentAgentPrefix || !currentAgentId) {
      try {
        const agent = await getCurrentAgent();
        if (!agent) {
          alert('Agent information not available');
          return;
        }
        currentAgentPrefix = agent.agent_prefix;
        currentAgentId = parseInt(agent.id);
      } catch (err) {
        alert('Failed to get agent information');
        return;
      }
    }

    // Validate items before sending request
    for (const item of items) {
      if (!item.name || item.name.trim().length === 0) {
        alert('All items must have a name');
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        alert('All items must have a valid quantity');
        return;
      }
      if (typeof item.price !== 'number' || isNaN(item.price) || item.price < 0) {
        alert('All items must have a valid price');
        return;
      }
    }

    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        alert('User not authenticated');
        return;
      }

      // Update main order
      const orderResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: order.id,
            status: editStatus,
            total_amount: items.reduce(
              (sum, item) => sum + item.quantity * item.price,
              0
            ),
            notes: order.notes || null,
            shipping_address: shippingAddress.trim() || null,
            updated_at: new Date().toISOString(),
          })
        }
      );

      if (!orderResponse.ok) {
        throw new Error('Failed to update order');
      }

      const orderData = await orderResponse.json();
      if (!orderData.success) {
        throw new Error('Failed to update order');
      }

      // Replace order items (delete old, insert new)
      const deleteResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=delete-items&order_id=${order.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
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
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              order_id: order.id,
              items: items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              }))
            })
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
      console.error("Update order error:", err);
      alert("Failed to update order: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!order || fetchLoading || businessTypeLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (businessTypeError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-xl p-6 text-center">
          <p className="text-red-600 mb-4">
            Unable to load business type: {businessTypeError}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-6xl mx-auto my-4 max-h-[90vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-black/10 animate-in fade-in-0 zoom-in-95 duration-300 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 lg:px-4 py-3 lg:py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-blue-50/50 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-2xl">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 01-2-2m0 13l6-6m-6 6V5a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 001 1.732V19a2 2 0 01-2 2h-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6H7a2 2 0 01-2-2v-4a2 2 0 011.732-1.732M9 5a2 2 0 002 2h2a2 2 0 002-2m0 4v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6H7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Order #{order.id}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {/* Order Status */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Status
              </label>
              <select
                value={editStatus}
                onChange={handleStatusChange}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Order Items
                </h3>
                {items.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {items.length} item(s)
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3 mb-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          businessType === "service"
                            ? handleItemNameChange(index, e.target.value)
                            : undefined
                        }
                        placeholder="Item name"
                        className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          businessType === "product"
                            ? "bg-gray-100 cursor-not-allowed"
                            : ""
                        }`}
                        readOnly={businessType === "product"}
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemQuantityChange(
                            index,
                            parseInt(e.target.value) || 1
                          )
                        }
                        min="1"
                        placeholder="Qty"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          businessType === "service"
                            ? handleItemPriceChange(
                                index,
                                parseFloat(e.target.value) || 0
                              )
                            : undefined
                        }
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right ${
                          businessType === "product"
                            ? "bg-gray-100 cursor-not-allowed"
                            : ""
                        }`}
                        readOnly={businessType === "product"}
                      />
                    </div>
                    <div className="w-24 text-right font-medium text-gray-900">
                      LKR {(item.quantity * item.price).toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Item */}
              {businessType === "service" ? (
                <div className="flex items-end space-x-3 p-3 bg-blue-50 rounded-xl">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Add new item"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={newItemQuantity}
                      onChange={(e) =>
                        setNewItemQuantity(parseInt(e.target.value) || 1)
                      }
                      min="1"
                      placeholder="Qty"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={newItemPrice}
                      onChange={(e) =>
                        setNewItemPrice(parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    />
                  </div>
                  <button
                    onClick={addItem}
                    disabled={
                      !newItemName.trim() ||
                      newItemQuantity <= 0 ||
                      newItemPrice <= 0
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
              ) : businessType === "product" ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Products from Inventory
                  </label>
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={inventorySearchTerm}
                    onChange={(e) => setInventorySearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex items-center space-x-3 mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Default Quantity:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={defaultAddQuantity}
                      onChange={(e) =>
                        setDefaultAddQuantity(parseInt(e.target.value) || 1)
                      }
                      className="w-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                    />
                  </div>
                  {filteredInventory.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                      {filteredInventory.map((invItem) => (
                        <div
                          key={invItem.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-100 rounded"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {invItem.image_urls?.[0] && (
                              <img
                                src={invItem.image_urls[0]}
                                alt={invItem.name}
                                className="w-10 h-10 object-cover rounded flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">
                                {invItem.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                LKR {invItem.price.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              addFromInventory(invItem, defaultAddQuantity)
                            }
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm ml-2 flex-shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 border rounded-lg">
                      {inventorySearchTerm
                        ? "No products found"
                        : "No inventory items available."}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Shipping Address */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Address (Optional)
              </label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                placeholder="Enter shipping address..."
              />
            </div>

            {/* Total */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">
                  Total Amount:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  LKR {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-4 py-4 bg-gray-50 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateOrder}
              disabled={loading || items.length === 0}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? "Updating..." : "Update Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;