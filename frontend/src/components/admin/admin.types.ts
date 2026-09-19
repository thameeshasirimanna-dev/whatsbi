export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
  created_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  created_by: string;
  agent_prefix: string;
  business_type: 'product' | 'service';
  created_at: string;
  user_name: string;
  user_email: string;
  is_email_verified: boolean;
  credits?: number;
  sms_credits?: number;
  ai_balance?: number;
  last_login_at?: string | null;
  total_customers?: number;
  total_conversations?: number;
  total_messages?: number;
  total_orders?: number;
  whatsapp_config?: {
    whatsapp_number: string;
    webhook_url?: string;
    api_key?: string;
    business_account_id?: string;
    phone_number_id?: string;
    whatsapp_app_secret?: string;
    deepseek_api_key?: string;
    sms_sender_id?: string;
    sms_api_token?: string;
    is_active: boolean;
  } | null;
}

export interface Analytics {
  total_agents: number;
  total_messages: number;
}
