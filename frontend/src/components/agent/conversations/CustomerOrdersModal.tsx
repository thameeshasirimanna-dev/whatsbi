import React, { useState, useEffect } from "react";
import { getToken } from "../../../lib/auth";
import { Order, Appointment } from "../../../types/index";
import { Plus, X, FileText, Calendar, CheckCircle2 } from "lucide-react";
import {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getInvoices,
  updateInvoiceStatus,
  deleteInvoice,
  createOrderFromInvoice,
  getAppointments,
  createAppointment as apiCreateAppointment,
  updateAppointment as apiUpdateAppointment,
  deleteAppointment,
  getCustomers,
} from "../../../lib/api";
import { getCurrentAgent } from "../../../lib/agent";
import CreateOrderModal from "../customers/CreateOrderModal";
import ViewOrderModal from "../orders/ViewOrderModal";
import EditOrderModal from "../orders/EditOrderModal";
import CreateAppointmentModal from "../appointments/CreateAppointmentModal";
import ViewAppointmentModal from "../appointments/ViewAppointmentModal";
import EditAppointmentModal from "../appointments/EditAppointmentModal";

import OrdersTab from "./OrdersTab";
import InvoicesTab from "./InvoicesTab";
import AppointmentsTab from "./AppointmentsTab";
import GenerateInvoiceModal from "./GenerateInvoiceModal";
import { useDialog } from "../shared/DialogProvider";
import Portal from "../shared/Portal";
import { SkeletonBase } from "../shared/Skeleton";

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: number | null;
  customerPhone: string | null;
  customerName: string;
  agentPrefix: string | null;
  agentId: number | null;
}

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface AgentDetails {
  name: string;
  address: string;
  business_email: string;
  contact_number: string;
  website: string;
}

