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
import AppointmentBulkActionsBar from "./AppointmentBulkActionsBar";
import { useTableSelection } from "../shared/useTableSelection";
import { useBulkProgress, FloatingBulkProgress } from "../shared/BulkProgress";

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
  const { toast, confirm: dlgConfirm } = useDialog();

  const selection = useTableSelection<number>([]);
  const { bulkProgress, isProcessing: isBulkProcessing, setBulkProgress } = useBulkProgress();

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

  const pageIds = filteredAppointments.map((a) => a.id);
  const isAllPageSelected = selection.isAllSelected(pageIds);
  const isPageIndeterminate = selection.isIndeterminate(pageIds);

  const handleBulkUpdateStatus = async (newStatus: string) => {
    const count = selection.selectedCount;
    if (count === 0) return;
    const label = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    if (
      !(await dlgConfirm(
        `Update status of ${count} selected appointment${count > 1 ? "s" : ""} to "${label}"?`
      ))
    ) {
      return;
    }

    const total = selection.selectedIds.length;
    setBulkProgress({ actionLabel: `Updating status to "${label}"…`, current: 0, total });
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
          actionLabel: `Updating appointment #${id}…`,
          current: i + 1,
          total,
        });
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-appointments`, {
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
        `Updated ${successCount} appointment${successCount > 1 ? "s" : ""} to ${label}`,
        "success"
      );
      selection.clearSelection();
      await handleRefetch();
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
        `Are you sure you want to delete ${count} selected appointment${count > 1 ? "s" : ""}? This action cannot be undone.`,
        { danger: true }
      ))
    ) {
      return;
    }

    const total = selection.selectedIds.length;
    setBulkProgress({ actionLabel: "Deleting appointments…", current: 0, total });
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
          actionLabel: `Deleting appointment #${id}…`,
          current: i + 1,
          total,
        });
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-appointments?id=${id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) successCount++;
      }
      toast(
        `Deleted ${successCount} appointment${successCount > 1 ? "s" : ""}`,
        "success"
      );
      selection.clearSelection();
      await handleRefetch();
    } catch (err: any) {
      toast(`Bulk delete failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setBulkProgress(null);
    }
  };

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
      <div className="bg-white rounded-[20px] p-3 sm:p-3.5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col gap-2.5 sm:gap-3">
        {/* Row 1: Search & Primary Action Button (Full width) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0 flex items-center">
            <Search
              size={14}
              className="absolute left-3.5 text-[#a1a1aa] pointer-events-none shrink-0"
            />
            <input
              type="text"
              placeholder="Search by customer, title, status…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-9 rounded-full bg-white border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all duration-150 focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 w-5 h-5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717a] hover:text-[#16281D] cursor-pointer border-0 transition-colors"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Book Appointment Action Button */}
          <button
            onClick={() => setShowCustomerSelect(true)}
            className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.3)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer border-0 shrink-0"
          >
            <Plus size={14} />
            <span>Book Appointment</span>
          </button>
        </div>

        {/* Row 2: Filters Grid (Full fill 100% row width across all screen sizes) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2 sm:gap-2.5 w-full">
          {/* Customer Filter */}
          <div className={`col-span-1 w-full min-w-0 ${timeRange.preset === "custom" ? "lg:w-48 xl:w-56 lg:shrink-0" : "lg:flex-1"}`}>
            <CustomDropdown
              value={customerFilter}
              onChange={(val) => setCustomerFilter(val)}
              options={[
                { value: "", label: "All Customers" },
                ...allCustomers.map((c) => ({
                  value: c.name,
                  label: c.name,
                  badge: c.phone || undefined,
                })),
              ]}
              placeholder="All Customers"
              searchable={true}
              searchPlaceholder="Search customer..."
              className="w-full"
            />
          </div>

          {/* Status Filter */}
          <div className={`col-span-1 w-full min-w-0 ${timeRange.preset === "custom" ? "lg:w-40 xl:w-48 lg:shrink-0" : "lg:flex-1"}`}>
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
              placeholder="All Statuses"
              className="w-full"
            />
          </div>

          {/* Time Range Filter */}
          <div className="col-span-1 sm:col-span-2 lg:flex-1 w-full min-w-0">
            <TimeRangeFilter
              value={timeRange}
              onChange={setTimeRange}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Banner (appears when rows are selected) */}
      <AppointmentBulkActionsBar
        selectedCount={selection.selectedCount}
        onBulkUpdateStatus={handleBulkUpdateStatus}
        onBulkDelete={handleBulkDelete}
        onClearSelection={selection.clearSelection}
        isProcessing={isBulkProcessing}
        bulkProgress={bulkProgress}
      />

      {/* Floating Viewport Progress Banner */}
      <FloatingBulkProgress progress={bulkProgress} />

      {/* Appointments Table / Cards Container */}
      <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] overflow-hidden relative z-0">
        <AppointmentTable
          appointments={filteredAppointments}
          totalCount={appointments.length}
          updatingAppointmentId={updatingAppointmentId}
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.toggleSelect}
          onSelectAll={selection.selectAll}
          isAllSelected={isAllPageSelected}
          isIndeterminate={isPageIndeterminate}
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
