import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { getToken } from '../../../lib/auth';

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
  status: string;
  created_at: string;
  updated_at?: string;
}

const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Order ID not provided');
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        // Get agent profile from backend
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          setError('Failed to fetch agent profile');
          setLoading(false);
          return;
        }

        const agentData = await response.json();
        if (!agentData.success || !agentData.agent) {
          setError('Agent not found');
          setLoading(false);
          return;
        }

        const currentAgentId = agentData.agent.id;
        const currentAgentPrefix = agentData.agent.agent_prefix;
        setAgentId(currentAgentId);
        setAgentPrefix(currentAgentPrefix);

        if (!currentAgentPrefix) {
          setError('Agent prefix not found');
          setLoading(false);
          return;
        }

        // First fetch order details
        const ordersTable = `${currentAgentPrefix}_orders`;
        const joinTable = `${currentAgentPrefix}_customers`;
        const { data: orderData, error: orderError } = await supabase
          .from(ordersTable)
          .select(`
            id,
            customer_id,
            total_amount,
            status,
            notes,
            created_at,
            updated_at,
            shipping_address,
            ${joinTable} (name, phone)
          `)
          .eq("id", Number(id))
          .single();

        if (orderError || !orderData) {
          setError("Order not found");
          console.error("Order fetch error:", orderError);
          setLoading(false);
          return;
        }

        const customerData = (orderData as any)[joinTable] || {
          name: "Unknown Customer",
          phone: "",
        };

        // Fetch order items
        const itemsTable = `${currentAgentPrefix}_orders_items`;
        const { data: itemsData, error: itemsError } = await supabase
          .from(itemsTable)
          .select("name, quantity, price")
          .eq("order_id", Number(id));

        if (itemsError) {
          console.warn("Failed to fetch order items:", itemsError);
        }

        const orderItems = (itemsData || []).map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
        } as OrderItem));

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
          status: (orderData as any).status,
          created_at: (orderData as any).created_at,
          updated_at: (orderData as any).updated_at,
        };

        setOrder(orderDetails);
        setNewStatus(orderDetails.status);
      } catch (err) {
        setError('Failed to load order details');
        console.error('Fetch error:', err);
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
      
      const ordersTable = `${agentPrefix}_orders`;
      const { error } = await supabase
        .from(ordersTable)
        .update({
          status: newStatus
        })
        .eq('id', Number(id));

      if (error) {
        setError('Failed to update order status');
        console.error('Status update error:', error);
        return;
      }

      // Update local state
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      alert('Order status updated successfully');
    } catch (err) {
      setError('Failed to update order status');
      console.error('Update error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const sendWhatsAppMessage = () => {
    if (!order || !order.customer_phone) {
      alert('Customer phone number not available');
      return;
    }

    const phoneNumber = order.customer_phone.replace(/\D/g, '');
    const message = `Order #${order.id.toString().padStart(4, '0')} Update

Customer: ${order.customer_name}
Status: ${order.status}

Items:
${order.order_details.items.map(item => `${item.name} - Qty: ${item.quantity} x LKR ${item.price.toFixed(2)} = LKR ${item.total.toFixed(2)}`).join('\n')}

Total: LKR ${order.order_details.total_amount.toFixed(2)}

${order.order_details.notes ? `Notes: ${order.order_details.notes}` : ''}

Thank you!`;

    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          Error: {error || 'Order not found'}
        </div>
        <button
          onClick={() => navigate('/agent/orders')}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'pending') return 'text-yellow-600 bg-yellow-100';
    if (lowerStatus === 'processing') return 'text-blue-600 bg-blue-100';
    if (lowerStatus === 'shipped') return 'text-purple-600 bg-purple-100';
    if (lowerStatus === 'delivered' || lowerStatus === 'completed') return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto no-print">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/agent/orders')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Orders</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order #{order.id.toString().padStart(4, '0')}</h1>
              <p className="text-gray-600">Order details and customer information</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              🖨️ Print Receipt
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm font-semibold text-gray-900">{order.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-sm text-gray-900">{order.customer_phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Order Date</label>
                  <p className="text-sm text-gray-900">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {order.updated_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-sm text-gray-900">
                      {new Date(order.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Update Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
              <div className="space-y-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={updateOrderStatus}
                  disabled={updatingStatus}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors mb-3"
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
                <button
                  onClick={sendWhatsAppMessage}
                  className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                >
                  📱 Send WhatsApp Update
                </button>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="lg:col-span-2">
            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">LKR {order.order_details.total_amount.toFixed(2)}</p>
                  <p className="text-gray-600">Total Amount</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{order.order_details.items.length}</p>
                  <p className="text-gray-600">Items</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{order.order_details.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                  <p className="text-gray-600">Total Quantity</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
              {order.order_details.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items in this order
                </div>
              ) : (
                <div className="space-y-4">
                  {order.order_details.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">Qty: {item.quantity} × LKR {item.price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">LKR {item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>LKR {order.order_details.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Information */}
            {(order.order_details.notes || order.order_details.shipping_address) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                {order.order_details.notes && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-500 block mb-1">Notes</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{order.order_details.notes}</p>
                  </div>
                )}
                {order.order_details.shipping_address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Shipping Address</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{order.order_details.shipping_address}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-receipt, #print-receipt * { visibility: visible; }
          #print-receipt { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            background: white;
            padding: 20px;
            font-family: Arial, sans-serif;
            font-size: 12pt;
          }
          .no-print { display: none !important; }
          @page { margin: 0.5in; size: A4; }
        }
      `}</style>

      {/* Printable Receipt Section */}
      <div id="print-receipt" className="hidden print:block">
        <div className="border p-6 max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">ORDER RECEIPT</h1>
            <p className="text-lg">Order #{order.id.toString().padStart(4, '0')}</p>
            <p className="text-sm mt-1">Date: {new Date(order.created_at).toLocaleDateString('en-US')}</p>
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Customer Information</h3>
            <p><strong>Name:</strong> {order.customer_name}</p>
            <p><strong>Phone:</strong> {order.customer_phone}</p>
            {order.order_details.shipping_address && (
              <div className="mt-2">
                <p><strong>Shipping Address:</strong></p>
                <p className="ml-4">{order.order_details.shipping_address}</p>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Order Items</h3>
            <table className="w-full border-collapse border">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 border">Item</th>
                  <th className="text-right py-2 border">Qty</th>
                  <th className="text-right py-2 border">Price</th>
                  <th className="text-right py-2 border">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.order_details.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 border">{item.name}</td>
                    <td className="text-right py-2 border">{item.quantity}</td>
                    <td className="text-right py-2 border">LKR {item.price.toFixed(2)}</td>
                    <td className="text-right py-2 border font-semibold">LKR {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-bold">
                  <td colSpan={3} className="text-right py-2 border">TOTAL:</td>
                  <td className="text-right py-2 border">LKR {order.order_details.total_amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {order.order_details.notes && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="italic border p-2">{order.order_details.notes}</p>
            </div>
          )}
          
          <div className="text-center mt-6 pt-4 border-t">
            <p className="text-sm">Status: <span className="font-semibold">{order.status.toUpperCase()}</span></p>
            <p className="text-sm mt-2">Thank you for your business!</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetailsPage;