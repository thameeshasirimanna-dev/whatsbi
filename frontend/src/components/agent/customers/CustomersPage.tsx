import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "../../../lib/auth";
import {
  Users, UserPlus, ShoppingBag, Globe, Search, Plus, TrendingUp, TrendingDown,
  MessageCircle, Pencil, X,
} from 'lucide-react';
import CreateOrderModal from "./CreateOrderModal";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46',
  background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
  paddingRight: 12,
};

const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

interface ProfileImage {
  phone: string;
  url?: string;
  loading: boolean;
  error: boolean;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  created_at: string;
  lead_stage?: string;
  interest_stage?: string;
  conversion_stage?: string;
  order_count: number;
  profile_image_url?: string;
}

interface Metrics {
  totalCustomers: number;
  newThisMonth: number;
  totalOrders: number;
  activeCountries: number;
  trendPercentage: number;
}

const leadStages = ["New Lead", "Contacted", "Not Responding", "Follow-up Needed"] as const;
const interestStages = ["Interested", "Quotation Sent", "Asked for More Info"] as const;
const conversionStages = ["Payment Pending", "Paid", "Order Confirmed"] as const;

const getProgressStyle = (customer: Customer): React.CSSProperties => {
  if (customer.conversion_stage) return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (customer.interest_stage) return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
};

const getProgressLabel = (customer: Customer): string => {
  if (customer.conversion_stage) return customer.conversion_stage;
  if (customer.interest_stage) return customer.interest_stage;
  return customer.lead_stage || 'New Lead';
};

const StageSelects: React.FC<{
  leadStage: string;
  interestStage: string;
  conversionStage: string;
  onLeadChange: (v: string) => void;
  onInterestChange: (v: string) => void;
  onConversionChange: (v: string) => void;
}> = ({ leadStage, interestStage, conversionStage, onLeadChange, onInterestChange, onConversionChange }) => (
  <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ ...SYNE, fontSize: 12, fontWeight: 700, color: '#0c1a0e' }}>Customer Progress Stages</div>
    <div>
      <label style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 5 }}>
        Lead Stage
        <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 20, background: 'rgba(8,145,178,0.1)', color: '#0891b2' }}>Initial</span>
      </label>
      <select value={leadStage} onChange={e => onLeadChange(e.target.value)} style={selectStyle} onFocus={onFocusG} onBlur={onBlurG}>
        {leadStages.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
    <div>
      <label style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 5 }}>
        Interest Stage
        <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 20, background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>Optional</span>
      </label>
      <select value={interestStage} onChange={e => onInterestChange(e.target.value)} disabled={leadStage === 'New Lead'} style={{ ...selectStyle, background: leadStage === 'New Lead' ? '#f4f4f5' : '#f9f9f9', color: leadStage === 'New Lead' ? '#a1a1aa' : '#3f3f46', cursor: leadStage === 'New Lead' ? 'not-allowed' : 'pointer' }} onFocus={onFocusG} onBlur={onBlurG}>
        <option value="">No interest stage</option>
        {interestStages.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
    <div>
      <label style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 5 }}>
        Conversion Stage
        <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: '#059669' }}>Optional</span>
      </label>
      <select value={conversionStage} onChange={e => onConversionChange(e.target.value)} disabled={!interestStage} style={{ ...selectStyle, background: !interestStage ? '#f4f4f5' : '#f9f9f9', color: !interestStage ? '#a1a1aa' : '#3f3f46', cursor: !interestStage ? 'not-allowed' : 'pointer' }} onFocus={onFocusG} onBlur={onBlurG}>
        <option value="">No conversion stage</option>
        {conversionStages.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  </div>
);

