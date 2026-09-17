import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getToken } from '../../../lib/auth';
import { useDialog } from '../shared/DialogProvider';
import { useTableSelection } from '../shared/useTableSelection';
import { TimeRange, emptyTimeRange, matchesTimeRange } from '../shared/TimeRangeFilter';
import {
  Customer, ProfileImage, Metrics,
  detectCountryCode, getTimeRangeDates
} from './CustomerTypes';

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function useCustomers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm: dlgConfirm, toast } = useDialog();
  const tableRef = useRef<HTMLDivElement>(null);

  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "orders">("newest");
  const [timeRange, setTimeRange] = useState<TimeRange>(emptyTimeRange);
  const [progressCategory, setProgressCategory] = useState<"all" | "lead" | "interest" | "conversion">("all");
  const [progressStage, setProgressStage] = useState<string>("");

  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    const param = searchParams.get("rows");
    if (param && [10, 20, 50, 100].includes(Number(param))) return Number(param);
    const saved = sessionStorage.getItem("customers_rows_per_page");
    if (saved && [10, 20, 50, 100].includes(Number(saved))) return Number(saved);
    return 20;
  });

  const [currentPage, setCurrentPage] = useState<number>(() => {
    const param = searchParams.get("page");
    if (param) {
      const parsed = parseInt(param, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const saved = sessionStorage.getItem("customers_page");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 1;
  });

  const handlePageChange = (newPage: number, shouldScroll = true) => {
    const p = Math.max(1, newPage);
    setCurrentPage(p);
    sessionStorage.setItem("customers_page", String(p));
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p === 1) next.delete("page");
      else next.set("page", String(p));
      return next;
    }, { replace: true });

    if (shouldScroll) {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleRowsPerPageChange = (newRows: number) => {
    setRowsPerPage(newRows);
    sessionStorage.setItem("customers_rows_per_page", String(newRows));
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newRows === 20) next.delete("rows");
      else next.set("rows", String(newRows));
      return next;
    }, { replace: true });
    handlePageChange(1, false);
  };

  useEffect(() => {
    if (currentPage > 1 && searchParams.get("page") !== String(currentPage)) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set("page", String(currentPage));
        return next;
      }, { replace: true });
    }
  }, []);

  useEffect(() => {
    const pageFromUrl = searchParams.get("page");
    if (pageFromUrl) {
      const parsed = parseInt(pageFromUrl, 10);
      const validPage = !isNaN(parsed) && parsed > 0 ? parsed : 1;
      if (validPage !== currentPage) {
        setCurrentPage(validPage);
        sessionStorage.setItem("customers_page", String(validPage));
      }
    }
  }, [searchParams]);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
  const [selectedEditCountryCode, setSelectedEditCountryCode] = useState("+94");
  const [createForm, setCreateForm] = useState({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
  const [selectedCountryCode, setSelectedCountryCode] = useState("+94");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [profileImages, setProfileImages] = useState<ProfileImage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const metrics: Metrics = useMemo(() => {
    const { start, end, label, prevStart, prevEnd, prevLabel } = getTimeRangeDates(timeRange);

    const timeFilteredCustomers = timeRange.preset
      ? customers.filter(c => matchesTimeRange(c.created_at, timeRange))
      : customers;

    const totalCustomers = timeFilteredCustomers.length;
    const totalOrders = timeFilteredCustomers.reduce((sum, c) => sum + (c.order_count || 0), 0);
    const countries = new Set(timeFilteredCustomers.map(c => detectCountryCode(c.phone)));
    const activeCountries = countries.size;

    let newCount = 0;
    let prevCount = 0;

    if (timeRange.preset) {
      newCount = timeFilteredCustomers.length;
      prevCount = customers.filter(c => {
        const d = new Date(c.created_at);
        return d >= prevStart && d < prevEnd;
      }).length;
    } else {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      newCount = customers.filter(c => new Date(c.created_at) >= thisMonthStart).length;
      prevCount = customers.filter(c => {
        const d = new Date(c.created_at);
        return d >= lastMonthStart && d <= lastMonthEnd;
      }).length;
    }

    let trendPercentage = 0;
    if (prevCount > 0) {
      trendPercentage = Math.round(((newCount - prevCount) / prevCount) * 1000) / 10;
    } else if (newCount > 0) {
      trendPercentage = 100;
    }

    return {
      totalCustomers,
      newThisMonth: newCount,
      totalOrders,
      activeCountries,
      trendPercentage,
      label: timeRange.preset ? `New ${label}` : 'New This Month',
      prevLabel
    };
  }, [customers, timeRange]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "name") setEditForm(prev => ({ ...prev, name: value }));
    else if (name === "phone") setEditForm(prev => ({ ...prev, phone: value.replace(/\D/g, "") }));
  };

  const handleStageChange = (field: "lead_stage" | "interest_stage" | "conversion_stage", value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (field === "lead_stage" && value === "New Lead") {
      setEditForm((prev) => ({ ...prev, interest_stage: "", conversion_stage: "" }));
    }
    if (field === "interest_stage" && !value) {
      setEditForm((prev) => ({ ...prev, conversion_stage: "" }));
    }
  };

  const handleEditCountryChange = (code: string) => {
    setSelectedEditCountryCode(code);
    if (editForm.phone.startsWith(code.replace("+", ""))) return;
    setEditForm(prev => ({ ...prev, phone: "" }));
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "name") setCreateForm(prev => ({ ...prev, name: value }));
    else if (name === "phone") setCreateForm(prev => ({ ...prev, phone: value.replace(/\D/g, "") }));
  };

  const handleCreateCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    if (createForm.phone.startsWith(code.replace("+", ""))) return;
    setCreateForm(prev => ({ ...prev, phone: "" }));
  };

  const handleCreateStageChange = (field: "lead_stage" | "interest_stage" | "conversion_stage", value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    if (field === "lead_stage" && value === "New Lead") {
      setCreateForm((prev) => ({ ...prev, interest_stage: "", conversion_stage: "" }));
    }
    if (field === "interest_stage" && !value) {
      setCreateForm((prev) => ({ ...prev, conversion_stage: "" }));
    }
  };

  const handleCreateCustomer = async () => {
    if (!createForm.name.trim() || !createForm.phone.trim()) return;
    const fullPhone = `${selectedCountryCode}${createForm.phone}`.replace("+", "");
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${backendUrl}/manage-customers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          phone: fullPhone,
          lead_stage: createForm.lead_stage || "New Lead",
          interest_stage: createForm.interest_stage || null,
          conversion_stage: createForm.conversion_stage || null
        }),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Failed to create customer"); }
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to create customer");
      setShowCreateModal(false);
      setCreateForm({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
      setSelectedCountryCode("+94");
      fetchCustomers();
      setError(null);
    } catch (err: any) {
      console.error("Create customer error:", err);
      setError(err.message || "Failed to create customer");
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !editForm.name.trim() || !editForm.phone.trim()) return;
    const fullPhone = `${selectedEditCountryCode}${editForm.phone}`.replace("+", "");
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${backendUrl}/manage-customers`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCustomer.id,
          name: editForm.name.trim(),
          phone: fullPhone,
          lead_stage: editForm.lead_stage || "New Lead",
          interest_stage: editForm.interest_stage || null,
          conversion_stage: editForm.conversion_stage || null
        }),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Failed to update customer"); }
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to update customer");
      setEditingCustomer(null);
      setEditForm({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
      setSelectedEditCountryCode("+94");
      fetchCustomers();
      setError(null);
    } catch (err: any) {
      console.error("Update error:", err);
      setError(err.message || "Failed to update customer");
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${backendUrl}/manage-customers?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Failed to delete customer"); }
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to delete customer");
      setDeletingCustomer(null);
      fetchCustomers();
      setError(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete customer");
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) { setError("User not authenticated"); setLoading(false); return; }

      const agentResponse = await fetch(`${backendUrl}/get-agent-profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!agentResponse.ok) { setError("Failed to fetch agent profile"); setLoading(false); return; }
      const agentProfile = await agentResponse.json();
      if (!agentProfile.success || !agentProfile.agent) { setError("Agent not found"); setLoading(false); return; }

      const agentData = agentProfile.agent;
      setAgentId(agentData.id);
      setAgentPrefix(agentData.agent_prefix);
      if (!agentData.agent_prefix) { setError("Agent prefix not found"); setLoading(false); return; }

      const customersResponse = await fetch(`${backendUrl}/manage-customers`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!customersResponse.ok) { setError("Failed to fetch customers"); setLoading(false); return; }
      const customersData = await customersResponse.json();
      if (!customersData.success) { setError("Failed to fetch customers"); setLoading(false); return; }

      const customersWithOrderCounts: Customer[] = (customersData.customers || []).map((c: any) => ({
        ...c,
        order_count: Number(c.order_count) || 0
      }));

      const initialProfileImages: ProfileImage[] = customersWithOrderCounts.map(customer => ({
        phone: customer.phone,
        url: customer.profile_image_url || undefined,
        loading: false,
        error: !customer.profile_image_url,
      }));
      setProfileImages(initialProfileImages);
      setCustomers(customersWithOrderCounts);
      setCurrentUserId(agentData.user_id);
    } catch (err) {
      setError("Failed to load customers");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const fetchProfilePicture = async (phone: string) => {
    const existing = profileImages.find(img => img.phone === phone);
    if (existing && (existing.url || existing.error)) return;
    setProfileImages(prev => prev.map(img => img.phone === phone ? { ...img, loading: true, error: false } : img));
    try {
      const token = getToken();
      const response = await fetch(`${backendUrl}/get-whatsapp-profile-pic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ phone, user_id: currentUserId }),
      });
      if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP ${response.status}: ${errorText}`); }
      const data = await response.json();
      if (data.success && data.profile_image_url) {
        setProfileImages(prev => prev.map(img => img.phone === phone ? { ...img, url: data.profile_image_url, loading: false } : img));
      } else {
        setProfileImages(prev => prev.map(img => img.phone === phone ? { ...img, error: true, loading: false } : img));
      }
    } catch {
      setProfileImages(prev => prev.map(img => img.phone === phone ? { ...img, error: true, loading: false } : img));
    }
  };

  useEffect(() => {
    if (customers.length > 0 && currentUserId) {
      customers.slice(0, 5).forEach(customer => fetchProfilePicture(customer.phone));
    }
  }, [customers, currentUserId]);

  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || customer.phone.includes(searchTerm);
    let matchesProgress = true;
    if (progressCategory !== "all") {
      if (progressCategory === "lead") {
        matchesProgress = !customer.conversion_stage && !customer.interest_stage;
        if (progressStage) matchesProgress = matchesProgress && customer.lead_stage === progressStage;
      } else if (progressCategory === "interest") {
        matchesProgress = !customer.conversion_stage && !!customer.interest_stage;
        if (progressStage) matchesProgress = matchesProgress && customer.interest_stage === progressStage;
      } else if (progressCategory === "conversion") {
        matchesProgress = !!customer.conversion_stage;
        if (progressStage) matchesProgress = matchesProgress && customer.conversion_stage === progressStage;
      }
    }
    const matchesTime = matchesTimeRange(customer.created_at, timeRange);
    return matchesSearch && matchesProgress && matchesTime;
  });

  const sortedCustomers = [...filteredCustomers].sort((a: Customer, b: Customer) => {
    switch (sortBy) {
      case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "orders": return (b.order_count || 0) - (a.order_count || 0);
      default: return 0;
    }
  });

  const totalCustomersCount = sortedCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCustomersCount / rowsPerPage));
  const effectiveCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (effectiveCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalCustomersCount);
  const paginatedCustomers = sortedCustomers.slice(startIndex, endIndex);

  const selection = useTableSelection<number>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const pageIds = paginatedCustomers.map((c) => c.id);
  const isAllPageSelected = selection.isAllSelected(pageIds);
  const isPageIndeterminate = selection.isIndeterminate(pageIds);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isPageIndeterminate;
    }
  }, [isPageIndeterminate]);

  const handleBulkDelete = async () => {
    const count = selection.selectedCount;
    if (count === 0) return;
    if (
      !(await dlgConfirm(
        `Are you sure you want to delete ${count} selected customer${count > 1 ? "s" : ""}? This action cannot be undone.`,
        { danger: true }
      ))
    )
      return;

    setIsBulkProcessing(true);
    try {
      const token = getToken();
      if (!token) {
        toast("User not authenticated", "error");
        return;
      }
      let successCount = 0;
      for (const id of selection.selectedIds) {
        const res = await fetch(`${backendUrl}/manage-customers?id=${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) successCount++;
      }
      toast(
        `Successfully deleted ${successCount} customer${successCount > 1 ? "s" : ""}`,
        "success"
      );
      selection.clearSelection();
      await fetchCustomers();
    } catch (err: any) {
      toast(`Bulk delete failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkBroadcast = () => {
    if (selection.selectedCount === 0) return;
    navigate("/agent/broadcasts", {
      state: { selectedCustomerIds: selection.selectedIds },
    });
  };

  useEffect(() => {
    if (!loading && totalCustomersCount > 0 && currentPage > totalPages) {
      handlePageChange(totalPages, false);
    }
  }, [loading, totalCustomersCount, totalPages, currentPage]);

  return {
    tableRef,
    agentPrefix,
    agentId,
    customers,
    paginatedCustomers,
    totalCustomersCount,
    totalPages,
    effectiveCurrentPage,
    startIndex,
    endIndex,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    timeRange,
    setTimeRange,
    progressCategory,
    setProgressCategory,
    progressStage,
    setProgressStage,
    rowsPerPage,
    handleRowsPerPageChange,
    handlePageChange,
    metrics,
    selection,
    isBulkProcessing,
    selectAllCheckboxRef,
    isAllPageSelected,
    pageIds,
    profileImages,
    setProfileImages,
    fetchCustomers,
    fetchProfilePicture,
    showCreateModal,
    setShowCreateModal,
    createForm,
    setCreateForm,
    selectedCountryCode,
    setSelectedCountryCode,
    handleCreateChange,
    handleCreateCountryChange,
    handleCreateStageChange,
    handleCreateCustomer,
    editingCustomer,
    setEditingCustomer,
    editForm,
    setEditForm,
    selectedEditCountryCode,
    setSelectedEditCountryCode,
    handleEditChange,
    handleEditCountryChange,
    handleStageChange,
    handleUpdateCustomer,
    deletingCustomer,
    setDeletingCustomer,
    handleDeleteCustomer,
    showOrderModal,
    setShowOrderModal,
    selectedCustomer,
    setSelectedCustomer,
    handleBulkDelete,
    handleBulkBroadcast,
  };
}
