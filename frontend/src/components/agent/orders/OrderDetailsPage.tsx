import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getToken, getCurrentUser } from '../../../lib/auth';
import { getCurrentAgent } from '../../../lib/agent';
import { useDialog } from '../shared/DialogProvider';
import {
  OrderDetails,
  OrderItem,
  BusinessType,
  OrderDetailsHeader,
  OrderCustomerCard,
  OrderStatusCard,
  OrderSummaryStats,
  OrderItemsCard,
  OrderReceiptPrint,
} from './orderDetails';

const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useDialog();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>('product');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // Retrieve order navigation sequence from router state or sessionStorage
  const navOrderIds: number[] = useMemo(() => {
    const stateIds = (location.state as { orderIds?: number[] } | null)?.orderIds;
    if (Array.isArray(stateIds) && stateIds.length > 0) {
      try {
        sessionStorage.setItem('orders_navigation_ids', JSON.stringify(stateIds));
      } catch (e) {
        // ignore sessionStorage quotas
      }
      return stateIds;
    }
    try {
      const saved = sessionStorage.getItem('orders_navigation_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  }, [location.state]);

  // Compute navigation indices
  const { prevOrderId, nextOrderId, currentIndex, totalCount } = useMemo(() => {
    const currentIdNum = Number(id);
    if (!isNaN(currentIdNum) && navOrderIds.length > 0) {
      const idx = navOrderIds.indexOf(currentIdNum);
      if (idx !== -1) {
        return {
          prevOrderId: idx > 0 ? navOrderIds[idx - 1] : null,
          nextOrderId: idx < navOrderIds.length - 1 ? navOrderIds[idx + 1] : null,
          currentIndex: idx,
          totalCount: navOrderIds.length,
        };
      }
    }
    // Fallback: use adjacent orders returned by backend (chronological/id based)
    return {
      prevOrderId: order?.prev_order_id ?? null,
      nextOrderId: order?.next_order_id ?? null,
      currentIndex: -1,
      totalCount: 0,
    };
  }, [id, navOrderIds, order?.prev_order_id, order?.next_order_id]);

  const handleNavigatePrev = useCallback(() => {
    if (prevOrderId) {
      navigate(`/agent/orders/${prevOrderId}`, {
        state: { orderIds: navOrderIds },
      });
    }
  }, [prevOrderId, navigate, navOrderIds]);

  const handleNavigateNext = useCallback(() => {
    if (nextOrderId) {
      navigate(`/agent/orders/${nextOrderId}`, {
        state: { orderIds: navOrderIds },
      });
    }
  }, [nextOrderId, navigate, navOrderIds]);

  // Keyboard shortcut listener: Left Arrow (Prev) and Right Arrow (Next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select, [contenteditable="true"]')) return;

      if (e.key === 'ArrowLeft' && prevOrderId) {
        e.preventDefault();
        handleNavigatePrev();
      } else if (e.key === 'ArrowRight' && nextOrderId) {
        e.preventDefault();
        handleNavigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevOrderId, nextOrderId, handleNavigatePrev, handleNavigateNext]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/agent/orders');
    }
  };

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

        const user = await getCurrentUser();
        if (!user.success || !user.user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        const agent = await getCurrentAgent();
        if (!agent) {
          setError('Agent not found');
          setLoading(false);
          return;
        }

        setAgentId(parseInt(agent.id));
        setAgentPrefix(agent.agent_prefix);
        if (agent.business_type === 'service') {
          setBusinessType('service');
        } else {
          setBusinessType('product');
        }

        if (!agent.agent_prefix) {
          setError('Agent prefix not found');
          setLoading(false);
          return;
        }

        const orderResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-orders?order_id=${id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!orderResponse.ok) {
          setError('Order not found');
          setLoading(false);
          return;
        }
        const orderDataResult = await orderResponse.json();
        const orderData = orderDataResult.order || (orderDataResult.orders && orderDataResult.orders[0]);
        if (!orderDataResult.success || !orderData) {
          setError('Order not found');
          setLoading(false);
          return;
        }

        let customerName = orderData.customer?.name || orderData.customer_name || '';
        let customerPhone = orderData.customer?.phone || orderData.customer_phone || '';
        if (!customerName && orderData.customer_id) {
          try {
            const customerResponse = await fetch(
              `${import.meta.env.VITE_BACKEND_URL}/manage-customers?id=${orderData.customer_id}`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${getToken()}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (customerResponse.ok) {
              const customerDataResult = await customerResponse.json();
              if (customerDataResult.success && customerDataResult.customers?.length > 0) {
                customerName = customerDataResult.customers[0].name || customerName;
                customerPhone = customerDataResult.customers[0].phone || customerPhone;
              }
            }
          } catch (e) {
            console.warn('Failed to fetch customer fallback', e);
          }
        }

        let orderItems: OrderItem[] = [];
        if (Array.isArray(orderData.items) && orderData.items.length > 0) {
          orderItems = orderData.items.map((item: any) => ({
            name: item.name,
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
            total: Number(item.total) || (Number(item.quantity) || 1) * (Number(item.price) || 0),
          }));
        } else if (Array.isArray(orderData.order_details?.items)) {
          orderItems = orderData.order_details.items;
        } else {
          try {
            const itemsResponse = await fetch(
              `${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=items&order_id=${id}`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${getToken()}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (itemsResponse.ok) {
              const itemsDataResult = await itemsResponse.json();
              if (itemsDataResult.success && itemsDataResult.items) {
                orderItems = itemsDataResult.items.map((item: any) => ({
                  name: item.name,
                  quantity: Number(item.quantity) || 1,
                  price: Number(item.price) || 0,
                  total: Number(item.quantity * item.price) || 0,
                }));
              }
            }
          } catch (e) {
            console.warn('Failed to fetch order items', e);
          }
        }

        const orderDetails: OrderDetails = {
          id: orderData.id,
          customer_id: orderData.customer_id,
          customer_name: customerName || 'Unknown Customer',
          customer_phone: customerPhone || '',
          order_details: {
            items: orderItems,
            total_amount: Number(orderData.total_amount) || 0,
            notes: orderData.notes || '',
            shipping_address: orderData.shipping_address || '',
          },
          advance_amount: Number(orderData.advance_amount) || 0,
          payment_status: orderData.payment_status || 'unpaid',
          status: orderData.status || 'pending',
          estimated_delivery_date: orderData.estimated_delivery_date || '',
          created_at: orderData.created_at,
          updated_at: orderData.updated_at,
          prev_order_id: orderData.prev_order_id ?? orderDataResult.prev_order_id ?? null,
          next_order_id: orderData.next_order_id ?? orderDataResult.next_order_id ?? null,
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
      const token = getToken();
      if (!token) {
        setError('User not authenticated');
        return;
      }

      const updateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id), status: newStatus }),
      });
      if (!updateResponse.ok) {
        setError('Failed to update order status');
        return;
      }
      const updateData = await updateResponse.json();
      if (!updateData.success) {
        setError('Failed to update order status');
        return;
      }

      setOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast('Order status updated successfully', 'success');
    } catch (err) {
      setError('Failed to update order status');
      console.error('Update error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const markAsFullyPaid = async () => {
    if (!id || !agentId || !agentPrefix || !order) return;
    try {
      setUpdatingStatus(true);
      const token = getToken();
      if (!token) {
        setError('User not authenticated');
        return;
      }

      const updateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(id),
          payment_status: 'paid',
          advance_amount: order.order_details.total_amount,
        }),
      });
      if (!updateResponse.ok) {
        setError('Failed to update payment status');
        return;
      }
      const updateData = await updateResponse.json();
      if (!updateData.success) {
        setError('Failed to update payment status');
        return;
      }

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              payment_status: 'paid',
              advance_amount: prev.order_details.total_amount,
            }
          : null
      );
      toast('Order marked as fully paid successfully', 'success');
    } catch (err) {
      setError('Failed to update payment status');
      console.error('Update payment error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const sendWhatsAppMessage = () => {
    if (!order || !order.customer_phone) {
      toast('Customer phone number not available', 'error');
      return;
    }
    const isService = businessType === 'service';
    const phoneNumber = order.customer_phone.replace(/\D/g, '');
    const message = `${isService ? 'Service Booking' : 'Order'} #${order.id.toString().padStart(4, '0')} Update\n\n${
      isService ? 'Client' : 'Customer'
    }: ${order.customer_name}\nStatus: ${order.status}\n\n${
      isService ? 'Booked Services' : 'Items'
    }:\n${order.order_details.items
      .map(
        (item) =>
          `${item.name} - ${isService ? 'Units' : 'Qty'}: ${item.quantity} x Rs. ${item.price.toFixed(2)} = Rs. ${item.total.toFixed(2)}`
      )
      .join('\n')}\n\nTotal: Rs. ${order.order_details.total_amount.toFixed(2)}\n\n${
      order.order_details.notes ? `Notes: ${order.order_details.notes}` : ''
    }\n\nThank you!`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[360px] h-full">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-8 h-8 rounded-full border-3 border-[#22C55E]/15 border-t-[#22C55E] animate-spin" />
          <span className="text-xs font-semibold text-[#71717A]">Loading order…</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full p-3 sm:p-5 flex flex-col gap-4 font-sans animate-fade-in">
        <div className="p-3.5 sm:px-4 bg-[#F43F5E]/8 border border-[#F43F5E]/15 rounded-xl text-xs sm:text-sm font-semibold text-[#F43F5E]">
          {error || 'Order not found'}
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="w-fit inline-flex items-center gap-2 bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA] rounded-full px-4 py-2 text-xs font-bold cursor-pointer transition-all active:scale-95"
        >
          <ArrowLeft size={14} strokeWidth={2.4} /> Back to Orders
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="no-print w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 font-sans animate-fade-in">
        {/* Header with Navigation Controls */}
        <OrderDetailsHeader
          order={order}
          businessType={businessType}
          prevOrderId={prevOrderId}
          nextOrderId={nextOrderId}
          currentIndex={currentIndex}
          totalCount={totalCount}
          onNavigatePrev={handleNavigatePrev}
          onNavigateNext={handleNavigateNext}
          onBack={handleBack}
        />

        {error && (
          <div className="p-3.5 bg-[#EF4444]/6 border border-[#EF4444]/15 rounded-xl text-xs font-semibold text-[#EF4444]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column: Customer Details + Status Controls */}
          <div className="flex flex-col gap-4 sm:gap-5">
            <OrderCustomerCard order={order} businessType={businessType} />
            <OrderStatusCard
              order={order}
              businessType={businessType}
              newStatus={newStatus}
              setNewStatus={setNewStatus}
              updatingStatus={updatingStatus}
              onUpdateStatus={updateOrderStatus}
              onMarkAsPaid={markAsFullyPaid}
              onSendWhatsApp={sendWhatsAppMessage}
            />
          </div>

          {/* Right Column: Financial Summary + Order Items + Notes */}
          <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-5">
            <OrderSummaryStats order={order} businessType={businessType} />
            <OrderItemsCard order={order} businessType={businessType} />
          </div>
        </div>
      </div>

      {/* Print receipt view for browser printing */}
      <OrderReceiptPrint order={order} businessType={businessType} />
    </>
  );
};

export default OrderDetailsPage;
