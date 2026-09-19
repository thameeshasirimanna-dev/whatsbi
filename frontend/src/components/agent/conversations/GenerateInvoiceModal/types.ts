import { Order } from "../../../../types/index";

export interface AgentDetails {
  name: string;
  address: string;
  business_email: string;
  contact_number: string;
  website: string;
}

export interface LineItem {
  name: string;
  quantity: number;
  price: number;
}

export interface CustomerOption {
  id: number;
  name: string;
  phone?: string;
}

export interface QuickItem {
  name: string;
  price: number;
}

export interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrderId?: number;
  orders?: Order[];
  customers?: CustomerOption[];
  customerName?: string;
  customerId?: number | null;
  customerPhone?: string | null;
  agentPrefix: string | null;
  agentId: number | null;
  agentDetails: AgentDetails;
  invoiceTemplatePath: string | null;
  editingInvoice?: any;
  onSuccess: () => void;
}