const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "orders">("newest");
  const [progressCategory, setProgressCategory] = useState<"all" | "lead" | "interest" | "conversion">("all");
  const [progressStage, setProgressStage] = useState<string>("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
  const [selectedEditCountryCode, setSelectedEditCountryCode] = useState("+94");
  const [createForm, setCreateForm] = useState({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
  const [selectedCountryCode, setSelectedCountryCode] = useState("+94");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [profileImages, setProfileImages] = useState<ProfileImage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({ totalCustomers: 0, newThisMonth: 0, totalOrders: 0, activeCountries: 0, trendPercentage: 0 });

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] } }),
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.05, ease: "easeOut" } }),
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
  };

  const handleEditNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setEditForm({ ...editForm, [e.target.name]: value });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "name") handleEditNameChange(e);
    else if (e.target.name === "phone") handleEditPhoneChange(e);
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
    setEditForm({ ...editForm, phone: "" });
  };

  const detectCountryCode = (phone: string): string => {
    if (!phone) return "+1";
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("1")) return "+1";
    if (cleanPhone.startsWith("44")) return "+44";
    if (cleanPhone.startsWith("91")) return "+91";
    if (cleanPhone.startsWith("94")) return "+94";
    if (cleanPhone.startsWith("971")) return "+971";
    if (cleanPhone.startsWith("966")) return "+966";
    if (cleanPhone.startsWith("92")) return "+92";
    if (cleanPhone.startsWith("880")) return "+880";
    if (cleanPhone.startsWith("98")) return "+98";
    if (cleanPhone.startsWith("20")) return "+20";
    return "+1";
  };

  const getFlagEmoji = (countryCode: string): string => {
    const flags: Record<string, string> = {
      "+1": "🇺🇸", "+44": "🇬🇧", "+91": "🇮🇳", "+94": "🇱🇰",
      "+971": "🇦🇪", "+966": "🇸🇦", "+92": "🇵🇰", "+880": "🇧🇩",
      "+98": "🇮🇷", "+20": "🇪🇬",
    };
    return flags[countryCode] || "🌍";
  };

  const extractLocalNumber = (phone: string, countryCode: string): string => {
    const cleanPhone = phone.replace(/\D/g, "");
    const codeDigits = countryCode.replace("+", "");
    if (cleanPhone.startsWith(codeDigits)) return cleanPhone.substring(codeDigits.length);
    return cleanPhone;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCreateForm({ ...createForm, [e.target.name]: value });
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "name") handleNameChange(e);
    else if (e.target.name === "phone") handlePhoneChange(e);
  };

  const handleCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    if (createForm.phone.startsWith(code.replace("+", ""))) return;
    setCreateForm({ ...createForm, phone: "" });
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
        body: JSON.stringify({ name: createForm.name.trim(), phone: fullPhone, lead_stage: createForm.lead_stage || "New Lead", interest_stage: createForm.interest_stage || null, conversion_stage: createForm.conversion_stage || null }),
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
        body: JSON.stringify({ id: editingCustomer.id, name: editForm.name.trim(), phone: fullPhone, lead_stage: editForm.lead_stage || "New Lead", interest_stage: editForm.interest_stage || null, conversion_stage: editForm.conversion_stage || null }),
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

      const customersWithOrderCounts: Customer[] = (customersData.customers || []).map((c: any) => ({ ...c, order_count: Number(c.order_count) || 0 }));

      const totalCustomers = customersWithOrderCounts.length;
      const totalOrders = customersWithOrderCounts.reduce((sum, c) => sum + c.order_count, 0);
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const newThisMonth = customersWithOrderCounts.filter(c => new Date(c.created_at) >= thisMonthStart).length;
      const newLastMonth = customersWithOrderCounts.filter(c => { const date = new Date(c.created_at); return date >= lastMonthStart && date <= lastMonthEnd; }).length;
      let trendPercentage = 0;
      if (newLastMonth > 0) trendPercentage = Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 1000) / 10;
      else if (newThisMonth > 0) trendPercentage = 100;
      const countries = new Set(customersWithOrderCounts.map(c => detectCountryCode(c.phone)));
      setMetrics({ totalCustomers, newThisMonth, totalOrders, activeCountries: countries.size, trendPercentage });

      const initialProfileImages: ProfileImage[] = customersWithOrderCounts.map(customer => ({
        phone: customer.phone, url: customer.profile_image_url || undefined,
        loading: false, error: !customer.profile_image_url,
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
    return matchesSearch && matchesProgress;
  });

  const sortedCustomers = [...filteredCustomers].sort((a: Customer, b: Customer) => {
    switch (sortBy) {
      case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "orders": return (b.order_count || 0) - (a.order_count || 0);
      default: return 0;
    }
  });

  const handleOrderSuccess = () => { fetchCustomers(); setShowOrderModal(false); setSelectedCustomer(null); };

  const thCell: React.CSSProperties = {
    padding: '10px 16px', ...DM, fontSize: 11, fontWeight: 600,
    color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em',
    textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #ebebeb',
  };

  const countryCodes = [
    { value: "+1", label: "🇺🇸 +1" }, { value: "+44", label: "🇬🇧 +44" },
    { value: "+91", label: "🇮🇳 +91" }, { value: "+94", label: "🇱🇰 +94" },
    { value: "+971", label: "🇦🇪 +971" }, { value: "+966", label: "🇸🇦 +966" },
    { value: "+92", label: "🇵🇰 +92" }, { value: "+880", label: "🇧🇩 +880" },
    { value: "+98", label: "🇮🇷 +98" }, { value: "+20", label: "🇪🇬 +20" },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 320 }}>
        <style>{`@keyframes cp-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(34,197,94,0.15)', borderTopColor: '#22c55e', animation: 'cp-spin 0.8s linear infinite' }} />
          <span style={{ ...DM, fontSize: 13, color: '#71717a' }}>Loading customers…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes cp-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Create Customer Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
          >
            <motion.div
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserPlus size={15} style={{ color: '#22c55e' }} />
                  </div>
                  <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Add New Customer</span>
                </div>
                <button onClick={() => { setShowCreateModal(false); setCreateForm({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" }); setSelectedCountryCode("+94"); }} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} style={{ color: '#71717a' }} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 5 }}>Customer Name *</label>
                  <input type="text" name="name" value={createForm.name} onChange={handleCreateChange} placeholder="Full name" style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                </div>

                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 5 }}>Phone Number *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={selectedCountryCode} onChange={e => handleCountryChange(e.target.value)} style={{ ...selectStyle, width: 110, flexShrink: 0 }} onFocus={onFocusG} onBlur={onBlurG}>
                      {countryCodes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <input type="tel" name="phone" value={createForm.phone} onChange={handleCreateChange} placeholder="Phone number" style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>
                    Full: {selectedCountryCode} {createForm.phone}
                  </div>
                </div>

                <StageSelects
                  leadStage={createForm.lead_stage}
                  interestStage={createForm.interest_stage}
                  conversionStage={createForm.conversion_stage}
                  onLeadChange={v => handleCreateStageChange("lead_stage", v)}
                  onInterestChange={v => handleCreateStageChange("interest_stage", v)}
                  onConversionChange={v => handleCreateStageChange("conversion_stage", v)}
                />
              </div>

              <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #ebebeb', display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowCreateModal(false); setCreateForm({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" }); setSelectedCountryCode("+94"); }} style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '10px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleCreateCustomer} disabled={!createForm.name.trim() || !createForm.phone.trim()} style={{ flex: 1, background: (!createForm.name.trim() || !createForm.phone.trim()) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: (!createForm.name.trim() || !createForm.phone.trim()) ? 'not-allowed' : 'pointer', boxShadow: (!createForm.name.trim() || !createForm.phone.trim()) ? 'none' : '0 4px 12px rgba(34,197,94,0.3)' }}>
                  Create Customer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {editingCustomer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
          >
            <motion.div
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={14} style={{ color: '#22c55e' }} />
                  </div>
                  <div>
                    <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', display: 'block' }}>Edit Customer</span>
                    <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>{editingCustomer.name}</span>
                  </div>
                </div>
                <button onClick={() => { setEditingCustomer(null); setEditForm({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" }); setSelectedEditCountryCode("+94"); }} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} style={{ color: '#71717a' }} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 5 }}>Customer Name *</label>
                  <input type="text" name="name" value={editForm.name || editingCustomer.name} onChange={handleEditChange} placeholder="Full name" style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                </div>

                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 5 }}>Phone Number *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={selectedEditCountryCode} onChange={e => handleEditCountryChange(e.target.value)} style={{ ...selectStyle, width: 110, flexShrink: 0 }} onFocus={onFocusG} onBlur={onBlurG}>
                      {countryCodes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <input type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} placeholder="Phone number" style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>
                    Full: {selectedEditCountryCode} {editForm.phone}
                  </div>
                </div>

                <StageSelects
                  leadStage={editForm.lead_stage}
                  interestStage={editForm.interest_stage}
                  conversionStage={editForm.conversion_stage}
                  onLeadChange={v => handleStageChange("lead_stage", v)}
                  onInterestChange={v => handleStageChange("interest_stage", v)}
                  onConversionChange={v => handleStageChange("conversion_stage", v)}
                />
              </div>

              <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #ebebeb', display: 'flex', gap: 10 }}>
                <button onClick={() => { setEditingCustomer(null); setEditForm({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" }); setSelectedEditCountryCode("+94"); }} style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '10px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleUpdateCustomer} disabled={!editForm.name.trim() || !editForm.phone.trim()} style={{ flex: 1, background: (!editForm.name.trim() || !editForm.phone.trim()) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: (!editForm.name.trim() || !editForm.phone.trim()) ? 'not-allowed' : 'pointer', boxShadow: (!editForm.name.trim() || !editForm.phone.trim()) ? 'none' : '0 4px 12px rgba(34,197,94,0.3)' }}>
                  Update Customer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderModal && selectedCustomer && agentPrefix && agentId && (
          <CreateOrderModal
            key="order-modal"
            customer={selectedCustomer}
            agentPrefix={agentPrefix}
            agentId={agentId}
            onClose={() => setShowOrderModal(false)}
            onSuccess={handleOrderSuccess}
          />
        )}
      </AnimatePresence>

      {/* Metric Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      >
        {[
          { Icon: Users, label: 'Total Customers', value: metrics.totalCustomers.toLocaleString(), sub: 'Registered contacts', iconColor: '#22c55e', iconBg: 'rgba(34,197,94,0.1)' },
          { Icon: UserPlus, label: 'New This Month', value: metrics.newThisMonth, sub: null, iconColor: '#059669', iconBg: 'rgba(5,150,105,0.1)', trend: metrics.trendPercentage },
          { Icon: ShoppingBag, label: 'Total Orders', value: metrics.totalOrders.toLocaleString(), sub: 'Across all customers', iconColor: '#0891b2', iconBg: 'rgba(8,145,178,0.1)' },
          { Icon: Globe, label: 'Active Countries', value: metrics.activeCountries, sub: 'Unique regions', iconColor: '#7c3aed', iconBg: 'rgba(124,58,237,0.1)' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            variants={cardVariants} custom={i}
            style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.Icon size={17} style={{ color: card.iconColor }} />
              </div>
              {'trend' in card && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, ...DM, fontSize: 11, fontWeight: 600, color: card.trend! >= 0 ? '#059669' : '#f43f5e', background: card.trend! >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(244,63,94,0.08)', padding: '3px 7px', borderRadius: 20 }}>
                  {card.trend! >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {Math.abs(card.trend!)}%
                </div>
              )}
            </div>
            <div style={{ ...SYNE, fontSize: 28, fontWeight: 800, color: '#0c1a0e', lineHeight: 1, marginBottom: 4 }}>{card.value}</div>
            <div style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#3f3f46', marginBottom: 2 }}>{card.label}</div>
            {'trend' in card
              ? <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>vs last month</div>
              : <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>{card.sub}</div>
            }
          </motion.div>
        ))}
      </motion.div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e' }}>
          {error}
        </div>
      )}

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
        style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '14px 18px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
            onFocus={onFocusG} onBlur={onBlurG}
          />
        </div>

        {/* Filters */}
        <select value={progressCategory} onChange={e => { setProgressCategory(e.target.value as any); setProgressStage(""); }} style={{ ...selectStyle, width: 'auto', minWidth: 130 }} onFocus={onFocusG} onBlur={onBlurG}>
          <option value="all">All Progress</option>
          <option value="lead">Lead Stage</option>
          <option value="interest">Interest Stage</option>
          <option value="conversion">Conversion Stage</option>
        </select>

        {progressCategory !== "all" && (
          <select value={progressStage} onChange={e => setProgressStage(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: 140 }} onFocus={onFocusG} onBlur={onBlurG}>
            <option value="">All {progressCategory === "lead" ? "Leads" : progressCategory === "interest" ? "Interests" : "Conversions"}</option>
            {(progressCategory === "lead" ? leadStages : progressCategory === "interest" ? interestStages : conversionStages).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ ...selectStyle, width: 'auto', minWidth: 140 }} onFocus={onFocusG} onBlur={onBlurG}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="orders">Most Orders</option>
        </select>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          <Plus size={14} /> Add Customer
        </button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}
        style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}
      >
        {sortedCustomers.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Users size={22} style={{ color: '#d4d4d8' }} />
            </div>
            <div style={{ ...SYNE, fontSize: 15, fontWeight: 600, color: '#0c1a0e', marginBottom: 6 }}>
              {searchTerm ? "No customers found" : "No customers yet"}
            </div>
            <div style={{ ...DM, fontSize: 13, color: '#71717a', marginBottom: 20 }}>
              {searchTerm ? `No customers match "${searchTerm}"` : "Get started by adding your first customer."}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> Add your first customer
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Phone', 'Orders', 'Progress', 'Joined', 'Actions'].map((h, i) => (
                    <th key={h} style={{ ...thCell, textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <motion.tbody
                initial="hidden" animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
              >
                {sortedCustomers.map((customer: Customer, index: number) => {
                  const profile = profileImages.find(img => img.phone === customer.phone);
                  const hasImage = profile?.url && !profile?.error;

                  return (
                    <motion.tr
                      key={customer.id}
                      variants={rowVariants} custom={index}
                      style={{ borderBottom: '1px solid #f4f4f5', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(34,197,94,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      {/* Name */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                            {profile?.loading ? (
                              <div style={{ width: 36, height: 36, background: '#f4f4f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(34,197,94,0.2)', borderTopColor: '#22c55e', animation: 'cp-spin 0.7s linear infinite' }} />
                              </div>
                            ) : hasImage ? (
                              <img
                                src={profile.url}
                                alt={customer.name}
                                style={{ width: 36, height: 36, objectFit: 'cover' }}
                                onError={e => {
                                  setProfileImages(prev => prev.map(img => img.phone === customer.phone ? { ...img, error: true } : img));
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div
                                onClick={() => fetchProfilePicture(customer.phone)}
                                style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#fff' }}>{customer.name.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{customer.name}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13 }}>{getFlagEmoji(detectCountryCode(customer.phone))}</span>
                          <span style={{ ...DM, fontSize: 13, color: '#3f3f46' }}>{customer.phone}</span>
                        </div>
                      </td>

                      {/* Orders */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{customer.order_count || 0}</span>
                      </td>

                      {/* Progress */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ ...DM, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, ...getProgressStyle(customer) }}>
                          {getProgressLabel(customer)}
                        </span>
                      </td>

                      {/* Joined */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>
                          {new Date(customer.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {/* Chat */}
                          <button
                            title="Open conversation"
                            onClick={() => window.open(`${window.location.origin}/agent/conversations?customerId=${customer.id}`, "_blank")}
                            style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.15)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.08)'}
                          >
                            <MessageCircle size={14} style={{ color: '#22c55e' }} />
                          </button>

                          {/* Edit */}
                          <button
                            title="Edit customer"
                            onClick={() => {
                              const detectedCode = detectCountryCode(customer.phone);
                              setEditingCustomer(customer);
                              setEditForm({ name: customer.name, phone: extractLocalNumber(customer.phone, detectedCode), lead_stage: customer.lead_stage || "New Lead", interest_stage: customer.interest_stage || "", conversion_stage: customer.conversion_stage || "" });
                              setSelectedEditCountryCode(detectedCode);
                            }}
                            style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(217,119,6,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(217,119,6,0.15)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(217,119,6,0.08)'}
                          >
                            <Pencil size={13} style={{ color: '#d97706' }} />
                          </button>

                          {/* New Order */}
                          <button
                            title="Create new order"
                            onClick={() => { setSelectedCustomer(customer); setShowOrderModal(true); }}
                            disabled={!agentPrefix || !agentId}
                            style={{ width: 30, height: 30, borderRadius: 8, background: (!agentPrefix || !agentId) ? '#f4f4f5' : 'rgba(8,145,178,0.08)', border: 'none', cursor: (!agentPrefix || !agentId) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}
                            onMouseEnter={e => { if (agentPrefix && agentId) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,145,178,0.15)'; }}
                            onMouseLeave={e => { if (agentPrefix && agentId) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,145,178,0.08)'; }}
                          >
                            <ShoppingBag size={13} style={{ color: (!agentPrefix || !agentId) ? '#d4d4d8' : '#0891b2' }} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CustomersPage;
