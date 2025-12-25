import React, { useState, useEffect } from 'react';
import { getToken } from "../../../lib/auth";
import { Order, OrderItem } from '../../../types/index';

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

      // Fetch order items if not present
      let orderItems: OrderItem[] = order.parsed_order_details?.items || [];
      if (orderItems.length === 0 && order.id) {
        const token = getToken();
        if (!token) {
          setError("User not authenticated");
          return;
        }

        const itemsResponse = await fetch(
          `${
            import.meta.env.VITE_BACKEND_URL
          }/manage-orders?type=items&order_id=${order.id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
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
        customer_name: order.customer_name || "Unknown Customer",
        customer_phone: order.customer_phone || "",
        parsed_order_details: {
          ...order.parsed_order_details,
          items: orderItems,
        },
      };

      setFullOrderDetails(fullDetails);
    } catch (err) {
      setError("Failed to load order details");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppMessage = () => {
    if (!fullOrderDetails || !fullOrderDetails.customer_phone) {
      alert('Customer phone number not available');
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

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'pending') return 'text-yellow-600 bg-yellow-100';
    if (lowerStatus === 'processing') return 'text-blue-600 bg-blue-100';
    if (lowerStatus === 'shipped') return 'text-purple-600 bg-purple-100';
    if (lowerStatus === 'delivered' || lowerStatus === 'completed') return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" aria-hidden="true" />
          <div className="relative w-full max-w-4xl mx-auto my-8 max-h-[95vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-black/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    error ||
    !fullOrderDetails ||
    !fullOrderDetails.id ||
    typeof fullOrderDetails.id !== "number" ||
    fullOrderDetails.id <= 0
  ) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md mx-auto my-8 max-h-[95vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-black/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="p-6 text-center">
              <p className="text-red-600 mb-3 text-sm">
                {error || "Order not found or invalid"}
              </p>
              <button
                onClick={onClose}
                className="inline-flex justify-center px-4 py-2 rounded-lg border border-gray-300 shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" aria-hidden="true" />
        
        <div className="relative w-full max-w-6xl mx-auto max-h-[95vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-100 rounded-xl">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Order #{fullOrderDetails.id.toString().padStart(4, '0')}
                </h3>
                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(fullOrderDetails.status)}`}>
                  {fullOrderDetails.status}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="group inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 hover:scale-110"
              onClick={onClose}
            >
              <svg className="h-4 w-4 group-hover:rotate-90 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1">
            <div className="p-4 space-y-4 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Customer Info - Left Column */}
                <div className="lg:col-span-1 space-y-3">
                  {/* Customer Information Card */}
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-100 shadow-sm">
                    <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Customer Info
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Name:</span>
                        <span className="text-gray-900 font-medium truncate">{fullOrderDetails.customer_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Phone:</span>
                        <span className="text-gray-900 font-medium">{fullOrderDetails.customer_phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Date:</span>
                        <span className="text-gray-900 text-right">
                          {new Date(fullOrderDetails.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100 shadow-sm">
                    <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.345 3.288a5.761 5.761 0 012.27 0l.99 0.383a4.606 4.606 0 004.832 0l.99-.383a5.76 5.76 0 012.27 0L21 3.288M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m0 0a2 2 0 012 2v4a2 2 0 001.343 1.856" />
                      </svg>
                      Actions
                    </h4>
                    <div className="space-y-2">
                      <button
                        onClick={sendWhatsAppMessage}
                        disabled={!fullOrderDetails.customer_phone}
                        className="w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-xs inline-flex justify-center items-center rounded-lg border-0 shadow-sm px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        WhatsApp Update
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Details - Right Column */}
                <div className="lg:col-span-2 space-y-3">
                  {/* Order Summary Card */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-100 shadow-sm">
                    <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Order Summary
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                      <div className="bg-white/50 backdrop-blur-sm rounded-lg p-2 border border-gray-100 shadow-sm">
                        <p className="text-lg font-bold text-gray-900 mb-0.5">LKR {(fullOrderDetails.total_amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Total Amount</p>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-lg p-2 border border-gray-100 shadow-sm">
                        <p className="text-lg font-bold text-gray-900 mb-0.5">{fullOrderDetails.parsed_order_details?.items?.length || 0}</p>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Items</p>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-lg p-2 border border-gray-100 shadow-sm">
                        <p className="text-lg font-bold text-gray-900 mb-0.5">
                          {fullOrderDetails.parsed_order_details?.items?.reduce((sum: number, item: OrderItem) => sum + (item.quantity || 0), 0) || 0}
                        </p>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Total Quantity</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Card */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 overflow-hidden flex-1">
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30 border-b border-gray-100">
                      <h4 className="text-sm font-bold text-gray-900">Order Items ({fullOrderDetails.parsed_order_details?.items?.length || 0})</h4>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {fullOrderDetails.parsed_order_details?.items?.length === 0 ? (
                        <div className="text-center py-6">
                          <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <h3 className="mt-1 text-xs font-medium text-gray-900">No items</h3>
                          <p className="mt-1 text-xs text-gray-500">No items in this order.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {fullOrderDetails.parsed_order_details?.items?.map((item: OrderItem, index: number) => {
                            const itemTotal = item.quantity * item.price;
                            return (
                              <div key={index} className="px-4 py-3 bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                                <div className="flex justify-between items-center">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="text-sm font-semibold text-gray-900 truncate mb-0.5">{item.name}</h5>
                                    <p className="text-xs text-gray-600">Qty: {item.quantity} × LKR {item.price.toFixed(2)}</p>
                                  </div>
                                  <div className="text-right ml-3 min-w-[80px]">
                                    <p className="text-sm font-bold text-gray-900">LKR {itemTotal.toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30 border-t border-gray-100 font-bold">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Total</span>
                              <span className="text-lg text-gray-900">LKR {(fullOrderDetails.total_amount || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Info Cards - Only show if content exists and space allows */}
                  {(fullOrderDetails.notes || fullOrderDetails.parsed_order_details?.shipping_address) && (
                    <div className="grid grid-cols-1 gap-2">
                      {fullOrderDetails.notes && (
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 shadow-sm">
                          <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-1 flex items-center">
                            <svg className="w-3 h-3 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Notes
                          </h4>
                          <p className="text-xs text-gray-700 leading-tight line-clamp-3">{fullOrderDetails.notes}</p>
                        </div>
                      )}
                      {fullOrderDetails.parsed_order_details?.shipping_address && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200 shadow-sm">
                          <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-1 flex items-center">
                            <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Shipping
                          </h4>
                          <p className="text-xs text-gray-700 leading-tight line-clamp-3">{fullOrderDetails.parsed_order_details.shipping_address}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 bg-gray-50 px-4 py-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 rounded-lg border border-gray-300 shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewOrderModal;