import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Assuming React Router is set up
import { AddAgentModal } from './AddAgentModal';
import { EditAgentModal } from './EditAgentModal';
import { WhatsAppSetupModal } from './WhatsAppSetupModal';

// Supabase client with service key (same as AdminLoginPage)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types - Updated for new structure
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
  created_at: string;
}

interface Agent {
  id: string;
  user_id: string;
  created_by: string;
  agent_prefix: string;
  business_type: 'product' | 'service';
  created_at: string;
  user_name: string; // Name from users table
  user_email: string; // Email from users table
  is_email_verified: boolean; // Email verification status from users table
  whatsapp_config?: {
    whatsapp_number: string;
    webhook_url: string;
    api_key?: string;
    business_account_id?: string;
    phone_number_id?: string;
    is_active: boolean;
  } | null;
}

interface Analytics {
  total_agents: number;
  total_messages: number;
}

// Main AdminDashboard component
const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedAgentForSetup, setSelectedAgentForSetup] = useState<Agent | null>(null);
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [analytics, setAnalytics] = useState<Analytics>({
    total_agents: 0,
    total_messages: 0,
  });
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [customUser, setCustomUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login?error=no-session');
        return;
      }
      
      setCurrentUser(session.user);
      
      // Verify admin role using the exact same simple query as AdminLoginPage
      const { data: roleData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('email', session.user.email)
        .single();
      
      if (roleError || !roleData || roleData.role !== 'admin') {
        console.error('Admin role verification failed:', roleError);
        await supabase.auth.signOut();
        navigate('/login?error=unauthorized');
        return;
      }
      
      // Now get the user ID for agent creation (query by email)
      let userData = null;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('email', session.user.email)
          .single();
        
        if (error) {
          console.error('User ID query failed:', error);
          setError('Failed to retrieve admin user ID. Please check your account setup.');
          await supabase.auth.signOut();
          navigate('/login?error=user-not-found');
          return;
        }
        
        userData = data;
      } catch (err) {
        console.error('Unexpected error getting user ID:', err);
        setError('Database connection error during authentication.');
        await supabase.auth.signOut();
        navigate('/login');
        return;
      }
      
      if (!userData) {
        console.error('No user data found:', userData);
        setError('Admin user not found in database. Please check your account setup.');
        await supabase.auth.signOut();
        navigate('/login?error=admin-not-found');
        return;
      }
        
      // Store the admin's UUID users table ID for agent creation
      setAdminUserId(userData.id);
      // Create minimal User object for TypeScript compliance
      setCustomUser({
        id: userData.id,
        name: session.user.email || 'Admin',
        email: session.user.email || '',
        role: 'admin',
        created_at: new Date().toISOString()
      });
    };
    checkAdmin();
  }, [navigate]);

  // Fetch agents - Updated to join with users and fetch WhatsApp config separately
  useEffect(() => {
    if (currentUser && adminUserId) {
      fetchAgents();
      fetchAnalytics();
    }
  }, [currentUser, adminUserId]);

  const fetchAgents = async () => {
    if (!currentUser || !adminUserId) {
      setError('Invalid admin authentication - user ID not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Check table row count first
      const { count: totalCount, error: countError } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        setAgents([]);
        setError(`Database access issue: ${countError.message}`);
        return;
      }
      
      if (totalCount === 0) {
        setAgents([]);
        return;
      }
      
      // Fetch agent data with user join (no WhatsApp fields in agents table)
      const { data: agentsData, error: fetchError } = await supabase
        .from('agents')
        .select(`
          *,
          users!user_id (id, name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        setAgents([]);
        setError(`Failed to fetch agents: ${fetchError.message}`);
        return;
      }
      
      if (agentsData && agentsData.length > 0) {
        // Transform data and fetch WhatsApp config for each agent
        const agentsWithConfig = await Promise.all(
          agentsData.map(async (agent) => {
            const safeAgent = {
              id: agent.id.toString(),
              user_id: agent.user_id,
              created_by: agent.created_by || adminUserId,
              agent_prefix: agent.agent_prefix || '',
              business_type: agent.business_type || 'product',
              created_at: agent.created_at || new Date().toISOString(),
              user_name: agent.users?.name || 'Unnamed Agent',
              user_email: agent.users?.email || '',
            };

            // Fetch WhatsApp config separately - always fresh data
            let whatsappConfig = null;
            try {
              const { data: responseData, error: fetchError } = await supabase.functions.invoke('get-whatsapp-config', {
                body: { user_id: agent.user_id }
              });
              
              if (fetchError) {
                whatsappConfig = null;
              } else if (responseData) {
                // RPC returns array with {config: row_to_json(...)} structure
                const configArray = responseData.whatsapp_config;
                let actualConfig = null;
                
                if (Array.isArray(configArray) && configArray.length > 0) {
                  const configItem = configArray[0];
                  actualConfig = configItem.config || configItem;
                } else if (configArray && typeof configArray === 'object') {
                  actualConfig = configArray.config || configArray;
                }
                
                if (actualConfig && typeof actualConfig === 'object') {
                  whatsappConfig = {
                    whatsapp_number: actualConfig.whatsapp_number || '',
                    webhook_url: actualConfig.webhook_url || '',
                    api_key: actualConfig.api_key || undefined,
                    business_account_id: actualConfig.business_account_id || undefined,
                    phone_number_id: actualConfig.phone_number_id || undefined,
                    is_active: Boolean(actualConfig.is_active)
                  };
                } else {
                  whatsappConfig = null;
                }
              } else {
                whatsappConfig = null;
              }
            } catch (configError) {
              whatsappConfig = null;
            }

            // Fetch email verification status from auth.users
            let isEmailVerified = false;
            try {
              const { data: authUser } = await supabase.auth.admin.getUserById(agent.user_id);
              isEmailVerified = authUser?.user?.email_confirmed_at !== null;
            } catch (authError) {
              console.warn('Failed to fetch auth user email status:', authError);
              isEmailVerified = false;
            }

            return {
              ...safeAgent,
              is_email_verified: isEmailVerified,
              whatsapp_config: whatsappConfig
            };
          })
        );
        
        setAgents(agentsWithConfig);
      } else {
        setAgents([]);
      }
      
      setError(null);
      
    } catch (err: any) {
      setAgents([]);
      setError(`Failed to load agents: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!currentUser || !adminUserId) {
      setAnalytics({ total_agents: 0, total_messages: 0 });
      return;
    }

    try {
      // Total agents count
      const { count: total, error: totalError } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true });
      if (totalError) {
        throw totalError;
      }

      // Total messages placeholder (expand with actual messages table)
      const totalMessages = 0;

      setAnalytics({
        total_agents: total || 0,
        total_messages: totalMessages,
      });
      
    } catch (err: any) {
      setAnalytics({ total_agents: 0, total_messages: 0 });
    }
  };

  // Modal handles its own submission - this is now unused but kept for potential edit functionality
  const handleSubmit = async () => {
    // Modal is now self-contained for agent creation
  };

  const handleEdit = (agent: Agent) => {
    // Prepare editing data with only basic agent fields (no WhatsApp)
    const editData = {
      agent_name: agent.user_name,
      email: agent.user_email,
      business_type: agent.business_type,
    };
    setEditingAgent({ ...agent, ...editData });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent? This will also delete all associated customer data, messages, and the agent\'s authentication account.')) return;
    
    if (!adminUserId || !customUser) {
      setError('User not authenticated');
      return;
    }
    
    try {
      setLoading(true);
      // Call the delete-agent Edge Function
      const { data, error } = await supabase.functions.invoke('delete-agent', {
        body: { agent_id: id }
      });
      
      if (error) {
        throw new Error(`Failed to delete agent: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete agent');
      }
      
      fetchAgents();
      fetchAnalytics();
      setError(null);
    } catch (err: any) {
      console.error('Delete agent error:', err);
      setError(`Failed to delete agent: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp Config section - Now shows per-agent config status
  const WhatsAppConfig = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">WhatsApp Configuration Management</h2>
        <p className="text-gray-600 mb-4">
          Configure WhatsApp integration for individual agents. Each agent can have their own WhatsApp Business API setup.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Setup New Config</h3>
            <p className="text-sm text-blue-800">Use the dedicated WhatsApp setup for agents without configuration</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Agent Dashboard Integration</h3>
            <p className="text-sm text-green-800">Agents can manage their own WhatsApp settings from their dashboard</p>
          </div>
        </div>
      </div>

      {/* Agent WhatsApp Status Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Agent WhatsApp Status</h3>
        </div>
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No agents to display</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Webhook</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{agent.user_name}</div>
                        <div className="text-sm text-gray-500">{agent.user_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.whatsapp_config?.whatsapp_number || 'Not configured'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        agent.whatsapp_config?.is_active
                          ? 'bg-green-100 text-green-800'
                          : agent.whatsapp_config
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agent.whatsapp_config?.is_active ? 'Active' : agent.whatsapp_config ? 'Inactive' : 'Not Set'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                      {agent.whatsapp_config?.webhook_url ? (
                        <a href={agent.whatsapp_config.webhook_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View Webhook
                        </a>
                      ) : 'Not configured'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {agent.whatsapp_config ? (
                        <button
                          onClick={() => handleWhatsAppConfigure(agent)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Configure
                        </button>
                      ) : (
                        <button
                          onClick={() => handleWhatsAppSetup(agent)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Setup WhatsApp
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // Analytics Widgets
  const AnalyticsWidgets = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-lg shadow-md"
      >
        <h3 className="text-lg font-semibold text-gray-700">Total Agents</h3>
        <p className="text-3xl font-bold text-blue-600">{analytics.total_agents}</p>
        <p className="text-sm text-gray-500 mt-1">
          {agents.filter(a => a.whatsapp_config?.is_active).length} with active WhatsApp
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-lg shadow-md"
      >
        <h3 className="text-lg font-semibold text-gray-700">Total Messages</h3>
        <p className="text-3xl font-bold text-purple-600">{analytics.total_messages}</p>
        <p className="text-sm text-gray-500 mt-1">Messages processed via WhatsApp</p>
      </motion.div>
    </div>
  );

  // Agents Table - Updated for new structure
  const AgentsTable = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b">
        <h2 className="text-2xl font-bold">Agents Management</h2>
        <button
          onClick={() => {
            setEditingAgent(null);
            setShowAddModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={!adminUserId || !customUser}
        >
          {adminUserId && customUser ? 'Add Agent' : 'Loading Admin...'}
        </button>
      </div>
      {loading ? (
        <div className="p-6 text-center">Loading...</div>
      ) : error ? (
        <div className="p-6 text-red-500">Error: {error}</div>
      ) : agents.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p className="text-lg">No agents found</p>
          <p className="mt-2">Get started by creating your first agent.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prefix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{agent.user_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.user_email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      agent.business_type === 'product'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {agent.business_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">{agent.agent_prefix}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      agent.whatsapp_config?.is_active
                        ? 'bg-green-100 text-green-800'
                        : agent.whatsapp_config
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agent.whatsapp_config ? (
                        agent.whatsapp_config.is_active ? 'Active' : 'Inactive'
                      ) : 'Not Configured'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(agent.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {agent.is_email_verified ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                        Verified
                      </span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                          Unverified
                        </span>
                        <button
                          onClick={() => handleConfirmEmail(agent.user_id)}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(agent)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Modal close handler - resets state
  const handleAddModalClose = () => {
    setShowAddModal(false);
    setError(null);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingAgent(null);
    setError(null);
  };

  const handleAgentAdded = () => {
    setActiveTab('agents');
    fetchAgents();
    fetchAnalytics();
    setShowAddModal(false);
    setEditingAgent(null);
    setError(null);
  };

  const handleAgentUpdated = () => {
    setActiveTab('agents');
    fetchAgents();
    fetchAnalytics();
    setShowEditModal(false);
    setEditingAgent(null);
    setError(null);
  };

  const handleWhatsAppSetupSuccess = () => {
    setActiveTab('whatsapp');
    // Clear agents cache to force refetch of WhatsApp configs
    setAgents([]);
    fetchAgents();
    fetchAnalytics();
    setShowWhatsAppModal(false);
    setSelectedAgentForSetup(null);
    setCurrentConfig(null);
    setError(null);
  };

  const handleConfirmEmail = async (userId: string) => {
    if (!confirm('Are you sure you want to confirm this agent\'s email? This will mark their email as verified.')) {
      return;
    }

    try {
      setLoading(true);
      // Update email confirmation in auth.users using admin API
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true
      });

      if (authError) {
        throw new Error(`Failed to confirm email: ${authError.message}`);
      }

      // Refresh agents list
      await fetchAgents();
      setError(null);
    } catch (err: any) {
      console.error('Email confirmation error:', err);
      setError(`Failed to confirm email: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppConfig = async (userId: string) => {
    if (!userId) return null;
    
    try {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke('get-whatsapp-config', {
        body: { user_id: userId }
      });
      
      if (fetchError) {
        console.warn('Failed to fetch WhatsApp config:', fetchError);
        return null;
      }
      
      if (responseData && responseData.success) {
        // Edge function returns full config object, map to expected interface
        const configArray = responseData.whatsapp_config;
        let actualConfig = null;
        
        if (Array.isArray(configArray) && configArray.length > 0) {
          const configItem = configArray[0];
          actualConfig = configItem.config || configItem;
        } else if (configArray && typeof configArray === 'object') {
          actualConfig = configArray.config || configArray;
        }
        
        if (actualConfig && typeof actualConfig === 'object') {
          return {
            whatsapp_number: actualConfig.whatsapp_number || '',
            webhook_url: actualConfig.webhook_url || '',
            api_key: actualConfig.api_key || '',
            business_account_id: actualConfig.business_account_id || '',
            phone_number_id: actualConfig.phone_number_id || '',
            is_active: Boolean(actualConfig.is_active)
          };
        }
        return null;
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching WhatsApp config:', err);
      return null;
    }
  };

  const handleWhatsAppSetup = async (agent: Agent) => {
    setSelectedAgentForSetup(agent);
    
    // Always fetch fresh config data to ensure we have the latest
    const freshConfig = await fetchWhatsAppConfig(agent.user_id);
    setCurrentConfig(freshConfig);
    
    setShowWhatsAppModal(true);
  };

  const handleWhatsAppConfigure = async (agent: Agent) => {
    setSelectedAgentForSetup(agent);
    // Fetch fresh config to ensure we have complete data for editing
    const freshConfig = await fetchWhatsAppConfig(agent.user_id);
    setCurrentConfig(freshConfig);
    setShowWhatsAppModal(true);
  };

  // Navigation links
  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'agents', label: 'Agents' },
    { id: 'whatsapp', label: 'WhatsApp Config' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Logout', onClick: () => supabase.auth.signOut().then(() => navigate('/login')) },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div>
            <AnalyticsWidgets />
            {/* Add more dashboard widgets here */}
          </div>
        );
      case 'agents':
        return <AgentsTable />;
      case 'whatsapp':
        return <WhatsAppConfig />;
      case 'analytics':
        return <AnalyticsWidgets />; // Expand with charts
      case 'settings':
        return <div className="p-6"><h2 className="text-2xl font-bold">Settings</h2></div>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 bg-white shadow-lg flex flex-col"
      >
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">WhatsApp CRM Admin</h1>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => link.onClick ? link.onClick() : setActiveTab(link.id)}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === link.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {/* Add icons here if needed */}
              <span className="ml-3">{link.label}</span>
            </button>
          ))}
        </nav>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold text-gray-900 capitalize">{activeTab}</h2>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4">
          {renderContent()}
        </main>
      </div>

      {/* Mobile menu button - expand for full responsive */}
      <button className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-md shadow-lg">
        Menu
      </button>

      <AddAgentModal
        isOpen={showAddModal}
        onClose={handleAddModalClose}
        onSuccess={handleAgentAdded}
        createdByUserId={adminUserId ?? undefined}
      />

      <EditAgentModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        onSuccess={handleAgentUpdated}
        agentId={editingAgent?.id || ''}
        initialData={editingAgent ? {
          agent_name: editingAgent.user_name,
          email: editingAgent.user_email,
        } : {
          agent_name: '',
          email: '',
        }}
        createdByUserId={adminUserId ?? undefined}
      />

      <WhatsAppSetupModal
        isOpen={showWhatsAppModal}
        onClose={() => {
          setShowWhatsAppModal(false);
          setSelectedAgentForSetup(null);
          setCurrentConfig(null);
        }}
        onSuccess={handleWhatsAppSetupSuccess}
        selectedAgent={selectedAgentForSetup}
        initialConfig={currentConfig}
      />
    </div>
  );
};

export default AdminDashboard;