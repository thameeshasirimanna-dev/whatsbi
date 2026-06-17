import React, { useState, useEffect } from "react";
import { getToken } from "../../../lib/auth";
import { Order, Appointment } from "../../../types/index";
import { Plus, X, FileText, Calendar } from "lucide-react";
import {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getInvoices,
  updateInvoiceStatus,
  deleteInvoice,
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

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  order_id: number;
  name: string;
  pdf_url: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  customerPhone,
  customerName,
  agentPrefix,
  agentId,
}) => {
  const { toast, confirm: dlgConfirm } = useDialog();
  const [activeTab, setActiveTab] = useState<"orders" | "invoices" | "appointments">("orders");
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

  useEffect(() => {
    if (isOpen && customerPhone && agentPrefix) {
      fetchCustomerData();
    }
  }, [isOpen, customerPhone, agentPrefix]);

  const fetchCustomerData = async () => {
    if (!customerPhone || !agentPrefix) return;

    setLoading(true);
    setError(null);

    try {
      const customers = await getCustomers({ search: customerPhone! });
      const customerData = customers.find((c) => c.phone === customerPhone);

      if (!customerData) {
        setOrders([]);
        setInvoices([]);
        setAppointments([]);
        setCustomerId(null);
        setLoading(false);
        return;
      }

      const customerId = customerData.id;
      setCustomerId(customerData.id);

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

      const ordersData = await getOrders({ customer_id: customerId });

      setOrders(
        (ordersData || []).map((order: any) => ({
          ...order,
          customer_name: customerName,
          customer_phone: customerPhone!,
        }))
      );

      const invoicesRaw = await getInvoices();

      const transformedInvoices = (invoicesRaw || [])
        .filter((inv) => inv.customer_id === customerId)
        .map((inv: any) => ({
          id: inv.id,
          order_id: inv.order_id,
          name: inv.name,
          pdf_url: inv.pdf_url,
          total_amount: inv.total || 0,
          status: inv.status,
          created_at: inv.generated_at,
        }));

      setInvoices(transformedInvoices);

      const appointmentsData = await getAppointments({ customer_id: customerId });

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

      const agent = await getCurrentAgent();
      if (!agent) {
        throw new Error("Agent not found");
      }

      const body = {
        user_id: agent.user_id,
        customer_phone: customerPhone,
        invoice_url: invoice.pdf_url,
        invoice_name: invoice.name,
        order_number: invoice.order_id.toString(),
        total_amount: invoice.total_amount.toString(),
        customer_name: customerName,
      };

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/send-invoice-template`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invoice");
      }

      if (data && data.success) {
        toast("Invoice sent successfully via WhatsApp!", 'success');
      } else {
        throw new Error("Failed to send invoice");
      }
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
    if (!agentPrefix) {
      setError("Missing agent prefix");
      return;
    }

    setUpdatingId(invoice.id);

    try {
      await updateInvoiceStatus(invoice.id, "paid");
      toast("Marked invoice as paid", 'success');
      await fetchCustomerData();
    } catch (err: any) {
      setError("Failed to mark as paid: " + err.message);
      console.error("Mark paid error:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isOpen) return null;

  const TAB_DEFS = [
    { key: "orders" as const, label: "Orders", count: orders.length, badge: { bg: "rgba(8,145,178,0.1)", color: "#0891b2" } },
    { key: "invoices" as const, label: "Invoices", count: invoices.length, badge: { bg: "rgba(34,197,94,0.1)", color: "#059669" } },
    { key: "appointments" as const, label: "Appointments", count: appointments.length, badge: { bg: "rgba(217,119,6,0.1)", color: "#d97706" } },
  ];

  const actionDisabled = !customerId || loading;
  const invoiceActionDisabled = !customerId || loading || orders.length === 0;

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
          style={{
            flexShrink: 0,
            borderBottom: "1px solid #ebebeb",
            padding: "20px 24px 0",
            background: "#fff",
          }}
        >
          {/* Title row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <span style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: "#0c1a0e" }}>
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
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 0 }}>
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
                      padding: "10px 16px",
                      background: "none",
                      border: "none",
                      borderBottom: isActive ? "2px solid #22c55e" : "2px solid transparent",
                      color: isActive ? "#059669" : "#71717a",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      transition: "color 0.15s, border-color 0.15s",
                      marginBottom: -1,
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

            <div style={{ display: "flex", gap: 8, paddingBottom: 12 }}>
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
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "48px 0",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "3px solid rgba(34,197,94,0.2)",
                  borderTopColor: "#22c55e",
                  animation: "com-spin 0.8s linear infinite",
                }}
              />
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
            agentPrefix={agentPrefix}
            agentId={agentId}
            agentDetails={agentDetails}
            invoiceTemplatePath={invoiceTemplatePath}
            onSuccess={fetchCustomerData}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerOrdersModal;
