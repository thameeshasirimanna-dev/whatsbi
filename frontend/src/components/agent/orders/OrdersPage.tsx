import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../../lib/auth";
import { Menu, Transition } from "@headlessui/react";
import { motion } from "framer-motion";
import {
  ShoppingBag, DollarSign, Clock, CheckCircle,
  Search, Plus, Eye, Pencil, MessageCircle, Trash2, ChevronDown,
  X, Users, Calendar,
} from "lucide-react";
import EditOrderModal from "./EditOrderModal";
import ViewOrderModal from "./ViewOrderModal";
import CreateOrderModal from "../customers/CreateOrderModal";
import Portal from "../shared/Portal";
import { Order } from "../../../types";
import { useDialog } from "../shared/DialogProvider";
import TimeRangeFilter, { TimeRange, emptyTimeRange, matchesTimeRange } from "../shared/TimeRangeFilter";
import { SkeletonPage } from "../shared/Skeleton";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46',
  background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', cursor: 'pointer', width: 'auto', minWidth: 120 };

const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

const getStatusStyle = (status: string): React.CSSProperties => {
  const s = status.toLowerCase();
  if (s === 'pending') return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  if (s === 'processing') return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
  if (s === 'shipped') return { background: 'rgba(124,58,237,0.1)', color: '#7c3aed' };
  if (s === 'delivered' || s === 'completed') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'cancelled') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

