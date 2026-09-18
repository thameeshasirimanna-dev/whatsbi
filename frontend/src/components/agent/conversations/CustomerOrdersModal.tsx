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
import MarkPaidModal from "./MarkPaidModal";
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

  const primaryBtnClass =
    "h-9 px-4 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_14px_rgba(159,232,112,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer w-full sm:w-auto shrink-0 border-0";

  return (
    <>
      <Portal>
        <div className="fixed inset-0 z-[100] bg-[#16281D]/65 flex items-center justify-center p-2.5 sm:p-4 animate-modal-backdrop">
          <style>{`@keyframes com-spin { to { transform: rotate(360deg); } }`}</style>

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-2xl w-full max-w-[min(64rem,95vw)] sm:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-modal-card">
          {/* Header */}
          <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#EAEAEA] bg-white flex items-center justify-between shrink-0">
            <h2 className="font-sans text-sm sm:text-base md:text-lg font-bold text-[#16281D] truncate mr-2">
              {customerName ? `${customerName}'s Records` : "Customer Records"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer border-0 shrink-0"
              aria-label="Close modal"
            >
              <X size={15} />
            </button>
          </div>

          {/* Subheader / Tabs toolbar */}
          <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[#EAEAEA] bg-[#F4F7F4]/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
            {/* Segmented Capsule Tabs */}
            <div className="bg-[#F4F7F4] p-1 rounded-full flex items-center gap-1 border border-[#EAEAEA] overflow-x-auto no-scrollbar max-w-full">
              {TAB_DEFS.map(({ key, label, count }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 sm:flex-none justify-center px-2.5 sm:px-3.5 py-1.5 rounded-full font-sans text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer border-0 shrink-0 ${
                      isActive
                        ? "bg-[#16281D] text-white shadow-xs"
                        : "text-[#71717A] hover:text-[#16281D] hover:bg-white/60 bg-transparent"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-[#9FE870] text-[#16281D] font-bold"
                          : "bg-black/5 text-[#71717A] font-semibold"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {activeTab === "orders" && (
                <button
                  onClick={() => setShowCreateOrderModal(true)}
                  disabled={actionDisabled}
                  className={primaryBtnClass}
                >
                  <Plus size={14} strokeWidth={2.4} />
                  <span>New Order</span>
                </button>
              )}
              {activeTab === "invoices" && (
                <button
                  onClick={() => {
                    setSelectedOrderId(null);
                    setShowGenerateModal(true);
                  }}
                  disabled={invoiceActionDisabled}
                  className={primaryBtnClass}
                >
                  <FileText size={14} strokeWidth={2.4} />
                  <span>Generate Invoice</span>
                </button>
              )}
              {activeTab === "appointments" && (
                <button
                  onClick={() => setShowCreateAppointmentModal(true)}
                  disabled={actionDisabled}
                  className={primaryBtnClass}
                >
                  <Calendar size={14} strokeWidth={2.4} />
                  <span>New Appointment</span>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-[#FAFAF9]/60">
            {loading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center">
                      <SkeletonBase className="w-32 h-4 rounded" />
                      <SkeletonBase className="w-20 h-5 rounded-full" />
                    </div>
                    <SkeletonBase className="w-full h-10 rounded-xl" />
                    <div className="flex gap-2 pt-3 border-t border-[#F4F7F4]">
                      <SkeletonBase className="w-16 h-8 rounded-full" />
                      <SkeletonBase className="w-16 h-8 rounded-full" />
                      <SkeletonBase className="w-28 h-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 font-sans text-sm text-[#E11D48]">
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
      </div>
    </Portal>

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
          <MarkPaidModal
            payingInvoice={payingInvoice}
            onClose={() => setPayingInvoice(null)}
            orderPaidAmount={orderPaidAmount}
            setOrderPaidAmount={setOrderPaidAmount}
            orderShippingAddress={orderShippingAddress}
            setOrderShippingAddress={setOrderShippingAddress}
            orderEstimatedDelivery={orderEstimatedDelivery}
            setOrderEstimatedDelivery={setOrderEstimatedDelivery}
            orderNotes={orderNotes}
            setOrderNotes={setOrderNotes}
            creatingOrderFromInv={creatingOrderFromInv}
            onQuickConfirm={handleMarkPaidOnly}
            onConfirmAndCreate={handleConfirmPaymentAndCreateOrder}
          />
        )}
    </>
  );
};

export default CustomerOrdersModal;
