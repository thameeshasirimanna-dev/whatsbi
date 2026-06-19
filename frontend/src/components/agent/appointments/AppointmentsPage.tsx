import React, { useState, useEffect, useCallback, useRef } from "react";
import { Appointment } from "../../../types";
import { Menu, Transition } from "@headlessui/react";
import CreateAppointmentModal from "./CreateAppointmentModal";
import ViewAppointmentModal from "./ViewAppointmentModal";
import EditAppointmentModal from "./EditAppointmentModal";
import { useAppointments } from "../../../hooks/useAppointments";
import { getToken } from "../../../lib/auth";
import { motion } from "framer-motion";
import {
  Calendar, Clock, CheckCircle, Search, Plus, Eye, Pencil, Trash2,
  ChevronDown, X, Users, AlertTriangle,
} from "lucide-react";
import { useDialog } from "../shared/DialogProvider";
import TimeRangeFilter, { TimeRange, emptyTimeRange, matchesTimeRange } from "../shared/TimeRangeFilter";
import { SkeletonPage } from "../shared/Skeleton";
import Portal from "../shared/Portal";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46',
  background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', cursor: 'pointer', width: 'auto', minWidth: 130 };

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
  if (s === 'confirmed') return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
  if (s === 'completed') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'cancelled') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.05, ease: "easeOut" } }),
};

const thCell: React.CSSProperties = {
  padding: '10px 16px', ...DM, fontSize: 11, fontWeight: 600,
  color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em',
  textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #ebebeb',
};

