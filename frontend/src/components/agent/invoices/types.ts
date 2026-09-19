export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: number;
  name: string;
  pdf_url: string;
  status: "generated" | "sent" | "paid" | "partially_paid";
  generated_at: string;
  order_id?: number | null;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
}

export interface OrderForModal {
  id: number;
  customer_id?: number;
  total_amount: number;
  advance_amount?: number;
  payment_status?: string;
  status: string;
  notes?: string;
  created_at: string;
  customer_name: string;
  type?: string;
}

export interface InvoiceWithDetails extends Invoice {
  customer_name: string;
  customer_phone?: string;
  order_number?: string | null;
  invoice_number?: string | null;
  total: number;
  total_amount?: number;
  advance_amount?: number;
  discount_percentage?: number;
  customer_id?: number;
  notes?: string;
  linked_order_id?: number | null;
}

export interface AgentDetails {
  name: string;
  address: string;
  business_email: string;
  contact_number: string;
  website: string;
}

export interface WhatsAppConfig {
  phone_number_id: string;
  api_key: string;
}
