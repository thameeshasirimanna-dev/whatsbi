import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getToken } from "../../../lib/auth";
import { createOrderFromInvoice } from "../../../lib/api";
import { useDialog } from "../shared/DialogProvider";
import { TimeRange, emptyTimeRange, matchesTimeRange } from "../shared/TimeRangeFilter";
import { useTableSelection } from "../shared/useTableSelection";
import { useBulkProgress } from "../shared/BulkProgress";
import {
  InvoiceWithDetails,
  Customer,
  OrderForModal,
  AgentDetails,
  WhatsAppConfig,
} from "./types";
import { sanitizeFileName } from "./constants";

const getUser = async () => {
  try {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/get-current-user`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      }
    );
    const data = await response.json();
    if (response.ok && data.success) {
      if (!data.user || !data.user.id)
        return { data: { user: null }, error: "Invalid user data from server" };
      return { data: { user: data.user }, error: null };
    } else {
      return { data: { user: null }, error: data.message || "Failed to get user" };
    }
  } catch (error) {
    return { data: { user: null }, error };
  }
};

export const useInvoices = (tableRef: React.RefObject<HTMLDivElement>) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast, confirm: dlgConfirm } = useDialog();

  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(emptyTimeRange);

  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    const param = searchParams.get("rows");
    if (param && [10, 20, 50, 100].includes(Number(param))) return Number(param);
    const saved = sessionStorage.getItem("invoices_rows_per_page");
    if (saved && [10, 20, 50, 100].includes(Number(saved))) return Number(saved);
    return 20;
  });

  const [currentPage, setCurrentPage] = useState<number>(() => {
    const param = searchParams.get("page");
    if (param) {
      const parsed = parseInt(param, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const saved = sessionStorage.getItem("invoices_page");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 1;
  });

  const [updating, setUpdating] = useState<number | null>(null);
  const { bulkProgress, isProcessing: isBulkProcessing, setBulkProgress } = useBulkProgress();
  const [invoiceTemplatePath, setInvoiceTemplatePath] = useState<string | null>(null);
  const [agentDetails, setAgentDetails] = useState<AgentDetails>({
    name: "",
    address: "",
    business_email: "",
    contact_number: "",
    website: "",
  });
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null);

  const handleEditInvoice = (inv: InvoiceWithDetails) => {
    setEditingInvoice(inv);
    setIsModalOpen(true);
  };

  // Mark Paid & Create Order state
  const [payingInvoice, setPayingInvoice] = useState<InvoiceWithDetails | null>(null);
  const [orderPaidAmount, setOrderPaidAmount] = useState<number>(0);
  const [orderShippingAddress, setOrderShippingAddress] = useState("");
  const [orderEstimatedDelivery, setOrderEstimatedDelivery] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [creatingOrderFromInv, setCreatingOrderFromInv] = useState(false);

  // Multi-selection hook
  const selection = useTableSelection<number>([]);

  const handlePageChange = (newPage: number, shouldScroll = true) => {
    const p = Math.max(1, newPage);
    setCurrentPage(p);
    sessionStorage.setItem("invoices_page", String(p));
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (p === 1) next.delete("page");
        else next.set("page", String(p));
        return next;
      },
      { replace: true }
    );

    if (shouldScroll) {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleRowsPerPageChange = (newRows: number) => {
    setRowsPerPage(newRows);
    sessionStorage.setItem("invoices_rows_per_page", String(newRows));
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (newRows === 20) next.delete("rows");
        else next.set("rows", String(newRows));
        return next;
      },
      { replace: true }
    );
    handlePageChange(1, false);
  };

  useEffect(() => {
    if (currentPage > 1 && searchParams.get("page") !== String(currentPage)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("page", String(currentPage));
          return next;
        },
        { replace: true }
      );
    }
  }, []);

  useEffect(() => {
    const pageFromUrl = searchParams.get("page");
    if (pageFromUrl) {
      const parsed = parseInt(pageFromUrl, 10);
      const validPage = !isNaN(parsed) && parsed > 0 ? parsed : 1;
      if (validPage !== currentPage) {
        setCurrentPage(validPage);
        sessionStorage.setItem("invoices_page", String(validPage));
      }
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      const userResult = await getUser();
      if (userResult.error || !userResult.data.user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      const user = userResult.data.user;
      if (
        !user.id ||
        user.id === "null" ||
        !user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      ) {
        setError("Invalid user data");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        setError("Failed to fetch agent profile");
        setLoading(false);
        return;
      }
      const agentProfile = await response.json();
      if (!agentProfile.success || !agentProfile.agent) {
        setError("Agent not found");
        setLoading(false);
        return;
      }

      const agentData = agentProfile.agent;
      setAgentId(agentData.id);
      setAgentPrefix(agentData.agent_prefix);
      setInvoiceTemplatePath(agentData.invoice_template_path);
      setAgentDetails({
        name: agentData.name || "",
        address: agentData.address || "",
        business_email: agentData.business_email || "",
        contact_number: agentData.contact_number || "",
        website: agentData.website || "",
      });

      if (user.id) {
        const whatsappResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config?user_id=${user.id}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }
        );
        if (whatsappResponse.ok) {
          const whatsappData = await whatsappResponse.json();
          if (whatsappData.success && whatsappData.whatsapp_config) {
            const config = whatsappData.whatsapp_config[0] || whatsappData.whatsapp_config;
            setWhatsappConfig({
              phone_number_id: config.phone_number_id,
              api_key: config.api_key,
            });
          }
        }
      }

      if (!agentData.agent_prefix) {
        setError("Agent prefix not found");
        setLoading(false);
        return;
      }

      const customersResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-customers`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );
      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        if (customersData.success) {
          const agentCustomers =
            customersData.customers.map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.phone || "",
            })) || [];
          setCustomers(agentCustomers);
        }
      }

      const invoicesResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-invoices`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );
      if (!invoicesResponse.ok) {
        setError("Failed to fetch invoices");
        setLoading(false);
        return;
      }
      const invoicesData = await invoicesResponse.json();
      if (!invoicesData.success) {
        setError("Failed to fetch invoices");
        setLoading(false);
        return;
      }
      setInvoices(
        (invoicesData.invoices || []).map((inv: any) => ({
          ...inv,
          total: parseFloat(inv.total) || 0,
          invoice_number:
            inv.invoice_number || `#INV-${inv.id.toString().padStart(4, "0")}`,
        }))
      );
      setError(null);
    } catch (err) {
      setError("Failed to load data");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter logic
  const filteredInvoices = invoices.filter((invoice) => {
    const invNum =
      invoice.invoice_number || `#INV-${invoice.id.toString().padStart(4, "0")}`;
    const matchesCustomer =
      selectedCustomerFilter === null || invoice.customer_id === selectedCustomerFilter;
    const matchesSearch =
      searchTerm === "" ||
      invNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toString().includes(searchTerm) ||
      (invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (invoice.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (invoice.status?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (invoice.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesTime = matchesTimeRange(invoice.generated_at, timeRange);
    return matchesCustomer && matchesSearch && matchesTime;
  });

  // Pagination calculations
  const totalInvoicesCount = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalInvoicesCount / rowsPerPage));
  const effectiveCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (effectiveCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalInvoicesCount);
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  useEffect(() => {
    if (!loading && totalInvoicesCount > 0 && currentPage > totalPages) {
      handlePageChange(totalPages, false);
    }
  }, [loading, totalInvoicesCount, totalPages, currentPage]);

  // Actions
  const handleSendInvoice = async (invoiceId: number) => {
    if (!whatsappConfig) {
      setError("WhatsApp not configured. Please set up WhatsApp in settings.");
      return;
    }
    setUpdating(invoiceId);

    try {
      const token = getToken();
      if (!token) throw new Error("User not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-invoices?action=send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ invoice_id: invoiceId }),
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send invoice");
      }

      await fetchData();
      toast("Invoice sent via WhatsApp successfully!", "success");
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to send invoice");
      toast(err.message || "Failed to send invoice", "error");
    } finally {
      setUpdating(null);
    }
  };

  const downloadPDF = async (invoice: InvoiceWithDetails) => {
    try {
      const token = getToken();
      if (!token) {
        setError("User not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/download-invoice?invoiceId=${invoice.id}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to download PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitizeFileName(invoice.name)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download PDF: " + (err as Error).message);
      console.error("Download PDF error:", err);
    }
  };

  const handleDeleteInvoice = async (invoice: InvoiceWithDetails) => {
    if (
      !(await dlgConfirm(
        `Delete invoice "${invoice.name}"? This will remove the PDF from storage and record from database.`,
        { danger: true }
      ))
    )
      return;
    if (!agentPrefix) {
      setError("Agent configuration missing");
      return;
    }
    setUpdating(invoice.id);

    try {
      const token = getToken();
      if (!token) throw new Error("User not authenticated");

      const dbDeleteResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-invoices?id=${invoice.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!dbDeleteResponse.ok) throw new Error("Failed to delete invoice record");
      const dbData = await dbDeleteResponse.json();
      if (!dbData.success) throw new Error("Failed to delete invoice record");

      // Remove from selection if selected
      selection.setSelectedIds((prev) => prev.filter((id) => id !== invoice.id));

      await fetchData();
      toast("Invoice deleted successfully", "success");
      setError(null);
    } catch (err) {
      setError("Failed to delete invoice: " + (err as Error).message);
      console.error("Delete invoice error:", err);
    } finally {
      setUpdating(null);
    }
  };

  const handleOpenMarkPaidModal = (invoice: InvoiceWithDetails) => {
    setPayingInvoice(invoice);
    const invoiceTotal = Number(invoice.total_amount || invoice.total || 0);
    setOrderPaidAmount(invoiceTotal);
    setOrderShippingAddress("");
    setOrderEstimatedDelivery("");
    setOrderNotes("");
  };

  const handleMarkPaidFull = async (invoice: InvoiceWithDetails) => {
    try {
      const token = getToken();
      if (!token) throw new Error("User not authenticated");
      const totalAmt = Number(invoice.total_amount || invoice.total || 0);
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-invoices`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          status: "paid",
          advance_amount: totalAmt,
          order_id: invoice.linked_order_id || invoice.order_id,
        }),
      });
      if (!res.ok) throw new Error("Failed to update invoice");
      toast("Marked invoice as paid in full and sent confirmation!", "success");
      await fetchData();
    } catch (err: any) {
      toast(err.message || "Failed to mark invoice as paid in full", "error");
    }
  };

  const handleConfirmPaymentAndCreateOrder = async () => {
    if (!payingInvoice) return;
    setCreatingOrderFromInv(true);
    try {
      const paidVal = Number(orderPaidAmount) || 0;
      await createOrderFromInvoice({
        invoice_id: payingInvoice.id,
        advance_amount: paidVal,
        shipping_address: orderShippingAddress.trim() || undefined,
        estimated_delivery_date: orderEstimatedDelivery || undefined,
        notes: orderNotes.trim() || undefined,
      });
      toast("Payment confirmed! Order created in CRM successfully.", "success");
      setPayingInvoice(null);
      await fetchData();
    } catch (err: any) {
      console.error("Create order from invoice error:", err);
      toast(err.message || "Failed to create order from invoice", "error");
    } finally {
      setCreatingOrderFromInv(false);
    }
  };

  const handleMarkPaidOnly = async () => {
    if (!payingInvoice) return;
    setCreatingOrderFromInv(true);
    try {
      const token = getToken();
      if (!token) throw new Error("User not authenticated");
      const totalAmt = Number(payingInvoice.total_amount || payingInvoice.total || 0);
      const paidAmt = Number(orderPaidAmount) || 0;
      const isFull = paidAmt >= totalAmt && totalAmt > 0;
      const status = isFull ? "paid" : "partially_paid";
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-invoices`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payingInvoice.id,
          status,
          advance_amount: paidAmt,
          order_id: payingInvoice.linked_order_id || payingInvoice.order_id,
        }),
      });
      if (!res.ok) throw new Error("Failed to update invoice");
      toast(
        isFull
          ? "Marked invoice as paid in full"
          : "Marked invoice as partially paid (advance received)",
        "success"
      );
      setPayingInvoice(null);
      await fetchData();
    } catch (err: any) {
      toast(err.message || "Failed to mark invoice as paid", "error");
    } finally {
      setCreatingOrderFromInv(false);
    }
  };

  // Bulk Operations
  const handleBulkMarkPaid = async () => {
    const selected = invoices.filter((inv) => selection.selectedIds.includes(inv.id));
    const unpaid = selected.filter((inv) => inv.status !== "paid");

    if (unpaid.length === 0) {
      toast("All selected invoices are already marked as paid.", "info");
      return;
    }

    if (
      !(await dlgConfirm(
        `Mark ${unpaid.length} selected invoice${unpaid.length > 1 ? "s" : ""} as paid in full?`
      ))
    ) {
      return;
    }

    const total = unpaid.length;
    setBulkProgress({ actionLabel: "Marking invoices paid...", current: 0, total });
    try {
      const token = getToken();
      if (!token) throw new Error("User not authenticated");

      let successCount = 0;
      for (let i = 0; i < total; i++) {
        const inv = unpaid[i];
        setBulkProgress({
          actionLabel: `Marking paid: #${inv.invoice_number || inv.id}...`,
          current: i + 1,
          total,
        });
        const totalAmt = Number(inv.total_amount || inv.total || 0);
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-invoices`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: inv.id,
            status: "paid",
            advance_amount: totalAmt,
            order_id: inv.linked_order_id || inv.order_id,
          }),
        });
        if (res.ok) successCount++;
      }

      toast(`Successfully marked ${successCount} invoice${successCount > 1 ? "s" : ""} as paid.`, "success");
      selection.clearSelection();
      await fetchData();
    } catch (err: any) {
      toast(err.message || "Failed to mark some invoices as paid", "error");
    } finally {
      setBulkProgress(null);
    }
  };

  const handleBulkDelete = async () => {
    const count = selection.selectedCount;
    if (count === 0) return;

    if (
      !(await dlgConfirm(
        `Are you sure you want to permanently delete ${count} selected invoice${count > 1 ? "s" : ""}? This will delete the PDF files and database records.`,
        { danger: true }
      ))
    ) {
      return;
    }

    const total = selection.selectedIds.length;
    setBulkProgress({ actionLabel: "Deleting invoices...", current: 0, total });
    try {
      const token = getToken();
      if (!token) throw new Error("User not authenticated");

      let successCount = 0;
      for (let i = 0; i < total; i++) {
        const id = selection.selectedIds[i];
        setBulkProgress({
          actionLabel: `Deleting invoice #${id}...`,
          current: i + 1,
          total,
        });
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-invoices?id=${id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) successCount++;
      }

      toast(`Successfully deleted ${successCount} invoice${successCount > 1 ? "s" : ""}.`, "success");
      selection.clearSelection();
      await fetchData();
    } catch (err: any) {
      toast(err.message || "Failed to delete some invoices", "error");
    } finally {
      setBulkProgress(null);
    }
  };

  const handleBulkDownload = async () => {
    const selected = invoices.filter((inv) => selection.selectedIds.includes(inv.id));
    if (selected.length === 0) return;

    const total = selected.length;
    setBulkProgress({ actionLabel: "Downloading invoice PDFs...", current: 0, total });
    try {
      toast(`Downloading ${total} invoice PDF${total > 1 ? "s" : ""}…`, "info");
      for (let i = 0; i < total; i++) {
        const inv = selected[i];
        setBulkProgress({
          actionLabel: `Downloading invoice #${inv.invoice_number || inv.id}...`,
          current: i + 1,
          total,
        });
        await downloadPDF(inv);
        // Small delay between downloads to prevent browser throttle
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      toast(`Downloaded ${total} invoices.`, "success");
    } catch (err: any) {
      toast(err.message || "Error downloading PDFs", "error");
    } finally {
      setBulkProgress(null);
    }
  };

  // Summary stats
  const totalInvoices = filteredInvoices.length;
  const paidCount = filteredInvoices.filter((i) => i.status === "paid").length;
  const sentCount = filteredInvoices.filter((i) => i.status === "sent").length;
  const totalPaidRevenue = filteredInvoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + parseFloat(i.total as any), 0);

  return {
    invoices,
    customers,
    loading,
    error,
    agentId,
    agentPrefix,
    invoiceTemplatePath,
    agentDetails,
    searchTerm,
    setSearchTerm,
    selectedCustomerFilter,
    setSelectedCustomerFilter,
    timeRange,
    setTimeRange,
    rowsPerPage,
    currentPage,
    handlePageChange,
    handleRowsPerPageChange,
    updating,
    isBulkProcessing,
    bulkProgress,
    isModalOpen,
    setIsModalOpen,
    editingInvoice,
    setEditingInvoice,
    handleEditInvoice,
    fetchData,
    filteredInvoices,
    paginatedInvoices,
    totalInvoicesCount,
    totalPages,
    effectiveCurrentPage,
    startIndex,
    endIndex,
    totalInvoices,
    paidCount,
    sentCount,
    totalPaidRevenue,
    handleSendInvoice,
    downloadPDF,
    handleDeleteInvoice,
    handleOpenMarkPaidModal,
    handleMarkPaidFull,
    payingInvoice,
    setPayingInvoice,
    orderPaidAmount,
    setOrderPaidAmount,
    orderShippingAddress,
    setOrderShippingAddress,
    orderEstimatedDelivery,
    setOrderEstimatedDelivery,
    orderNotes,
    setOrderNotes,
    creatingOrderFromInv,
    handleConfirmPaymentAndCreateOrder,
    handleMarkPaidOnly,
    // Multi-selection & bulk actions
    selection,
    handleBulkMarkPaid,
    handleBulkDelete,
    handleBulkDownload,
  };
};

export default useInvoices;