const AppointmentsPage: React.FC = () => {
  const { appointments, loading, error, refetch, createAppointment, updateAppointment, deleteAppointment } = useAppointments();

  const { toast, confirm: dlgConfirm } = useDialog();
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>(emptyTimeRange);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerMap, setCustomerMap] = useState<{ [key: number]: any }>({});
  const [query, setQuery] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const [customerDropdownRect, setCustomerDropdownRect] = useState({ top: 0, left: 0, width: 0 });

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAppointmentForView, setSelectedAppointmentForView] = useState<Appointment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointmentForEdit, setSelectedAppointmentForEdit] = useState<Appointment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAppointmentForDelete, setSelectedAppointmentForDelete] = useState<Appointment | null>(null);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<number | null>(null);

  const fetchAgentInfo = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) return;
      const agentProfile = await response.json();
      if (!agentProfile.success || !agentProfile.agent) return;
      const agentData = agentProfile.agent;
      setAgentId(Number(agentData.id));
      setAgentPrefix(agentData.agent_prefix);
      if (!agentData.agent_prefix) return;

      const customersResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-customers`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!customersResponse.ok) return;
      const customersData = await customersResponse.json();
      if (!customersData.success) return;
      const agentCustomers = customersData.customers || [];
      setAllCustomers(agentCustomers);
      setCustomerMap(agentCustomers.reduce((map: any, c: any) => { map[c.id] = c; return map; }, {}));
    } catch (err) { console.error("Error fetching agent info:", err); }
  }, []);

  const handleRefetch = useCallback(async () => {
    const customerId = customerFilter ? allCustomers.find(c => c.name === customerFilter)?.id : null;
    await refetch({ customerId, status: statusFilter || null, limit: 50, offset: 0 });
  }, [customerFilter, statusFilter, allCustomers, refetch]);

  const handleViewAppointment = (a: Appointment) => { setSelectedAppointmentForView(a); setShowViewModal(true); };
  const handleEditAppointment = (a: Appointment) => { setSelectedAppointmentForEdit(a); setShowEditModal(true); };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointmentForDelete) return;
    try {
      await deleteAppointment(selectedAppointmentForDelete.id);
      handleRefetch();
    } catch (err) { console.error("Delete error:", err); }
    finally { setShowDeleteConfirm(false); setSelectedAppointmentForDelete(null); }
  };

  const updateAppointmentStatus = async (appointmentId: number, newStatus: "pending" | "confirmed" | "completed" | "cancelled") => {
    setUpdatingAppointmentId(appointmentId);
    try {
      await updateAppointment(appointmentId, { status: newStatus });
    } catch (err) {
      console.error("Update error:", err);
      toast("Failed to update status", 'error');
    } finally { setUpdatingAppointmentId(null); }
  };

  const handleCloseDeleteConfirm = () => { setShowDeleteConfirm(false); setSelectedAppointmentForDelete(null); };
  const handleCustomerSelect = (customer: any) => { setSelectedCustomer(customer); setShowCustomerSelect(false); setShowCreateModal(true); };
  const handleCreateAppointmentSuccess = () => { handleRefetch(); setShowCreateModal(false); setSelectedCustomer(null); };
  const handleUpdateAppointmentSuccess = () => { handleRefetch(); setShowEditModal(false); setSelectedAppointmentForEdit(null); };
  const handleCloseViewModal = () => { setShowViewModal(false); setSelectedAppointmentForView(null); };

  useEffect(() => { fetchAgentInfo(); }, [fetchAgentInfo]);
  useEffect(() => { if (agentPrefix) handleRefetch(); }, [handleRefetch, agentPrefix]);

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const capitalizeFirst = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const filteredAppointments = appointments.filter(a => {
    const matchesSearch = searchTerm === "" ||
      a.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = customerFilter === "" || a.customer_name === customerFilter;
    const matchesStatus = statusFilter === "" || a.status.toLowerCase() === statusFilter;
    const matchesTime = matchesTimeRange(a.appointment_date, timeRange);
    return matchesSearch && matchesCustomer && matchesStatus && matchesTime;
  });

  const totalAppointments = filteredAppointments.length;
  const pendingAppointments = filteredAppointments.filter(a => a.status.toLowerCase() === "pending").length;
  const upcomingAppointments = filteredAppointments.filter(a => new Date(a.appointment_date) > new Date() && a.status !== "cancelled").length;

  const allCustomerList = Object.values(customerMap) as any[];
  const filteredCustomerList = query === ""
    ? allCustomerList
    : allCustomerList.filter((c: any) => c.name?.toLowerCase().includes(query.toLowerCase()) || c.phone?.includes(query));

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <>
      <style>{`@keyframes ap-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Modals */}
      {showCreateModal && selectedCustomer && (
        <CreateAppointmentModal customer={selectedCustomer} createAppointment={createAppointment}
          onClose={() => { setShowCreateModal(false); setSelectedCustomer(null); }}
          onSuccess={handleCreateAppointmentSuccess} />
      )}
      {showViewModal && selectedAppointmentForView && (
        <ViewAppointmentModal appointment={selectedAppointmentForView} onClose={handleCloseViewModal} />
      )}
      {showEditModal && selectedAppointmentForEdit && (
        <EditAppointmentModal appointment={selectedAppointmentForEdit} updateAppointment={updateAppointment}
          onClose={() => { setShowEditModal(false); setSelectedAppointmentForEdit(null); }}
          onSuccess={handleUpdateAppointmentSuccess} />
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && selectedAppointmentForDelete && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 420, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(244,63,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={15} style={{ color: '#f43f5e' }} />
              </div>
              <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#f43f5e' }}>Delete Appointment</span>
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              <p style={{ ...DM, fontSize: 14, color: '#3f3f46', marginBottom: 6 }}>
                Delete <strong style={{ color: '#0c1a0e' }}>"{selectedAppointmentForDelete.title}"</strong> for{' '}
                <strong style={{ color: '#0c1a0e' }}>{selectedAppointmentForDelete.customer_name}</strong>?
              </p>
              <p style={{ ...DM, fontSize: 13, color: '#71717a', marginBottom: 24 }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleCloseDeleteConfirm} style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleDeleteAppointment} style={{ flex: 1, background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(244,63,94,0.3)' }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      </Portal>
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
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or phone…" style={{ ...inputStyle, paddingLeft: 30 }} onFocus={onFocusG} onBlur={onFocusG} autoFocus />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>
              {filteredCustomerList.length === 0 ? (
                <div style={{ padding: '32px 12px', textAlign: 'center', ...DM, fontSize: 13, color: '#71717a' }}>
                  {allCustomerList.length === 0 ? 'No customers available.' : 'No customers match.'}
                </div>
              ) : filteredCustomerList.map((customer: any) => (
                <button key={customer.id} onClick={() => { handleCustomerSelect(customer); setQuery(""); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                >
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#fff' }}>{customer.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.name}</div>
                    <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>{customer.phone || 'No phone'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Portal>
    )}

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { Icon: Calendar, label: 'Total Appointments', value: totalAppointments, iconColor: '#22c55e', iconBg: 'rgba(34,197,94,0.1)', i: 0 },
            { Icon: Clock, label: 'Pending', value: pendingAppointments, iconColor: '#d97706', iconBg: 'rgba(217,119,6,0.1)', i: 1 },
            { Icon: CheckCircle, label: 'Upcoming', value: upcomingAppointments, iconColor: '#0891b2', iconBg: 'rgba(8,145,178,0.1)', i: 2 },
          ].map(({ Icon, label, value, iconColor, iconBg, i }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} style={{ color: iconColor }} />
                </div>
              </div>
              <div style={{ ...SYNE, fontSize: 28, fontWeight: 800, color: '#0c1a0e', lineHeight: 1, marginBottom: 4 }}>{value}</div>
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
            <input type="text" placeholder="Search by customer, title, or status…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle, paddingLeft: 30 }} onFocus={onFocusG} onBlur={onBlurG} />
          </div>

          <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} style={selectStyle} onFocus={onFocusG} onBlur={onBlurG}>
            <option value="">All Customers</option>
            {allCustomers.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle} onFocus={onFocusG} onBlur={onBlurG}>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

          {(searchTerm || customerFilter || statusFilter) && (
            <button onClick={() => { setSearchTerm(""); setCustomerFilter(""); setStatusFilter(""); }}
              title="Clear filters"
              style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={14} style={{ color: '#71717a' }} />
            </button>
          )}

          <button onClick={() => setShowCustomerSelect(true)}
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Plus size={14} /> Create Appointment
          </button>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'visible' }}
        >
          {filteredAppointments.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Calendar size={22} style={{ color: '#d4d4d8' }} />
              </div>
              <div style={{ ...SYNE, fontSize: 15, fontWeight: 600, color: '#0c1a0e', marginBottom: 6 }}>
                {appointments.length === 0 ? "No appointments yet" : "No matching appointments"}
              </div>
              <div style={{ ...DM, fontSize: 13, color: '#71717a', marginBottom: 20 }}>
                {appointments.length === 0
                  ? "Schedule your first appointment with a customer."
                  : searchTerm
                    ? `No appointments match "${searchTerm}".`
                    : "No appointments match your current filters."}
              </div>
              {appointments.length === 0 && (
                <button onClick={() => setShowCustomerSelect(true)}
                  style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Schedule First Appointment
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile/Tablet Card Layout */}
              <div className="block lg:hidden">
                <div className="flex flex-col divide-y divide-[#f4f4f5]">
                  {filteredAppointments.map((appointment, index) => (
                    <motion.div
                      key={appointment.id}
                      variants={rowVariants} custom={index}
                      initial="hidden" animate="visible"
                      style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ ...SYNE, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                              {appointment.customer_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{appointment.customer_name}</div>
                            {appointment.customer_phone && <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>{appointment.customer_phone}</div>}
                          </div>
                        </div>

                        <span style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#0c1a0e' }}>
                          #{appointment.id.toString().padStart(4, "0")}
                        </span>
                      </div>

                      <div style={{ ...DM, fontSize: 13, color: '#3f3f46', fontWeight: 600 }}>
                        {appointment.title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', padding: '8px 12px', borderRadius: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Date & Time</span>
                          <span style={{ ...DM, fontSize: 12, color: '#0c1a0e', fontWeight: 500 }}>
                            {new Date(appointment.appointment_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Duration</span>
                          <span style={{ ...DM, fontSize: 13, color: '#3f3f46', fontWeight: 600 }}>
                            {appointment.duration_minutes} min
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                        {/* Status Menu */}
                        <div style={{ position: 'relative' }}>
                          <Menu as="div" style={{ position: 'relative', display: 'inline-block' }}>
                            <Menu.Button
                              disabled={updatingAppointmentId === appointment.id}
                              style={{ ...getStatusStyle(appointment.status), ...DM, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: updatingAppointmentId === appointment.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: updatingAppointmentId === appointment.id ? 0.6 : 1 }}
                            >
                              {updatingAppointmentId === appointment.id ? (
                                <><div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'currentColor', animation: 'ap-spin 0.7s linear infinite' }} />Updating…</>
                              ) : (
                                <>{capitalizeFirst(appointment.status)}<ChevronDown size={10} /></>
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
                              <Menu.Items style={{ position: 'absolute', left: 0, marginTop: 4, width: 150, background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, padding: 4, outline: 'none' }}>
                                {statusOptions.filter(o => o.value !== "").map(option => (
                                  <Menu.Item key={option.value}>
                                    {({ active }) => (
                                      <button
                                        disabled={updatingAppointmentId === appointment.id}
                                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', ...DM, fontSize: 12, background: active ? 'rgba(34,197,94,0.06)' : appointment.status === option.value ? 'rgba(34,197,94,0.04)' : 'transparent', color: appointment.status === option.value ? '#059669' : '#3f3f46' }}
                                        onClick={async () => { if (await dlgConfirm(`Change appointment status to ${option.label}?`)) updateAppointmentStatus(appointment.id, option.value as any); }}
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
                            { Icon: Eye, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', hbg: 'rgba(34,197,94,0.15)', title: 'View', onClick: () => handleViewAppointment(appointment) },
                            { Icon: Pencil, color: '#d97706', bg: 'rgba(217,119,6,0.08)', hbg: 'rgba(217,119,6,0.15)', title: 'Edit', onClick: () => handleEditAppointment(appointment) },
                            { Icon: Trash2, color: '#f43f5e', bg: 'rgba(244,63,94,0.06)', hbg: 'rgba(244,63,94,0.12)', title: 'Delete', onClick: () => { setSelectedAppointmentForDelete(appointment); setShowDeleteConfirm(true); } },
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
                    {['#', 'Customer', 'Title', 'Date & Time', 'Duration', 'Status', 'Actions'].map((h, i) => (
                      <th key={h} style={{ ...thCell, textAlign: i === 6 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}>
                  {filteredAppointments.map((appointment, index) => (
                    <motion.tr key={appointment.id} variants={rowVariants} custom={index}
                      style={{ borderBottom: '1px solid #f4f4f5', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(34,197,94,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      {/* # */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>
                          #{appointment.id.toString().padStart(4, "0")}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ ...SYNE, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                              {appointment.customer_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', whiteSpace: 'nowrap' }}>{appointment.customer_name}</div>
                            {appointment.customer_phone && <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>{appointment.customer_phone}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Title */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ ...DM, fontSize: 13, color: '#3f3f46' }}>{appointment.title}</span>
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>
                          {new Date(appointment.appointment_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 13, color: '#3f3f46' }}>{appointment.duration_minutes} min</span>
                      </td>

                      {/* Status — headlessui Menu with inline styles */}
                      <td style={{ padding: '12px 16px', position: 'relative' }}>
                        <Menu as="div" style={{ position: 'relative', display: 'inline-block' }}>
                          <Menu.Button
                            disabled={updatingAppointmentId === appointment.id}
                            style={{ ...getStatusStyle(appointment.status), ...DM, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: updatingAppointmentId === appointment.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: updatingAppointmentId === appointment.id ? 0.6 : 1 }}
                          >
                            {updatingAppointmentId === appointment.id ? (
                              <><div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'currentColor', animation: 'ap-spin 0.7s linear infinite' }} />Updating…</>
                            ) : (
                              <>{capitalizeFirst(appointment.status)}<ChevronDown size={10} /></>
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
                            <Menu.Items style={{ position: 'absolute', left: 0, marginTop: 4, width: 150, background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, padding: 4, outline: 'none' }}>
                              {statusOptions.filter(o => o.value !== "").map(option => (
                                <Menu.Item key={option.value}>
                                  {({ active }) => (
                                    <button
                                      disabled={updatingAppointmentId === appointment.id}
                                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', ...DM, fontSize: 12, background: active ? 'rgba(34,197,94,0.06)' : appointment.status === option.value ? 'rgba(34,197,94,0.04)' : 'transparent', color: appointment.status === option.value ? '#059669' : '#3f3f46' }}
                                      onClick={async () => { if (await dlgConfirm(`Change appointment status to ${option.label}?`)) updateAppointmentStatus(appointment.id, option.value as any); }}
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
                            { Icon: Eye, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', hbg: 'rgba(34,197,94,0.15)', title: 'View', onClick: () => handleViewAppointment(appointment) },
                            { Icon: Pencil, color: '#d97706', bg: 'rgba(217,119,6,0.08)', hbg: 'rgba(217,119,6,0.15)', title: 'Edit', onClick: () => handleEditAppointment(appointment) },
                            { Icon: Trash2, color: '#f43f5e', bg: 'rgba(244,63,94,0.06)', hbg: 'rgba(244,63,94,0.12)', title: 'Delete', onClick: () => { setSelectedAppointmentForDelete(appointment); setShowDeleteConfirm(true); } },
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
      </div>
    </>
  );
};

export default AppointmentsPage;
