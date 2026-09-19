import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getToken } from "../../../lib/auth";
import { Menu, Transition } from "@headlessui/react";
import {
  ShoppingBag, DollarSign, Clock, CheckCircle,
  Search, Plus, Eye, Pencil, MessageCircle, Trash2, ChevronDown,
  X, Users, Calendar, ChevronLeft, ChevronRight,
} from "lucide-react";
import EditOrderModal from "./EditOrderModal";
import ViewOrderModal from "./ViewOrderModal";
import CreateOrderModal from "../customers/CreateOrderModal";
import Portal from "../shared/Portal";
import { Order } from "../../../types";
import { useDialog } from "../shared/DialogProvider";
import TimeRangeFilter, { TimeRange, emptyTimeRange, matchesTimeRange } from "../shared/TimeRangeFilter";
import CustomDropdown from "../shared/CustomDropdown";
import { DatePicker } from "../shared/DatePicker";
import { SkeletonPage } from "../shared/Skeleton";
import { useTableSelection } from "../shared/useTableSelection";
import { RoundCheckbox } from "../shared/RoundCheckbox";
import OrderBulkActionsBar from "./OrderBulkActionsBar";
import { useBulkProgress, FloatingBulkProgress } from "../shared/BulkProgress";
import { EmptyTableState } from "../shared/EmptyTableState";

const SYNE: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#16281D',
  background: '#fff', border: '1px solid #EAEAEA', borderRadius: 12,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', cursor: 'pointer', width: 'auto', minWidth: 120, borderRadius: 9999 };

const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#9FE870';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(159,232,112,0.2)';
};
const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#EAEAEA';
  e.currentTarget.style.boxShadow = 'none';
};

const getStatusStyle = (status: string): React.CSSProperties => {
  const s = status ? status.toLowerCase() : '';
  if (s === 'pending') return { background: 'rgba(245,158,11,0.1)', color: '#B45309', borderRadius: 9999 };
  if (s === 'confirmed') return { background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 9999 };
  if (s === 'processing') return { background: 'rgba(59,130,246,0.1)', color: '#1D4ED8', borderRadius: 9999 };
  if (s === 'shipped') return { background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 9999 };
  if (s === 'delivered' || s === 'completed') return { background: 'rgba(34,197,94,0.1)', color: '#15803D', borderRadius: 9999 };
  if (s === 'cancelled') return { background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: 9999 };
  return { background: '#F4F7F4', color: '#71717a', borderRadius: 9999 };
};

