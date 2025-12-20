import { createClient } from '@supabase/supabase-js';
import { Agent } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Utility function to get dynamic table name based on agent prefix
export const getAgentTableName = (agentPrefix: string, tableName: string) => {
  return `${agentPrefix}_${tableName}`;
};

// Function to get current logged-in agent with user details
export const getCurrentAgent = async (): Promise<Agent | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null;
    }

    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        *,
        users (
          name,
          email
        )
      `)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      return null;
    }

    // Combine agent data with user details
    const agentWithUser = {
      ...agent,
      name: agent.users?.name || 'Unknown Agent',
      email: agent.users?.email || 'No email',
      users: undefined, // Remove the nested users object
      credits: agent.credits || 0
    };

    return agentWithUser as Agent;
  } catch (error) {
    return null;
  }
};

// Custom hook for agent-specific queries
export const useAgentData = (agentPrefix: string, tableName: string) => {
  const query = supabase
    .from(getAgentTableName(agentPrefix, tableName))
    .select('*')
    .order('created_at', { ascending: false });

  return query;
};

// Error handler utility
export const handleSupabaseError = (error: any, defaultMessage: string = 'An error occurred') => {
  const message = error.message || defaultMessage;
  return message;
};

// Service Management Helpers

// Manage services - single endpoint for all operations
export const manageServices = async (
  operation: "create" | "get" | "update" | "delete",
  data: any
) => {
  try {
    // Ensure fresh session/token before invoke to handle potential expiration
    const {
      data: { session },
      error: refreshError,
    } = await supabase.auth.refreshSession();
    if (refreshError) {
      // Fallback to current session
      await supabase.auth.getSession();
    } else {
    }

    // DEBUG: Log session state after refresh
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    const expiresAt = currentSession?.expires_at
      ? new Date(currentSession.expires_at * 1000).toISOString()
      : "N/A";
    const tokenPreview = currentSession?.access_token
      ? `${currentSession.access_token.substring(0, 20)}...`
      : "MISSING";

    // Check if token is expired after refresh; if so, sign out to force re-login
    if (
      currentSession &&
      currentSession.expires_at &&
      currentSession.expires_at * 1000 < Date.now()
    ) {
      await supabase.auth.signOut();
      throw new Error("Session expired. Please log in again to continue.");
    }

    const response = await fetch("http://localhost:8080/manage-services", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ operation, ...data }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result };
    }

    return { data: result.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: handleSupabaseError(error, "Failed to manage service"),
    };
  }
};

// Upload service images
export const uploadServiceImages = async (
  agentId: string,
  serviceId: string,
  images: Array<{
    fileName: string;
    fileBase64: string;
    fileType: string;
  }>
) => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("No active session");
    }

    const fetchResponse = await fetch(
      "http://localhost:8080/upload-service-images",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ agentId, serviceId, images }),
      }
    );

    const result = await fetchResponse.json();

    if (!fetchResponse.ok) {
      return { data: null, error: result };
    }

    return { data: result, error: null };
  } catch (error) {
    return {
      data: null,
      error: handleSupabaseError(error, "Failed to upload images"),
    };
  }
};

// Create a new service with packages
export const createService = async (data: {
  service_name: string;
  description?: string;
  images?: Array<{
    fileName: string;
    fileBase64: string;
    fileType: string;
  }>;
  packages: Array<{
    package_name: string;
    price: number;
    currency?: string;
    discount?: number;
    description?: string;
  }>;
}) => {
  return manageServices('create', data);
};

// Get services with nested packages
export const getServices = async (filters?: {
  service_name?: string;
  package_name?: string;
  sort_by?: 'price' | 'created_at';
  sort_order?: 'asc' | 'desc';
}) => {
  return manageServices('get', filters || {});
};

// Update service or package
export const updateService = async (
  type: 'service' | 'package',
  id: string,
  updates: any
) => {
  // Extract removed_image_urls from updates for service updates
  let removed_image_urls: string[] | undefined;
  if (type === 'service' && updates.image_urls?.remove) {
    removed_image_urls = updates.image_urls.remove;
    // Remove from updates since backend expects it separately
    delete updates.image_urls.remove;
    // If image_urls is now empty, remove it
    if (Object.keys(updates.image_urls).length === 0) {
      delete updates.image_urls;
    }
  }

  return manageServices('update', { type, id, updates, removed_image_urls });
};

// Delete service (permanent delete only)
export const deleteService = async (id: string) => {
  return manageServices('delete', { id, hard_delete: true });
};