const getPaymentStatusStyle = (paymentStatus: string): React.CSSProperties => {
  const s = paymentStatus?.toLowerCase() || 'unpaid';
  if (s === 'paid') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'partially_paid') return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
  if (s === 'unpaid') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] as any } }),
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.05, ease: "easeOut" } }),
  };

  const { toast, confirm: dlgConfirm } = useDialog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount">("newest");
  const [timeRange, setTimeRange] = useState<TimeRange>(emptyTimeRange);
  const [estDeliveryDateFilter, setEstDeliveryDateFilter] = useState<string>("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] = useState<Order | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerMap, setCustomerMap] = useState<{ [key: string]: any }>({});
  const [query, setQuery] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) { setError("User not authenticated"); setLoading(false); return; }

      const agentResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!agentResponse.ok) { setError("Failed to fetch agent profile"); setLoading(false); return; }
      const agentProfile = await agentResponse.json();
      if (!agentProfile.success || !agentProfile.agent) { setError("Agent not found"); setLoading(false); return; }

      const agentData = agentProfile.agent;
      setAgentId(agentData.id);
      setAgentPrefix(agentData.agent_prefix);
      if (!agentData.agent_prefix) { setError("Agent prefix not found"); setLoading(false); return; }

      const ordersResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!ordersResponse.ok) { setError("Failed to fetch orders"); setLoading(false); return; }
      const ordersData = await ordersResponse.json();
      if (!ordersData.success) { setError("Failed to fetch orders"); setLoading(false); return; }

      const ordersDataArray = ordersData.orders || [];
      if (ordersDataArray.length === 0) { setOrders([]); setCustomerMap({}); setLoading(false); return; }

      const customerMapFromOrders = ordersDataArray.reduce((map: any, order: any) => {
        if (order.customer) map[String(order.customer.id)] = order.customer;
        return map;
      }, {});
      setCustomerMap(customerMapFromOrders);

      const customerMapInstance = new Map<number, any>();
      Object.entries(customerMapFromOrders).forEach(([idStr, customer]) => {
        const idNum = Number(idStr);
        if (!isNaN(idNum)) customerMapInstance.set(idNum, customer);
      });

      const processedOrders: Order[] = ordersDataArray.map((order: any) => {
        const totalAmount = Number(order.total_amount) || 0;
        const customerIdNum = Number(order.customer_id);
        const customerInfo = customerMapInstance.get(customerIdNum) || { name: "Unknown Customer", phone: "" };
        return {
          id: order.id,
          customer_id: order.customer_id,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          total_amount: totalAmount,
          advance_amount: Number(order.advance_amount) || 0,
          payment_status: order.payment_status || "unpaid",
          status: order.status || "pending",
          notes: order.notes,
          shipping_address: order.shipping_address,
          estimated_delivery_date: order.estimated_delivery_date,
          created_at: order.created_at,
          parsed_order_details: {
            items: (order.order_items || []).map((item: any) => ({
              name: item.name, quantity: Number(item.quantity), price: Number(item.price),
              total: Number(item.quantity) * Number(item.price),
            })),
            total_amount: totalAmount,
            shipping_address: order.shipping_address,
            currency: "LKR",
            created_via: "manual",
          },
          type: "order" as const,
        };
      });

      setOrders(processedOrders);
    } catch (err) {
      setError("Failed to load orders");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const capitalizeFirst = (str: string): string => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const extractOrderText = (order: Order): string => {
    let text = "";
    if (order.notes) text += order.notes + " ";
    text += order.status;
    return text.toLowerCase();
  };

  let filteredOrders = orders.filter((order) => {
    const matchesSearch = searchTerm === "" ||
      order.id.toString().includes(searchTerm) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_phone && order.customer_phone.includes(searchTerm)) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      extractOrderText(order).includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "" || order.status.toLowerCase() === statusFilter;
    const matchesTime = matchesTimeRange(order.created_at, timeRange);
    const matchesEstDelivery = estDeliveryDateFilter === "" || (
      order.estimated_delivery_date ? (() => {
        const d = new Date(order.estimated_delivery_date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}` === estDeliveryDateFilter;
      })() : false
    );
    return matchesSearch && matchesStatus && matchesTime && matchesEstDelivery;
  });

  filteredOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "amount") return (b.total_amount || 0) - (a.total_amount || 0);
    return 0;
  });

  const totalOrders = filteredOrders.length;
  const pendingOrders = filteredOrders.filter(o => o.status.toLowerCase() === "pending").length;
  const completedOrders = filteredOrders.filter(o => ["completed", "delivered"].includes(o.status.toLowerCase())).length;
  const totalRevenue = filteredOrders.filter(o => ["completed", "delivered"].includes(o.status.toLowerCase()))
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const handleEditOrderSuccess = () => { fetchOrders(); setShowEditModal(false); setSelectedOrder(null); };
  const handleCreateOrderSuccess = () => { fetchOrders(); setShowCreateModal(false); setSelectedCustomer(null); };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const token = getToken();
      if (!token) { toast("User not authenticated", 'error'); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      if (!response.ok) { const errorData = await response.json(); toast(`Failed to update status: ${errorData.message || "Unknown error"}`, 'error'); return; }
      await fetchOrders();
    } catch (err: any) {
      console.error("Update error:", err);
      toast(`Failed to update status: ${err.message || "Unknown error"}`, 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const markAsFullyPaid = async (order: Order) => {
    if (!await dlgConfirm(`Are you sure you want to mark Order #${order.id.toString().padStart(4, "0")} as fully paid?`)) return;
    setUpdatingOrderId(order.id);
    try {
      const token = getToken();
      if (!token) { toast("User not authenticated", 'error'); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          payment_status: 'paid',
          advance_amount: Number(order.total_amount || 0)
        }),
      });
      if (!response.ok) { const errorData = await response.json(); toast(`Failed to mark as paid: ${errorData.message || "Unknown error"}`, 'error'); return; }
      toast("Order marked as fully paid", 'success');
      await fetchOrders();
    } catch (err: any) {
      console.error("Update error:", err);
      toast(`Failed to mark as paid: ${err.message || "Unknown error"}`, 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const deleteOrder = async (orderId: number) => {
    if (!await dlgConfirm("Are you sure you want to delete this order? This action cannot be undone.", { danger: true })) return;
    try {
      const token = getToken();
      if (!token) { toast("User not authenticated", 'error'); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders?id=${orderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { const errorData = await response.json(); toast(`Failed to delete order: ${errorData.message || "Unknown error"}`, 'error'); return; }
      await fetchOrders();
      toast("Order deleted successfully", 'success');
    } catch (err: any) {
      console.error("Delete error:", err);
      toast(`Failed to delete order: ${err.message || "Unknown error"}`, 'error');
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setShowCustomerSelect(false);
    setShowCreateModal(true);
  };

  const handleViewOrderClose = () => { setShowViewModal(false); setSelectedOrderForView(null); };

  const thCell: React.CSSProperties = {
    padding: '10px 16px', ...DM, fontSize: 11, fontWeight: 600,
    color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em',
    textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #ebebeb',
  };

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  const allCustomers = Object.values(customerMap);
  const filteredCustomers = query === ""
    ? allCustomers
    : allCustomers.filter((c: any) =>
        c.name?.toLowerCase().includes(query.toLowerCase()) ||
        (c.phone && c.phone.includes(query))
      );

  return (
    <>
      <style>{`@keyframes op-spin { to { transform: rotate(360deg); } }`}</style>

      {showEditModal && selectedOrder && agentPrefix && agentId && (
        <EditOrderModal order={selectedOrder} onClose={() => { setShowEditModal(false); setSelectedOrder(null); }} onSuccess={handleEditOrderSuccess} agentPrefix={agentPrefix} agentId={agentId} />
      )}
      {showCreateModal && selectedCustomer && agentPrefix && agentId && (
        <CreateOrderModal customer={selectedCustomer} agentPrefix={agentPrefix} agentId={agentId} onClose={() => { setShowCreateModal(false); setSelectedCustomer(null); }} onSuccess={handleCreateOrderSuccess} />
      )}
      {showViewModal && selectedOrderForView && agentPrefix && agentId && (
        <ViewOrderModal order={selectedOrderForView} onClose={handleViewOrderClose} onSuccess={fetchOrders} agentPrefix={agentPrefix} agentId={agentId} />
      )}

      {/* Customer Select Modal */}
      {showCustomerSelect && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={15} style={{ color: '#22c55e' }} />
                  </div>
                  <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Select Customer</span>
                </div>
                <button onClick={() => { setShowCustomerSelect(false); setQuery(""); }} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} style={{ color: '#71717a' }} />
                </button>
              </div>

              <div style={{ flexShrink: 0, padding: '14px 24px 10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name or phone…"
                    style={{ ...inputStyle, paddingLeft: 30 }}
                    onFocus={onFocusG} onBlur={onBlurG}
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>
                {filteredCustomers.length === 0 ? (
                  <div style={{ padding: '32px 12px', textAlign: 'center', ...DM, fontSize: 13, color: '#71717a' }}>
                    {allCustomers.length === 0 ? "No customers available. Create customers first." : "No customers match your search."}
                  </div>
                ) : (
                  filteredCustomers.map((customer: any) => (
                    <button
                      key={customer.id}
                      onClick={() => { handleCustomerSelect(customer); setQuery(""); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.05)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#fff' }}>{customer.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.name}</div>
                        <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>{customer.phone || "No phone"}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { Icon: ShoppingBag, label: 'Total Orders', value: totalOrders.toLocaleString(), iconColor: '#22c55e', iconBg: 'rgba(34,197,94,0.1)', i: 0 },
            { Icon: DollarSign, label: 'Total Revenue', value: `LKR ${totalRevenue.toLocaleString()}`, iconColor: '#059669', iconBg: 'rgba(5,150,105,0.1)', i: 1 },
            { Icon: Clock, label: 'Pending Orders', value: pendingOrders, iconColor: '#d97706', iconBg: 'rgba(217,119,6,0.1)', i: 2 },
            { Icon: CheckCircle, label: 'Completed Orders', value: completedOrders, iconColor: '#0891b2', iconBg: 'rgba(8,145,178,0.1)', i: 3 },
          ].map(({ Icon, label, value, iconColor, iconBg, i }) => (
            <motion.div key={label} variants={cardVariants} initial="hidden" animate="visible" custom={i}
              style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} style={{ color: iconColor }} />
                </div>
              </div>
              <div style={{ ...SYNE, fontSize: 26, fontWeight: 800, color: '#0c1a0e', lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#71717a' }}>{label}</div>
            </motion.div>
          ))}
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e' }}>
            {error}
          </div>
        )}

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '14px 18px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
            <input type="text" placeholder="Search by ID, customer, or phone…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle, paddingLeft: 30 }} onFocus={onFocusG} onBlur={onBlurG} />
          </div>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle} onFocus={onFocusG} onBlur={onBlurG}>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={selectStyle} onFocus={onFocusG} onBlur={onBlurG}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount">Amount (High → Low)</option>
          </select>

          <TimeRangeFilter value={timeRange} onChange={setTimeRange} placeholder="Placed Date..." />

          {/* Est. Delivery Date Filter */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ position: "relative" }}>
              <Calendar
                size={13}
                style={{
                  position: "absolute",
                  left: 9,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: estDeliveryDateFilter ? "#059669" : "#a1a1aa",
                  pointerEvents: "none",
                }}
              />
              <input
                type="date"
                value={estDeliveryDateFilter}
                onChange={(e) => setEstDeliveryDateFilter(e.target.value)}
                onFocus={onFocusG}
                onBlur={onBlurG}
                style={{
                  ...inputStyle,
                  padding: "9px 10px 9px 28px",
                  minWidth: 156,
                  cursor: "pointer",
                  background: estDeliveryDateFilter ? "rgba(34,197,94,0.06)" : "#f9f9f9",
                  border: estDeliveryDateFilter ? "1px solid rgba(34,197,94,0.35)" : "1px solid #ebebeb",
                  color: estDeliveryDateFilter ? "#0c1a0e" : "#a1a1aa",
                }}
              />
            </div>
            {estDeliveryDateFilter && (
              <button
                onClick={() => setEstDeliveryDateFilter('')}
                title="Clear estimated delivery date filter"
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  background: "rgba(244,63,94,0.08)",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.14)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.08)")}
              >
                <X size={12} style={{ color: "#f43f5e" }} />
              </button>
            )}
          </div>

          <button onClick={() => setShowCustomerSelect(true)} style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Plus size={14} /> New Order
          </button>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'visible' }}
        >
          {orders.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <ShoppingBag size={22} style={{ color: '#d4d4d8' }} />
              </div>
              <div style={{ ...SYNE, fontSize: 15, fontWeight: 600, color: '#0c1a0e', marginBottom: 6 }}>No orders yet</div>
              <div style={{ ...DM, fontSize: 13, color: '#71717a', marginBottom: 20 }}>Start by creating your first order for a customer.</div>
              <button onClick={() => setShowCustomerSelect(true)} style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} /> Create Order
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Search size={20} style={{ color: '#d4d4d8' }} />
              </div>
              <div style={{ ...SYNE, fontSize: 14, fontWeight: 600, color: '#0c1a0e', marginBottom: 4 }}>No orders found</div>
              <div style={{ ...DM, fontSize: 12, color: '#71717a' }}>
                {searchTerm || statusFilter ? "No orders match your current filters." : "No orders available."}
              </div>
            </div>
          ) : (
            <>
              {/* Mobile/Tablet Card Layout */}
              <div className="block lg:hidden">
                <div className="flex flex-col divide-y divide-[#f4f4f5]">
                  {filteredOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      variants={rowVariants} initial="hidden" animate="visible" custom={index}
                      style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ ...SYNE, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                              {order.customer_name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{order.customer_name}</div>
                            <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>{order.customer_phone || "No phone"}</div>
                          </div>
                        </div>

                        <span style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#0c1a0e' }}>
                          #{order.id.toString().padStart(4, "0")}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#fafafa', padding: '10px 12px', borderRadius: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Amount</span>
                          <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>
                            {order.total_amount !== undefined ? `LKR ${Number(order.total_amount).toFixed(2)}` : "LKR 0.00"}
                          </span>
                          {order.payment_status === 'partially_paid' && (
                            <span style={{ ...DM, fontSize: 10, color: '#71717a' }}>
                              Bal: LKR {(Number(order.total_amount || 0) - Number(order.advance_amount || 0)).toFixed(2)}
                            </span>
                          )}
                          {order.payment_status === 'unpaid' && Number(order.total_amount) > 0 && (
                            <span style={{ ...DM, fontSize: 10, color: '#71717a' }}>
                              Bal: LKR {Number(order.total_amount || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Placed on</span>
                            <span style={{ ...DM, fontSize: 12, color: '#3f3f46', fontWeight: 500 }}>
                              {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                            {order.estimated_delivery_date && (
                              <span style={{ ...DM, fontSize: 10, color: '#059669', fontWeight: 500, marginTop: 2 }}>
                                Est. Del: {new Date(order.estimated_delivery_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            )}
                          </div>
                          <span style={{ ...DM, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, ...getPaymentStatusStyle(order.payment_status || 'unpaid'), marginTop: 4 }}>
                            {order.payment_status === 'partially_paid' ? 'Partially Paid' : order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                        {/* Status Dropdown */}
                        <div style={{ position: 'relative' }}>
                          <Menu as="div" style={{ position: 'relative', display: 'inline-block' }}>
                            <Menu.Button
                              disabled={updatingOrderId === order.id}
                              style={{ ...getStatusStyle(order.status), ...DM, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: updatingOrderId === order.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: updatingOrderId === order.id ? 0.6 : 1 }}
                            >
                              {updatingOrderId === order.id ? (
                                <><div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'currentColor', animation: 'op-spin 0.7s linear infinite' }} />Updating…</>
                              ) : (
                                <>{capitalizeFirst(order.status)}<ChevronDown size={10} /></>
                              )}
                            </Menu.Button>
                            <Transition
                              enter="transition ease-out duration-100"
                              enterFrom="transform opacity-0 scale-95"
                              enterTo="transform opacity-100 scale-100"
                              leave="transition ease-in duration-75"
                              leaveFrom="transform opacity-100 scale-100"
                              leaveTo="transform opacity-0 scale-95"
                            >
                              <Menu.Items style={{ position: 'absolute', left: 0, marginTop: 4, width: 160, background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, padding: 4, outline: 'none' }}>
                                {statusOptions.filter(o => o.value !== "").map(option => (
                                  <Menu.Item key={option.value}>
                                    {({ active }) => (
                                      <button
                                        disabled={updatingOrderId === order.id}
                                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', ...DM, fontSize: 12, background: active ? 'rgba(34,197,94,0.06)' : order.status === option.value ? 'rgba(34,197,94,0.04)' : 'transparent', color: order.status === option.value ? '#059669' : '#3f3f46' }}
                                        onClick={async () => { if (await dlgConfirm(`Change order status to ${option.label}?`)) updateOrderStatus(order.id, option.value); }}
                                      >
                                        {option.label}
                                      </button>
                                    )}
                                  </Menu.Item>
                                ))}
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[
                            { Icon: Eye, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', hbg: 'rgba(34,197,94,0.15)', title: 'View', onClick: () => { setSelectedOrderForView(order); setShowViewModal(true); } },
                            { Icon: Pencil, color: '#d97706', bg: 'rgba(217,119,6,0.08)', hbg: 'rgba(217,119,6,0.15)', title: 'Edit', onClick: () => { setSelectedOrder(order); setShowEditModal(true); } },
                            ...(order.payment_status !== 'paid' ? [{ Icon: CheckCircle, color: '#16a34a', bg: 'rgba(22,163,74,0.08)', hbg: 'rgba(22,163,74,0.15)', title: 'Paid Fully', onClick: () => markAsFullyPaid(order) }] : []),
                            { Icon: MessageCircle, color: '#0891b2', bg: 'rgba(8,145,178,0.08)', hbg: 'rgba(8,145,178,0.15)', title: 'Message', onClick: () => navigate(`/agent/conversations?customerId=${order.customer_id}`) },
                            { Icon: Trash2, color: '#f43f5e', bg: 'rgba(244,63,94,0.06)', hbg: 'rgba(244,63,94,0.12)', title: 'Delete', onClick: () => deleteOrder(order.id) },
                          ].map(({ Icon, color, bg, hbg, title, onClick }) => (
                            <button key={title} onClick={onClick} title={title}
                              style={{ width: 28, height: 28, borderRadius: 7, background: bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = hbg}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = bg}
                            >
                              <Icon size={13} style={{ color }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Order ID', 'Customer', 'Date', 'Amount', 'Payment Status', 'Status', 'Actions'].map((h, i) => (
                      <th key={h} style={{ ...thCell, textAlign: i === 3 || i === 6 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}>
                  {filteredOrders.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      variants={rowVariants} initial="hidden" animate="visible" custom={index}
                      style={{ borderBottom: '1px solid #f4f4f5', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(34,197,94,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      {/* Order ID */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>
                          #{order.id.toString().padStart(4, "0")}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ ...SYNE, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                              {order.customer_name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>
                          <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', whiteSpace: 'nowrap' }}>{order.customer_name}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>
                            {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          {order.estimated_delivery_date && (
                            <span style={{ ...DM, fontSize: 10.5, color: '#059669', fontWeight: 500 }} title="Estimated Delivery Date">
                              Est: {new Date(order.estimated_delivery_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>
                          {order.total_amount !== undefined ? `LKR ${Number(order.total_amount).toFixed(2)}` : "LKR 0.00"}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ ...DM, fontSize: 11, fontWeight: 600, width: 'fit-content', padding: '3px 10px', borderRadius: 20, ...getPaymentStatusStyle(order.payment_status || 'unpaid') }}>
                            {order.payment_status === 'partially_paid' ? 'Partially Paid' : order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                          {order.payment_status === 'partially_paid' && (
                            <span style={{ ...DM, fontSize: 10, color: '#71717a', paddingLeft: 4 }}>
                              Bal: LKR {(Number(order.total_amount || 0) - Number(order.advance_amount || 0)).toFixed(2)}
                            </span>
                          )}
                          {order.payment_status === 'unpaid' && Number(order.total_amount) > 0 && (
                            <span style={{ ...DM, fontSize: 10, color: '#71717a', paddingLeft: 4 }}>
                              Bal: LKR {Number(order.total_amount || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status — headlessui Menu with inline styles */}
                      <td style={{ padding: '12px 16px', position: 'relative' }}>
                        <Menu as="div" style={{ position: 'relative', display: 'inline-block' }}>
                          <Menu.Button
                            disabled={updatingOrderId === order.id}
                            style={{ ...getStatusStyle(order.status), ...DM, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: updatingOrderId === order.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: updatingOrderId === order.id ? 0.6 : 1 }}
                          >
                            {updatingOrderId === order.id ? (
                              <>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'currentColor', animation: 'op-spin 0.7s linear infinite' }} />
                                Updating…
                              </>
                            ) : (
                              <>{capitalizeFirst(order.status)}<ChevronDown size={10} /></>
                            )}
                          </Menu.Button>
                          <Transition
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items style={{ position: 'absolute', left: 0, marginTop: 4, width: 160, background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, padding: 4, outline: 'none' }}>
                              {statusOptions.filter(o => o.value !== "").map(option => (
                                <Menu.Item key={option.value}>
                                  {({ active }) => (
                                    <button
                                      disabled={updatingOrderId === order.id}
                                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', ...DM, fontSize: 12, background: active ? 'rgba(34,197,94,0.06)' : order.status === option.value ? 'rgba(34,197,94,0.04)' : 'transparent', color: order.status === option.value ? '#059669' : '#3f3f46' }}
                                      onClick={async () => { if (await dlgConfirm(`Change order status to ${option.label}?`)) updateOrderStatus(order.id, option.value); }}
                                    >
                                      {option.label}
                                    </button>
                                  )}
                                </Menu.Item>
                              ))}
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5 }}>
                          {[
                            { Icon: Eye, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', hbg: 'rgba(34,197,94,0.15)', title: 'View', onClick: () => { setSelectedOrderForView(order); setShowViewModal(true); } },
                            { Icon: Pencil, color: '#d97706', bg: 'rgba(217,119,6,0.08)', hbg: 'rgba(217,119,6,0.15)', title: 'Edit', onClick: () => { setSelectedOrder(order); setShowEditModal(true); } },
                            ...(order.payment_status !== 'paid' ? [{ Icon: CheckCircle, color: '#16a34a', bg: 'rgba(22,163,74,0.08)', hbg: 'rgba(22,163,74,0.15)', title: 'Paid Fully', onClick: () => markAsFullyPaid(order) }] : []),
                            { Icon: MessageCircle, color: '#0891b2', bg: 'rgba(8,145,178,0.08)', hbg: 'rgba(8,145,178,0.15)', title: 'Message', onClick: () => navigate(`/agent/conversations?customerId=${order.customer_id}`) },
                            { Icon: Trash2, color: '#f43f5e', bg: 'rgba(244,63,94,0.06)', hbg: 'rgba(244,63,94,0.12)', title: 'Delete', onClick: () => deleteOrder(order.id) },
                          ].map(({ Icon, color, bg, hbg, title, onClick }) => (
                            <button key={title} onClick={onClick} title={title}
                              style={{ width: 28, height: 28, borderRadius: 7, background: bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = hbg}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = bg}
                            >
                              <Icon size={13} style={{ color }} />
                            </button>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>
      </motion.div>
    </>
  );
};

export default OrdersPage;
