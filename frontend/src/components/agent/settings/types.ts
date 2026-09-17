export interface AgentProfile {
  id: number;
  name: string;
  whatsapp_number: string;
  address?: string;
  business_email?: string;
  contact_number?: string;
  website?: string;
  invoice_template_path?: string;
  company_overview_path?: string;
  credits?: number;
  ai_balance?: number;
  user_id?: string;
  logged_in_user_id?: string;
  email?: string;
}

export interface UserProfile {
  id: number;
  email: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  is_owner: boolean;
}