const getPaymentStatusStyle = (paymentStatus: string): React.CSSProperties => {
  const s = paymentStatus?.toLowerCase() || 'unpaid';
  if (s === 'paid') return { background: 'rgba(34,197,94,0.1)', color: '#15803D', borderRadius: 9999 };
  if (s === 'partially_paid') return { background: 'rgba(59,130,246,0.1)', color: '#1D4ED8', borderRadius: 9999 };
  if (s === 'unpaid') return { background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: 9999 };
  return { background: '#F4F7F4', color: '#71717a', borderRadius: 9999 };
};

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableRef = useRef<HTMLDivElement>(null);



  const { toast, confirm: dlgConfirm } = useDialog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount">("newest");
  const [timeRange, setTimeRange] = useState<TimeRange>(emptyTimeRange);
  const [estDeliveryDateFilter, setEstDeliveryDateFilter] = useState<string>("");
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    const param = searchParams.get("rows");
    if (param && [10, 20, 50, 100].includes(Number(param))) return Number(param);
    const saved = sessionStorage.getItem("orders_rows_per_page");
    if (saved && [10, 20, 50, 100].includes(Number(saved))) return Number(saved);
    return 20;
  });
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const param = searchParams.get("page");
    if (param) {
      const parsed = parseInt(param, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const saved = sessionStorage.getItem("orders_page");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 1;
  });

  const handlePageChange = (newPage: number, shouldScroll = true) => {
    const p = Math.max(1, newPage);
    setCurrentPage(p);
    sessionStorage.setItem("orders_page", String(p));
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p === 1) next.delete("page");
      else next.set("page", String(p));
      return next;
    }, { replace: true });

    if (shouldScroll) {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleRowsPerPageChange = (newRows: number) => {
    setRowsPerPage(newRows);
    sessionStorage.setItem("orders_rows_per_page", String(newRows));
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newRows === 20) next.delete("rows");
      else next.set("rows", String(newRows));
      return next;
    }, { replace: true });
    handlePageChange(1, false);
  };

  useEffect(() => {
    if (currentPage > 1 && searchParams.get("page") !== String(currentPage)) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set("page", String(currentPage));
        return next;
      }, { replace: true });
    }
  }, []);

  useEffect(() => {
    const pageFromUrl = searchParams.get("page");
    if (pageFromUrl) {
      const parsed = parseInt(pageFromUrl, 10);
      const validPage = !isNaN(parsed) && parsed > 0 ? parsed : 1;
      if (validPage !== currentPage) {
        setCurrentPage(validPage);
        sessionStorage.setItem("orders_page", String(validPage));
      }
    }
  }, [searchParams]);
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

      const [ordersResponse, customersResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }),
        fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-customers`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }),
      ]);
      if (!ordersResponse.ok) { setError("Failed to fetch orders"); setLoading(false); return; }
      const ordersData = await ordersResponse.json();
      if (!ordersData.success) { setError("Failed to fetch orders"); setLoading(false); return; }

      const ordersDataArray = ordersData.orders || [];

      const allCustMap: any = {};
      if (customersResponse.ok) {
        const custData = await customersResponse.json();
        if (custData.success && Array.isArray(custData.customers)) {
          custData.customers.forEach((c: any) => {
            allCustMap[String(c.id)] = c;
          });
        }
      }
      ordersDataArray.forEach((order: any) => {
        if (order.customer && order.customer.id) {
          allCustMap[String(order.customer.id)] = {
            ...allCustMap[String(order.customer.id)],
            ...order.customer,
          };
        }
      });
      setCustomerMap(allCustMap);

      if (ordersDataArray.length === 0) { setOrders([]); setLoading(false); return; }

      const customerMapInstance = new Map<number, any>();
      Object.entries(allCustMap).forEach(([idStr, customer]) => {
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
            currency: "Rs.",
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
    { value: "confirmed", label: "Confirmed" },
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
    const matchesCustomer = customerFilter === "" ||
      String(order.customer_id) === customerFilter ||
      order.customer_name === customerFilter ||
      order.customer_name?.toLowerCase() === customerFilter.toLowerCase();
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
    return matchesSearch && matchesCustomer && matchesStatus && matchesTime && matchesEstDelivery;
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

  const totalOrdersCount = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrdersCount / rowsPerPage));
  const effectiveCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (effectiveCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalOrdersCount);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  useEffect(() => {
    if (!loading && totalOrdersCount > 0 && currentPage > totalPages) {
      handlePageChange(totalPages, false);
    }
  }, [loading, totalOrdersCount, totalPages, currentPage]);

  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, '...', total];
    if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const handleEditOrderSuccess = () => { fetchOrders(); setShowEditModal(false); setSelectedOrder(null); };
  const handleCreateOrderSuccess = () => { fetchOrders(); setShowCreateModal(false); setSelectedCustomer(null); };

  const handleNavigateToOrder = (orderId: number) => {
    const currentOrderIds = filteredOrders.map(o => o.id);
    try {
      sessionStorage.setItem('orders_navigation_ids', JSON.stringify(currentOrderIds));
    } catch (e) {
      // ignore
    }
    navigate(`/agent/orders/${orderId}`, {
      state: { orderIds: currentOrderIds },
    });
  };

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

  // Table selection & bulk actions
  const selection = useTableSelection<number>([]);
  const { bulkProgress, isProcessing: isBulkProcessing, setBulkProgress } = useBulkProgress();
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const pageIds = paginatedOrders.map((o) => o.id);
  const isAllPageSelected = selection.isAllSelected(pageIds);
  const isPageIndeterminate = selection.isIndeterminate(pageIds);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isPageIndeterminate;
    }
  }, [isPageIndeterminate]);

  const handleBulkMarkPaid = async () => {
    const selected = orders.filter((o) => selection.selectedIds.includes(o.id));
    const unpaid = selected.filter((o) => o.payment_status !== "paid");
    if (unpaid.length === 0) {
      toast("All selected orders are already marked as paid.", "info");
      return;
    }
    if (
      !(await dlgConfirm(
        `Mark ${unpaid.length} selected order${unpaid.length > 1 ? "s" : ""} as fully paid?`
      ))
    )
      return;

    setBulkProgress({ actionLabel: "Marking orders as paid...", current: 0, total: unpaid.length });
    try {
      const token = getToken();
      if (!token) {
        toast("User not authenticated", "error");
        return;
      }
      let successCount = 0;
      for (let i = 0; i < unpaid.length; i++) {
        const order = unpaid[i];
        setBulkProgress({
          actionLabel: `Marking as paid: #${order.id}...`,
          current: i + 1,
          total: unpaid.length,
        });
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: order.id,
            payment_status: "paid",
            advance_amount: Number(order.total_amount || 0),
          }),
        });
        if (res.ok) successCount++;
      }
      toast(
        `Marked ${successCount} order${successCount > 1 ? "s" : ""} as fully paid`,
        "success"
      );
      selection.clearSelection();
      await fetchOrders();
    } catch (err: any) {
      toast(`Bulk update failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setBulkProgress(null);
    }
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    const count = selection.selectedCount;
    if (count === 0) return;
    if (
      !(await dlgConfirm(
        `Update status of ${count} selected order${count > 1 ? "s" : ""} to "${capitalizeFirst(newStatus)}"?`
      ))
    )
      return;

    const total = selection.selectedIds.length;
    setBulkProgress({ actionLabel: `Updating status to "${capitalizeFirst(newStatus)}"...`, current: 0, total });
    try {
      const token = getToken();
      if (!token) {
        toast("User not authenticated", "error");
        return;
      }
      let successCount = 0;
      for (let i = 0; i < total; i++) {
        const id = selection.selectedIds[i];
        setBulkProgress({
          actionLabel: `Updating order #${id} status...`,
          current: i + 1,
          total,
        });
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, status: newStatus }),
        });
        if (res.ok) successCount++;
      }
      toast(
        `Updated ${successCount} order${successCount > 1 ? "s" : ""} to ${newStatus}`,
        "success"
      );
      selection.clearSelection();
      await fetchOrders();
    } catch (err: any) {
      toast(`Bulk status update failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setBulkProgress(null);
    }
  };

  const handleBulkDelete = async () => {
    const count = selection.selectedCount;
    if (count === 0) return;
    if (
      !(await dlgConfirm(
        `Are you sure you want to delete ${count} selected order${count > 1 ? "s" : ""}? This action cannot be undone.`,
        { danger: true }
      ))
    )
      return;

    const total = selection.selectedIds.length;
    setBulkProgress({ actionLabel: "Deleting orders...", current: 0, total });
    try {
      const token = getToken();
      if (!token) {
        toast("User not authenticated", "error");
        return;
      }
      let successCount = 0;
      for (let i = 0; i < total; i++) {
        const id = selection.selectedIds[i];
        setBulkProgress({
          actionLabel: `Deleting order #${id}...`,
          current: i + 1,
          total,
        });
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-orders?id=${id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) successCount++;
      }
      toast(`Deleted ${successCount} order${successCount > 1 ? "s" : ""}`, "success");
      selection.clearSelection();
      await fetchOrders();
    } catch (err: any) {
      toast(`Bulk delete failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setBulkProgress(null);
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
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(22, 40, 29, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #EAEAEA', boxShadow: '0 24px 64px rgba(0,0,0,0.14)', width: '100%', maxWidth: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #EAEAEA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9999, background: 'rgba(159,232,112,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={15} style={{ color: '#16281D' }} />
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#16281D' }}>Select Customer</span>
                </div>
                <button onClick={() => { setShowCustomerSelect(false); setQuery(""); }} style={{ width: 32, height: 32, background: '#F4F7F4', border: '1px solid #EAEAEA', borderRadius: 9999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  <X size={14} style={{ color: '#71717a' }} />
                </button>
              </div>

              <div style={{ flexShrink: 0, padding: '14px 24px 10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name or phone…"
                    style={{ ...inputStyle, paddingLeft: 34, borderRadius: 9999 }}
                    onFocus={onFocusG} onBlur={onBlurG}
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>
                {filteredCustomers.length === 0 ? (
                  <div style={{ padding: '32px 12px', textAlign: 'center', fontSize: 13, color: '#71717a' }}>
                    {allCustomers.length === 0 ? "No customers available. Create customers first." : "No customers match your search."}
                  </div>
                ) : (
                  filteredCustomers.map((customer: any) => (
                    <button
                      key={customer.id}
                      onClick={() => { handleCustomerSelect(customer); setQuery(""); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#F4F7F4'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#16281D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#9FE870' }}>{customer.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#16281D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.name}</div>
                        <div style={{ fontSize: 11, color: '#71717a' }}>{customer.phone || "No phone"}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {[
            { Icon: ShoppingBag, label: 'Total Orders', value: totalOrders.toLocaleString(), iconColor: '#16281D', iconBg: 'rgba(159,232,112,0.25)' },
            { Icon: DollarSign, label: 'Total Revenue', value: `Rs. ${totalRevenue.toLocaleString()}`, iconColor: '#15803D', iconBg: 'rgba(34,197,94,0.1)' },
            { Icon: Clock, label: 'Pending Orders', value: pendingOrders, iconColor: '#B45309', iconBg: 'rgba(245,158,11,0.1)' },
            { Icon: CheckCircle, label: 'Completed Orders', value: completedOrders, iconColor: '#1D4ED8', iconBg: 'rgba(59,130,246,0.1)' },
          ].map(({ Icon, label, value, iconColor, iconBg }) => (
            <div
              key={label}
              className="bg-white rounded-[16px] sm:rounded-[20px] p-3 sm:p-5 border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.03)] min-w-0"
            >
              <div className="flex items-start justify-between mb-2 sm:mb-3.5">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: iconBg }}
                >
                  <Icon className="w-4 h-4 sm:w-[17px] sm:h-[17px]" style={{ color: iconColor }} />
                </div>
              </div>
              <div className="font-mono text-base sm:text-2xl font-bold text-[#16281D] leading-none mb-1 sm:mb-1.5 truncate" title={String(value)}>
                {value}
              </div>
              <div className="text-xs sm:text-[13px] font-medium text-[#71717a] truncate">
                {label}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, fontSize: 13, color: '#EF4444' }}>
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div
          className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3"
        >
          {/* Row 1: Search & Primary Action Row (Full width) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
            {/* Search Bar Capsule */}
            <div className="relative flex-1 min-w-0 flex items-center">
              <Search
                size={14}
                className="absolute left-3.5 text-[#a1a1aa] pointer-events-none shrink-0"
              />
              <input
                type="text"
                placeholder="Search by ID, customer, phone, or status…"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  handlePageChange(1, false);
                }}
                className="w-full h-10 pl-9 pr-9 rounded-full bg-white border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all duration-150 focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    handlePageChange(1, false);
                  }}
                  className="absolute right-3 w-5 h-5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717a] hover:text-[#16281D] cursor-pointer border-0 transition-colors"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Rows Per Page & New Order Action Button */}
            <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end shrink-0">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: '#71717a', whiteSpace: 'nowrap', fontWeight: 500 }}>Rows:</span>
                <CustomDropdown
                  value={rowsPerPage}
                  onChange={(val) => handleRowsPerPageChange(Number(val))}
                  options={[
                    { value: 10, label: "10" },
                    { value: 20, label: "20" },
                    { value: 50, label: "50" },
                    { value: 100, label: "100" },
                  ]}
                  minWidth={75}
                />
              </div>

              <button
                onClick={() => setShowCustomerSelect(true)}
                className="flex-1 sm:flex-initial justify-center rounded-full px-5 py-2.5 bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_2px_10px_rgba(159,232,112,0.3)] hover:shadow-[0_4px_16px_rgba(159,232,112,0.4)] flex items-center gap-2 shrink-0 cursor-pointer border-0 transition-all"
              >
                <Plus size={14} /> New Order
              </button>
            </div>
          </div>

          {/* Row 2: Filters Grid (Full fill 100% row width across all screen sizes) */}
          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 sm:gap-2.5 w-full">
            {/* Customer Filter */}
            <div className={`col-span-1 w-full min-w-0 ${timeRange.preset === "custom" ? "lg:w-36 xl:w-44 lg:shrink-0" : "lg:flex-1"}`}>
              <CustomDropdown
                value={customerFilter}
                onChange={(val) => {
                  setCustomerFilter(val);
                  handlePageChange(1, false);
                }}
                options={[
                  { value: "", label: "All Customers" },
                  ...allCustomers.map((c: any) => ({
                    value: String(c.id),
                    label: c.name,
                    badge: c.phone || undefined,
                  })),
                ]}
                placeholder="All Customers"
                searchable={true}
                searchPlaceholder="Search customer..."
                className="w-full"
                triggerClassName={
                  customerFilter
                    ? "!bg-[#22C55E]/10 !border-[#22C55E]/30 !text-[#16281D] !font-bold"
                    : ""
                }
              />
            </div>

            {/* Status Dropdown */}
            <div className={`col-span-1 w-full min-w-0 ${timeRange.preset === "custom" ? "lg:w-32 xl:w-36 lg:shrink-0" : "lg:flex-1"}`}>
              <CustomDropdown
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  handlePageChange(1, false);
                }}
                options={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
                className="w-full"
                triggerClassName={
                  statusFilter
                    ? "!bg-[#22C55E]/10 !border-[#22C55E]/30 !text-[#16281D] !font-bold"
                    : ""
                }
              />
            </div>

            {/* Sort Dropdown */}
            <div className={`col-span-1 w-full min-w-0 ${timeRange.preset === "custom" ? "lg:w-32 xl:w-36 lg:shrink-0" : "lg:flex-1"}`}>
              <CustomDropdown
                value={sortBy}
                onChange={(val) => {
                  setSortBy(val as any);
                  handlePageChange(1, false);
                }}
                options={[
                  { value: "newest", label: "Newest First" },
                  { value: "oldest", label: "Oldest First" },
                  { value: "amount", label: "Amount (High → Low)" },
                ]}
                className="w-full"
              />
            </div>

            {/* Est Delivery Date Picker */}
            <div className={`col-span-1 w-full min-w-0 ${timeRange.preset === "custom" ? "lg:w-32 xl:w-36 lg:shrink-0" : "lg:flex-1"}`}>
              <DatePicker
                value={estDeliveryDateFilter || null}
                onChange={(val) => {
                  setEstDeliveryDateFilter(val || '');
                  handlePageChange(1, false);
                }}
                placeholder="Est. Delivery..."
                size="md"
                variant="mint"
                align="right"
                className="w-full"
                triggerClassName={`w-full !justify-between ${
                  estDeliveryDateFilter
                    ? "!bg-[#22C55E]/10 !border-[#22C55E]/30 !text-[#16281D] !font-bold"
                    : ""
                }`}
              />
            </div>

            {/* Placed Date Filter */}
            <div className="col-span-2 lg:flex-1 w-full min-w-0">
              <TimeRangeFilter
                value={timeRange}
                onChange={range => {
                  setTimeRange(range);
                  handlePageChange(1, false);
                }}
                placeholder="Placed Date..."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <OrderBulkActionsBar
          selectedCount={selection.selectedCount}
          onBulkMarkPaid={handleBulkMarkPaid}
          onBulkUpdateStatus={handleBulkUpdateStatus}
          onBulkDelete={handleBulkDelete}
          onClearSelection={selection.clearSelection}
          isProcessing={isBulkProcessing}
          bulkProgress={bulkProgress}
        />

        {/* Floating Viewport Progress Banner */}
        <FloatingBulkProgress progress={bulkProgress} />

        {/* Table */}
        <div ref={tableRef}
          style={{ background: '#fff', borderRadius: 20, border: '1px solid #EAEAEA', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'visible', scrollMarginTop: 20, position: 'relative', zIndex: 0 }}
        >
          {orders.length === 0 ? (
            <EmptyTableState
              icon={ShoppingBag}
              title="No orders yet"
              description="Start by creating your first order for a customer."
              actionLabel="Create Order"
              onAction={() => setShowCustomerSelect(true)}
            />
          ) : filteredOrders.length === 0 ? (
            <EmptyTableState
              isFiltered
              filteredTitle="No orders found"
              filteredMessage={
                searchTerm || statusFilter
                  ? "No orders match your current filters."
                  : "No orders available."
              }
            />
          ) : (
            <>
              {/* Mobile/Tablet Card Layout */}
              <div className="block lg:hidden">
                <div className="flex flex-col divide-y divide-[#f4f4f5]">
                  {paginatedOrders.map((order, index) => {
                    const isSelected = selection.isSelected(order.id);
                    return (
                      <div
                        key={order.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button, input, [role="menu"], [role="menuitem"], .no-row-click')) return;
                          handleNavigateToOrder(order.id);
                        }}
                        className="cursor-pointer hover:bg-[#F4F7F4]/60 transition-colors"
                        style={{
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          background: isSelected ? '#f0fdf4' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <RoundCheckbox
                              checked={isSelected}
                              onChange={() => selection.toggleSelect(order.id)}
                              aria-label={`Select order #${order.id}`}
                            />
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#16281D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#9FE870' }}>
                                {order.customer_name?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#16281D' }}>{order.customer_name}</div>
                              <div style={{ fontSize: 11, color: '#71717a' }}>{order.customer_phone || "No phone"}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleNavigateToOrder(order.id)}
                            className="hover:underline cursor-pointer transition-colors"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#16281D',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                            title={`View Order #${order.id.toString().padStart(4, "0")}`}
                          >
                            #{order.id.toString().padStart(4, "0")}
                          </button>
                        </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#F4F7F4', border: '1px solid #EAEAEA', padding: '10px 12px', borderRadius: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 11, color: '#71717a' }}>Amount</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#16281D' }}>
                            {order.total_amount !== undefined ? `Rs. ${Number(order.total_amount).toFixed(2)}` : "Rs. 0.00"}
                          </span>
                          {order.payment_status === 'partially_paid' && (
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#71717a' }}>
                              Bal: Rs. {(Number(order.total_amount || 0) - Number(order.advance_amount || 0)).toFixed(2)}
                            </span>
                          )}
                          {order.payment_status === 'unpaid' && Number(order.total_amount) > 0 && (
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#71717a' }}>
                              Bal: Rs. {Number(order.total_amount || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 11, color: '#71717a' }}>Placed on</span>
                            <span style={{ fontSize: 12, color: '#16281D', fontWeight: 500 }}>
                              {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                            <span style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", color: '#71717a' }}>
                              {new Date(order.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {order.estimated_delivery_date && (
                              <span style={{ fontSize: 10.5, color: '#15803D', fontWeight: 500, marginTop: 2 }}>
                                Est: {new Date(order.estimated_delivery_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, ...getPaymentStatusStyle(order.payment_status || 'unpaid'), marginTop: 4 }}>
                            {order.payment_status === 'partially_paid' ? 'Partially Paid' : order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                        {/* Status Dropdown */}
                        <div style={{ position: 'relative' }}>
                          <Menu as="div" style={{ position: 'relative', display: 'inline-block' }}>
                            <Menu.Button
                              disabled={updatingOrderId === order.id}
                              style={{ ...getStatusStyle(order.status), fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 9999, border: 'none', cursor: updatingOrderId === order.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: updatingOrderId === order.id ? 0.6 : 1 }}
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
                              <Menu.Items style={{ position: 'absolute', left: 0, marginTop: 4, width: 160, background: '#fff', border: '1px solid #EAEAEA', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, padding: 4, outline: 'none' }}>
                                {statusOptions.filter(o => o.value !== "").map(option => (
                                  <Menu.Item key={option.value}>
                                    {({ active }) => (
                                      <button
                                        disabled={updatingOrderId === order.id}
                                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, background: active ? 'rgba(159,232,112,0.15)' : order.status === option.value ? 'rgba(159,232,112,0.08)' : 'transparent', color: order.status === option.value ? '#16281D' : '#71717a', fontWeight: order.status === option.value ? 700 : 500 }}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { Icon: Eye, color: '#16281D', bg: '#F4F7F4', hbg: 'rgba(159,232,112,0.3)', title: 'View Details', onClick: () => handleNavigateToOrder(order.id) },
                            { Icon: Pencil, color: '#B45309', bg: 'rgba(245,158,11,0.1)', hbg: 'rgba(245,158,11,0.2)', title: 'Edit', onClick: () => { setSelectedOrder(order); setShowEditModal(true); } },
                            ...(order.payment_status !== 'paid' ? [{ Icon: CheckCircle, color: '#15803D', bg: 'rgba(34,197,94,0.1)', hbg: 'rgba(34,197,94,0.2)', title: 'Paid Fully', onClick: () => markAsFullyPaid(order) }] : []),
                            { Icon: MessageCircle, color: '#1D4ED8', bg: 'rgba(59,130,246,0.1)', hbg: 'rgba(59,130,246,0.2)', title: 'Message', onClick: () => navigate(`/agent/conversations?customerId=${order.customer_id}`) },
                            { Icon: Trash2, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', hbg: 'rgba(239,68,68,0.16)', title: 'Delete', onClick: () => deleteOrder(order.id) },
                          ].map(({ Icon, color, bg, hbg, title, onClick }) => (
                            <button key={title} onClick={onClick} title={title}
                              className="w-8 h-8 rounded-full border border-[#EAEAEA] flex items-center justify-center cursor-pointer shrink-0 transition-all"
                              style={{ background: bg }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = hbg}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = bg}
                            >
                              <Icon size={14} style={{ color }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>

              {/* Desktop Table Layout - No horizontal scroll */}
              <div className="hidden lg:block w-full">
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ ...thCell, width: '38px', textAlign: 'center', padding: '12px 6px' }}>
                      <RoundCheckbox
                        ref={selectAllCheckboxRef}
                        checked={isAllPageSelected}
                        indeterminate={isPageIndeterminate}
                        onChange={() => selection.selectAll(pageIds)}
                        title="Select all on current page"
                        aria-label="Select all orders on current page"
                      />
                    </th>
                    <th style={{ ...thCell, width: '10%' }}>Order ID</th>
                    <th style={{ ...thCell, width: '22%' }}>Customer</th>
                    <th style={{ ...thCell, width: '14%' }}>Date</th>
                    <th style={{ ...thCell, textAlign: 'right', width: '14%' }}>Amount</th>
                    <th style={{ ...thCell, width: '13%' }}>Payment Status</th>
                    <th style={{ ...thCell, width: '13%' }}>Status</th>
                    <th style={{ ...thCell, textAlign: 'right', width: '14%', minWidth: 155 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order, index) => {
                    const isSelected = selection.isSelected(order.id);
                    return (
                      <tr
                        key={order.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button, input, [role="menu"], [role="menuitem"], .no-row-click')) return;
                          handleNavigateToOrder(order.id);
                        }}
                        style={{
                          borderBottom: '1px solid #EAEAEA',
                          transition: 'background 0.1s',
                          background: isSelected ? 'rgba(159,232,112,0.08)' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLTableRowElement).style.background = '#F4F7F4';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                          }
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ textAlign: 'center', padding: '12px 6px', whiteSpace: 'nowrap' }}>
                          <RoundCheckbox
                            checked={isSelected}
                            onChange={() => selection.toggleSelect(order.id)}
                            aria-label={`Select order #${order.id}`}
                          />
                        </td>

                        {/* Order ID */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => handleNavigateToOrder(order.id)}
                            className="hover:underline text-left cursor-pointer transition-colors"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#16281D',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                            title={`View Order #${order.id.toString().padStart(4, "0")}`}
                          >
                            #{order.id.toString().padStart(4, "0")}
                          </button>
                        </td>

                      {/* Customer */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#16281D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#9FE870' }}>
                              {order.customer_name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#16281D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.customer_name}>
                              {order.customer_name}
                            </span>
                            {order.customer_phone && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: '#71717a',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={order.customer_phone}
                              >
                                {order.customer_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#16281D' }}>
                            {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          <span style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", color: '#71717a' }}>
                            {new Date(order.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {order.estimated_delivery_date && (
                            <span style={{ fontSize: 10.5, color: '#15803D', fontWeight: 500, marginTop: 1 }} title="Estimated Delivery Date">
                              Est: {new Date(order.estimated_delivery_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#16281D' }}>
                          {order.total_amount !== undefined ? `Rs. ${Number(order.total_amount).toFixed(2)}` : "Rs. 0.00"}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, width: 'fit-content', padding: '3px 10px', borderRadius: 9999, ...getPaymentStatusStyle(order.payment_status || 'unpaid') }}>
                            {order.payment_status === 'partially_paid' ? 'Partially Paid' : order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                          {order.payment_status === 'partially_paid' && (
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#71717a', paddingLeft: 4 }}>
                              Bal: Rs. {(Number(order.total_amount || 0) - Number(order.advance_amount || 0)).toFixed(2)}
                            </span>
                          )}
                          {order.payment_status === 'unpaid' && Number(order.total_amount) > 0 && (
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#71717a', paddingLeft: 4 }}>
                              Bal: Rs. {Number(order.total_amount || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status — headlessui Menu with inline styles */}
                      <td style={{ padding: '12px 16px', position: 'relative' }}>
                        <Menu as="div" style={{ position: 'relative', display: 'inline-block' }}>
                          <Menu.Button
                            disabled={updatingOrderId === order.id}
                            style={{ ...getStatusStyle(order.status), fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 9999, border: 'none', cursor: updatingOrderId === order.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: updatingOrderId === order.id ? 0.6 : 1 }}
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
                            <Menu.Items style={{ position: 'absolute', left: 0, marginTop: 4, width: 160, background: '#fff', border: '1px solid #EAEAEA', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, padding: 4, outline: 'none' }}>
                              {statusOptions.filter(o => o.value !== "").map(option => (
                                <Menu.Item key={option.value}>
                                  {({ active }) => (
                                    <button
                                      disabled={updatingOrderId === order.id}
                                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, background: active ? 'rgba(159,232,112,0.15)' : order.status === option.value ? 'rgba(159,232,112,0.08)' : 'transparent', color: order.status === option.value ? '#16281D' : '#71717a', fontWeight: order.status === option.value ? 700 : 500 }}
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
                      <td style={{ padding: '12px 16px', width: '14%', minWidth: 155 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {[
                            { Icon: Eye, color: '#16281D', bg: '#F4F7F4', hbg: 'rgba(159,232,112,0.3)', title: 'View Details', onClick: () => handleNavigateToOrder(order.id) },
                            { Icon: Pencil, color: '#B45309', bg: 'rgba(245,158,11,0.1)', hbg: 'rgba(245,158,11,0.2)', title: 'Edit', onClick: () => { setSelectedOrder(order); setShowEditModal(true); } },
                            ...(order.payment_status !== 'paid' ? [{ Icon: CheckCircle, color: '#15803D', bg: 'rgba(34,197,94,0.1)', hbg: 'rgba(34,197,94,0.2)', title: 'Paid Fully', onClick: () => markAsFullyPaid(order) }] : []),
                            { Icon: MessageCircle, color: '#1D4ED8', bg: 'rgba(59,130,246,0.1)', hbg: 'rgba(59,130,246,0.2)', title: 'Message', onClick: () => navigate(`/agent/conversations?customerId=${order.customer_id}`) },
                            { Icon: Trash2, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', hbg: 'rgba(239,68,68,0.16)', title: 'Delete', onClick: () => deleteOrder(order.id) },
                          ].map(({ Icon, color, bg, hbg, title, onClick }) => (
                            <button key={title} onClick={onClick} title={title}
                              style={{ width: 28, height: 28, borderRadius: 9999, background: bg, border: '1px solid #EAEAEA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = hbg}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = bg}
                            >
                              <Icon size={13} style={{ color }} />
                            </button>
                          ))}
                        </div>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #EAEAEA',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {/* Entries Status */}
              <div style={{ fontSize: 12, color: '#71717a' }}>
                Showing <strong style={{ color: '#16281D' }}>{totalOrdersCount === 0 ? 0 : startIndex + 1}</strong> to <strong style={{ color: '#16281D' }}>{endIndex}</strong> of <strong style={{ color: '#16281D' }}>{totalOrdersCount}</strong> orders
              </div>

              {/* Page Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(Math.max(1, effectiveCurrentPage - 1), true)}
                  disabled={effectiveCurrentPage <= 1}
                  title="Previous page"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 9999,
                    border: '1px solid #EAEAEA',
                    background: effectiveCurrentPage <= 1 ? '#F4F7F4' : '#fff',
                    color: effectiveCurrentPage <= 1 ? '#d4d4d8' : '#16281D',
                    cursor: effectiveCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (effectiveCurrentPage > 1) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#9FE870'; (e.currentTarget as HTMLButtonElement).style.background = '#F4F7F4'; } }}
                  onMouseLeave={e => { if (effectiveCurrentPage > 1) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#EAEAEA'; (e.currentTarget as HTMLButtonElement).style.background = '#fff'; } }}
                >
                  <ChevronLeft size={14} />
                </button>

                {/* Page Number Buttons */}
                {getPageNumbers(effectiveCurrentPage, totalPages).map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`dots-${idx}`} style={{ fontSize: 12, color: '#a1a1aa', padding: '0 4px' }}>
                        …
                      </span>
                    );
                  }
                  const isCurrent = p === effectiveCurrentPage;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p as number, true)}
                      style={{
                        minWidth: 32,
                        height: 32,
                        padding: '0 10px',
                        borderRadius: 9999,
                        border: isCurrent ? '1px solid #9FE870' : '1px solid #EAEAEA',
                        background: isCurrent ? '#9FE870' : '#fff',
                        color: '#16281D',
                        fontSize: 12,
                        fontWeight: isCurrent ? 700 : 500,
                        cursor: 'pointer',
                        boxShadow: isCurrent ? '0 2px 8px rgba(159,232,112,0.3)' : 'none',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!isCurrent) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#9FE870'; (e.currentTarget as HTMLButtonElement).style.background = '#F4F7F4'; } }}
                      onMouseLeave={e => { if (!isCurrent) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#EAEAEA'; (e.currentTarget as HTMLButtonElement).style.background = '#fff'; } }}
                    >
                      {p}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, effectiveCurrentPage + 1), true)}
                  disabled={effectiveCurrentPage >= totalPages}
                  title="Next page"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 9999,
                    border: '1px solid #EAEAEA',
                    background: effectiveCurrentPage >= totalPages ? '#F4F7F4' : '#fff',
                    color: effectiveCurrentPage >= totalPages ? '#d4d4d8' : '#16281D',
                    cursor: effectiveCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (effectiveCurrentPage < totalPages) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#9FE870'; (e.currentTarget as HTMLButtonElement).style.background = '#F4F7F4'; } }}
                  onMouseLeave={e => { if (effectiveCurrentPage < totalPages) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#EAEAEA'; (e.currentTarget as HTMLButtonElement).style.background = '#fff'; } }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </>
  );
};

export default OrdersPage;
