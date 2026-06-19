import React, { useState, useEffect, useRef } from "react";
import { getToken } from "../../../lib/auth";
import { getCurrentAgent } from "../../../lib/agent";
import jsPDF from "jspdf";
import {
  FileText, Search, Plus, Eye, Download, Send, CheckCircle, Trash2,
  X, DollarSign, Clock,
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

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', cursor: 'pointer' };

const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

const getStatusStyle = (status: "generated" | "sent" | "paid"): React.CSSProperties => {
  if (status === "paid") return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (status === "sent") return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const result = reader.result as string; resolve(result.split(",")[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getUser = async () => {
  try {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (response.ok && data.success) {
      if (!data.user || !data.user.id) return { data: { user: null }, error: "Invalid user data from server" };
      return { data: { user: data.user }, error: null };
    } else {
      return { data: { user: null }, error: data.message || "Failed to get user" };
    }
  } catch (error) {
    return { data: { user: null }, error };
  }
};

interface InvoiceItem { name: string; quantity: number; price: number; total: number; }
interface Invoice { id: number; name: string; pdf_url: string; status: "generated" | "sent" | "paid"; generated_at: string; order_id: number; }
interface Customer { id: number; name: string; }
interface OrderForModal { id: number; customer_id?: number; total_amount: number; advance_amount?: number; payment_status?: string; status: string; notes?: string; created_at: string; customer_name: string; type?: string; }
interface InvoiceWithDetails extends Invoice { customer_name: string; order_number: string; total: number; discount_percentage?: number; customer_id?: number; }

const thCell: React.CSSProperties = {
  padding: '10px 16px', ...DM, fontSize: 11, fontWeight: 600,
  color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em',
  textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #ebebeb',
};

const InvoicesPage: React.FC = () => {
  const { toast, confirm: dlgConfirm } = useDialog();
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOrders, setCustomerOrders] = useState<Record<number, OrderForModal[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(emptyTimeRange);
  const [generating, setGenerating] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [invoiceTemplatePath, setInvoiceTemplatePath] = useState<string | null>(null);
  const [agentDetails, setAgentDetails] = useState({ name: "", address: "", business_email: "", contact_number: "", website: "" });
  const [userId, setUserId] = useState<string | null>(null);
  const [whatsappConfig, setWhatsappConfig] = useState<{ phone_number_id: string; api_key: string; } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderForModal | null>(null);
  const [invoiceName, setInvoiceName] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [query, setQuery] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState({ top: 0, left: 0, width: 0 });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) { setError("User not authenticated"); setLoading(false); return; }

      const userResult = await getUser();
      if (userResult.error || !userResult.data.user) { setError("User not authenticated"); setLoading(false); return; }

      const user = userResult.data.user;
      setUserId(user.id);

      if (!user.id || user.id === "null" || !user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        setError("Invalid user data"); setLoading(false); return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) { setError("Failed to fetch agent profile"); setLoading(false); return; }
      const agentProfile = await response.json();
      if (!agentProfile.success || !agentProfile.agent) { setError("Agent not found"); setLoading(false); return; }

      const agentData = agentProfile.agent;
      setAgentId(agentData.id);
      setAgentPrefix(agentData.agent_prefix);
      setInvoiceTemplatePath(agentData.invoice_template_path);
      setAgentDetails({ name: agentData.name || "", address: agentData.address || "", business_email: agentData.business_email || "", contact_number: agentData.contact_number || "", website: agentData.website || "" });
      setUserId(user.id);

      if (!user.id) {
        setWhatsappConfig(null);
      } else {
        const whatsappResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config?user_id=${user.id}`, {
          method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!whatsappResponse.ok) {
          setWhatsappConfig(null);
        } else {
          const whatsappData = await whatsappResponse.json();
          if (!whatsappData.success || !whatsappData.whatsapp_config) {
            setWhatsappConfig(null);
          } else {
            const whatsappConfigData = whatsappData.whatsapp_config[0] || whatsappData.whatsapp_config;
            setWhatsappConfig({ phone_number_id: whatsappConfigData.phone_number_id, api_key: whatsappConfigData.api_key });
          }
        }
      }

      if (!agentData.agent_prefix) { setError("Agent prefix not found"); setLoading(false); return; }

      const customersResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-customers`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!customersResponse.ok) { setError("Failed to fetch customers"); console.error("Customers fetch error:", await customersResponse.text()); setLoading(false); return; }
      const customersData = await customersResponse.json();
      if (!customersData.success) { setError("Failed to fetch customers"); setLoading(false); return; }
      const agentCustomers = customersData.customers.map((c: any) => ({ id: c.id, name: c.name })) || [];
      setCustomers(agentCustomers);

      const ordersResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!ordersResponse.ok) { setError("Failed to fetch orders"); console.error("Orders fetch error:", await ordersResponse.text()); setLoading(false); return; }
      const ordersData = await ordersResponse.json();
      if (!ordersData.success) { setError("Failed to fetch orders"); setLoading(false); return; }

      const allOrdersDataTemp = ordersData.orders.map((o: any) => ({
        id: o.id, customer_id: o.customer.id, total_amount: Number(o.total_amount) || 0,
        advance_amount: Number(o.advance_amount) || 0, payment_status: o.payment_status || "unpaid",
        status: o.status, notes: o.notes, created_at: o.created_at,
      })) || [];
      const allOrdersData = allOrdersDataTemp.filter((o: any) => agentCustomers.some((c: any) => c.id === o.customer_id));
      const customerMap = new Map();
      agentCustomers.forEach((customer: any) => customerMap.set(customer.id, customer.name));

      const ordersByCustomer: Record<number, OrderForModal[]> = {};
      (allOrdersData || []).forEach((order: any) => {
        const customerId = order.customer_id;
        if (!ordersByCustomer[customerId]) ordersByCustomer[customerId] = [];
        ordersByCustomer[customerId].push({
          id: order.id, customer_id: order.customer_id,
          customer_name: customerMap.get(order.customer_id) || "Unknown Customer",
          total_amount: order.total_amount || 0,
          advance_amount: order.advance_amount || 0,
          payment_status: order.payment_status || "unpaid",
          status: order.status || "pending",
          notes: order.notes, created_at: order.created_at, type: "order" as const,
        });
      });
      setCustomerOrders(ordersByCustomer);

      const invoicesResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-invoices`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!invoicesResponse.ok) { setError("Failed to fetch invoices"); console.error("Invoices fetch error:", await invoicesResponse.text()); setLoading(false); return; }
      const invoicesData = await invoicesResponse.json();
      if (!invoicesData.success) { setError("Failed to fetch invoices"); setLoading(false); return; }
      setInvoices((invoicesData.invoices || []).map((inv: any) => ({ ...inv, total: parseFloat(inv.total) || 0 })));
      setError(null);
    } catch (err) {
      setError("Failed to load data");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesCustomer = selectedCustomerFilter === null || invoice.customer_id === selectedCustomerFilter;
    const matchesSearch = searchTerm === "" ||
      invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTime = matchesTimeRange(invoice.generated_at, timeRange);
    return matchesCustomer && matchesSearch && matchesTime;
  });

  const capitalizeFirst = (str: string): string => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
  const sanitizeFileName = (name: string): string => name.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  const handleGenerateInvoice = async (order: OrderForModal, discountPct: number) => {
    if (!agentPrefix || !agentId) { setError("Agent configuration missing"); return; }
    if (!invoiceName.trim()) { setError("Invoice name is required"); return; }
    setGenerating(order.id);

    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }

      const agent = await getCurrentAgent();
      if (agent) setInvoiceTemplatePath(agent.invoice_template_path || null);

      const itemsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=items&order_id=${order.id}`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!itemsResponse.ok) throw new Error("Failed to fetch order items");
      const itemsData = await itemsResponse.json();
      if (!itemsData.success) throw new Error("Failed to fetch order items");

      const items: InvoiceItem[] = (itemsData.items || []).map((item: any) => ({
        name: item.name, quantity: Number(item.quantity) || 0, price: Number(item.price) || 0,
        total: item.total ? Number(item.total) : (Number(item.quantity) || 0) * (Number(item.price) || 0),
      }));

      let templateBase64: string | null = null;
      if (agent?.invoice_template_path || invoiceTemplatePath) {
        const currentPath = agent?.invoice_template_path || invoiceTemplatePath;
        try {
          if (!currentPath) { console.warn("No template path available"); } else {
            const templateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-invoice-template?path=${encodeURIComponent(currentPath)}`, {
              method: "GET", headers: { Authorization: `Bearer ${token}` },
            });
            if (templateResponse.ok) {
              const templateBlob = await templateResponse.blob();
              const img = new Image();
              const url = URL.createObjectURL(templateBlob);
              img.src = url;
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d")!;
                  const DPI = 150;
                  const a4WidthPt = 595;
                  const a4HeightPt = 842;
                  const scaleFactor = DPI / 72;
                  const canvasWidth = a4WidthPt * scaleFactor;
                  const canvasHeight = a4HeightPt * scaleFactor;
                  canvas.width = canvasWidth;
                  canvas.height = canvasHeight;
                  const scaleX = canvasWidth / img.width;
                  const scaleY = canvasHeight / img.height;
                  const scale = Math.min(scaleX, scaleY);
                  const scaledWidth = img.width * scale;
                  const scaledHeight = img.height * scale;
                  const offsetX = (canvasWidth - scaledWidth) / 2;
                  const offsetY = (canvasHeight - scaledHeight) / 2;
                  ctx.fillStyle = "white";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = "high";
                  ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
                  templateBase64 = canvas.toDataURL("image/jpeg", 0.95);
                  URL.revokeObjectURL(url);
                  resolve(null);
                };
                img.onerror = () => { console.error("Failed to load template image"); reject(new Error("Image load failed")); };
              });
            } else { console.warn("Failed to fetch template"); }
          }
        } catch (err) { console.error("Error fetching template:", err); }
      }

      const doc = new jsPDF();
      const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return window.btoa(binary);
      };

      const regularFontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf";
      const boldFontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf";
      const [regularFontBuffer, boldFontBuffer] = await Promise.all([
        fetch(regularFontUrl).then(res => res.arrayBuffer()),
        fetch(boldFontUrl).then(res => res.arrayBuffer()),
      ]);
      const regularFontBase64 = arrayBufferToBase64(regularFontBuffer);
      const boldFontBase64 = arrayBufferToBase64(boldFontBuffer);
      doc.addFileToVFS("Poppins-Regular.ttf", regularFontBase64);
      doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
      doc.addFileToVFS("Poppins-Bold.ttf", boldFontBase64);
      doc.addFont("Poppins-Bold.ttf", "Poppins", "bold");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      if (templateBase64) doc.addImage(templateBase64, "JPEG", 0, 0, pageWidth, pageHeight);

      doc.setFontSize(16);
      doc.setFont("Poppins", "bold");
      doc.text(invoiceName, pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("Poppins", "normal");
      let currentY = 80;
      if (agentDetails.name.trim()) { doc.setFont("Poppins", "bold"); doc.text(agentDetails.name, 20, currentY); doc.setFont("Poppins", "normal"); currentY += 8; }
      if (agentDetails.address.trim()) { doc.text(agentDetails.address, 20, currentY); currentY += 8; }
      if (agentDetails.business_email.trim()) { doc.text(`Email: ${agentDetails.business_email}`, 20, currentY); currentY += 8; }
      if (agentDetails.contact_number.trim()) { doc.text(`Phone: ${agentDetails.contact_number}`, 20, currentY); currentY += 8; }
      if (agentDetails.website.trim()) { doc.text(`Website: ${agentDetails.website}`, 20, currentY); currentY += 8; }

      const rightX = doc.internal.pageSize.getWidth() - 20;
      doc.setFont("Poppins", "bold");
      doc.text("Invoice Details", rightX, 80, { align: "right" });
      doc.setFont("Poppins", "normal");
      doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, rightX, 88, { align: "right" });
      doc.text(`Order #: #${order.id.toString().padStart(4, "0")}`, rightX, 96, { align: "right" });
      doc.text(`Status: ${capitalizeFirst(order.status)}`, rightX, 104, { align: "right" });

      doc.setFont("Poppins", "bold");
      doc.text("Bill To:", 20, 120);
      doc.setFont("Poppins", "normal");
      doc.text(order.customer_name || "Unknown Customer", 20, 130);

      let yPosition = 145;
      const colPositions = { desc: 20, qty: 90, price: 120, total: 150 };
      const descWidth = 55;
      const rowHeight = 10;
      const lineSpacing = 6;

      doc.setFontSize(9);
      doc.setFont("Poppins", "bold");
      doc.text("Item Description", colPositions.desc, yPosition);
      doc.text("Qty", colPositions.qty + 5, yPosition);
      doc.text("Unit Price", colPositions.price, yPosition);
      doc.text("Total", 190, yPosition, { align: "right" });
      yPosition += rowHeight + 2;

      doc.setFont("Poppins", "normal");
      doc.setFontSize(10);
      items.forEach((item) => {
        if (yPosition > 240) {
          doc.addPage();
          if (templateBase64) doc.addImage(templateBase64, "JPEG", 0, 0, pageWidth, pageHeight);
          yPosition = 35;
          doc.setFont("Poppins", "bold");
          doc.text("Item Description", colPositions.desc, yPosition);
          doc.text("Qty", colPositions.qty + 5, yPosition);
          doc.text("Unit Price", colPositions.price, yPosition);
          doc.text("Total", 195, yPosition, { align: "right" });
          yPosition += rowHeight + 2;
          doc.setFont("Poppins", "normal");
        }
        const descLines = doc.splitTextToSize(item.name, descWidth);
        let cy = yPosition;
        descLines.forEach((line: string) => { doc.text(line, colPositions.desc, cy); cy += lineSpacing; });
        const maxDescLines = Math.max(1, descLines.length);
        const effectiveRowHeight = Math.max(rowHeight, (maxDescLines - 1) * lineSpacing + rowHeight);
        const itemY = yPosition + ((maxDescLines - 1) * lineSpacing) / 2;
        doc.text(item.quantity.toString(), colPositions.qty + 5, itemY);
        doc.text(`LKR ${item.price.toFixed(2)}`, colPositions.price, itemY);
        doc.text(`LKR ${(item.total || item.quantity * item.price).toFixed(2)}`, 190, itemY, { align: "right" });
        yPosition += effectiveRowHeight + 2;
      });

      doc.setLineWidth(0.1);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 5;

      const subtotal = items.reduce((sum, item) => sum + (item.total || item.quantity * item.price), 0);
      const discountAmount = subtotal * (discountPct / 100);
      const total = subtotal - discountAmount;
      let totalsY = yPosition + 5;

      doc.setFont("Poppins", "normal"); doc.setFontSize(9);
      doc.text("Discount (" + discountPct.toFixed(2) + "%):", 120, totalsY);
      doc.text(`-LKR ${discountAmount.toFixed(2)}`, 190, totalsY, { align: "right" });
      totalsY += 8;

      doc.setFont("Poppins", "bold"); doc.setFontSize(10);
      doc.text("Total Amount:", 120, totalsY);
      doc.text(`LKR ${total.toFixed(2)}`, 190, totalsY, { align: "right" });
      totalsY += 8;

      // Advance Paid
      const advancePaid = Number(order.advance_amount || 0);
      doc.setFont("Poppins", "normal"); doc.setFontSize(9);
      doc.text("Advance Paid:", 120, totalsY);
      doc.text(`LKR ${advancePaid.toFixed(2)}`, 190, totalsY, { align: "right" });
      totalsY += 8;

      // Balance Due
      const balanceDue = Math.max(0, total - advancePaid);
      doc.setFont("Poppins", "bold"); doc.setFontSize(10);
      doc.text("Balance Due:", 120, totalsY);
      doc.text(`LKR ${balanceDue.toFixed(2)}`, 190, totalsY, { align: "right" });

      yPosition = totalsY + 12;

      if (invoiceNotes.trim()) {
        doc.setFont("Poppins", "normal"); doc.setFontSize(9);
        doc.text("Notes:", 20, yPosition);
        const notesLines = doc.splitTextToSize(invoiceNotes.trim(), 170);
        let notesY = yPosition;
        notesLines.forEach((line: string) => { doc.text(line, 50, notesY); notesY += 6; });
        yPosition = notesY + 10;
      }

      const footerY = pageHeight - 20;
      doc.setFontSize(10); doc.setFont("Poppins", "normal");
      doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

      const pdfBlob = doc.output("blob");
      const sanitizedFileName = sanitizeFileName(invoiceName);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const uploadResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-invoice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, invoiceName, agentPrefix, customerId: order.customer_id, discountPercentage: discountPct, pdfBase64 }),
      });
      if (!uploadResponse.ok) throw new Error("Failed to upload invoice");
      const uploadData = await uploadResponse.json();
      if (!uploadData.success) throw new Error("Failed to upload invoice");

      await fetchData();
      doc.save(`${sanitizedFileName}.pdf`);
      setError(null);
      setIsModalOpen(false);
      setSelectedCustomer(null);
      setSelectedOrder(null);
      setInvoiceName("");
      setDiscountPercentage(0);
    } catch (err) {
      setError("Failed to generate invoice: " + (err as Error).message);
      console.error("Invoice generation error:", err);
    } finally {
      setGenerating(null);
    }
  };

  const handleSendInvoice = async (invoiceId: number) => {
    if (!whatsappConfig) { setError("WhatsApp not configured. Please set up WhatsApp in settings."); return; }
    setUpdating(invoiceId);

    try {
      const token = getToken();
      if (!token) throw new Error("User not authenticated");

      const userResult = await getUser();
      if (userResult.error || !userResult.data.user) throw new Error("User not authenticated");

      const invoiceResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-invoices?id=${invoiceId}`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!invoiceResponse.ok) throw new Error("Failed to fetch invoice");
      const invoiceData = await invoiceResponse.json();
      if (!invoiceData.success || !invoiceData.invoices || invoiceData.invoices.length === 0) throw new Error("Invoice not found");
      const invoice = invoiceData.invoices[0];

      const orderResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders?id=${invoice.order_id}`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!orderResponse.ok) throw new Error("Failed to fetch order");
      const orderData = await orderResponse.json();
      if (!orderData.success || !orderData.orders || orderData.orders.length === 0) throw new Error("Order not found");
      const order = orderData.orders[0];

      const customerResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-customers?id=${order.customer_id}`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!customerResponse.ok) throw new Error("Failed to fetch customer");
      const customerData = await customerResponse.json();
      if (!customerData.success || !customerData.customers || customerData.customers.length === 0) throw new Error("Customer not found");
      const customer = customerData.customers[0];

      const phone = customer.phone;
      if (!phone) throw new Error("Customer phone number not found");

      const orderId = invoice.order_id;
      const orderNumber = `#${orderId.toString().padStart(4, "0")}`;

      const itemsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-orders?type=items&order_id=${orderId}`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!itemsResponse.ok) throw new Error("Failed to fetch order items");
      const itemsDataResult = await itemsResponse.json();
      if (!itemsDataResult.success) throw new Error("Failed to fetch order items");

      const subtotal = (itemsDataResult.items || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0);
      const discount = invoice.discount_percentage || 0;
      const totalAmount = subtotal * (1 - discount / 100);

      const now = new Date();
      const lastTime = customer.last_user_message_time ? new Date(customer.last_user_message_time) : new Date(0);
      const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

      const sendResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/send-invoice-template`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, customer_phone: phone, invoice_url: invoice.pdf_url, invoice_name: invoice.name, order_number: orderNumber, total_amount: totalAmount.toString(), customer_name: customer.name || "Valued Customer" }),
      });
      const data = await sendResponse.json();
      if (!sendResponse.ok) throw new Error("Failed to send invoice: " + (data.error || "Unknown error"));

      if (invoice.status === "generated") {
        const updateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-invoices`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id: invoiceId, status: "sent", updated_at: new Date().toISOString() }),
        });
        if (!updateResponse.ok) throw new Error("Failed to update invoice status");
        const updateData = await updateResponse.json();
        if (!updateData.success) throw new Error("Failed to update invoice status");
      }

      await fetchData();
      setError(null);
    } catch (err) {
      setError("Failed to send invoice: " + (err as Error).message);
      console.error("Send invoice error:", err);
    } finally {
      setUpdating(null);
    }
  };

  const handleMarkPaid = async (invoiceId: number) => {
    setUpdating(invoiceId);
    try {
      const token = getToken();
      if (!token) throw new Error("User not authenticated");

      const updateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-invoices`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoiceId, status: "paid", updated_at: new Date().toISOString() }),
      });
      if (!updateResponse.ok) throw new Error("Failed to update invoice status");
      const updateData = await updateResponse.json();
      if (!updateData.success) throw new Error("Failed to update invoice status");

      toast("Marked invoice as paid", 'success');
      await fetchData();
      setError(null);
    } catch (err) {
      setError("Failed to mark as paid: " + (err as Error).message);
      console.error("Mark paid error:", err);
    } finally {
      setUpdating(null);
    }
  };

  const downloadPDF = async (invoice: InvoiceWithDetails) => {
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/download-invoice?invoiceId=${invoice.id}`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` },
      });
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
    if (!await dlgConfirm(`Delete invoice "${invoice.name}"? This will remove the PDF from storage and record from database.`, { danger: true })) return;
    if (!agentPrefix) { setError("Agent configuration missing"); return; }
    setUpdating(invoice.id);

    try {
      const token = getToken();
      if (!token) throw new Error("User not authenticated");

      const dbDeleteResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-invoices?id=${invoice.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!dbDeleteResponse.ok) throw new Error("Failed to delete invoice record");
      const dbData = await dbDeleteResponse.json();
      if (!dbData.success) throw new Error("Failed to delete invoice record");

      await fetchData();
      toast("Invoice deleted successfully", 'success');
      setError(null);
    } catch (err) {
      setError("Failed to delete invoice: " + (err as Error).message);
      console.error("Delete invoice error:", err);
    } finally {
      setUpdating(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
    setSelectedOrder(null);
    setInvoiceName("");
    setDiscountPercentage(0);
    setInvoiceNotes("");
    setQuery("");
    setShowCustomerDropdown(false);
  };

  // Summary stats
  const totalInvoices = filteredInvoices.length;
  const paidCount = filteredInvoices.filter(i => i.status === 'paid').length;
  const sentCount = filteredInvoices.filter(i => i.status === 'sent').length;
  const totalPaidRevenue = filteredInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total as any), 0);

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes ip-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={15} style={{ color: '#22c55e' }} />
                </div>
                <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Create Invoice</span>
              </div>
              <button onClick={closeModal} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} style={{ color: '#71717a' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Customer Search */}
              <div style={{ position: 'relative' }}>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Select Customer</label>

                {/* Selected customer chip */}
                {selectedCustomer ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ ...SYNE, fontSize: 10, fontWeight: 700, color: '#fff' }}>{selectedCustomer.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#059669', flex: 1 }}>{selectedCustomer.name}</span>
                    <button
                      onClick={() => { setSelectedCustomer(null); setSelectedOrder(null); setInvoiceName(""); setQuery(""); setShowCustomerDropdown(false); }}
                      style={{ width: 20, height: 20, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <X size={11} style={{ color: '#71717a' }} />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none', zIndex: 1 }} />
                    <input
                      ref={customerInputRef}
                      type="text"
                      placeholder="Search customers…"
                      value={query}
                      onChange={e => { setQuery(e.target.value); setShowCustomerDropdown(true); }}
                      onFocus={() => {
                        if (customerInputRef.current) {
                          const r = customerInputRef.current.getBoundingClientRect();
                          setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
                        }
                        setShowCustomerDropdown(true);
                      }}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                      style={{ ...inputStyle, paddingLeft: 30 }}
                    />
                  </div>
                )}
              </div>

              {/* Order Select */}
              {selectedCustomer && (
                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>
                    Order for {selectedCustomer.name}
                  </label>
                  <select
                    value={selectedOrder?.id || ""}
                    onChange={e => {
                      const id = parseInt(e.target.value);
                      const order = customerOrders[selectedCustomer.id]?.find(o => o.id === id);
                      setSelectedOrder(order || null);
                      if (order) setInvoiceName(`Invoice for Order #${order.id.toString().padStart(4, "0")} - ${selectedCustomer.name}`);
                      else setInvoiceName(`Invoice for ${selectedCustomer.name}`);
                    }}
                    style={selectStyle} onFocus={onFocusG} onBlur={onBlurG}
                  >
                    <option value="">Choose an order…</option>
                    {customerOrders[selectedCustomer.id]?.map(order => (
                      <option key={order.id} value={order.id}>
                        Order #{order.id.toString().padStart(4, "0")} — LKR {order.total_amount.toFixed(2)} — {capitalizeFirst(order.status)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Invoice Name */}
              {selectedCustomer && selectedOrder && (
                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Invoice Name</label>
                  <input type="text" value={invoiceName} onChange={e => setInvoiceName(e.target.value)} placeholder="Enter custom invoice name" style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                </div>
              )}

              {/* Discount */}
              {selectedCustomer && selectedOrder && (
                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Discount Percentage (%)</label>
                  <input type="number" value={discountPercentage} onChange={e => setDiscountPercentage(parseFloat(e.target.value) || 0)} placeholder="0" min="0" max="100" step="0.01" style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                </div>
              )}

              {/* Invoice Notes */}
              {selectedCustomer && selectedOrder && (
                <div>
                  <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Invoice Notes</label>
                  <textarea
                    value={invoiceNotes}
                    onChange={e => setInvoiceNotes(e.target.value)}
                    placeholder="Notes to print on the invoice..."
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                    onFocus={onFocusG as any}
                    onBlur={onBlurG as any}
                  />
                </div>
              )}
            </div>

            <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #ebebeb', display: 'flex', gap: 10 }}>
              <button onClick={closeModal} style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '10px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              {selectedCustomer && selectedOrder && (
                <button
                  onClick={() => handleGenerateInvoice(selectedOrder, discountPercentage)}
                  disabled={generating === selectedOrder.id || !invoiceName.trim()}
                  style={{ flex: 1, background: (generating === selectedOrder.id || !invoiceName.trim()) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: (generating === selectedOrder.id || !invoiceName.trim()) ? 'not-allowed' : 'pointer', boxShadow: (generating === selectedOrder.id || !invoiceName.trim()) ? 'none' : '0 4px 12px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {generating === selectedOrder.id ? (
                    <><div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'ip-spin 0.7s linear infinite' }} />Generating…</>
                  ) : <><FileText size={13} />Generate Invoice</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </Portal>
    )}

      {/* Customer search dropdown — fixed portal above modal */}
      {showCustomerDropdown && isModalOpen && (
        <Portal>
          <div style={{ position: 'fixed', top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width, background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, maxHeight: 220, overflowY: 'auto' }}>
          {(() => {
            const filtered = query === '' ? customers : customers.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
            if (filtered.length === 0) return (
              <div style={{ padding: '12px 14px', ...DM, fontSize: 12, color: '#71717a' }}>
                {customers.length === 0 ? 'No customers available.' : 'No customers match.'}
              </div>
            );
            return filtered.map(c => (
              <button
                key={c.id}
                onMouseDown={() => {
                  setSelectedCustomer(c);
                  setSelectedOrder(null);
                  setInvoiceName(`Invoice for ${c.name}`);
                  setQuery("");
                  setShowCustomerDropdown(false);
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.05)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ ...SYNE, fontSize: 11, fontWeight: 700, color: '#fff' }}>{c.name.charAt(0).toUpperCase()}</span>
                </div>
                <span style={{ ...DM, fontSize: 13, color: '#0c1a0e' }}>{c.name}</span>
              </button>
            ));
          })()}
          </div>
        </Portal>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { Icon: FileText, label: 'Total Invoices', value: totalInvoices, iconColor: '#22c55e', iconBg: 'rgba(34,197,94,0.1)' },
          { Icon: DollarSign, label: 'Revenue Collected', value: `LKR ${totalPaidRevenue.toFixed(2)}`, iconColor: '#059669', iconBg: 'rgba(5,150,105,0.1)' },
          { Icon: Send, label: 'Sent (Awaiting)', value: sentCount, iconColor: '#d97706', iconBg: 'rgba(217,119,6,0.1)' },
          { Icon: CheckCircle, label: 'Paid Invoices', value: paidCount, iconColor: '#0891b2', iconBg: 'rgba(8,145,178,0.1)' },
        ].map(({ Icon, label, value, iconColor, iconBg }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={17} style={{ color: iconColor }} />
              </div>
            </div>
            <div style={{ ...SYNE, fontSize: 26, fontWeight: 800, color: '#0c1a0e', lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#71717a' }}>{label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e' }}>
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '14px 18px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search by customer, name, or status…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle, paddingLeft: 30 }} onFocus={onFocusG} onBlur={onBlurG} />
        </div>
        <select
          value={selectedCustomerFilter?.toString() || ""}
          onChange={e => setSelectedCustomerFilter(e.target.value ? parseInt(e.target.value) : null)}
          style={{ ...selectStyle, width: 'auto', minWidth: 150 }} onFocus={onFocusG} onBlur={onBlurG}
        >
          <option value="">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

        <button onClick={() => setIsModalOpen(true)} style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Plus size={14} /> Create Invoice
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {filteredInvoices.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <FileText size={22} style={{ color: '#d4d4d8' }} />
            </div>
            <div style={{ ...SYNE, fontSize: 15, fontWeight: 600, color: '#0c1a0e', marginBottom: 6 }}>
              {searchTerm ? "No invoices found" : "No invoices yet"}
            </div>
            <div style={{ ...DM, fontSize: 13, color: '#71717a', marginBottom: 20 }}>
              {searchTerm ? `No invoices match "${searchTerm}"` : "Create your first invoice using the button above"}
            </div>
          </div>
        ) : (
          <>
            {/* Mobile/Tablet Card Layout */}
            <div className="block lg:hidden">
              <div className="flex flex-col divide-y divide-[#f4f4f5]">
                {filteredInvoices.map(invoice => (
                  <div
                    key={invoice.id}
                    style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invoice.name}</div>
                        <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>{invoice.order_number}</div>
                      </div>
                      <span style={{ ...DM, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, ...getStatusStyle(invoice.status), flexShrink: 0 }}>
                        {capitalizeFirst(invoice.status)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', padding: '8px 12px', borderRadius: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Customer</span>
                        <span style={{ ...DM, fontSize: 12, color: '#0c1a0e', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {invoice.customer_name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                        <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Total</span>
                        <span style={{ ...DM, fontSize: 13, color: '#3f3f46', fontWeight: 600 }}>
                          LKR {invoice.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                      <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>
                        Generated: {new Date(invoice.generated_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {/* View */}
                        <button onClick={() => window.open(invoice.pdf_url, "_blank")} title="View PDF"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', ...DM, fontSize: 11, fontWeight: 600, background: 'rgba(8,145,178,0.08)', color: '#0891b2', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,145,178,0.15)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,145,178,0.08)'}
                        >
                          <Eye size={11} /> View
                        </button>

                        {/* Download */}
                        <button onClick={() => downloadPDF(invoice)} title="Download PDF"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', ...DM, fontSize: 11, fontWeight: 600, background: 'rgba(34,197,94,0.08)', color: '#22c55e', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.15)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.08)'}
                        >
                          <Download size={11} /> Download
                        </button>

                        {/* Send / Resend */}
                        {invoice.status !== "paid" && (
                          <button onClick={() => handleSendInvoice(invoice.id)} disabled={updating === invoice.id} title="Send via WhatsApp"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: updating === invoice.id ? 'not-allowed' : 'pointer', ...DM, fontSize: 11, fontWeight: 600, background: updating === invoice.id ? '#f4f4f5' : 'rgba(217,119,6,0.08)', color: updating === invoice.id ? '#a1a1aa' : '#d97706', whiteSpace: 'nowrap' }}
                          >
                            <Send size={11} /> {updating === invoice.id ? "Sending…" : invoice.status === "generated" ? "Send" : "Resend"}
                          </button>
                        )}

                        {/* Mark Paid */}
                        {(invoice.status === "generated" || invoice.status === "sent") && (
                          <button onClick={() => handleMarkPaid(invoice.id)} disabled={updating === invoice.id} title="Mark as paid"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: updating === invoice.id ? 'not-allowed' : 'pointer', ...DM, fontSize: 11, fontWeight: 600, background: updating === invoice.id ? '#f4f4f5' : 'rgba(34,197,94,0.08)', color: updating === invoice.id ? '#a1a1aa' : '#059669', whiteSpace: 'nowrap' }}
                          >
                            <CheckCircle size={11} /> {updating === invoice.id ? "Updating…" : "Mark Paid"}
                          </button>
                        )}

                        {/* Delete */}
                        <button onClick={() => handleDeleteInvoice(invoice)} disabled={updating === invoice.id} title="Delete invoice"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: updating === invoice.id ? 'not-allowed' : 'pointer', ...DM, fontSize: 11, fontWeight: 600, background: updating === invoice.id ? '#f4f4f5' : 'rgba(244,63,94,0.06)', color: updating === invoice.id ? '#a1a1aa' : '#f43f5e', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => { if (updating !== invoice.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.12)'; }}
                          onMouseLeave={e => { if (updating !== invoice.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.06)'; }}
                        >
                          <Trash2 size={11} /> {updating === invoice.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden lg:block overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Invoice', 'Customer', 'Order', 'Total', 'Status', 'Date', 'Actions'].map((h, i) => (
                      <th key={h} style={{ ...thCell, textAlign: i === 6 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(invoice => (
                    <tr
                      key={invoice.id}
                      style={{ borderBottom: '1px solid #f4f4f5', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(34,197,94,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{invoice.name}</span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#0c1a0e' }}>{invoice.customer_name}</span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>{invoice.order_number}</span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>LKR {invoice.total.toFixed(2)}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ ...DM, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, ...getStatusStyle(invoice.status) }}>
                          {capitalizeFirst(invoice.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>
                          {new Date(invoice.generated_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, flexWrap: 'nowrap' }}>
                          {/* View */}
                          <button onClick={() => window.open(invoice.pdf_url, "_blank")} title="View PDF"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', ...DM, fontSize: 11, fontWeight: 600, background: 'rgba(8,145,178,0.08)', color: '#0891b2', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,145,178,0.15)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,145,178,0.08)'}
                          >
                            <Eye size={11} /> View
                          </button>

                          {/* Download */}
                          <button onClick={() => downloadPDF(invoice)} title="Download PDF"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', ...DM, fontSize: 11, fontWeight: 600, background: 'rgba(34,197,94,0.08)', color: '#22c55e', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.15)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.08)'}
                          >
                            <Download size={11} /> Download
                          </button>

                          {/* Send / Resend */}
                          {invoice.status !== "paid" && (
                            <button onClick={() => handleSendInvoice(invoice.id)} disabled={updating === invoice.id} title="Send via WhatsApp"
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: updating === invoice.id ? 'not-allowed' : 'pointer', ...DM, fontSize: 11, fontWeight: 600, background: updating === invoice.id ? '#f4f4f5' : 'rgba(217,119,6,0.08)', color: updating === invoice.id ? '#a1a1aa' : '#d97706', whiteSpace: 'nowrap' }}
                            >
                              <Send size={11} /> {updating === invoice.id ? "Sending…" : invoice.status === "generated" ? "Send" : "Resend"}
                            </button>
                          )}

                          {/* Mark Paid */}
                          {(invoice.status === "generated" || invoice.status === "sent") && (
                            <button onClick={() => handleMarkPaid(invoice.id)} disabled={updating === invoice.id} title="Mark as paid"
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: updating === invoice.id ? 'not-allowed' : 'pointer', ...DM, fontSize: 11, fontWeight: 600, background: updating === invoice.id ? '#f4f4f5' : 'rgba(34,197,94,0.08)', color: updating === invoice.id ? '#a1a1aa' : '#059669', whiteSpace: 'nowrap' }}
                            >
                              <CheckCircle size={11} /> {updating === invoice.id ? "Updating…" : "Mark Paid"}
                            </button>
                          )}

                          {/* Delete */}
                          <button onClick={() => handleDeleteInvoice(invoice)} disabled={updating === invoice.id} title="Delete invoice"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: updating === invoice.id ? 'not-allowed' : 'pointer', ...DM, fontSize: 11, fontWeight: 600, background: updating === invoice.id ? '#f4f4f5' : 'rgba(244,63,94,0.06)', color: updating === invoice.id ? '#a1a1aa' : '#f43f5e', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { if (updating !== invoice.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.12)'; }}
                            onMouseLeave={e => { if (updating !== invoice.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.06)'; }}
                          >
                            <Trash2 size={11} /> {updating === invoice.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoicesPage;
