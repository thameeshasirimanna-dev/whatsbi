import React, { useState, useEffect, useCallback } from "react";
import { Appointment } from "../../../types";
import { Search, Plus, X } from "lucide-react";
import { useAppointments } from "../../../hooks/useAppointments";
import { getToken } from "../../../lib/auth";
import { useDialog } from "../shared/DialogProvider";
import TimeRangeFilter, { TimeRange, emptyTimeRange, matchesTimeRange } from "../shared/TimeRangeFilter";
import CustomDropdown from "../shared/CustomDropdown";
import { SkeletonPage } from "../shared/Skeleton";
import CreateAppointmentModal from "./CreateAppointmentModal";
import ViewAppointmentModal from "./ViewAppointmentModal";
import EditAppointmentModal from "./EditAppointmentModal";
import DeleteAppointmentModal from "./DeleteAppointmentModal";
import SelectCustomerModal from "./SelectCustomerModal";
import AppointmentSummaryCards from "./AppointmentSummaryCards";
import AppointmentTable from "./AppointmentTable";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

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
  const { toast } = useDialog();

  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>(emptyTimeRange);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  // Modals
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAppointmentForView, setSelectedAppointmentForView] = useState<Appointment | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointmentForEdit, setSelectedAppointmentForEdit] = useState<Appointment | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAppointmentForDelete, setSelectedAppointmentForDelete] = useState<Appointment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<number | null>(null);

  const fetchAgentInfo = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) return;
      const agentProfile = await response.json();
      if (!agentProfile.success || !agentProfile.agent) return;
      setAgentPrefix(agentProfile.agent.agent_prefix);

      const customersResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-customers`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!customersResponse.ok) return;
      const customersData = await customersResponse.json();
      if (customersData.success) {
        setAllCustomers(customersData.customers || []);
      }
    } catch (err) {
      console.error("Error fetching agent info:", err);
    }
  }, []);

  const handleRefetch = useCallback(async () => {
    const customerId = customerFilter ? allCustomers.find((c) => c.name === customerFilter)?.id : null;
    await refetch({ customerId, status: statusFilter || null, limit: 50, offset: 0 });
  }, [customerFilter, statusFilter, allCustomers, refetch]);

  useEffect(() => {
    fetchAgentInfo();
  }, [fetchAgentInfo]);

  useEffect(() => {
    if (agentPrefix) handleRefetch();
  }, [handleRefetch, agentPrefix]);

  const handleUpdateStatus = async (
    appointmentId: number,
    newStatus: "pending" | "confirmed" | "completed" | "cancelled"
  ) => {
    setUpdatingAppointmentId(appointmentId);
    try {
      await updateAppointment(appointmentId, { status: newStatus });
      toast("Status updated successfully", "success");
    } catch (err) {
      console.error("Update error:", err);
      toast("Failed to update status", "error");
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAppointmentForDelete) return;
    try {
      setIsDeleting(true);
      await deleteAppointment(selectedAppointmentForDelete.id);
      toast("Appointment deleted", "success");
      handleRefetch();
    } catch (err) {
      console.error("Delete error:", err);
      toast("Failed to delete appointment", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setSelectedAppointmentForDelete(null);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      searchTerm === "" ||
      a.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = customerFilter === "" || a.customer_name === customerFilter;
    const matchesStatus = statusFilter === "" || a.status.toLowerCase() === statusFilter;
    const matchesTime = matchesTimeRange(a.appointment_date, timeRange);
    return matchesSearch && matchesCustomer && matchesStatus && matchesTime;
  });

  const totalAppointments = appointments.length;
  const pendingAppointments = appointments.filter((a) => a.status.toLowerCase() === "pending").length;
  const upcomingAppointments = appointments.filter(
    (a) => new Date(a.appointment_date) > new Date() && a.status.toLowerCase() !== "cancelled"
  ).length;

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      {/* Modals */}
      <SelectCustomerModal
        isOpen={showCustomerSelect}
        onClose={() => setShowCustomerSelect(false)}
        customers={allCustomers}
        onSelectCustomer={(cust) => {
          setSelectedCustomer(cust);
          setShowCustomerSelect(false);
          setShowCreateModal(true);
        }}
      />

      {showCreateModal && selectedCustomer && (
        <CreateAppointmentModal
          customer={selectedCustomer}
          createAppointment={createAppointment}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            handleRefetch();
            setShowCreateModal(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {showViewModal && selectedAppointmentForView && (
        <ViewAppointmentModal
          appointment={selectedAppointmentForView}
          onClose={() => {
            setShowViewModal(false);
            setSelectedAppointmentForView(null);
          }}
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
          onSuccess={() => {
            handleRefetch();
            setShowEditModal(false);
            setSelectedAppointmentForEdit(null);
          }}
        />
      )}

      <DeleteAppointmentModal
        isOpen={showDeleteModal}
        appointment={selectedAppointmentForDelete}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAppointmentForDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Summary KPI Cards */}
      <AppointmentSummaryCards
        total={totalAppointments}
        pending={pendingAppointments}
        upcoming={upcomingAppointments}
      />

      {error && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] font-medium">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-[20px] p-3.5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by customer, title, status…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-[#F4F7F4] border border-[#EAEAEA] rounded-full text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
            />
          </div>

          <CustomDropdown
            value={customerFilter}
            onChange={(val) => setCustomerFilter(val)}
            options={[
              { value: "", label: "All Customers" },
              ...allCustomers.map((c) => ({ value: c.name, label: c.name })),
            ]}
            placeholder="All Customers"
            minWidth={150}
          />

          <CustomDropdown
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="All Statuses"
            minWidth={130}
          />

          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

          {(searchTerm || customerFilter || statusFilter || timeRange.period !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCustomerFilter("");
                setStatusFilter("");
                setTimeRange(emptyTimeRange);
              }}
              title="Clear filters"
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCustomerSelect(true)}
          className="px-4 py-2 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.3)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer border-0 shrink-0"
        >
          <Plus size={14} />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Appointments Table / Cards Container */}
      <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] overflow-hidden">
        <AppointmentTable
          appointments={filteredAppointments}
          totalCount={appointments.length}
          updatingAppointmentId={updatingAppointmentId}
          onUpdateStatus={handleUpdateStatus}
          onView={(appointment) => {
            setSelectedAppointmentForView(appointment);
            setShowViewModal(true);
          }}
          onEdit={(appointment) => {
            setSelectedAppointmentForEdit(appointment);
            setShowEditModal(true);
          }}
          onDelete={(appointment) => {
            setSelectedAppointmentForDelete(appointment);
            setShowDeleteModal(true);
          }}
          onScheduleFirst={() => setShowCustomerSelect(true)}
        />
      </div>
    </div>
  );
};

export default AppointmentsPage;
