// Agent related functions
import { getToken } from './auth';

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  email: string;
  agent_prefix: string;
  role: "agent" | "admin";
  business_type: "product" | "service";
  webhook_url?: string;
  credits: number;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  invoice_template_path?: string;
}

export const getCurrentAgent = async (): Promise<Agent | null> => {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Failed to get agent profile:', data.message);
      return null;
    }

    return {
      id: data.agent.id,
      user_id: data.agent.user_id,
      name: data.agent.name,
      email: data.agent.email,
      agent_prefix: data.agent.agent_prefix,
      role: data.agent.role,
      business_type: data.agent.business_type,
      webhook_url: data.agent.webhook_url,
      credits: data.agent.credits,
      created_at: data.agent.created_at,
      updated_at: data.agent.updated_at,
      created_by: data.agent.created_by,
      invoice_template_path: data.agent.invoice_template_path,
    };
  } catch (err) {
    console.error('Get current agent error:', err);
    return null;
  }
};