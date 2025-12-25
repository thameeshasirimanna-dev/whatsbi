import React, { useState, useEffect } from "react";
import { Dialog, Combobox } from '@headlessui/react';
import { getToken } from "../../../lib/auth";
import { getCurrentAgent } from "../../../lib/agent";
import jsPDF from "jspdf";

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getUser = async () => {
  try {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };

    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/get-current-user`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    if (response.ok && data.success) {
      if (!data.user || !data.user.id) {
        return { data: { user: null }, error: "Invalid user data from server" };
      }
      return { data: { user: data.user }, error: null };
    } else {
      return {
        data: { user: null },
        error: data.message || "Failed to get user",
      };
    }
  } catch (error) {
    return { data: { user: null }, error };
  }
};

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Invoice {
  id: number;
  name: string;
  pdf_url: string;
  status: "generated" | "sent" | "paid";
  generated_at: string;
  order_id: number;
}

interface Customer {
  id: number;
  name: string;
}

interface OrderForModal {
  id: number;
  customer_id?: number;
  total_amount: number;
  status: string;
  notes?: string;
  created_at: string;
  customer_name: string;
  type?: string;
}

interface InvoiceWithDetails extends Invoice {
  customer_name: string;
  order_number: string;
  total: number;
  discount_percentage?: number;
  customer_id?: number;
}

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOrders, setCustomerOrders] = useState<
    Record<number, OrderForModal[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<
    number | null
  >(null);
  const [generating, setGenerating] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [invoiceTemplatePath, setInvoiceTemplatePath] = useState<string | null>(
    null
  );

  const [agentDetails, setAgentDetails] = useState({
    name: "",
    address: "",
    business_email: "",
    contact_number: "",
    website: "",
  });

  const [userId, setUserId] = useState<string | null>(null);
  const [whatsappConfig, setWhatsappConfig] = useState<{
    phone_number_id: string;
    api_key: string;
  } | null>(null);

  // Modal states
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedOrder, setSelectedOrder] = useState<OrderForModal | null>(
    null
  );
  const [invoiceName, setInvoiceName] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [query, setQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authenticated user
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
      setUserId(user.id);

      // Validate user ID
      if (
        !user.id ||
        user.id === "null" ||
        !user.id.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
      ) {
        setError("Invalid user data");
        setLoading(false);
        return;
      }

      // Get agent profile from backend

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
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
      const currentAgentId = agentData.id;
      const currentAgentPrefix = agentData.agent_prefix;
      setAgentId(currentAgentId);
      setAgentPrefix(currentAgentPrefix);
      setInvoiceTemplatePath(agentData.invoice_template_path);

      setAgentDetails({
        name: agentData.name || "",
        address: agentData.address || "",
        business_email: agentData.business_email || "",
        contact_number: agentData.contact_number || "",
        website: agentData.website || "",
      });

      setUserId(user.id);

      // Get WhatsApp config from backend
      if (!user.id) {
        setWhatsappConfig(null);
      } else {
        const whatsappResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config?user_id=${
            user.id
          }`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!whatsappResponse.ok) {
          // Do not set error, allow page to load without WhatsApp config
          setWhatsappConfig(null);
        } else {
          const whatsappData = await whatsappResponse.json();
          if (!whatsappData.success || !whatsappData.whatsapp_config) {
            // Do not set error, allow page to load without WhatsApp config
            setWhatsappConfig(null);
          } else {
            const whatsappConfigData =
              whatsappData.whatsapp_config[0] || whatsappData.whatsapp_config;
            setWhatsappConfig({
              phone_number_id: whatsappConfigData.phone_number_id,
              api_key: whatsappConfigData.api_key,
            });
          }
        }
      }

      if (!currentAgentPrefix) {
        setError("Agent prefix not found");
        setLoading(false);
        return;
      }

      // Fetch customers
      const customersResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-customers`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!customersResponse.ok) {
        setError("Failed to fetch customers");
        console.error("Customers fetch error:", await customersResponse.text());
        setLoading(false);
        return;
      }
      const customersData = await customersResponse.json();
      if (!customersData.success) {
        setError("Failed to fetch customers");
        setLoading(false);
        return;
      }
      const agentCustomers =
        customersData.customers.map((c: any) => ({ id: c.id, name: c.name })) ||
        [];
      setCustomers(agentCustomers);

      // Fetch all orders
      const ordersResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!ordersResponse.ok) {
        setError("Failed to fetch orders");
        console.error("Orders fetch error:", await ordersResponse.text());
        setLoading(false);
        return;
      }
      const ordersData = await ordersResponse.json();
      if (!ordersData.success) {
        setError("Failed to fetch orders");
        setLoading(false);
        return;
      }
      const allOrdersDataTemp =
        ordersData.orders.map((o: any) => ({
          id: o.id,
          customer_id: o.customer.id,
          total_amount: Number(o.total_amount) || 0,
          status: o.status,
          notes: o.notes,
          created_at: o.created_at,
        })) || [];
      // Filter orders for the customers
      const allOrdersData = allOrdersDataTemp.filter((o: any) =>
        agentCustomers.some((c: any) => c.id === o.customer_id)
      );

      // Set customer map
      const customerMap = new Map();
      agentCustomers.forEach((customer: any) => {
        customerMap.set(customer.id, customer.name);
      });

      // Process orders per customer
      const ordersByCustomer: Record<number, OrderForModal[]> = {};
      (allOrdersData || []).forEach((order: any) => {
        const customerId = order.customer_id;
        if (!ordersByCustomer[customerId]) {
          ordersByCustomer[customerId] = [];
        }
        ordersByCustomer[customerId].push({
          id: order.id,
          customer_id: order.customer_id,
          customer_name:
            customerMap.get(order.customer_id) || "Unknown Customer",
          total_amount: order.total_amount || 0,
          status: order.status || "pending",
          notes: order.notes,
          created_at: order.created_at,
          type: "order" as const,
        });
      });

      setCustomerOrders(ordersByCustomer);

      // Fetch invoices
      const invoicesResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-invoices`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!invoicesResponse.ok) {
        setError("Failed to fetch invoices");
        console.error("Invoices fetch error:", await invoicesResponse.text());
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
          total: Number(inv.total) || 0,
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

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesCustomer =
      selectedCustomerFilter === null ||
      invoice.customer_id === selectedCustomerFilter;
    const matchesSearch =
      searchTerm === "" ||
      invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.order_number.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCustomer && matchesSearch;
  });

  const capitalizeFirst = (str: string): string => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const getInvoiceStatusBadgeClass = (
    status: "generated" | "sent" | "paid"
  ) => {
    switch (status) {
      case "generated":
        return "bg-blue-100 text-blue-800";
      case "sent":
        return "bg-yellow-100 text-yellow-800";
      case "paid":
        return "bg-green-100 text-green-800";
    }
  };

  const sanitizeFileName = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  };

  const handleGenerateInvoice = async (
    order: OrderForModal,
    discountPercentage: number
  ) => {
    if (!agentPrefix || !agentId) {
      setError("Agent configuration missing");
      return;
    }

    if (!invoiceName.trim()) {
      setError("Invoice name is required");
      return;
    }

    setGenerating(order.id);

    try {
      const token = getToken();
      if (!token) {
        setError("User not authenticated");
        return;
      }
      // Refetch latest invoice template path to ensure it's up-to-date
      const agent = await getCurrentAgent();
      if (agent) {
        setInvoiceTemplatePath(agent.invoice_template_path || null);
      }

      // Fetch order items
      const itemsResponse = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/manage-orders?type=items&order_id=${order.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!itemsResponse.ok) {
        throw new Error("Failed to fetch order items");
      }

      const itemsData = await itemsResponse.json();
      if (!itemsData.success) {
        throw new Error("Failed to fetch order items");
      }

      const items: InvoiceItem[] = (itemsData.items || []).map((item: any) => ({
        name: item.name,
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        total: item.total
          ? Number(item.total)
          : (Number(item.quantity) || 0) * (Number(item.price) || 0),
      }));

      // Fetch template if available
      let templateBase64: string | null = null;
      if (agent?.invoice_template_path || invoiceTemplatePath) {
        const currentPath = agent?.invoice_template_path || invoiceTemplatePath;
        try {
          if (!currentPath) {
            console.warn("No template path available");
          } else {
            const templateResponse = await fetch(
              `${
                import.meta.env.VITE_BACKEND_URL
              }/get-invoice-template?path=${encodeURIComponent(currentPath)}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

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
                  const a4WidthPt = 595; // A4 width at 72 DPI
                  const a4HeightPt = 842; // A4 height at 72 DPI
                  const scaleFactor = DPI / 72;
                  const canvasWidth = a4WidthPt * scaleFactor;
                  const canvasHeight = a4HeightPt * scaleFactor;
                  canvas.width = canvasWidth;
                  canvas.height = canvasHeight;

                  // Calculate scale to fit A4 while preserving aspect ratio at high DPI
                  const scaleX = canvasWidth / img.width;
                  const scaleY = canvasHeight / img.height;
                  const scale = Math.min(scaleX, scaleY);
                  const scaledWidth = img.width * scale;
                  const scaledHeight = img.height * scale;

                  // Center the image
                  const offsetX = (canvasWidth - scaledWidth) / 2;
                  const offsetY = (canvasHeight - scaledHeight) / 2;

                  // Fill canvas with white background for JPEG compatibility
                  ctx.fillStyle = "white";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);

                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = "high";
                  ctx.drawImage(
                    img,
                    offsetX,
                    offsetY,
                    scaledWidth,
                    scaledHeight
                  );
                  templateBase64 = canvas.toDataURL("image/jpeg", 0.95); // JPEG for better compression while maintaining quality
                  URL.revokeObjectURL(url);
                  resolve(null);
                };
                img.onerror = () => {
                  console.error("Failed to load template image");
                  reject(new Error("Image load failed"));
                };
              });
            } else {
              console.warn("Failed to fetch template");
            }
          }
        } catch (err) {
          console.error("Error fetching template:", err);
        }
      }

      // Create PDF
      const doc = new jsPDF();
      const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      };

      // Load Poppins fonts (using TTF from GitHub for jsPDF compatibility)
      const regularFontUrl =
        "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf";
      const boldFontUrl =
        "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf";
      const [regularFontBuffer, boldFontBuffer] = await Promise.all([
        fetch(regularFontUrl).then((res) => res.arrayBuffer()),
        fetch(boldFontUrl).then((res) => res.arrayBuffer()),
      ]);
      const regularFontBase64 = arrayBufferToBase64(regularFontBuffer);
      const boldFontBase64 = arrayBufferToBase64(boldFontBuffer);
      doc.addFileToVFS("Poppins-Regular.ttf", regularFontBase64);
      doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
      doc.addFileToVFS("Poppins-Bold.ttf", boldFontBase64);
      doc.addFont("Poppins-Bold.ttf", "Poppins", "bold");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Add background template if available
      if (templateBase64) {
        doc.addImage(templateBase64, "JPEG", 0, 0, pageWidth, pageHeight);
      }

      // Header
      doc.setFontSize(16);
      doc.setFont("Poppins", "bold");
      doc.text(invoiceName, pageWidth / 2, 20, { align: "center" });

      // Agent details
      doc.setFontSize(10);
      doc.setFont("Poppins", "normal");
      let currentY = 60;
      if (agentDetails.name.trim()) {
        doc.setFont("Poppins", "bold");
        doc.text(agentDetails.name, 20, currentY);
        doc.setFont("Poppins", "normal");
        currentY += 10;
      }
      if (agentDetails.address.trim()) {
        doc.text(agentDetails.address, 20, currentY);
        currentY += 10;
      }
      if (agentDetails.business_email.trim()) {
        doc.text(`Email: ${agentDetails.business_email}`, 20, currentY);
        currentY += 10;
      }
      if (agentDetails.contact_number.trim()) {
        doc.text(`Phone: ${agentDetails.contact_number}`, 20, currentY);
        currentY += 10;
      }
      if (agentDetails.website.trim()) {
        doc.text(`Website: ${agentDetails.website}`, 20, currentY);
        currentY += 10;
      }

      // Invoice details (right aligned)
      const rightX = doc.internal.pageSize.getWidth() - 20;
      doc.setFont("Poppins", "bold");
      doc.text("Invoice Details", rightX, 60, { align: "right" });
      doc.setFont("Poppins", "normal");
      doc.text(
        `Date: ${new Date(order.created_at).toLocaleDateString()}`,
        rightX,
        80,
        { align: "right" }
      );
      doc.text(
        `Order #: #${order.id.toString().padStart(4, "0")}`,
        rightX,
        90,
        { align: "right" }
      );
      doc.text(`Status: ${capitalizeFirst(order.status)}`, rightX, 100, {
        align: "right",
      });

      // Customer details
      doc.setFont("Poppins", "bold");
      doc.text("Bill To:", 20, 120);
      doc.setFont("Poppins", "normal");
      doc.text(order.customer_name || "Unknown Customer", 20, 130);

      // Items table without borders - reduced width with wrapping
      let yPosition = 145;
      const colPositions = { desc: 20, qty: 90, price: 120, total: 150 };
      const descWidth = 55; // Width for description wrapping with small right padding
      const rowHeight = 10; // Standard row height
      const lineSpacing = 6; // Tighter spacing for wrapped text lines

      // Header texts
      doc.setFontSize(9);
      doc.setFont("Poppins", "bold");
      doc.text("Item Description", colPositions.desc, yPosition);
      doc.text("Qty", colPositions.qty + 5, yPosition);
      doc.text("Unit Price", colPositions.price, yPosition);
      doc.text("Total", 190, yPosition, { align: "right" });

      yPosition += rowHeight + 2; // Extra padding after header

      doc.setFont("Poppins", "normal");
      doc.setFontSize(10);
      items.forEach((item) => {
        if (yPosition > 750) {
          doc.addPage();
          // Add background to new page
          if (templateBase64) {
            doc.addImage(templateBase64, "JPEG", 0, 0, pageWidth, pageHeight);
          }
          // Redraw table headers
          yPosition = 35; // Adjusted for new page, moved up
          doc.setFont("Poppins", "bold");
          doc.text("Item Description", colPositions.desc, yPosition);
          doc.text("Qty", colPositions.qty + 5, yPosition);
          doc.text("Unit Price", colPositions.price, yPosition);
          doc.text("Total", 195, yPosition, { align: "right" });
          yPosition += rowHeight + 2; // Extra padding after header
          doc.setFont("Poppins", "normal");
        }

        // Row data with wrapping for description
        const descLines = doc.splitTextToSize(item.name, descWidth);
        let currentY = yPosition;
        descLines.forEach((line: string, index: number) => {
          doc.text(line, colPositions.desc, currentY);
          currentY += lineSpacing;
        });
        const maxDescLines = Math.max(1, descLines.length);
        const effectiveRowHeight = Math.max(
          rowHeight,
          (maxDescLines - 1) * lineSpacing + rowHeight
        );
        const itemY = yPosition + ((maxDescLines - 1) * lineSpacing) / 2; // Align other fields to middle of description height
        doc.text(item.quantity.toString(), colPositions.qty + 5, itemY);
        doc.text(`LKR ${item.price.toFixed(2)}`, colPositions.price, itemY);
        doc.text(
          `LKR ${(item.total || item.quantity * item.price).toFixed(2)}`,
          190,
          itemY,
          { align: "right" }
        );

        yPosition += effectiveRowHeight + 2; // Extra padding after row
      });

      // Horizontal line at bottom of table
      doc.setLineWidth(0.1);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 5; // Padding after line

      // Calculate subtotal
      const subtotal = items.reduce(
        (sum, item) => sum + (item.total || item.quantity * item.price),
        0
      );

      const discountAmount = subtotal * (discountPercentage / 100);
      const total = subtotal - discountAmount;

      // Totals section positioned after table with 5 padding
      let totalsY = yPosition + 5;

      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.text("Subtotal:", 120, totalsY);
      doc.text(`LKR ${subtotal.toFixed(2)}`, 190, totalsY, { align: "right" });
      totalsY += 10;
      doc.setFont("Poppins", "normal");
      doc.setFontSize(9);
      doc.text(`Discount (${discountPercentage.toFixed(2)}%):`, 120, totalsY);
      doc.text(`-LKR ${discountAmount.toFixed(2)}`, 190, totalsY, {
        align: "right",
      });
      totalsY += 10;
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.text("Total Amount:", 120, totalsY);
      doc.text(`LKR ${total.toFixed(2)}`, 190, totalsY, { align: "right" });
      totalsY += 15;

      yPosition = totalsY + 20; // Update yPosition for notes

      // Notes
      if (order.notes) {
        doc.setFont("Poppins", "normal");
        doc.setFontSize(9);
        doc.text("Notes:", 20, yPosition);
        const notesLines = doc.splitTextToSize(order.notes, 170);
        let notesY = yPosition;
        notesLines.forEach((line: string) => {
          doc.text(line, 50, notesY);
          notesY += 6;
        });
        yPosition = notesY + 10;
      }

      // Footer at bottom
      const footerY = pageHeight - 20;
      doc.setFontSize(10);
      doc.setFont("Poppins", "normal");
      doc.text("Thank you for your business!", pageWidth / 2, footerY, {
        align: "center",
      });

      // Generate blob for upload
      const pdfBlob = doc.output("blob");

      // Sanitize invoice name for file name
      const sanitizedFileName = sanitizeFileName(invoiceName);
      const fileName = `${agentPrefix}/${sanitizedFileName}.pdf`;

      // Upload to storage
      const pdfBase64 = await blobToBase64(pdfBlob);
      const uploadResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/upload-invoice`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: order.id,
            invoiceName,
            agentPrefix,
            customerId: order.customer_id,
            discountPercentage,
            pdfBase64,
          }),
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload invoice");
      }

      const uploadData = await uploadResponse.json();
      if (!uploadData.success) {
        throw new Error("Failed to upload invoice");
      }

      // Refresh data
      await fetchData();

      // Download PDF
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
    if (!whatsappConfig) {
      setError("WhatsApp not configured. Please set up WhatsApp in settings.");
      return;
    }

    setUpdating(invoiceId);

    try {
      const token = getToken();
      if (!token) {
        throw new Error("User not authenticated");
      }

      const userResult = await getUser();
      if (userResult.error || !userResult.data.user) {
        throw new Error("User not authenticated");
      }
      const user = userResult.data.user;

      // Fetch invoice
      const invoiceResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-invoices?id=${invoiceId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!invoiceResponse.ok) {
        throw new Error("Failed to fetch invoice");
      }

      const invoiceData = await invoiceResponse.json();
      if (
        !invoiceData.success ||
        !invoiceData.invoices ||
        invoiceData.invoices.length === 0
      ) {
        throw new Error("Invoice not found");
      }

      const invoice = invoiceData.invoices[0];

      // Fetch order
      const orderResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-orders?id=${
          invoice.order_id
        }`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!orderResponse.ok) {
        throw new Error("Failed to fetch order");
      }

      const orderData = await orderResponse.json();
      if (
        !orderData.success ||
        !orderData.orders ||
        orderData.orders.length === 0
      ) {
        throw new Error("Order not found");
      }

      const order = orderData.orders[0];

      // Fetch customer (include last_user_message_time for 24h window check)
      const customerResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-customers?id=${
          order.customer_id
        }`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!customerResponse.ok) {
        throw new Error("Failed to fetch customer");
      }

      const customerData = await customerResponse.json();
      if (
        !customerData.success ||
        !customerData.customers ||
        customerData.customers.length === 0
      ) {
        throw new Error("Customer not found");
      }

      const customer = customerData.customers[0];

      const phone = customer.phone;
      if (!phone) {
        throw new Error("Customer phone number not found");
      }

      const orderId = invoice.order_id;
      const orderNumber = `#${orderId.toString().padStart(4, "0")}`;

      // Calculate total
      const itemsResponse = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/manage-orders?type=items&order_id=${orderId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!itemsResponse.ok) {
        throw new Error("Failed to fetch order items");
      }

      const itemsDataResult = await itemsResponse.json();
      if (!itemsDataResult.success) {
        throw new Error("Failed to fetch order items");
      }

      const subtotal = (itemsDataResult.items || []).reduce(
        (sum: number, item: any) => sum + (item.total || 0),
        0
      );
      const discount = invoice.discount_percentage || 0;
      const totalAmount = subtotal * (1 - discount / 100);

      // Check if customer is in free form window (24 hours)
      const now = new Date();
      const lastTime = customer.last_user_message_time
        ? new Date(customer.last_user_message_time)
        : new Date(0);
      const hoursSince =
        (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

      // Send invoice using the unified send-invoice-template function
      // This function now handles both template and free form sending automatically

      const response = await fetch(
        "http://localhost:8080/send-invoice-template",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            customer_phone: phone,
            invoice_url: invoice.pdf_url,
            invoice_name: invoice.name,
            order_number: orderNumber,
            total_amount: totalAmount.toString(),
            customer_name: customer.name || "Valued Customer",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          "Failed to send invoice: " + (data.error || "Unknown error")
        );
      }

      // Update status only if generated
      if (invoice.status === "generated") {
        const updateResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-invoices`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: invoiceId,
              status: "sent",
              updated_at: new Date().toISOString(),
            }),
          }
        );

        if (!updateResponse.ok) {
          throw new Error("Failed to update invoice status");
        }

        const updateData = await updateResponse.json();
        if (!updateData.success) {
          throw new Error("Failed to update invoice status");
        }
      }

      // Refresh data
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
      if (!token) {
        throw new Error("User not authenticated");
      }

      const updateResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-invoices`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: invoiceId,
            status: "paid",
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error("Failed to update invoice status");
      }

      const updateData = await updateResponse.json();
      if (!updateData.success) {
        throw new Error("Failed to update invoice status");
      }

      alert("Marked invoice as paid");

      // Refresh data
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
      if (!token) {
        setError("User not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/download-invoice?invoiceId=${
          invoice.id
        }`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

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
      !confirm(
        `Delete invoice "${invoice.name}"? This will remove the PDF from storage and record from database.`
      )
    ) {
      return;
    }

    if (!agentPrefix) {
      setError("Agent configuration missing");
      return;
    }

    setUpdating(invoice.id);

    try {
      const token = getToken();
      if (!token) {
        throw new Error("User not authenticated");
      }

      // Delete from DB (backend handles storage deletion)
      const dbDeleteResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-invoices?id=${invoice.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!dbDeleteResponse.ok) {
        throw new Error("Failed to delete invoice record");
      }

      const dbData = await dbDeleteResponse.json();
      if (!dbData.success) {
        throw new Error("Failed to delete invoice record");
      }

      // Refresh data
      await fetchData();

      alert("Invoice deleted successfully");

      setError(null);
    } catch (err) {
      setError("Failed to delete invoice: " + (err as Error).message);
      console.error("Delete invoice error:", err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          Error: {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none"
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
                placeholder="Search invoices by customer, name, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          <div className="flex gap-4 items-center flex-shrink-0">
            <div className="w-64">
              <select
                value={selectedCustomerFilter?.toString() || ""}
                onChange={(e) =>
                  setSelectedCustomerFilter(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              Create Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "No invoices found" : "No invoices yet"}
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? `No invoices match "${searchTerm}"`
                : "Create your first invoice using the button above"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.customer_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      LKR {invoice.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInvoiceStatusBadgeClass(
                          invoice.status
                        )}`}
                      >
                        {capitalizeFirst(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.generated_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => window.open(invoice.pdf_url, "_blank")}
                          className="px-3 py-1 rounded-md text-xs transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                          type="button"
                        >
                          View
                        </button>
                        <button
                          onClick={() => downloadPDF(invoice)}
                          className="px-3 py-1 rounded-md text-xs transition-colors bg-green-600 hover:bg-green-700 text-white"
                          type="button"
                        >
                          Download
                        </button>
                        {invoice.status !== "paid" && (
                          <button
                            onClick={() => handleSendInvoice(invoice.id)}
                            disabled={updating === invoice.id}
                            className={`px-3 py-1 rounded-md text-xs transition-colors ${
                              updating === invoice.id
                                ? "bg-yellow-400 cursor-not-allowed"
                                : "bg-yellow-600 hover:bg-yellow-700 text-white"
                            }`}
                          >
                            {updating === invoice.id
                              ? "Sending..."
                              : invoice.status === "generated"
                              ? "Send"
                              : "Resend"}
                          </button>
                        )}
                        {(invoice.status === "generated" ||
                          invoice.status === "sent") && (
                          <button
                            onClick={() => handleMarkPaid(invoice.id)}
                            disabled={updating === invoice.id}
                            className={`px-3 py-1 rounded-md text-xs transition-colors ${
                              updating === invoice.id
                                ? "bg-green-400 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 text-white"
                            }`}
                          >
                            {updating === invoice.id
                              ? "Updating..."
                              : "Mark Paid"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteInvoice(invoice)}
                          disabled={updating === invoice.id}
                          className={`px-3 py-1 rounded-md text-xs transition-colors ${
                            updating === invoice.id
                              ? "bg-red-400 cursor-not-allowed"
                              : "bg-red-600 hover:bg-red-700 text-white"
                          }`}
                        >
                          {updating === invoice.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal - Single Window */}
      <Dialog
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomer(null);
          setSelectedOrder(null);
          setInvoiceName("");
          setDiscountPercentage(0);
          setQuery("");
        }}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="max-w-md w-full max-h-[90vh] overflow-y-auto transform rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
            <Dialog.Title
              as="h3"
              className="text-lg font-medium leading-6 text-gray-900 mb-4"
            >
              Create Invoice
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer
                </label>
                <Combobox
                  value={selectedCustomer}
                  onChange={(customer) => {
                    setSelectedCustomer(customer);
                    setSelectedOrder(null);
                    if (customer) {
                      setInvoiceName(`Invoice for ${customer.name}`);
                    } else {
                      setInvoiceName("");
                    }
                  }}
                >
                  <div className="relative mt-1">
                    <Combobox.Input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      displayValue={(customer: Customer) =>
                        customer ? customer.name : ""
                      }
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                      {(() => {
                        const filteredCustomers =
                          query === ""
                            ? customers
                            : customers.filter((c) =>
                                c.name
                                  .toLowerCase()
                                  .includes(query.toLowerCase())
                              );
                        if (filteredCustomers.length === 0) {
                          return (
                            <Combobox.Option
                              value={null}
                              className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900"
                            >
                              {query === ""
                                ? "No customers available."
                                : "No customers found."}
                            </Combobox.Option>
                          );
                        }
                        return filteredCustomers.map((customer) => (
                          <Combobox.Option
                            key={customer.id}
                            className={({ active }) =>
                              `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                active
                                  ? "bg-green-600 text-white"
                                  : "text-gray-900"
                              }`
                            }
                            value={customer}
                          >
                            {({ selected, active }) => (
                              <>
                                <span
                                  className={`block truncate ${
                                    selected ? "font-medium" : "font-normal"
                                  } ${active ? "text-white" : "text-gray-900"}`}
                                >
                                  {customer.name}
                                </span>
                                {selected ? (
                                  <span
                                    className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                                      active ? "text-white" : "text-green-600"
                                    }`}
                                  >
                                    <svg
                                      className="h-5 w-5"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </span>
                                ) : null}
                              </>
                            )}
                          </Combobox.Option>
                        ));
                      })()}
                    </Combobox.Options>
                  </div>
                </Combobox>
              </div>

              {selectedCustomer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Order for {selectedCustomer.name}
                  </label>
                  <select
                    value={selectedOrder?.id || ""}
                    onChange={(e) => {
                      const id = parseInt(e.target.value);
                      const order = customerOrders[selectedCustomer.id]?.find(
                        (o) => o.id === id
                      );
                      setSelectedOrder(order || null);
                      if (order) {
                        setInvoiceName(
                          `Invoice for Order #${order.id
                            .toString()
                            .padStart(4, "0")} - ${selectedCustomer.name}`
                        );
                      } else {
                        setInvoiceName(`Invoice for ${selectedCustomer.name}`);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Choose an order</option>
                    {customerOrders[selectedCustomer.id]?.map((order) => (
                      <option key={order.id} value={order.id}>
                        Order #{order.id.toString().padStart(4, "0")} - LKR{" "}
                        {order.total_amount.toFixed(2)} -{" "}
                        {capitalizeFirst(order.status)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedCustomer && selectedOrder && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Name
                  </label>
                  <input
                    type="text"
                    value={invoiceName}
                    onChange={(e) => setInvoiceName(e.target.value)}
                    placeholder="Enter custom invoice name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              {selectedCustomer && selectedOrder && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={discountPercentage}
                    onChange={(e) =>
                      setDiscountPercentage(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedCustomer(null);
                    setSelectedOrder(null);
                    setInvoiceName("");
                    setDiscountPercentage(0);
                    setQuery("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                {selectedCustomer && selectedOrder && (
                  <button
                    onClick={() =>
                      handleGenerateInvoice(selectedOrder, discountPercentage)
                    }
                    disabled={
                      generating === selectedOrder.id || !invoiceName.trim()
                    }
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                      generating === selectedOrder.id || !invoiceName.trim()
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {generating === selectedOrder.id
                      ? "Generating..."
                      : "Generate Invoice"}
                  </button>
                )}
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default InvoicesPage;

