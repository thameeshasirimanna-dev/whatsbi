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
  OrderUpdatePayload,
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState(false);

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

  const fetchOrderDetails = useCallback(async (isRefresh = false) => {
    if (!id) {
      setError('Order ID not provided');
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const user = await getCurrentUser();
      if (!user.success || !user.user) {
        setError('User not authenticated');
        return;
      }

      const agent = await getCurrentAgent();
      if (!agent) {
        setError('Agent not found');
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
        return;
      }
      const orderDataResult = await orderResponse.json();
      const orderData = orderDataResult.order || (orderDataResult.orders && orderDataResult.orders[0]);
      if (!orderDataResult.success || !orderData) {
        setError('Order not found');
        return;
      }

      let customerName = orderData.customer?.name || orderData.customer_name || '';
      let customerPhone = orderData.customer?.phone || orderData.customer_phone || '';
      if (!customerName && orderData.customer_id) {
        try {
          const custRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-customers?id=${orderData.customer_id}`, {
            headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
          });
          if (custRes.ok) {
            const custJson = await custRes.json();
            if (custJson.success && custJson.customers?.[0]) {
              customerName = custJson.customers[0].name || customerName;
              customerPhone = custJson.customers[0].phone || customerPhone;
            }
          }
        } catch (e) {
          console.warn('Failed to fetch customer fallback', e);
        }
      }

      let orderItems: OrderItem[] = [];
      if (Array.isArray(orderData.items) && orderData.items.length > 0) {
        orderItems = orderData.items.map((it: any) => ({
          name: it.name,
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || 0,
          total: Number(it.total) || (Number(it.quantity) || 1) * (Number(it.price) || 0),
        }));
      } else if (Array.isArray(orderData.order_details?.items)) {
        orderItems = orderData.order_details.items;
      } else {
        try {
          const itRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=items&order_id=${id}`, {
            headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
          });
          if (itRes.ok) {
            const itJson = await itRes.json();
            if (itJson.success && itJson.items) {
              orderItems = itJson.items.map((it: any) => ({
                name: it.name,
                quantity: Number(it.quantity) || 1,
                price: Number(it.price) || 0,
                total: Number(it.quantity * it.price) || 0,
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
      if (isRefresh) {
        toast('Order refreshed', 'success');
      }
    } catch (err) {
      setError('Failed to load order details');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchOrderDetails(false);
  }, [fetchOrderDetails]);

  // Unified Order Update Handler: supports status, payment_status, advance, total, items, delivery date, address, notes, customer details
  const handleUpdateOrder = async (payload: OrderUpdatePayload) => {
    if (!id || !agentId || !agentPrefix) return;
    try {
      setUpdatingOrder(true);
      const token = getToken();
      if (!token) {
        toast('User not authenticated', 'error');
        return;
      }

      const body: Record<string, any> = { id: Number(id) };
      if (payload.status !== undefined) body.status = payload.status;
      if (payload.payment_status !== undefined) body.payment_status = payload.payment_status;
      if (payload.advance_amount !== undefined) body.advance_amount = payload.advance_amount;
      if (payload.total_amount !== undefined) body.total_amount = payload.total_amount;
      if (payload.estimated_delivery_date !== undefined) body.estimated_delivery_date = payload.estimated_delivery_date;
      if (payload.shipping_address !== undefined) body.shipping_address = payload.shipping_address;
      if (payload.notes !== undefined) body.notes = payload.notes;
      if (payload.items !== undefined) body.items = payload.items;
      if (payload.customer_name !== undefined) body.customer_name = payload.customer_name;
      if (payload.customer_phone !== undefined) body.customer_phone = payload.customer_phone;

      const updateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!updateResponse.ok) {
        const errJson = await updateResponse.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update order');
      }

      const updateData = await updateResponse.json();
      if (!updateData.success) {
        throw new Error(updateData.message || 'Failed to update order');
      }

      // Reactively apply updates to local state
      setOrder((prev) => {
        if (!prev) return null;
        const newItems = payload.items || prev.order_details.items;
        const newTotal = payload.total_amount ?? (payload.items
          ? payload.items.reduce((s, i) => s + (Number(i.quantity) || 1) * (Number(i.price) || 0), 0)
          : prev.order_details.total_amount);

        return {
          ...prev,
          ...(payload.status !== undefined && { status: payload.status }),
          ...(payload.payment_status !== undefined && { payment_status: payload.payment_status }),
          ...(payload.advance_amount !== undefined && { advance_amount: payload.advance_amount }),
          ...(payload.estimated_delivery_date !== undefined && { estimated_delivery_date: payload.estimated_delivery_date || '' }),
          ...(payload.customer_name !== undefined && { customer_name: payload.customer_name }),
          ...(payload.customer_phone !== undefined && { customer_phone: payload.customer_phone }),
          order_details: {
            ...prev.order_details,
            items: newItems,
            total_amount: newTotal,
            ...(payload.shipping_address !== undefined && { shipping_address: payload.shipping_address }),
            ...(payload.notes !== undefined && { notes: payload.notes }),
          },
          updated_at: new Date().toISOString(),
        };
      });

      toast('Order updated successfully', 'success');
    } catch (err: any) {
      console.error('Update order error:', err);
      toast(err.message || 'Failed to update order', 'error');
    } finally {
      setUpdatingOrder(false);
    }
  };

  const sendWhatsAppMessage = () => {
    if (!order || !order.customer_phone) {
      toast('Customer phone number not available', 'error');
      return;
    }
    const isService = businessType === 'service';
    const phoneNumber = order.customer_phone.replace(/\D/g, '');
    const total = Number(order.order_details.total_amount) || 0;
    const advance = Number(order.advance_amount || 0);
    const balance = Math.max(0, total - advance);
    const formattedOrderId = String(order.id).padStart(4, '0');

    const statusLabel = order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending';
    const paymentLabel = order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'partially_paid' ? 'Partially Paid' : 'Unpaid';

    let message = `*${isService ? 'Service Booking' : 'Order'} #${formattedOrderId} Update*\n\n`;
    message += `Hello ${order.customer_name},\n`;
    message += `Here is the current update on your ${isService ? 'booking' : 'order'}:\n\n`;
    message += `*Status:* ${statusLabel}\n`;
    message += `*Payment:* ${paymentLabel}\n`;

    if (order.estimated_delivery_date) {
      message += `*${isService ? 'Scheduled Date' : 'Estimated Delivery'}:* ${order.estimated_delivery_date}\n`;
    }

    message += `\n*${isService ? 'Services' : 'Items'}:*\n`;
    order.order_details.items.forEach((item) => {
      message += `• ${item.name} (${item.quantity} x Rs. ${item.price.toFixed(2)}) = Rs. ${item.total.toFixed(2)}\n`;
    });

    message += `\n*Total Amount:* Rs. ${total.toFixed(2)}\n`;
    if (advance > 0) {
      message += `*Advance Paid:* Rs. ${advance.toFixed(2)}\n`;
      message += `*Balance Due:* Rs. ${balance.toFixed(2)}\n`;
    }

    if (order.order_details.shipping_address) {
      message += `\n*${isService ? 'Service Location' : 'Delivery Address'}:* ${order.order_details.shipping_address}\n`;
    }

    if (order.order_details.notes) {
      message += `\n*Note:* ${order.order_details.notes}\n`;
    }

    message += `\nThank you for choosing us!`;

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
        {/* Header with Navigation Controls & Refresh */}
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
          onRefresh={() => fetchOrderDetails(true)}
          refreshing={refreshing}
        />

        {/* Full-Width Order Financial & Items Summary KPIs */}
        <OrderSummaryStats order={order} businessType={businessType} />

        {error && (
          <div className="p-3.5 bg-[#EF4444]/6 border border-[#EF4444]/15 rounded-xl text-xs font-semibold text-[#EF4444]">
            {error}
          </div>
        )}

        {/* Balanced Responsive Grid: 7 cols for Order Content & Items, 5 cols for Controls & Customer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
          {/* Left Column (7 cols): Order Line Items (editable) + Notes & Delivery Address */}
          <div className="lg:col-span-7 flex flex-col gap-3.5 sm:gap-4 h-full">
            <OrderItemsCard
              order={order}
              businessType={businessType}
              onUpdateOrder={handleUpdateOrder}
              updating={updatingOrder}
            />
          </div>

          {/* Right Column (5 cols): Order Status & Payments Management + Customer Details */}
          <div className="lg:col-span-5 flex flex-col gap-3.5 sm:gap-4 h-full">
            <OrderStatusCard
              order={order}
              businessType={businessType}
              updatingStatus={updatingOrder}
              onUpdateOrder={handleUpdateOrder}
              onSendWhatsApp={sendWhatsAppMessage}
            />
            <OrderCustomerCard
              order={order}
              businessType={businessType}
              onUpdateCustomer={handleUpdateOrder}
              updating={updatingOrder}
            />
          </div>
        </div>
      </div>

      {/* Print receipt view for browser printing */}
      <OrderReceiptPrint order={order} businessType={businessType} />
    </>
  );
};

export default OrderDetailsPage;