interface Invoice {
  id: number;
  order_id?: number | null;
  customer_id?: number;
  name: string;
  pdf_url: string;
  total_amount?: number;
  total?: number;
  advance_amount?: number;
  discount_percentage?: number;
  notes?: string;
  status: string;
  created_at?: string;
  generated_at?: string;
  linked_order_id?: number | null;
}

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  customerId: propCustomerId = null,
  customerPhone,
  customerName,
  agentPrefix,
  agentId,
}) => {
  const { toast, confirm: dlgConfirm } = useDialog();
  const [activeTab, setActiveTab] = useState<"orders" | "invoices" | "appointments">("invoices");
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateAppointmentModal, setShowCreateAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showViewAppointmentModal, setShowViewAppointmentModal] = useState(false);
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false);
  const [agentDetails, setAgentDetails] = useState<AgentDetails>({
    name: "",
    address: "",
    business_email: "",
    contact_number: "",
    website: "",
  });
  const [invoiceTemplatePath, setInvoiceTemplatePath] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Mark Paid & Create Order modal state
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [orderShippingAddress, setOrderShippingAddress] = useState("");
  const [orderEstimatedDelivery, setOrderEstimatedDelivery] = useState("");
  const [orderPaidAmount, setOrderPaidAmount] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState("");
  const [creatingOrderFromInv, setCreatingOrderFromInv] = useState(false);

  useEffect(() => {
    if (isOpen && customerPhone && agentPrefix) {
      fetchCustomerData();
    }
  }, [isOpen, customerPhone, agentPrefix, propCustomerId]);

  const fetchCustomerData = async () => {
    if (!customerPhone || !agentPrefix) return;

    setLoading(true);
    setError(null);

    try {
      let currentCustomerId = propCustomerId || customerId;

      if (!currentCustomerId) {
        const cleanPhoneQuery = customerPhone.replace(/\D/g, "");
        const customers = await getCustomers({ search: cleanPhoneQuery });
        const customerData = customers.find((c) => {
          const cleanPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
          return cleanPhone === cleanPhoneQuery;
        });

        if (!customerData) {
          setOrders([]);
          setInvoices([]);
          setAppointments([]);
          setCustomerId(null);
          setLoading(false);
          return;
        }

        currentCustomerId = customerData.id;
      }

      setCustomerId(currentCustomerId);

      const token = getToken();
      if (!token) {
        throw new Error("User not authenticated");
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
        throw new Error("Failed to fetch agent profile");
      }

      const agentProfile = await agentResponse.json();
      if (!agentProfile.success || !agentProfile.agent) {
        throw new Error("Agent not found");
      }

      const agentData = agentProfile.agent;
      setInvoiceTemplatePath(agentData.invoice_template_path);

      setAgentDetails({
        name: agentData.name || "",
        address: agentData.address || "",
        business_email: agentData.business_email || "",
        contact_number: agentData.contact_number || "",
        website: agentData.website || "",
      });

      const ordersData = await getOrders({ customer_id: currentCustomerId });

      setOrders(
        (ordersData || []).map((order: any) => ({
          ...order,
          customer_name: customerName,
          customer_phone: customerPhone!,
        }))
      );

      const invoicesRaw = await getInvoices({ customer_id: currentCustomerId });

      const transformedInvoices = (invoicesRaw || [])
        .map((inv: any) => ({
          id: inv.id,
          order_id: inv.order_id,
          customer_id: inv.customer_id,
          name: inv.name,
          pdf_url: inv.pdf_url,
          total_amount: Number(inv.total || inv.total_amount || 0),
          advance_amount: Number(inv.advance_amount || 0),
          discount_percentage: Number(inv.discount_percentage || 0),
          notes: inv.notes,
          status: inv.status,
          created_at: inv.generated_at || inv.created_at,
          linked_order_id: inv.order_id || inv.linked_order_id,
        }));

      setInvoices(transformedInvoices);

      const appointmentsData = await getAppointments({ customer_id: currentCustomerId });

      setAppointments(
        (appointmentsData || []).map((appt: Appointment) => ({
          ...appt,
          customer_name: customerName,
          customer_phone: customerPhone!,
        }))
      );
    } catch (err: any) {
      setError("Failed to fetch customer data: " + err.message);
      console.error("Error fetching customer data:", err);
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (data: any) => {
    if (!customerId) return;

    try {
      const insertData = await apiCreateAppointment({
        ...data,
        customer_id: customerId,
      });

      setAppointments((prev) => [
        insertData,
        ...prev.map((appt: Appointment) => ({
          ...appt,
          customer_name: customerName,
          customer_phone: customerPhone!,
        })),
      ]);
      return insertData.id;
    } catch (err: any) {
      setError("Failed to create appointment: " + err.message);
      console.error("Error creating appointment:", err);
      throw err;
    }
  };

  const updateAppointment = async (id: number, data: any) => {
    try {
      await apiUpdateAppointment({ id, ...data });
      await fetchCustomerData();
    } catch (err: any) {
      setError("Failed to update appointment: " + err.message);
      console.error("Error updating appointment:", err);
      throw err;
    }
  };

  const deleteAppointmentLocal = async (id: number) => {
    try {
      await deleteAppointment(id);
      await fetchCustomerData();
    } catch (err: any) {
      setError("Failed to delete appointment: " + err.message);
      console.error("Error deleting appointment:", err);
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleGenerateInvoice = (orderId: number, defaultName: string) => {
    setSelectedOrderId(orderId);
    setShowGenerateModal(true);
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!await dlgConfirm(`Are you sure you want to delete Order #${orderId}? This action cannot be undone.`, { danger: true })) return;
    try {
      if (!agentPrefix) throw new Error("Missing agent prefix");
      await deleteOrder(orderId);
      await fetchCustomerData();
    } catch (err: any) {
      toast("Failed to delete order: " + err.message, 'error');
    }
  };

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowViewAppointmentModal(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowEditAppointmentModal(true);
  };

  const handleDeleteAppointment = async (appointmentId: number) => {
    if (!await dlgConfirm('Are you sure you want to delete this appointment? This action cannot be undone.', { danger: true })) return;
    try {
      await deleteAppointmentLocal(appointmentId);
    } catch (err: any) {
      toast("Failed to delete appointment: " + err.message, 'error');
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    if (!customerPhone || !agentId) {
      setError("Missing customer or agent information");
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-invoices?action=send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ invoice_id: invoice.id }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to send invoice");
      }

      toast("Invoice sent successfully via WhatsApp!", 'success');
      await fetchCustomerData();
      setError(null);
    } catch (err: any) {
      setError("Failed to send invoice: " + err.message);
      console.error("Error sending invoice:", err);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!await dlgConfirm(`Are you sure you want to delete invoice "${invoice.name}"? This action cannot be undone.`, { danger: true })) return;

    if (!agentPrefix) {
      setError("Missing agent prefix");
      return;
    }

    try {
      setLoading(true);

      const urlParts = invoice.pdf_url.split("/invoices/");
      if (urlParts.length < 2) {
        throw new Error("Invalid invoice URL");
      }

      await deleteInvoice(invoice.id);
      await fetchCustomerData();

      toast("Invoice deleted successfully!", 'success');
    } catch (err: any) {
      setError("Failed to delete invoice: " + err.message);
      console.error("Error deleting invoice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    setPayingInvoice(invoice);
    const amount = Number(invoice.advance_amount || invoice.total_amount || invoice.total || 0);
    setOrderPaidAmount(amount);
    setOrderShippingAddress("");
    setOrderEstimatedDelivery("");
    setOrderNotes(invoice.notes || "");
  };

  const handleConfirmPaymentAndCreateOrder = async () => {
    if (!payingInvoice) return;
    setCreatingOrderFromInv(true);
    try {
      await createOrderFromInvoice({
        invoice_id: payingInvoice.id,
        advance_amount: Number(orderPaidAmount) || 0,
        shipping_address: orderShippingAddress.trim() || undefined,
        estimated_delivery_date: orderEstimatedDelivery || undefined,
        notes: orderNotes.trim() || undefined,
      });
      toast("Payment confirmed! Order created in CRM successfully.", "success");
      setPayingInvoice(null);
      await fetchCustomerData();
      setActiveTab("orders");
    } catch (err: any) {
      console.error("Create order from invoice error:", err);
      toast(err.message || "Failed to create order from invoice", "error");
    } finally {
      setCreatingOrderFromInv(false);
    }
  };

  const handleMarkPaidFull = async (invoice: Invoice) => {
    try {
      const totalAmt = Number(invoice.total_amount || invoice.total || 0);
      await updateInvoiceStatus(invoice.id, "paid", totalAmt, invoice.linked_order_id || invoice.order_id);
      toast("Marked invoice as paid in full and sent confirmation!", "success");
      await fetchCustomerData();
    } catch (err: any) {
      console.error("Mark paid full error:", err);
      toast(err.message || "Failed to mark invoice as paid in full", "error");
    }
  };

  const handleMarkPaidOnly = async () => {
    if (!payingInvoice) return;
    setCreatingOrderFromInv(true);
    try {
      const totalAmt = Number(payingInvoice.total_amount || payingInvoice.total || 0);
      const paidAmt = Number(orderPaidAmount) || 0;
      const isFull = paidAmt >= totalAmt && totalAmt > 0;
      const status = isFull ? "paid" : "partially_paid";
      await updateInvoiceStatus(payingInvoice.id, status, paidAmt, payingInvoice.linked_order_id || payingInvoice.order_id);
      toast(isFull ? "Marked invoice as paid in full" : "Marked invoice as partially paid (advance received)", "success");
      setPayingInvoice(null);
      await fetchCustomerData();
    } catch (err: any) {
      console.error("Mark paid error:", err);
      toast(err.message || "Failed to mark invoice as paid", "error");
    } finally {
      setCreatingOrderFromInv(false);
    }
  };

  if (!isOpen) return null;

  const TAB_DEFS = [
    { key: "invoices" as const, label: "Invoices", count: invoices.length, badge: { bg: "rgba(34,197,94,0.1)", color: "#059669" } },
    { key: "orders" as const, label: "Orders", count: orders.length, badge: { bg: "rgba(8,145,178,0.1)", color: "#0891b2" } },
    { key: "appointments" as const, label: "Appointments", count: appointments.length, badge: { bg: "rgba(217,119,6,0.1)", color: "#d97706" } },
  ];

  const actionDisabled = !customerId || loading;
  const invoiceActionDisabled = !customerId || loading;

  const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: disabled ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: disabled ? "not-allowed" : "pointer",
    ...DM,
    fontSize: 13,
    fontWeight: 600,
    boxShadow: disabled ? "none" : "0 4px 14px rgba(34,197,94,0.3)",
    transition: "opacity 0.15s",
    flexShrink: 0,
  });

  return (
    <Portal>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <style>{`@keyframes com-spin { to { transform: rotate(360deg); } }`}</style>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid #ebebeb",
            boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
            width: "100%",
            maxWidth: 1100,
            maxHeight: "95vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            className="px-4 pt-4 md:px-6 md:pt-5"
            style={{
              flexShrink: 0,
              borderBottom: "1px solid #ebebeb",
              background: "#fff",
            }}
          >
            {/* Title row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <span 
                className="text-base md:text-lg"
                style={{ ...SYNE, fontWeight: 700, color: "#0c1a0e", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 12 }}
              >
                {customerName ? `${customerName}'s Records` : "Customer Records"}
              </span>
              <button
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  background: "rgba(0,0,0,0.06)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#71717a",
                  transition: "background 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs + action button row */}
            <div
              className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-0"
              style={{
                justifyContent: "space-between",
              }}
            >
              <div 
                className="overflow-x-auto scrollbar-none"
                style={{ display: "flex", gap: 0, maxWidth: "100%" }}
              >
                {TAB_DEFS.map(({ key, label, count, badge }) => {
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      style={{
                        ...DM,
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "10px 14px",
                        background: "none",
                        border: "none",
                        borderBottom: isActive ? "2px solid #22c55e" : "2px solid transparent",
                        color: isActive ? "#059669" : "#71717a",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "color 0.15s, border-color 0.15s",
                        marginBottom: -1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                      <span
                        style={{
                          ...DM,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "1px 7px",
                          borderRadius: 9999,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div 
                className="justify-start md:justify-end"
                style={{ display: "flex", gap: 8, paddingBottom: 12 }}
              >
                {activeTab === "orders" && (
                  <button
                    onClick={() => setShowCreateOrderModal(true)}
                    disabled={actionDisabled}
                    style={primaryBtnStyle(actionDisabled)}
                  >
                    <Plus size={15} />
                    New Order
                  </button>
                )}
                {activeTab === "invoices" && (
                  <button
                    onClick={() => {
                      setSelectedOrderId(null);
                      setShowGenerateModal(true);
                    }}
                    disabled={invoiceActionDisabled}
                    style={primaryBtnStyle(invoiceActionDisabled)}
                  >
                    <FileText size={15} />
                    Generate Invoice
                  </button>
                )}
                {activeTab === "appointments" && (
                  <button
                    onClick={() => setShowCreateAppointmentModal(true)}
                    disabled={actionDisabled}
                    style={primaryBtnStyle(actionDisabled)}
                  >
                    <Calendar size={15} />
                    New Appointment
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="p-4 md:p-6" style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#fff',
                      border: '1px solid #ebebeb',
                      borderRadius: 14,
                      padding: '16px 18px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <SkeletonBase style={{ width: 100, height: 14, borderRadius: 4 }} />
                      <SkeletonBase style={{ width: 80, height: 18, borderRadius: 9999 }} />
                    </div>
                    <SkeletonBase style={{ width: 150, height: 12, borderRadius: 3, marginTop: 4 }} />
                    <SkeletonBase style={{ width: 120, height: 11, borderRadius: 3 }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #f4f4f5', paddingTop: 12 }}>
                      <SkeletonBase style={{ width: 65, height: 26, borderRadius: 8 }} />
                      <SkeletonBase style={{ width: 65, height: 26, borderRadius: 8 }} />
                      <SkeletonBase style={{ width: 120, height: 26, borderRadius: 8 }} />
                      <SkeletonBase style={{ width: 75, height: 26, borderRadius: 8 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 0",
                  ...DM,
                  fontSize: 14,
                  color: "#f43f5e",
                }}
              >
                {error}
              </div>
            ) : (
              <>
                {activeTab === "orders" && (
                  <OrdersTab
                    orders={orders}
                    customerId={customerId}
                    loading={loading}
                    agentPrefix={agentPrefix}
                    agentId={agentId}
                    customerName={customerName}
                    customerPhone={customerPhone}
                    onViewOrder={handleViewOrder}
                    onEditOrder={handleEditOrder}
                    onGenerateInvoice={handleGenerateInvoice}
                    onDeleteOrder={handleDeleteOrder}
                    onRefresh={fetchCustomerData}
                  />
                )}
                {activeTab === "invoices" && (
                  <InvoicesTab
                    invoices={invoices}
                    agentPrefix={agentPrefix}
                    customerPhone={customerPhone}
                    agentId={agentId}
                    customerName={customerName}
                    updatingId={updatingId}
                    onRefresh={fetchCustomerData}
                    onSendInvoice={handleSendInvoice}
                    onDeleteInvoice={handleDeleteInvoice}
                    onMarkPaid={handleMarkPaid}
                    onMarkPaidFull={handleMarkPaidFull}
                  />
                )}
                {activeTab === "appointments" && (
                  <AppointmentsTab
                    appointments={appointments}
                    loading={loading}
                    onViewAppointment={handleViewAppointment}
                    onEditAppointment={handleEditAppointment}
                    onDeleteAppointment={handleDeleteAppointment}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {showCreateOrderModal && customerId && (
          <CreateOrderModal
            customer={{
              id: customerId,
              name: customerName,
              phone: customerPhone!,
            }}
            agentPrefix={agentPrefix || ""}
            agentId={agentId!}
            onClose={() => setShowCreateOrderModal(false)}
            onSuccess={fetchCustomerData}
          />
        )}

        {showViewModal && selectedOrder && (
          <ViewOrderModal
            order={selectedOrder}
            onClose={() => {
              setShowViewModal(false);
              setSelectedOrder(null);
            }}
            onSuccess={fetchCustomerData}
            agentPrefix={agentPrefix || null}
            agentId={agentId || null}
          />
        )}

        {showEditModal && selectedOrder && (
          <EditOrderModal
            order={selectedOrder}
            onClose={() => {
              setShowEditModal(false);
              setSelectedOrder(null);
            }}
            onSuccess={fetchCustomerData}
            agentPrefix={agentPrefix || null}
            agentId={agentId || null}
          />
        )}

        {showCreateAppointmentModal && customerId && (
          <CreateAppointmentModal
            customer={{
              id: customerId,
              name: customerName,
              phone: customerPhone!,
            }}
            createAppointment={createAppointment}
            onClose={() => setShowCreateAppointmentModal(false)}
            onSuccess={fetchCustomerData}
          />
        )}

        {showViewAppointmentModal && selectedAppointment && (
          <ViewAppointmentModal
            appointment={selectedAppointment}
            onClose={() => {
              setShowViewAppointmentModal(false);
              setSelectedAppointment(null);
            }}
          />
        )}

        {showEditAppointmentModal && selectedAppointment && (
          <EditAppointmentModal
            appointment={selectedAppointment}
            updateAppointment={updateAppointment}
            onClose={() => {
              setShowEditAppointmentModal(false);
              setSelectedAppointment(null);
            }}
            onSuccess={fetchCustomerData}
          />
        )}

        {showGenerateModal && customerId && (
          <GenerateInvoiceModal
            isOpen={showGenerateModal}
            onClose={() => {
              setShowGenerateModal(false);
              setSelectedOrderId(null);
            }}
            selectedOrderId={selectedOrderId ?? undefined}
            orders={orders}
            customerName={customerName}
            customerId={customerId}
            customerPhone={customerPhone}
            agentPrefix={agentPrefix}
            agentId={agentId}
            agentDetails={agentDetails}
            invoiceTemplatePath={invoiceTemplatePath}
            onSuccess={fetchCustomerData}
          />
        )}

        {/* Mark Paid & Create Order Modal */}
        {payingInvoice && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 70,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                border: "1px solid #ebebeb",
                boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
                width: "100%",
                maxWidth: "min(480px, 90vw)",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "18px 22px 14px",
                  borderBottom: "1px solid #ebebeb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "rgba(34,197,94,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckCircle2 size={15} style={{ color: "#059669" }} />
                  </div>
                  <div>
                    <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: "#0c1a0e", display: "block" }}>
                      Mark Paid & Create Order
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setPayingInvoice(null)}
                  disabled={creatingOrderFromInv}
                  style={{
                    width: 28,
                    height: 28,
                    background: "rgba(0,0,0,0.06)",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#71717a",
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Modal Form Body */}
              <div style={{ padding: 22, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    background: "#f9f9fb",
                    border: "1px solid #ebebeb",
                    borderRadius: 12,
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ ...DM, fontSize: 12, color: "#71717a" }}>Invoice:</span>
                    <span style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#0c1a0e" }}>
                      #{payingInvoice.id.toString().padStart(4, "0")} — {payingInvoice.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ ...DM, fontSize: 12, color: "#71717a" }}>Invoice Total:</span>
                    <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: "#059669" }}>
                      LKR {Number(payingInvoice.total_amount || payingInvoice.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 5 }}>
                    Confirmed Paid / Advance Amount (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderPaidAmount}
                    onChange={(e) => setOrderPaidAmount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      ...DM,
                      fontSize: 13,
                      border: "1px solid #ebebeb",
                      borderRadius: 8,
                      outline: "none",
                      background: "#f9f9f9",
                    }}
                  />
                  <span style={{ ...DM, fontSize: 11, color: "#71717a", marginTop: 3, display: "block" }}>
                    {orderPaidAmount >= Number(payingInvoice.total_amount || payingInvoice.total || 0)
                      ? "Full payment received (Payment status: Paid)"
                      : orderPaidAmount > 0
                      ? "Partial deposit received (Payment status: Partially Paid)"
                      : "Unpaid order"}
                  </span>
                </div>

                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 5 }}>
                    Shipping / Delivery Address (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter customer shipping address..."
                    value={orderShippingAddress}
                    onChange={(e) => setOrderShippingAddress(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      ...DM,
                      fontSize: 13,
                      border: "1px solid #ebebeb",
                      borderRadius: 8,
                      outline: "none",
                      background: "#f9f9f9",
                    }}
                  />
                </div>

                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 5 }}>
                    Estimated Delivery Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={orderEstimatedDelivery}
                    onChange={(e) => setOrderEstimatedDelivery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      ...DM,
                      fontSize: 13,
                      border: "1px solid #ebebeb",
                      borderRadius: 8,
                      outline: "none",
                      background: "#f9f9f9",
                    }}
                  />
                </div>

                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 5 }}>
                    Order Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Notes, delivery instructions or terms..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      ...DM,
                      fontSize: 13,
                      border: "1px solid #ebebeb",
                      borderRadius: 8,
                      outline: "none",
                      background: "#f9f9f9",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "14px 22px",
                  borderTop: "1px solid #ebebeb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  background: "#fff",
                }}
              >
                <button
                  type="button"
                  onClick={handleMarkPaidOnly}
                  disabled={creatingOrderFromInv}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#71717a",
                    ...DM,
                    fontSize: 12,
                    textDecoration: "underline",
                    cursor: creatingOrderFromInv ? "not-allowed" : "pointer",
                  }}
                >
                  Quick Confirm (Auto-create Order)
                </button>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setPayingInvoice(null)}
                    disabled={creatingOrderFromInv}
                    style={{
                      padding: "8px 14px",
                      background: "rgba(0,0,0,0.06)",
                      color: "#3f3f46",
                      border: "none",
                      borderRadius: 8,
                      cursor: creatingOrderFromInv ? "not-allowed" : "pointer",
                      ...DM,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPaymentAndCreateOrder}
                    disabled={creatingOrderFromInv}
                    style={{
                      padding: "8px 18px",
                      background: creatingOrderFromInv
                        ? "rgba(34,197,94,0.3)"
                        : "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: creatingOrderFromInv ? "not-allowed" : "pointer",
                      ...DM,
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 2px 10px rgba(34,197,94,0.25)",
                    }}
                  >
                    <CheckCircle2 size={14} />
                    {creatingOrderFromInv ? "Creating Order…" : "Confirm & Create Order"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Portal>
  );
};

export default CustomerOrdersModal;
