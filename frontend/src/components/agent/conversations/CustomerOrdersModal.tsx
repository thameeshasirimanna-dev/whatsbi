import React, { useState, useEffect } from "react";
import { getToken } from "../../../lib/auth";
import { Order, Appointment } from "../../../types/index";
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

const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  customerPhone,
  customerName,
  agentPrefix,
  agentId,
}) => {
  const [activeTab, setActiveTab] = useState<
    "orders" | "invoices" | "appointments"
  >("orders");
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
  const [showCreateAppointmentModal, setShowCreateAppointmentModal] =
    useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showViewAppointmentModal, setShowViewAppointmentModal] =
    useState(false);
  const [showEditAppointmentModal, setShowEditAppointmentModal] =
    useState(false);
  const [agentDetails, setAgentDetails] = useState<AgentDetails>({
    name: "",
    address: "",
    business_email: "",
    contact_number: "",
    website: "",
  });
  const [invoiceTemplatePath, setInvoiceTemplatePath] = useState<string | null>(
    null
  );
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
      // First, find customer_id by phone
      const customers = await getCustomers({ search: customerPhone! });
      const customerData = customers.find((c) => c.phone === customerPhone);

      if (!customerData) {
        // No customer found, no data
        setOrders([]);
        setInvoices([]);
        setAppointments([]);
        setCustomerId(null);
        setLoading(false);
        return;
      }

      const customerId = customerData.id;
      setCustomerId(customerData.id);

      // Fetch agent details for invoice generation
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

      // Fetch orders for this customer
      const ordersData = await getOrders({ customer_id: customerId });

      setOrders(
        (ordersData || []).map((order: any) => ({
          ...order,
          customer_name: customerName,
          customer_phone: customerPhone!,
        }))
      );

      // Fetch invoices for this customer
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

      // Fetch appointments for this customer
      const appointmentsData = await getAppointments({
        customer_id: customerId,
      });

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

  const deleteAppointment = async (id: number) => {
    try {
      await deleteAppointment(id);

      await fetchCustomerData();
    } catch (err: any) {
      setError("Failed to delete appointment: " + err.message);
      console.error("Error deleting appointment:", err);
      throw err;
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
    if (
      window.confirm(
        `Are you sure you want to delete Order #${orderId}? This action cannot be undone.`
      )
    ) {
      try {
        if (!agentPrefix) {
          throw new Error("Missing agent prefix");
        }
        await deleteOrder(orderId);
        await fetchCustomerData(); // Refresh the list
      } catch (err: any) {
        alert("Failed to delete order: " + err.message);
      }
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
    if (
      window.confirm(
        `Are you sure you want to delete this appointment? This action cannot be undone.`
      )
    ) {
      try {
        await deleteAppointment(appointmentId);
      } catch (err: any) {
        alert("Failed to delete appointment: " + err.message);
      }
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    if (!customerPhone || !agentId) {
      setError("Missing customer or agent information");
      return;
    }

    try {
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
        alert("Invoice sent successfully via WhatsApp!");
      } else {
        throw new Error("Failed to send invoice");
      }
    } catch (err: any) {
      setError("Failed to send invoice: " + err.message);
      console.error("Error sending invoice:", err);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (
      !window.confirm(
        `Are you sure you want to delete invoice "${invoice.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    if (!agentPrefix) {
      setError("Missing agent prefix");
      return;
    }

    try {
      setLoading(true);

      // Extract path from public URL
      const urlParts = invoice.pdf_url.split("/invoices/");
      if (urlParts.length < 2) {
        throw new Error("Invalid invoice URL");
      }
      const filePath = urlParts[1];

      const invoicesTable = `${agentPrefix}_orders_invoices`;

      // Delete invoice (backend handles storage)
      await deleteInvoice(invoice.id);

      // Refetch data
      await fetchCustomerData();

      alert("Invoice deleted successfully!");
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
      const invoicesTable = `${agentPrefix}_orders_invoices`;

      await updateInvoiceStatus(invoice.id, "paid");

      alert("Marked invoice as paid");

      await fetchCustomerData();
    } catch (err: any) {
      setError("Failed to mark as paid: " + err.message);
      console.error("Mark paid error:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">
              {customerName ? `${customerName}'s Records` : "Customer Records"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
          <div className="flex items-center justify-between">
            <div className="flex bg-gray-50 rounded-lg p-1 space-x-1 flex-shrink-0">
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center ${
                  activeTab === "orders"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Orders
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full ml-2">
                  {orders.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("invoices")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center ${
                  activeTab === "invoices"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Invoices
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
                  {invoices.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("appointments")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center ${
                  activeTab === "appointments"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Appointments
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full ml-2">
                  {appointments.length}
                </span>
              </button>
            </div>
            <div className="flex space-x-2 ml-4 flex-shrink-0">
              {activeTab === "orders" && (
                <button
                  onClick={() => setShowCreateOrderModal(true)}
                  disabled={!customerId || loading}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  title="Create Order"
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </button>
              )}
              {activeTab === "invoices" && (
                <button
                  onClick={() => {
                    setSelectedOrderId(null);
                    setShowGenerateModal(true);
                  }}
                  disabled={!customerId || loading || orders.length === 0}
                  className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  title="Generate Invoice"
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </button>
              )}
              {activeTab === "appointments" && (
                <button
                  onClick={() => setShowCreateAppointmentModal(true)}
                  disabled={!customerId || loading}
                  className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  title="Create Appointment"
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">{error}</div>
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
