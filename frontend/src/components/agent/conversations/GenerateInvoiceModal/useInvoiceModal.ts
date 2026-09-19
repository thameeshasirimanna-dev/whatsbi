import { useState, useEffect, useRef, useCallback } from "react";
import { getToken } from "../../../../lib/auth";
import { getCurrentAgent } from "../../../../lib/agent";
import { CustomerOption, LineItem, QuickItem, AgentDetails } from "./types";
import { Order } from "../../../../types/index";
import { generateAndUploadInvoice } from "./invoicePdfService";

interface UseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrderId?: number;
  orders?: Order[];
  customers?: CustomerOption[];
  customerName?: string;
  customerId?: number | null;
  customerPhone?: string | null;
  agentPrefix: string | null;
  agentDetails: AgentDetails;
  invoiceTemplatePath: string | null;
  editingInvoice?: any;
  onSuccess: () => void;
  toast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const useInvoiceModal = (props: UseInvoiceModalProps) => {
  const {
    isOpen, onClose, selectedOrderId, orders = [], customers = [],
    customerName = "", customerId = null, customerPhone = null,
    agentPrefix, agentDetails, invoiceTemplatePath, editingInvoice, onSuccess, toast,
  } = props;
  // Customer state
  const [localCustomerId, setLocalCustomerId] = useState<number | null>(customerId || null);
  const [localCustomerName, setLocalCustomerName] = useState<string>(customerName || "");
  const [localCustomerPhone, setLocalCustomerPhone] = useState<string | null>(customerPhone || null);

  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>(customers || []);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);

  // Invoice form state
  const [invoiceName, setInvoiceName] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ name: "", quantity: 1, price: 0 }]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceModifiedManually, setAdvanceModifiedManually] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick picker items (inventory or packages)
  const [businessType, setBusinessType] = useState<"product" | "service" | null>(null);
  const [quickItems, setQuickItems] = useState<QuickItem[]>([]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isCustomerDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCustomerDropdownOpen]);

  // Sync allCustomers when customers prop changes
  useEffect(() => {
    if (customers && customers.length > 0) {
      setAllCustomers((prev) => {
        const map = new Map<number, CustomerOption>();
        prev.forEach((c) => map.set(c.id, c));
        customers.forEach((c) => map.set(c.id, c));
        return Array.from(map.values());
      });
    }
  }, [customers]);

  // Load fresh customers from backend API
  const fetchAllCustomers = useCallback(async () => {
    try {
      setIsSearchingCustomers(true);
      const token = getToken();
      if (!token) return null;
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.customers)) {
          const mapped: CustomerOption[] = data.customers.map((c: any) => ({
            id: c.id,
            name: c.name || "Unnamed Customer",
            phone: c.phone || "",
          }));
          setAllCustomers((prev) => {
            const map = new Map<number, CustomerOption>();
            prev.forEach((c) => map.set(c.id, c));
            mapped.forEach((c) => map.set(c.id, c));
            return Array.from(map.values());
          });
          return mapped;
        }
      }
    } catch (e) {
      console.warn("Failed to load customers in invoice modal:", e);
    } finally {
      setIsSearchingCustomers(false);
    }
    return null;
  }, []);

  const loadOrderItems = useCallback(async (orderId: number) => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=items&order_id=${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items) && data.items.length > 0) {
          const loaded = data.items.map((it: any) => ({
            name: it.name || "",
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
          }));
          setItems(loaded);
          const order = orders.find((o) => o.id === orderId);
          if (order) {
            setInvoiceName(`Invoice for Order #${order.id.toString().padStart(4, "0")} - ${customerName}`);
            if (order.advance_amount) setAdvanceAmount(Number(order.advance_amount));
            if (order.notes) setInvoiceNotes(order.notes);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load order items:", e);
    }
  }, [orders, customerName]);

  const loadCatalog = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      const profileRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const pData = await profileRes.json();
        const bType = pData?.agent?.business_type as "product" | "service";
        setBusinessType(bType);

        if (bType === "product") {
          const invRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (invRes.ok) {
            const invData = await invRes.json();
            if (Array.isArray(invData.items)) {
              setQuickItems(
                invData.items.map((i: any) => ({
                  name: i.name,
                  price: Number(i.price) || 0,
                }))
              );
            }
          }
        } else if (bType === "service") {
          const svcRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-services`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (svcRes.ok) {
            const svcData = await svcRes.json();
            const list: QuickItem[] = [];
            (svcData?.services || []).forEach((s: any) => {
              if (s.packages && Array.isArray(s.packages)) {
                s.packages.forEach((pkg: any) => {
                  list.push({
                    name: `${s.service_name} - ${pkg.package_name}`,
                    price: Number(pkg.price) || 0,
                  });
                });
              } else {
                list.push({ name: s.service_name, price: 0 });
              }
            });
            setQuickItems(list);
          }
        }
      }
    } catch (e) {
      console.warn("Catalog fetch skipped:", e);
    }
  }, []);

  // Initialize form when opened
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (editingInvoice) {
        const editCustId = editingInvoice.customer_id || customerId || null;
        const editCustName = editingInvoice.customer_name || customerName || "";
        const editCustPhone = editingInvoice.customer_phone || customerPhone || null;
        setLocalCustomerId(editCustId);
        setLocalCustomerName(editCustName);
        setLocalCustomerPhone(editCustPhone);
        setInvoiceName(editingInvoice.name || "");
        setDiscountPercentage(Number(editingInvoice.discount_percentage) || 0);
        setAdvanceAmount(Number(editingInvoice.advance_amount) || 0);
        setAdvanceModifiedManually(true);
        setInvoiceNotes(editingInvoice.notes || "");
        setError(null);
        if (Array.isArray(editingInvoice.items) && editingInvoice.items.length > 0) {
          setItems(editingInvoice.items.map((it: any) => ({ name: it.name || "", quantity: Number(it.quantity) || 1, price: Number(it.price) || 0 })));
        } else if (editingInvoice.id) {
          const token = getToken();
          if (token) {
            fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-invoices?type=items&id=${editingInvoice.id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then((r) => r.json()).then((d) => {
                if (d.success && Array.isArray(d.items) && d.items.length > 0) {
                  setItems(d.items.map((it: any) => ({ name: it.name || "", quantity: Number(it.quantity) || 1, price: Number(it.price) || 0 })));
                }
              }).catch(() => {});
          }
        }
      } else {
        const initialCustId = customerId || null;
        const initialCustName = customerName || "";
        const initialCustPhone = customerPhone || null;
        setLocalCustomerId(initialCustId);
        setLocalCustomerName(initialCustName);
        setLocalCustomerPhone(initialCustPhone);
        setCustomerSearchQuery("");
        setIsCustomerDropdownOpen(false);
        if (customers && customers.length > 0) {
          setAllCustomers(customers);
          if (!initialCustPhone && initialCustId) {
            const match = customers.find((c) => c.id === initialCustId);
            if (match?.phone) setLocalCustomerPhone(match.phone);
          }
        }
        fetchAllCustomers().then((loaded) => {
          if (loaded && !initialCustPhone && initialCustId) {
            const match = loaded.find((c) => c.id === initialCustId);
            if (match?.phone) setLocalCustomerPhone(match.phone);
          }
        });
        const dateStr = new Date().toISOString().slice(0, 10);
        const defaultName = initialCustName ? `Invoice - ${initialCustName.trim()} - ${dateStr}` : `Invoice - ${dateStr}`;
        setInvoiceName(defaultName);
        setDiscountPercentage(0);
        setInvoiceNotes("");
        setError(null);
        setAdvanceModifiedManually(false);
        if (selectedOrderId) {
          loadOrderItems(selectedOrderId);
        } else {
          setItems([{ name: "", quantity: 1, price: 0 }]);
          setAdvanceAmount(0);
        }
      }
      loadCatalog();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, editingInvoice, selectedOrderId, customerName, customerId, customerPhone, customers, fetchAllCustomers, loadOrderItems, loadCatalog]);

  // Live search backend debounce
  useEffect(() => {
    const q = customerSearchQuery.trim();
    if (!q || !isOpen || localCustomerId) return;

    setIsSearchingCustomers(true);
    const timer = setTimeout(async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-customers?search=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.customers)) {
            const serverResults = data.customers.map((c: any) => ({
              id: c.id,
              name: c.name || "Unnamed Customer",
              phone: c.phone || "",
            }));
            setAllCustomers((prev) => {
              const map = new Map<number, CustomerOption>();
              prev.forEach((item) => map.set(item.id, item));
              serverResults.forEach((item: any) => map.set(item.id, item));
              return Array.from(map.values());
            });
          }
        }
      } catch (e) {
        console.warn("Live customer search failed:", e);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearchQuery, isOpen, localCustomerId]);

  const handleSelectCustomer = (cust: CustomerOption) => {
    setLocalCustomerId(cust.id);
    setLocalCustomerName(cust.name);
    setLocalCustomerPhone(cust.phone || null);
    setIsCustomerDropdownOpen(false);
    setCustomerSearchQuery("");
    const dateStr = new Date().toISOString().slice(0, 10);
    setInvoiceName(`Invoice - ${cust.name.trim()} - ${dateStr}`);
    setError(null);
  };

  const handleClearCustomer = () => {
    setLocalCustomerId(null);
    setLocalCustomerName("");
    setLocalCustomerPhone(null);
    setCustomerSearchQuery("");
    setIsCustomerDropdownOpen(true);
    setTimeout(() => {
      customerInputRef.current?.focus();
    }, 50);
  };

  const filteredCustomers = allCustomers.filter((c) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase().trim();
    const nameMatch = c.name?.toLowerCase().includes(q);

    const qDigits = q.replace(/\D/g, "");
    const cDigits = (c.phone || "").replace(/\D/g, "");

    let phoneMatch = (c.phone || "").toLowerCase().includes(q);
    if (qDigits) {
      if (cDigits.includes(qDigits) || qDigits.includes(cDigits)) {
        phoneMatch = true;
      }
      const qLocal = qDigits.startsWith("0") ? qDigits.slice(1) : qDigits;
      const cLocal = cDigits.startsWith("94") ? cDigits.slice(2) : cDigits.startsWith("0") ? cDigits.slice(1) : cDigits;
      if (cLocal && qLocal && (cLocal.includes(qLocal) || qLocal.includes(cLocal))) {
        phoneMatch = true;
      }
    }
    return nameMatch || phoneMatch;
  });

  // Line item modifications
  const handleItemChange = (index: number, field: keyof LineItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { name: "", quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickAdd = (qItem: QuickItem) => {
    if (items.length === 1 && !items[0].name.trim() && items[0].price === 0) {
      setItems([{ name: qItem.name, quantity: 1, price: qItem.price }]);
    } else {
      setItems((prev) => [...prev, { name: qItem.name, quantity: 1, price: qItem.price }]);
    }
  };

  // Calculations
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price) || 0),
    0
  );
  const discountAmount = subtotal * ((Number(discountPercentage) || 0) / 100);
  const total = Math.max(0, subtotal - discountAmount);
  const balanceDue = Math.max(0, total - (Number(advanceAmount) || 0));

  // Auto-sync advance amount with total if not manually changed
  useEffect(() => {
    if (!advanceModifiedManually) {
      setAdvanceAmount(total);
    }
  }, [total, advanceModifiedManually]);

  const handleGenerateInvoice = async () => {
    const activeCustomerId = customerId || localCustomerId;
    const activeCustomerName = customerName || localCustomerName;
    const activeCustomerPhone = customerPhone || localCustomerPhone;

    if (!activeCustomerId || !agentPrefix) {
      setError("Please select a customer to generate an invoice for");
      return;
    }

    if (!invoiceName.trim()) {
      setError("Please provide an invoice name or title");
      return;
    }

    const validItems = items.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) {
      setError("Please add at least one line item with a description");
      return;
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      setError("Discount percentage must be between 0 and 100");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error("Authentication token missing");

      const agent = await getCurrentAgent();
      const currentPath = agent?.invoice_template_path || invoiceTemplatePath;

      await generateAndUploadInvoice({
        token,
        invoiceId: editingInvoice?.id || undefined,
        templatePath: currentPath,
        invoiceName,
        agentDetails,
        selectedOrderId,
        customerName: activeCustomerName,
        customerPhone: activeCustomerPhone,
        customerId: activeCustomerId,
        agentPrefix,
        items: validItems,
        discountPercentage,
        subtotal,
        discountAmount,
        total,
        advanceAmount,
        balanceDue,
        invoiceNotes,
      });

      toast(editingInvoice ? "Invoice updated successfully!" : "Invoice created successfully!", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Generate invoice error:", err);
      setError(err.message || "Failed to generate invoice");
    } finally {
      setGenerating(false);
    }
  };

  return {
    // Customer
    localCustomerId, localCustomerName, localCustomerPhone, customerSearchQuery, setCustomerSearchQuery,
    isCustomerDropdownOpen, setIsCustomerDropdownOpen, isSearchingCustomers, customerDropdownRef,
    customerInputRef, filteredCustomers, handleSelectCustomer, handleClearCustomer,

    // Form, catalog & items
    invoiceName, setInvoiceName, items, handleItemChange, addItem, removeItem, handleQuickAdd,
    businessType, quickItems,

    // Financials, notes & submission
    discountPercentage, setDiscountPercentage, advanceAmount, setAdvanceAmount, setAdvanceModifiedManually,
    subtotal, discountAmount, total, balanceDue,
    invoiceNotes, setInvoiceNotes, generating, error, isEditing: Boolean(editingInvoice), handleGenerateInvoice,
  };
};
