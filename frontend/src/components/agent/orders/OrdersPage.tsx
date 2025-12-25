import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../../lib/auth";
import EditOrderModal from "./EditOrderModal";
import ViewOrderModal from "./ViewOrderModal";
import CreateOrderModal from "../customers/CreateOrderModal";
import { Menu, Transition, Combobox } from "@headlessui/react";
import { motion } from "framer-motion";

import { Order } from "../../../types";


const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: i * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    }),
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: i * 0.05,
        ease: "easeOut",
      },
    }),
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount">(
    "newest"
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] =
    useState<Order | null>(null);
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

      // Get token
      const token = getToken();
      if (!token) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      const agentResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!agentResponse.ok) {
        setError("Failed to fetch agent profile");
        setLoading(false);
        return;
      }

      const agentProfile = await agentResponse.json();
      if (!agentProfile.success || !agentProfile.agent) {
        setError("Agent not found");
        setLoading(false);
        return;
      }

      const agentData = agentProfile.agent;
      const currentAgentId = agentData.id;
      const currentAgentPrefix = agentData.agent_prefix;
      setAgentId(currentAgentId);
      setAgentPrefix(currentAgentPrefix);

      if (!currentAgentPrefix) {
        setError("Agent prefix not found");
        setLoading(false);
        return;
      }

      // Fetch orders from backend
      const ordersResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!ordersResponse.ok) {
        setError("Failed to fetch orders");
        setLoading(false);
        return;
      }

      const ordersData = await ordersResponse.json();
      if (!ordersData.success) {
        setError("Failed to fetch orders");
        setLoading(false);
        return;
      }

      const ordersDataArray = ordersData.orders || [];
      if (ordersDataArray.length === 0) {
        setOrders([]);
        setCustomerMap({});
        setLoading(false);
        return;
      }

      // Build customer map from the joined data
      const customerMapFromOrders = ordersDataArray.reduce(
        (map: any, order: any) => {
          if (order.customer) {
            map[String(order.customer.id)] = order.customer;
          }
          return map;
        },
        {}
      );

      setCustomerMap(customerMapFromOrders);

      // Use customer map from orders for names and phones
      const customerMapInstance = new Map<number, any>();
      Object.entries(customerMapFromOrders).forEach(([idStr, customer]) => {
        const idNum = Number(idStr);
        if (!isNaN(idNum)) {
          customerMapInstance.set(idNum, customer);
        }
      });

      // Process orders
      const processedOrders: Order[] = ordersDataArray.map((order: any) => {
        const totalAmount = Number(order.total_amount) || 0;
        const customerIdNum = Number(order.customer_id);
        const customerInfo = customerMapInstance.get(customerIdNum) || {
          name: "Unknown Customer",
          phone: "",
        };

        return {
          id: order.id,
          customer_id: order.customer_id,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          total_amount: totalAmount,
          status: order.status || "pending",
          notes: order.notes,
          shipping_address: order.shipping_address,
          created_at: order.created_at,
          parsed_order_details: {
            items: (order.order_items || []).map((item: any) => ({
              name: item.name,
              quantity: Number(item.quantity),
              price: Number(item.price),
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

  useEffect(() => {
    fetchOrders();
  }, []);

  const statusOptions = [
    { value: "", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "amount", label: "Amount (High to Low)" },
  ];

  const capitalizeFirst = (str: string): string => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const extractOrderText = (order: Order): string => {
    let text = "";
    // For now, use notes and status for search
    // Items would require additional query
    if (order.notes) {
      text += order.notes + " ";
    }
    text += order.status;
    return text.toLowerCase();
  };

  let filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchTerm === "" ||
      order.id.toString().includes(searchTerm) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_phone && order.customer_phone.includes(searchTerm)) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      extractOrderText(order).includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "" || order.status.toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort filtered orders
  filteredOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "newest") {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === "oldest") {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else if (sortBy === "amount") {
      return (b.total_amount || 0) - (a.total_amount || 0);
    }
    return 0;
  });

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (o) => o.status.toLowerCase() === "pending"
  ).length;
  const completedOrders = orders.filter(
    (o) =>
      o.status.toLowerCase() === "completed" ||
      o.status.toLowerCase() === "delivered"
  ).length;
  const totalRevenue = orders
    .filter(
      (o) =>
        o.status.toLowerCase() === "completed" ||
        o.status.toLowerCase() === "delivered"
    )
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const handleEditOrderSuccess = () => {
    fetchOrders();
    setShowEditModal(false);
    setSelectedOrder(null);
  };

  const handleCreateOrderSuccess = () => {
    fetchOrders();
    setShowCreateModal(false);
    setSelectedCustomer(null);
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    setUpdatingOrderId(orderId);

    try {
      const token = getToken();
      if (!token) {
        alert("User not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: orderId,
            status: newStatus,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        alert(
          `Failed to update status: ${errorData.message || "Unknown error"}`
        );
        return;
      }

      // Refresh the orders list
      await fetchOrders();
    } catch (err: any) {
      console.error("Update error:", err);
      alert(`Failed to update status: ${err.message || "Unknown error"}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const deleteOrder = async (orderId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this order? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        alert("User not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders?id=${orderId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        alert(
          `Failed to delete order: ${errorData.message || "Unknown error"}`
        );
        return;
      }

      // Refresh the orders list
      await fetchOrders();
      alert("Order deleted successfully");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(`Failed to delete order: ${err.message || "Unknown error"}`);
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setShowCustomerSelect(false);
    setShowCreateModal(true);
  };

  const handleViewOrderClose = () => {
    setShowViewModal(false);
    setSelectedOrderForView(null);
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

  const getStatusBadgeClass = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "pending") return "bg-yellow-100 text-yellow-700";
    if (lowerStatus === "processing") return "bg-blue-100 text-blue-800";
    if (lowerStatus === "shipped") return "bg-purple-100 text-purple-800";
    if (lowerStatus === "delivered" || lowerStatus === "completed")
      return "bg-green-100 text-green-700";
    if (lowerStatus === "cancelled") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <>
      {showEditModal && selectedOrder && agentPrefix && agentId && (
        <EditOrderModal
          order={selectedOrder}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={handleEditOrderSuccess}
          agentPrefix={agentPrefix}
          agentId={agentId}
        />
      )}
      {showCreateModal && selectedCustomer && agentPrefix && agentId && (
        <CreateOrderModal
          customer={selectedCustomer}
          agentPrefix={agentPrefix}
          agentId={agentId}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={handleCreateOrderSuccess}
        />
      )}
      {showViewModal && selectedOrderForView && agentPrefix && agentId && (
        <ViewOrderModal
          order={selectedOrderForView}
          onClose={handleViewOrderClose}
          agentPrefix={agentPrefix}
          agentId={agentId}
        />
      )}
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="p-6"
      >
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Orders Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Orders
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {totalOrders.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center text-green-600">
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
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  <span className="ml-1 text-sm font-medium">+12.5%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Total Revenue Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    LKR {totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center text-green-600">
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
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  <span className="ml-1 text-sm font-medium">+8.2%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Pending Orders Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Orders
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {pendingOrders}
                  </p>
                </div>
                <div className="flex items-center text-amber-600">
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
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  <span className="ml-1 text-sm font-medium">+3.1%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Completed Orders Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Completed Orders
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {completedOrders}
                  </p>
                </div>
                <div className="flex items-center text-green-600">
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
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  <span className="ml-1 text-sm font-medium">+15.7%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 animate-in fade-in-0 duration-300">
            Error: {error}
          </div>
        )}

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 p-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="flex-1 min-w-0"
            >
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search orders by ID, customer name, or phone"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className="flex flex-wrap gap-2 items-center min-w-max"
            >
              {/* Status Filter */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.7 }}
              >
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {statusOptions.find((opt) => opt.value === statusFilter)
                      ?.label || "All"}
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </Menu.Button>
                  <Transition
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      {statusOptions.map((option) => (
                        <Menu.Item key={option.value}>
                          {({ active }) => (
                            <button
                              className={`w-full text-left px-4 py-2 text-sm ${
                                active ? "bg-gray-100" : ""
                              } ${
                                statusFilter === option.value
                                  ? "bg-green-50 text-green-700"
                                  : ""
                              }`}
                              onClick={() => setStatusFilter(option.value)}
                            >
                              {option.label}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </Menu.Items>
                  </Transition>
                </Menu>
              </motion.div>

              {/* Sort Dropdown */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.8 }}
              >
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {sortOptions.find((opt) => opt.value === sortBy)?.label ||
                      "Newest"}
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </Menu.Button>
                  <Transition
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      {sortOptions.map((option) => (
                        <Menu.Item key={option.value}>
                          {({ active }) => (
                            <button
                              className={`w-full text-left px-4 py-2 text-sm ${
                                active ? "bg-gray-100" : ""
                              } ${
                                sortBy === option.value
                                  ? "bg-green-50 text-green-700"
                                  : ""
                              }`}
                              onClick={() =>
                                setSortBy(
                                  option.value as "newest" | "oldest" | "amount"
                                )
                              }
                            >
                              {option.label}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </Menu.Items>
                  </Transition>
                </Menu>
              </motion.div>

              {/* New Order Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.9 }}
                onClick={() => setShowCustomerSelect(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                New Order
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        {/* Divider */}
        <motion.hr
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 1.0 }}
          className="border-gray-200 mb-6"
        />

        {/* Orders Table */}
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible"
        >
          {orders.length === 0 ? (
            <motion.div
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No orders yet!
              </h3>
              <p className="text-gray-500 mb-4">
                Start by creating your first order for a customer.
              </p>
              <button
                onClick={() => setShowCustomerSelect(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 animate-in fade-in-0 duration-300"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Create Order
              </button>
            </motion.div>
          ) : filteredOrders.length === 0 ? (
            <motion.div
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No orders found
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter
                  ? `No orders match your current filters.`
                  : "No orders available."}
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              className="overflow-visible"
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      custom={index}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #ORD-{order.id.toString().padStart(4, "0")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {order.customer_name?.charAt(0).toUpperCase() ||
                                "?"}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {order.customer_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {order.total_amount !== undefined
                          ? `LKR ${order.total_amount.toFixed(2)}`
                          : "LKR 0.00"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap relative">
                        <Menu
                          as="div"
                          className="relative inline-block text-left"
                        >
                          <Menu.Button
                            disabled={updatingOrderId === order.id}
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                              order.status
                            )} ${
                              updatingOrderId === order.id
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {updatingOrderId === order.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                Updating...
                              </>
                            ) : (
                              <>
                                {capitalizeFirst(order.status)}
                                <svg
                                  className="w-3 h-3 ml-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </>
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
                            <Menu.Items className="origin-top-left absolute left-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[10000] border border-gray-200 divide-y divide-gray-100">
                              {statusOptions
                                .filter((opt) => opt.value !== "")
                                .map((option) => (
                                  <Menu.Item key={option.value}>
                                    {({ active }) => (
                                      <button
                                        disabled={updatingOrderId === order.id}
                                        className={`block w-full text-left px-4 py-2 text-sm ${
                                          active
                                            ? "bg-gray-100 text-gray-900"
                                            : "text-gray-700"
                                        } ${
                                          order.status === option.value
                                            ? "bg-green-50 text-green-700"
                                            : ""
                                        } ${
                                          updatingOrderId === order.id
                                            ? "opacity-50 cursor-not-allowed"
                                            : ""
                                        }`}
                                        onClick={() => {
                                          if (
                                            confirm(
                                              `Change order status to ${option.label}?`
                                            )
                                          ) {
                                            updateOrderStatus(
                                              order.id,
                                              option.value
                                            );
                                          }
                                        }}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedOrderForView(order);
                              setShowViewModal(true);
                            }}
                            title="View"
                            className="text-gray-400 hover:text-green-600 p-1 transition-colors"
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
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowEditModal(true);
                            }}
                            title="Edit"
                            className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
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
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.5H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              navigate(
                                `/agent/conversations?customerId=${order.customer_id}`
                              );
                            }}
                            title="New Message"
                            className="text-gray-400 hover:text-indigo-600 p-1 transition-colors"
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
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            title="Delete Order"
                            className="text-gray-400 hover:text-red-600 p-1 transition-colors"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Customer Selection Modal */}
      {showCustomerSelect && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setShowCustomerSelect(false)}
          />
          <div className="relative bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col z-50">
            <div className="sticky top-0 bg-white p-6 pb-4 border-b border-gray-200 z-20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Select Customer</h3>
                <button
                  onClick={() => setShowCustomerSelect(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
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
              <Combobox
                value={selectedCustomer}
                onChange={handleCustomerSelect}
              >
                <div className="relative">
                  <Combobox.Input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    displayValue={(customer: any) =>
                      customer ? customer.name : ""
                    }
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search customers by name or phone..."
                  />
                  <Combobox.Options className="absolute mt-1 max-h-96 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                    {(() => {
                      const allCustomerObjects = Object.values(customerMap);
                      const filteredCustomers =
                        query === ""
                          ? allCustomerObjects
                          : allCustomerObjects.filter(
                              (customer: any) =>
                                customer.name
                                  .toLowerCase()
                                  .includes(query.toLowerCase()) ||
                                (customer.phone &&
                                  customer.phone.includes(query.toLowerCase()))
                            );
                      if (
                        filteredCustomers.length === 0 &&
                        Object.keys(customerMap).length > 0
                      ) {
                        return (
                          <Combobox.Option
                            value={null}
                            className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900"
                          >
                            No customers found.
                          </Combobox.Option>
                        );
                      }
                      if (Object.keys(customerMap).length === 0) {
                        return (
                          <Combobox.Option
                            value={null}
                            className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900"
                          >
                            No customers available. Create some customers first.
                          </Combobox.Option>
                        );
                      }
                      return filteredCustomers.map((customer: any) => (
                        <Combobox.Option
                          key={customer.id}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-3 pr-9 ${
                              active
                                ? "bg-blue-600 text-white"
                                : "text-gray-900"
                            }`
                          }
                          value={customer}
                        >
                          {({ selected, active }) => (
                            <>
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center ${
                                    active ? "bg-blue-200" : ""
                                  }`}
                                >
                                  <span
                                    className={`text-blue-600 font-medium text-sm ${
                                      active ? "text-white" : ""
                                    }`}
                                  >
                                    {customer.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span
                                    className={`block truncate ${
                                      selected ? "font-medium" : "font-normal"
                                    } ${
                                      active ? "text-white" : "text-gray-900"
                                    }`}
                                  >
                                    {customer.name}
                                  </span>
                                  <span
                                    className={`text-sm block truncate ${
                                      active ? "text-blue-100" : "text-gray-500"
                                    }`}
                                  >
                                    {customer.phone || "No phone"}
                                  </span>
                                </div>
                              </div>
                              {selected ? (
                                <span
                                  className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                                    active ? "text-white" : "text-blue-600"
                                  }`}
                                >
                                  <svg
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </span>
                              ) : null}
                            </>
                          )}
                        </Combobox.Option>
                      ));
                    })()}
                  </Combobox.Options>
                </div>
              </Combobox>
            </div>
            <div className="flex-1 overflow-y-auto p-6 pt-0">
              {/* The options are already handling the scroll via max-h-96 overflow-auto */}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrdersPage;
