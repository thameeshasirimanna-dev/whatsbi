import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { Appointment } from "../../../types";
import { Menu, Transition, Combobox, Popover } from "@headlessui/react";
import CreateAppointmentModal from "./CreateAppointmentModal";
import ViewAppointmentModal from "./ViewAppointmentModal";
import EditAppointmentModal from "./EditAppointmentModal";
import { useAppointments } from "../../../hooks/useAppointments";
import { motion } from "framer-motion";
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
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: index * 0.15,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: index * 0.05,
      ease: "easeOut",
    },
  }),
};

const toolbarVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, delay: 0.4 },
  },
};

const searchVariants = {
  hidden: { x: 10, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, delay: 0.5 },
  },
};

const controlsVariants = {
  hidden: { x: -10, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, delay: 0.6 },
  },
};

const buttonVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.2, delay: 0.9 },
  },
};

const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const AppointmentsPage: React.FC = () => {
  const {
    appointments,
    loading,
    error,
    refetch,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments();

  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerMap, setCustomerMap] = useState<{ [key: number]: any }>({});
  const [query, setQuery] = useState("");

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAppointmentForView, setSelectedAppointmentForView] =
    useState<Appointment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointmentForEdit, setSelectedAppointmentForEdit] =
    useState<Appointment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAppointmentForDelete, setSelectedAppointmentForDelete] =
    useState<Appointment | null>(null);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<
    number | null
  >(null);

  const fetchAgentInfo = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("id, agent_prefix")
        .eq("user_id", user.id)
        .single();

      if (agentError || !agentData) return;

      setAgentId(Number(agentData.id));
      setAgentPrefix(agentData.agent_prefix);

      if (!agentData.agent_prefix) return;

      const customersTable = `${agentData.agent_prefix}_customers`;
      const { data: agentCustomers, error: customersError } = await supabase
        .from(customersTable)
        .select("id, name, phone")
        .eq("agent_id", agentData.id);

      if (customersError) return;

      setAllCustomers(agentCustomers || []);
      setCustomerMap(
        agentCustomers?.reduce((map: any, c: any) => {
          map[c.id] = c;
          return map;
        }, {}) || {}
      );
    } catch (err) {
      console.error("Error fetching agent info:", err);
    }
  }, []);

  const handleRefetch = useCallback(async () => {
    const customerId = customerFilter
      ? allCustomers.find((c) => c.name === customerFilter)?.id
      : null;
    await refetch({
      customerId,
      status: statusFilter || null,
      limit: 50,
      offset: 0,
    });
  }, [customerFilter, statusFilter, allCustomers, refetch]);

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointmentForView(appointment);
    setShowViewModal(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointmentForEdit(appointment);
    setShowEditModal(true);
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointmentForDelete) return;

    try {
      await deleteAppointment(selectedAppointmentForDelete.id);
      handleRefetch();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setShowDeleteConfirm(false);
      setSelectedAppointmentForDelete(null);
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: number,
    newStatus: "pending" | "confirmed" | "completed" | "cancelled"
  ) => {
    setUpdatingAppointmentId(appointmentId);

    try {
      await updateAppointment(appointmentId, { status: newStatus });
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update status");
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setSelectedAppointmentForDelete(null);
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setShowCustomerSelect(false);
    setShowCreateModal(true);
  };

  const handleCreateAppointmentSuccess = () => {
    handleRefetch();
    setShowCreateModal(false);
    setSelectedCustomer(null);
  };

  const handleUpdateAppointmentSuccess = () => {
    handleRefetch();
    setShowEditModal(false);
    setSelectedAppointmentForEdit(null);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedAppointmentForView(null);
  };

  useEffect(() => {
    fetchAgentInfo();
  }, [fetchAgentInfo]);

  useEffect(() => {
    if (agentPrefix) {
      handleRefetch();
    }
  }, [handleRefetch, agentPrefix]);

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const capitalizeFirst = (str: string): string => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const totalAppointments = appointments.length;
  const pendingAppointments = appointments.filter(
    (a) => a.status.toLowerCase() === "pending"
  ).length;
  const upcomingAppointments = appointments.filter(
    (a) => new Date(a.appointment_date) > new Date() && a.status !== "cancelled"
  ).length;

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch =
      searchTerm === "" ||
      appointment.customer_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.status.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCustomer =
      customerFilter === "" || appointment.customer_name === customerFilter;

    const matchesStatus =
      statusFilter === "" || appointment.status.toLowerCase() === statusFilter;

    return matchesSearch && matchesCustomer && matchesStatus;
  });

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
    if (lowerStatus === "pending") return "bg-yellow-100 text-yellow-800";
    if (lowerStatus === "confirmed") return "bg-blue-100 text-blue-800";
    if (lowerStatus === "completed") return "bg-green-100 text-green-800";
    if (lowerStatus === "cancelled") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <>
      {showCreateModal && selectedCustomer && (
        <CreateAppointmentModal
          customer={selectedCustomer}
          createAppointment={createAppointment}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={handleCreateAppointmentSuccess}
        />
      )}

      {showViewModal && selectedAppointmentForView && (
        <ViewAppointmentModal
          appointment={selectedAppointmentForView}
          onClose={handleCloseViewModal}
        />
      )}

      {showEditModal && selectedAppointmentForEdit && (
        <EditAppointmentModal
          appointment={selectedAppointmentForEdit}
          updateAppointment={updateAppointment}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAppointmentForEdit(null);
          }}
          onSuccess={handleUpdateAppointmentSuccess}
        />
      )}

      {showDeleteConfirm && selectedAppointmentForDelete && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={handleCloseDeleteConfirm}
          />
          <div className="relative bg-white rounded-xl w-full max-w-md p-6 z-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Appointment
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the appointment "
              {selectedAppointmentForDelete.title}" for{" "}
              {selectedAppointmentForDelete.customer_name}?
              <br />
              This action cannot be undone.
            </p>
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleCloseDeleteConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAppointment}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div
        className="p-6 flex flex-col flex-1 min-h-0"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
          variants={gridVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={cardVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h3 className="text-sm font-medium text-gray-500">
              Total Appointments
            </h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {totalAppointments}
            </p>
          </motion.div>
          <motion.div
            variants={cardVariants}
            custom={1}
            initial="hidden"
            animate="visible"
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h3 className="text-sm font-medium text-gray-500">Pending</h3>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {pendingAppointments}
            </p>
          </motion.div>
          <motion.div
            variants={cardVariants}
            custom={2}
            initial="hidden"
            animate="visible"
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h3 className="text-sm font-medium text-gray-500">Upcoming</h3>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {upcomingAppointments}
            </p>
          </motion.div>
        </motion.div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 animate-in fade-in-0 duration-300">
            Error: {error}
          </div>
        )}

        {/* Filters */}
        <motion.div
          className="mb-6 bg-white p-4 rounded-xl border border-gray-200"
          variants={toolbarVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Search Filter */}
            <div>
              <input
                type="text"
                placeholder="Search appointments by customer, title, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Customer Filter */}
            <div>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Customers</option>
                {allCustomers.map((customer, index) => (
                  <option key={index} value={customer.name}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <motion.div
              variants={controlsVariants}
              initial="hidden"
              animate="visible"
            >
              <Menu as="div" className="relative">
                <Menu.Button className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-left flex justify-between items-center">
                  {statusOptions.find((opt) => opt.value === statusFilter)
                    ?.label || "All Statuses"}
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
                  <Menu.Items className="absolute right-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
                    {statusOptions.map((option) => (
                      <Menu.Item key={option.value}>
                        {({ active }: { active: boolean }) => (
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

            {/* Clear Filters and Create */}
            <motion.div
              variants={buttonVariants}
              initial="hidden"
              animate="visible"
              className="flex justify-end space-x-3"
            >
              <button
                onClick={() => {
                  setCustomerFilter("");
                  setStatusFilter("");
                  setSearchTerm("");
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                title="Clear Filters"
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
              <motion.button
                variants={buttonVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ scale: 1.05 }}
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
                Create Appointment
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Appointments Table */}
        <motion.div
          className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 relative h-full"
          variants={pageVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredAppointments.length === 0 ? (
            <motion.div
              className="text-center py-16 h-full flex flex-col items-center justify-center space-y-6"
              variants={pageVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-green-50 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 p-4">
                <svg
                  className="w-10 h-10 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="max-w-md space-y-3">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {appointments.length === 0 ? "No appointments yet" : "No matching appointments"}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {appointments.length === 0
                    ? "Get started by scheduling your first appointment with a customer to manage your bookings effectively."
                    : searchTerm
                      ? `No appointments match "${searchTerm}". Try a different search term.`
                      : "No appointments match your current filters. Adjust your criteria or clear all filters to see more results."}
                </p>
              </div>
              {appointments.length === 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCustomerSelect(true)}
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Schedule First Appointment
                </motion.button>
              )}
            </motion.div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="overflow-visible flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Appointment #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
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
                    {filteredAppointments.map((appointment, index) => (
                      <motion.tr
                        key={appointment.id}
                        variants={rowVariants}
                        custom={index}
                        initial="hidden"
                        animate="visible"
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            #{appointment.id.toString().padStart(4, "0")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap relative">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {appointment.customer_name
                                  ?.charAt(0)
                                  .toUpperCase() || "?"}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {appointment.customer_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {appointment.customer_phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {appointment.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(
                            appointment.appointment_date
                          ).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {appointment.duration_minutes} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Menu
                            as="div"
                            className="relative inline-block text-left"
                          >
                            <Menu.Button
                              disabled={
                                updatingAppointmentId === appointment.id
                              }
                              className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                                appointment.status
                              )} ${
                                updatingAppointmentId === appointment.id
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              {updatingAppointmentId === appointment.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                  Updating...
                                </>
                              ) : (
                                <>
                                  {capitalizeFirst(appointment.status)}
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
                              <Menu.Items className="absolute left-0 mt-2 w-48 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[10000] border border-gray-200">
                                {statusOptions
                                  .filter((opt) => opt.value !== "")
                                  .map((option) => (
                                    <Menu.Item key={option.value}>
                                      {({ active }) => (
                                        <button
                                          disabled={
                                            updatingAppointmentId ===
                                            appointment.id
                                          }
                                          className={`${
                                            active ? "bg-gray-100" : ""
                                          } ${
                                            appointment.status === option.value
                                              ? "bg-green-50 text-green-700"
                                              : ""
                                          } ${
                                            updatingAppointmentId ===
                                            appointment.id
                                              ? "opacity-50 cursor-not-allowed"
                                              : ""
                                          } block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100`}
                                          onClick={() => {
                                            if (
                                              confirm(
                                                `Change appointment status to ${option.label}?`
                                              )
                                            ) {
                                              updateAppointmentStatus(
                                                appointment.id,
                                                option.value as
                                                  | "pending"
                                                  | "confirmed"
                                                  | "completed"
                                                  | "cancelled"
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
                          {/* Placeholder actions - View, Edit, Delete to be implemented */}
                          <button
                            onClick={() => handleViewAppointment(appointment)}
                            className="text-green-600 hover:text-green-900 mr-3 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditAppointment(appointment)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAppointmentForDelete(appointment);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                        const filteredCustomers =
                          query === ""
                            ? Object.values(customerMap)
                            : Object.values(customerMap).filter(
                                (customer: any) =>
                                  customer.name
                                    .toLowerCase()
                                    .includes(query.toLowerCase()) ||
                                  customer.phone?.includes(query.toLowerCase())
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
                              No customers available. Create some customers
                              first.
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
                                        active
                                          ? "text-blue-100"
                                          : "text-gray-500"
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
                {/* Options handled in Combobox */}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
};

export default AppointmentsPage;