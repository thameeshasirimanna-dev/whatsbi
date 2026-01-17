import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "../../../lib/auth";
import CreateOrderModal from "./CreateOrderModal";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

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

interface CreateOrderModalProps {
  customer: Customer | null;
  agentPrefix: string | null;
  agentId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

const leadStages = [
  "New Lead",
  "Contacted",
  "Not Responding",
  "Follow-up Needed",
] as const;
const interestStages = [
  "Interested",
  "Quotation Sent",
  "Asked for More Info",
] as const;
const conversionStages = [
  "Payment Pending",
  "Paid",
  "Order Confirmed",
] as const;

const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "orders">(
    "newest"
  );
  const [progressCategory, setProgressCategory] = useState<
    "all" | "lead" | "interest" | "conversion"
  >("all");
  const [progressStage, setProgressStage] = useState<string>("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    lead_stage: "New Lead",
    interest_stage: "",
    conversion_stage: "",
  });
  const [selectedEditCountryCode, setSelectedEditCountryCode] = useState("+94");
  const [createForm, setCreateForm] = useState({
    name: "",
    phone: "",
    lead_stage: "New Lead",
    interest_stage: "",
    conversion_stage: "",
  });
  const [selectedCountryCode, setSelectedCountryCode] = useState("+94"); // Default to Sri Lanka
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [profileImages, setProfileImages] = useState<ProfileImage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({
    totalCustomers: 0,
    newThisMonth: 0,
    totalOrders: 0,
    activeCountries: 0,
    trendPercentage: 0,
  });

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: i * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    }),
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: i * 0.05,
        ease: "easeOut",
      },
    }),
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.2, ease: "easeOut" },
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
  };

  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const handleEditNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setEditForm({ ...editForm, [e.target.name]: value });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "name") {
      handleEditNameChange(e);
    } else if (e.target.name === "phone") {
      handleEditPhoneChange(e);
    }
  };

  const handleStageChange = (
    field: "lead_stage" | "interest_stage" | "conversion_stage",
    value: string
  ) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (field === "lead_stage" && value === "New Lead") {
      setEditForm((prev) => ({
        ...prev,
        interest_stage: "",
        conversion_stage: "",
      }));
    }
    if (field === "interest_stage" && !value) {
      setEditForm((prev) => ({ ...prev, conversion_stage: "" }));
    }
  };

  const handleEditCountryChange = (code: string) => {
    setSelectedEditCountryCode(code);
    if (editForm.phone.startsWith(code.replace("+", ""))) {
      return;
    }
    setEditForm({ ...editForm, phone: "" });
  };

  const detectCountryCode = (phone: string): string => {
    if (!phone) return "+1";

    // Remove all non-digits
    const cleanPhone = phone.replace(/\D/g, "");

    // Check for common country codes
    if (cleanPhone.startsWith("1")) return "+1"; // US/Canada
    if (cleanPhone.startsWith("44")) return "+44"; // UK
    if (cleanPhone.startsWith("91")) return "+91"; // India
    if (cleanPhone.startsWith("94")) return "+94"; // Sri Lanka
    if (cleanPhone.startsWith("971")) return "+971"; // UAE
    if (cleanPhone.startsWith("966")) return "+966"; // Saudi Arabia
    if (cleanPhone.startsWith("92")) return "+92"; // Pakistan
    if (cleanPhone.startsWith("880")) return "+880"; // Bangladesh
    if (cleanPhone.startsWith("98")) return "+98"; // Iran
    if (cleanPhone.startsWith("20")) return "+20"; // Egypt

    // Default to US if no match
    return "+1";
  };

  const getFlagEmoji = (countryCode: string): string => {
    const flags: Record<string, string> = {
      "+1": "🇺🇸",
      "+44": "🇬🇧",
      "+91": "🇮🇳",
      "+94": "🇱🇰",
      "+971": "🇦🇪",
      "+966": "🇸🇦",
      "+92": "🇵🇰",
      "+880": "🇧🇩",
      "+98": "🇮🇷",
      "+20": "🇪🇬",
    };
    return flags[countryCode] || "🌍";
  };

  const extractLocalNumber = (phone: string, countryCode: string): string => {
    const cleanPhone = phone.replace(/\D/g, "");
    const codeDigits = countryCode.replace("+", "");
    if (cleanPhone.startsWith(codeDigits)) {
      return cleanPhone.substring(codeDigits.length);
    }
    return cleanPhone;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Remove non-digits
    setCreateForm({ ...createForm, [e.target.name]: value });
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "name") {
      handleNameChange(e);
    } else if (e.target.name === "phone") {
      handlePhoneChange(e);
    }
  };

  const handleCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    // Optionally update phone if it starts with old code
    if (createForm.phone.startsWith(code.replace("+", ""))) {
      return;
    }
    setCreateForm({ ...createForm, phone: "" });
  };

  const handleCreateStageChange = (
    field: "lead_stage" | "interest_stage" | "conversion_stage",
    value: string
  ) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    if (field === "lead_stage" && value === "New Lead") {
      setCreateForm((prev) => ({
        ...prev,
        interest_stage: "",
        conversion_stage: "",
      }));
    }
    if (field === "interest_stage" && !value) {
      setCreateForm((prev) => ({ ...prev, conversion_stage: "" }));
    }
  };

  const handleCreateCustomer = async () => {
    if (!createForm.name.trim() || !createForm.phone.trim()) return;

    const fullPhone = `${selectedCountryCode}${createForm.phone}`.replace(
      "+",
      ""
    );

    try {
      const token = getToken();
      if (!token) {
        setError("User not authenticated");
        return;
      }

      const response = await fetch(`${backendUrl}/manage-customers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          phone: fullPhone,
          lead_stage: createForm.lead_stage || "New Lead",
          interest_stage: createForm.interest_stage || null,
          conversion_stage: createForm.conversion_stage || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create customer");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to create customer");
      }

      setShowCreateModal(false);
      setCreateForm({
        name: "",
        phone: "",
        lead_stage: "New Lead",
        interest_stage: "",
        conversion_stage: "",
      });
      setSelectedCountryCode("+94");
      fetchCustomers();
      setError(null);
    } catch (err: any) {
      console.error("Create customer error:", err);
      setError(err.message || "Failed to create customer");
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !editForm.name.trim() || !editForm.phone.trim())
      return;

    const fullPhone = `${selectedEditCountryCode}${editForm.phone}`.replace(
      "+",
      ""
    );

    try {
      const token = getToken();
      if (!token) {
        setError("User not authenticated");
        return;
      }

      const response = await fetch(`${backendUrl}/manage-customers`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingCustomer.id,
          name: editForm.name.trim(),
          phone: fullPhone,
          lead_stage: editForm.lead_stage || "New Lead",
          interest_stage: editForm.interest_stage || null,
          conversion_stage: editForm.conversion_stage || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update customer");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update customer");
      }

      setEditingCustomer(null);
      setEditForm({
        name: "",
        phone: "",
        lead_stage: "New Lead",
        interest_stage: "",
        conversion_stage: "",
      });
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
      if (!token) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      // First get agent profile
      const agentResponse = await fetch(`${backendUrl}/get-agent-profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!agentResponse.ok) {
        setError("Failed to fetch agent profile");
        setLoading(false);
        return;
      }

      const agentProfile = await agentResponse.json();
      if (!agentProfile.success || !agentProfile.agent) {
        setError("Agent not found");
        setLoading(false);
        return;
      }

      const agentData = agentProfile.agent;
      const currentAgentId = agentData.id;
      const currentAgentPrefix = agentData.agent_prefix;
      setAgentId(currentAgentId);
      setAgentPrefix(currentAgentPrefix);

      if (!currentAgentPrefix) {
        setError("Agent prefix not found");
        setLoading(false);
        return;
      }

      // Fetch customers from backend
      const customersResponse = await fetch(`${backendUrl}/manage-customers`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!customersResponse.ok) {
        setError("Failed to fetch customers");
        setLoading(false);
        return;
      }

      const customersData = await customersResponse.json();
      if (!customersData.success) {
        setError("Failed to fetch customers");
        setLoading(false);
        return;
      }

      const customersWithOrderCounts: Customer[] = (
        customersData.customers || []
      ).map((c: any) => ({
        ...c,
        order_count: c.order_count || 0,
      }));

      // Compute metrics
      const totalCustomers = customersWithOrderCounts.length;
      const totalOrders = customersWithOrderCounts.reduce(
        (sum, c) => sum + (c.order_count || 0),
        0
      );

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const newThisMonth = customersWithOrderCounts.filter(
        (c) => new Date(c.created_at) >= thisMonthStart
      ).length;
      const newLastMonth = customersWithOrderCounts.filter((c) => {
        const date = new Date(c.created_at);
        return date >= lastMonthStart && date <= lastMonthEnd;
      }).length;

      let trendPercentage = 0;
      if (newLastMonth > 0) {
        const trend = ((newThisMonth - newLastMonth) / newLastMonth) * 100;
        trendPercentage = Math.round(trend * 10) / 10;
      } else if (newThisMonth > 0) {
        trendPercentage = 100;
      }

      const countries = new Set(
        customersWithOrderCounts.map((c) => detectCountryCode(c.phone))
      );
      const activeCountries = countries.size;

      setMetrics({
        totalCustomers,
        newThisMonth,
        totalOrders,
        activeCountries,
        trendPercentage,
      });

      // Initialize profile images state
      const initialProfileImages: ProfileImage[] = customersWithOrderCounts.map(
        (customer) => ({
          phone: customer.phone,
          url: customer.profile_image_url || undefined,
          loading: false,
          error: !customer.profile_image_url,
        })
      );
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

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Realtime subscription removed - using backend only

  const fetchProfilePicture = async (phone: string) => {
    const existing = profileImages.find((img) => img.phone === phone);
    if (existing && (existing.url || existing.error)) {
      return; // Already fetched or failed
    }

    // Update loading state
    setProfileImages((prev) =>
      prev.map((img) =>
        img.phone === phone ? { ...img, loading: true, error: false } : img
      )
    );

    try {
      const token = getToken();

      const response = await fetch(`${backendUrl}/get-whatsapp-profile-pic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          phone: phone,
          user_id: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success && data.profile_image_url) {
        setProfileImages((prev) =>
          prev.map((img) =>
            img.phone === phone
              ? { ...img, url: data.profile_image_url, loading: false }
              : img
          )
        );
      } else {
        setProfileImages((prev) =>
          prev.map((img) =>
            img.phone === phone ? { ...img, error: true, loading: false } : img
          )
        );
      }
    } catch (error) {
      setProfileImages((prev) =>
        prev.map((img) =>
          img.phone === phone ? { ...img, error: true, loading: false } : img
        )
      );
    }
  };

  // Fetch profile pictures when customers load
  useEffect(() => {
    if (customers.length > 0 && currentUserId) {
      // Fetch first 5 customers to avoid overwhelming the API
      const firstFive = customers.slice(0, 5);
      firstFive.forEach((customer) => {
        fetchProfilePicture(customer.phone);
      });
    }
  }, [customers, currentUserId]);

  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    let matchesProgress = true;
    if (progressCategory !== "all") {
      if (progressCategory === "lead") {
        matchesProgress =
          !customer.conversion_stage && !customer.interest_stage;
        if (progressStage) {
          matchesProgress =
            matchesProgress && customer.lead_stage === progressStage;
        }
      } else if (progressCategory === "interest") {
        matchesProgress =
          !customer.conversion_stage && !!customer.interest_stage;
        if (progressStage) {
          matchesProgress =
            matchesProgress && customer.interest_stage === progressStage;
        }
      } else if (progressCategory === "conversion") {
        matchesProgress = !!customer.conversion_stage;
        if (progressStage) {
          matchesProgress =
            matchesProgress && customer.conversion_stage === progressStage;
        }
      }
    }
    return matchesSearch && matchesProgress;
  });

  const sortedCustomers = [...filteredCustomers].sort(
    (a: Customer, b: Customer) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "orders":
          return (b.order_count || 0) - (a.order_count || 0);
        default:
          return 0;
      }
    }
  );

  const totalCustomers = filteredCustomers.length;

  const handleOrderSuccess = () => {
    fetchCustomers();
    setShowOrderModal(false);
    setSelectedCustomer(null);
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="p-6"
      >
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-green-600"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="p-6"
    >
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold mb-4">Add New Customer</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  name="name"
                  value={createForm.name}
                  onChange={handleCreateChange}
                  placeholder="Customer Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />

                <div className="flex space-x-2">
                  <select
                    value={selectedCountryCode}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                  >
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+94">🇱🇰 +94</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+966">🇸🇦 +966</option>
                    <option value="+92">🇵🇰 +92</option>
                    <option value="+880">🇧🇩 +880</option>
                    <option value="+98">🇮🇷 +98</option>
                    <option value="+20">🇪🇬 +20</option>
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    value={createForm.phone}
                    onChange={handleCreateChange}
                    placeholder="Phone Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Full number will be: {selectedCountryCode} {createForm.phone}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Customer Progress Stages
                  </h4>
                  <div className="space-y-3">
                    {/* Lead Stage */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Lead Stage 🔵
                      </label>
                      <select
                        value={createForm.lead_stage}
                        onChange={(e) =>
                          handleCreateStageChange("lead_stage", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        {leadStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Interest Stage */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Interest Stage 🟡
                      </label>
                      <select
                        value={createForm.interest_stage}
                        onChange={(e) =>
                          handleCreateStageChange(
                            "interest_stage",
                            e.target.value
                          )
                        }
                        disabled={createForm.lead_stage === "New Lead"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Interest Stage</option>
                        {interestStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Conversion Stage */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Conversion Stage 🟢
                      </label>
                      <select
                        value={createForm.conversion_stage}
                        onChange={(e) =>
                          handleCreateStageChange(
                            "conversion_stage",
                            e.target.value
                          )
                        }
                        disabled={!createForm.interest_stage}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Conversion Stage</option>
                        {conversionStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      name: "",
                      phone: "",
                      lead_stage: "New Lead",
                      interest_stage: "",
                      conversion_stage: "",
                    });
                    setSelectedCountryCode("+94");
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomer}
                  disabled={!createForm.name.trim() || !createForm.phone.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Customer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold mb-4">Edit Customer</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  name="name"
                  value={editForm.name || editingCustomer.name}
                  onChange={handleEditChange}
                  placeholder="Customer Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex space-x-2">
                  <select
                    value={selectedEditCountryCode}
                    onChange={(e) => handleEditCountryChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                  >
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+94">🇱🇰 +94</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+966">🇸🇦 +966</option>
                    <option value="+92">🇵🇰 +92</option>
                    <option value="+880">🇧🇩 +880</option>
                    <option value="+98">🇮🇷 +98</option>
                    <option value="+20">🇪🇬 +20</option>
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditChange}
                    placeholder="Phone Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Full number will be: {selectedEditCountryCode}{" "}
                  {editForm.phone}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Customer Progress Stages
                  </h4>
                  <div className="space-y-3">
                    {/* Lead Stage */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Lead Stage 🔵
                      </label>
                      <select
                        value={editForm.lead_stage}
                        onChange={(e) =>
                          handleStageChange("lead_stage", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {leadStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Interest Stage */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Interest Stage 🟡
                      </label>
                      <select
                        value={editForm.interest_stage}
                        onChange={(e) =>
                          handleStageChange("interest_stage", e.target.value)
                        }
                        disabled={editForm.lead_stage === "New Lead"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Interest Stage</option>
                        {interestStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Conversion Stage */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Conversion Stage 🟢
                      </label>
                      <select
                        value={editForm.conversion_stage}
                        onChange={(e) =>
                          handleStageChange("conversion_stage", e.target.value)
                        }
                        disabled={!editForm.interest_stage}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Conversion Stage</option>
                        {conversionStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setEditingCustomer(null);
                    setEditForm({
                      name: "",
                      phone: "",
                      lead_stage: "New Lead",
                      interest_stage: "",
                      conversion_stage: "",
                    });
                    setSelectedEditCountryCode("+94");
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCustomer}
                  disabled={!editForm.name.trim() || !editForm.phone.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <div className="mb-6"></div>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
      >
        {/* Total Customers Card */}
        <motion.div
          variants={cardVariants}
          custom={0}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-4a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Customers
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalCustomers.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* New This Month Card */}
        <motion.div
          variants={cardVariants}
          custom={1}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  New This Month
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.newThisMonth}
                </p>
              </div>
            </div>
            <div
              className={`text-sm font-medium ${
                metrics.trendPercentage >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              <div className="flex items-center">
                <svg
                  className={`w-4 h-4 ${
                    metrics.trendPercentage >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      metrics.trendPercentage >= 0
                        ? "M5 15l7-7 7 7"
                        : "M19 9l-7 7-7-7"
                    }
                  />
                </svg>
                <span>{Math.abs(metrics.trendPercentage)}% vs last month</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Total Orders Card */}
        <motion.div
          variants={cardVariants}
          custom={2}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 1.5M7 13l-1.5-1.5M16 13l-1.5-1.5M16 13l1.5 1.5M16 13l1.5-1.5m-1.5 1.5L19 8m-7 0h7"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalOrders.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Active Countries Card */}
        <motion.div
          variants={cardVariants}
          custom={3}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-indigo-100 rounded-full">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Active Countries
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.activeCountries}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          Error: {error}
        </div>
      )}

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search customers by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={progressCategory}
            onChange={(e) => {
              setProgressCategory(
                e.target.value as "all" | "lead" | "interest" | "conversion"
              );
              setProgressStage(""); // Reset stage when category changes
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          >
            <option value="all">All Progress</option>
            <option value="lead">Lead Stage</option>
            <option value="interest">Interest Stage</option>
            <option value="conversion">Conversion Stage</option>
          </select>
          {progressCategory !== "all" && (
            <select
              value={progressStage}
              onChange={(e) => setProgressStage(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="">
                All{" "}
                {progressCategory === "lead"
                  ? "Leads"
                  : progressCategory === "interest"
                  ? "Interests"
                  : "Conversions"}
              </option>
              {(progressCategory === "lead"
                ? leadStages
                : progressCategory === "interest"
                ? interestStages
                : conversionStages
              ).map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          )}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "newest" | "oldest" | "orders")
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          >
            <option value="newest">Sort by: Newest</option>
            <option value="oldest">Sort by: Oldest</option>
            <option value="orders">Sort by: Orders</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add Customer</span>
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {sortedCustomers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="text-center py-12 bg-gray-50"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.0 }}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"
            >
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.1 }}
              className="text-lg font-medium text-gray-900 mb-2"
            >
              {searchTerm ? "No customers found" : "No customers yet"}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.2 }}
              className="text-gray-500 mb-6"
            >
              {searchTerm
                ? `No customers match "${searchTerm}"`
                : "Get started by adding your first customer to the CRM."}
            </motion.p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.3 }}
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 mx-auto"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add your first customer</span>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 1.0,
                },
              },
            }}
            className="overflow-x-auto"
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <motion.tbody
                className="bg-white divide-y divide-gray-200"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                    },
                  },
                }}
              >
                {sortedCustomers.map((customer: Customer, index: number) => (
                  <motion.tr
                    key={customer.id}
                    variants={rowVariants}
                    custom={index}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden relative shadow-sm">
                          {(() => {
                            const profile = profileImages.find(
                              (img) => img.phone === customer.phone
                            );
                            const hasImage = profile?.url && !profile?.error;

                            if (profile?.loading) {
                              return (
                                <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                                </div>
                              );
                            }

                            if (hasImage) {
                              return (
                                <img
                                  src={profile.url}
                                  alt={`${customer.name}'s profile`}
                                  className="h-10 w-10 object-cover"
                                  onError={(e) => {
                                    setProfileImages((prev) =>
                                      prev.map((img) =>
                                        img.phone === customer.phone
                                          ? { ...img, error: true }
                                          : img
                                      )
                                    );
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement!.innerHTML = `
                                      <div class="h-10 w-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                                        <span class="text-white font-semibold text-sm">
                                          ${customer.name
                                            .charAt(0)
                                            .toUpperCase()}
                                        </span>
                                      </div>
                                    `;
                                  }}
                                />
                              );
                            }

                            return (
                              <div
                                className="h-10 w-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() =>
                                  fetchProfilePicture(customer.phone)
                                }
                              >
                                <span className="text-white font-semibold text-sm">
                                  {customer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="mr-2 text-xs">
                          {getFlagEmoji(detectCountryCode(customer.phone))}
                        </span>
                        <span>{customer.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {customer.order_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.conversion_stage ? (
                        <span className="font-medium text-green-600">
                          🟢 {customer.conversion_stage}
                        </span>
                      ) : customer.interest_stage ? (
                        <span className="font-medium text-yellow-600">
                          🟡 {customer.interest_stage}
                        </span>
                      ) : (
                        <span className="font-medium text-blue-600">
                          🔵 {customer.lead_stage || "New Lead"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          className="p-2 text-green-600 hover:text-green-900 hover:bg-green-100 rounded-lg transition-colors"
                          title="Open conversation"
                          onClick={() =>
                            window.open(
                              `${window.location.origin}/agent/conversations?customerId=${customer.id}`,
                              "_blank"
                            )
                          }
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                        </button>
                        <button
                          className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 rounded-lg transition-colors"
                          title="Edit customer"
                          onClick={() => {
                            const detectedCode = detectCountryCode(
                              customer.phone
                            );
                            const localNumber = extractLocalNumber(
                              customer.phone,
                              detectedCode
                            );

                            setEditingCustomer(customer);
                            setEditForm({
                              name: customer.name,
                              phone: localNumber,
                              lead_stage: customer.lead_stage || "New Lead",
                              interest_stage: customer.interest_stage || "",
                              conversion_stage: customer.conversion_stage || "",
                            });
                            setSelectedEditCountryCode(detectedCode);
                          }}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Create new order"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowOrderModal(true);
                          }}
                          disabled={!agentPrefix || !agentId}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 1.5M7 13l-1.5-1.5M16 13l-1.5-1.5M16 13l1.5 1.5M16 13l1.5-1.5m-1.5 1.5L19 8m-7 0h7"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </motion.div>
        )}
      </motion.div>

      {/* Bottom stats removed to avoid duplication */}
    </motion.div>
  );
};

export default CustomersPage;