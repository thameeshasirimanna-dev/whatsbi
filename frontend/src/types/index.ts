export interface Agent {
  id: string;
  user_id: string;
  name: string;
  email: string;
  agent_prefix: string;
  role: 'agent' | 'admin';
  business_type: 'product' | 'service';
  webhook_url?: string;
  credits: number;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface Message {
  id: string;
  sender_name: string;
  sender_phone: string;
  message_text: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'unread';
  direction: 'incoming' | 'outgoing';
  created_at: string;
  read_at?: string;
  type?: 'message';
}

export interface OrderItem {
  id: number;
  order_id: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

export interface Order {
   id: number;
   customer_id: number;
   agent_id?: number;
   customer_name?: string;
   customer_phone?: string;
   total_amount: number;
   status:
     | "pending"
     | "processing"
     | "shipped"
     | "completed"
     | "delivered"
     | "cancelled";
   notes?: string;
   order_details?: string;
   shipping_address?: string;
   created_at: string;
   updated_at?: string;
   parsed_order_details?: any;
   type?: "order";
   order_items?: OrderItem[];
 }

export type LeadStage = 'New Lead' | 'Contacted' | 'Not Responding' | 'Follow-up Needed';

export type InterestStage = 'Interested' | 'Quotation Sent' | 'Asked for More Info';

export type ConversionStage = 'Payment Pending' | 'Paid' | 'Order Confirmed';

export interface Customer {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  lead_stage: LeadStage;
  interest_stage?: InterestStage;
  conversion_stage?: ConversionStage;
  type?: 'customer';
}

export interface Message {
  id: string;
  sender_name: string;
  sender_phone: string;
  message_text: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'unread';
  direction: 'incoming' | 'outgoing';
  created_at: string;
  read_at?: string;
  type?: 'message';
}

export interface DashboardStats {
  totalOrders: number;
  totalCustomers: number;
  pendingMessages: number;
}

export interface Appointment {
  id: number;
  customer_id: number;
  title: string;
  appointment_date: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  customer_name?: string;
  customer_phone?: string;
  created_at: string;
  updated_at?: string;
}

export type ActivityItem = Order | Customer | Message | Appointment;
export type TableData = Order[] | Customer[] | Message[] | Appointment[];

export interface Service {
  id: string;
  agent_id: string;
  service_name: string;
  description?: string;
  image_urls?: string[];
  created_at: string;
  updated_at?: string;
  is_active?: boolean;
  deleted_at?: string;
}

export interface Package {
  id: string;
  service_id: string;
  package_name: string;
  price: number;
  currency: string;
  discount?: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ServiceWithPackages extends Service {
  packages: Package[];
}