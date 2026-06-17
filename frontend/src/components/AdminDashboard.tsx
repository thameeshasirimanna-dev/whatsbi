import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, BarChart3, Settings, LogOut,
  Plus, Pencil, Trash2, CheckCircle, Phone, Mail, ShieldCheck, ShieldX,
  Menu, X,
} from 'lucide-react';
import { AddAgentModal } from './AddAgentModal';
import { EditAgentModal } from './EditAgentModal';
import { WhatsAppSetupModal } from './WhatsAppSetupModal';
import { useDialog } from './agent/shared/DialogProvider';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

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
  user_name: string;
  user_email: string;
  is_email_verified: boolean;
  whatsapp_config?: {
    whatsapp_number: string;
    webhook_url: string;
    api_key?: string;
    business_account_id?: string;
    phone_number_id?: string;
    whatsapp_app_secret?: string;
    is_active: boolean;
  } | null;
}

interface Analytics {
  total_agents: number;
  total_messages: number;
}

const getWAStatusStyle = (agent: Agent): React.CSSProperties => {
  if (agent.whatsapp_config?.is_active) return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (agent.whatsapp_config) return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  return { background: 'rgba(113,113,122,0.1)', color: '#71717a' };
};

const getBizTypeStyle = (type: string): React.CSSProperties => {
  if (type === 'product') return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
  return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
};

const AdminDashboard: React.FC = () => {
  const { confirm: dlgConfirm } = useDialog();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedAgentForSetup, setSelectedAgentForSetup] = useState<Agent | null>(null);
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [analytics, setAnalytics] = useState<Analytics>({ total_agents: 0, total_messages: 0 });
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [customUser, setCustomUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) { navigate('/login?error=no-session'); return; }

      try {
        const response = await fetch(`${backendUrl}/get-admin-info`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error('Admin verification failed:', data.message);
          localStorage.removeItem('auth_token');
          navigate('/login?error=unauthorized');
          return;
        }

        setAdminUserId(data.user.id);
        setCustomUser(data.user);
        setAnalytics(data.analytics);
      } catch (err: any) {
        console.error('Admin verification error:', err);
        setError('Database connection error during authentication.');
        localStorage.removeItem('auth_token');
        navigate('/login');
        return;
      }
    };
    checkAdmin();
  }, [navigate]);

  useEffect(() => {
    if (adminUserId) fetchAgents();
  }, [adminUserId]);

  const fetchAgents = async () => {
    if (!adminUserId) {
      setError('Invalid admin authentication - user ID not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) { setError('Please log in to continue'); setAgents([]); return; }

      const response = await fetch(`${backendUrl}/get-agents`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setAgents([]);
        setError(data.message || 'Failed to fetch agents');
        return;
      }

      setAgents(data.agents || []);
      setError(null);
    } catch (err: any) {
      setAgents([]);
      setError(`Failed to load agents: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {};

  const handleEdit = (agent: Agent) => {
    const editData = { agent_name: agent.user_name, email: agent.user_email, business_type: agent.business_type };
    setEditingAgent({ ...agent, ...editData });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!await dlgConfirm('Are you sure you want to delete this agent? This will also delete all associated customer data, messages, and the agent\'s authentication account.', { danger: true })) return;
    if (!adminUserId || !customUser) { setError('User not authenticated'); return; }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) { setError('Please log in to continue'); return; }

      const response = await fetch(`${backendUrl}/delete-agent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: id }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete agent');

      fetchAgents();
      setError(null);
    } catch (err: any) {
      console.error('Delete agent error:', err);
      setError(`Failed to delete agent: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModalClose = () => { setShowAddModal(false); setError(null); };
  const handleEditModalClose = () => { setShowEditModal(false); setEditingAgent(null); setError(null); };
  const handleAgentAdded = () => { setActiveTab('agents'); fetchAgents(); setShowAddModal(false); setEditingAgent(null); setError(null); };
  const handleAgentUpdated = () => { setActiveTab('agents'); fetchAgents(); setShowEditModal(false); setEditingAgent(null); setError(null); };
  const handleWhatsAppSetupSuccess = () => { setActiveTab('whatsapp'); setAgents([]); fetchAgents(); setShowWhatsAppModal(false); setSelectedAgentForSetup(null); setCurrentConfig(null); setError(null); };

  const handleConfirmEmail = async (userId: string) => {
    if (!await dlgConfirm('Are you sure you want to confirm this agent\'s email? This will mark their email as verified.')) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) { setError('Please log in to continue'); return; }

      const response = await fetch(`${backendUrl}/update-user`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, updates: { email_verified: true } }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to confirm email');

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
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No active session');

      const response = await fetch(`${backendUrl}/get-whatsapp-config?user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const responseData = await response.json();

      if (response.ok && responseData.success) {
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
            whatsapp_app_secret: actualConfig.whatsapp_app_secret || '',
            is_active: Boolean(actualConfig.is_active),
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
    const freshConfig = await fetchWhatsAppConfig(agent.user_id);
    setCurrentConfig(freshConfig);
    setShowWhatsAppModal(true);
  };

  const handleWhatsAppConfigure = async (agent: Agent) => {
    setSelectedAgentForSetup(agent);
    const freshConfig = await fetchWhatsAppConfig(agent.user_id);
    setCurrentConfig(freshConfig);
    setShowWhatsAppModal(true);
  };

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'agents', label: 'Agents', Icon: Users },
    { id: 'whatsapp', label: 'WhatsApp Config', Icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
    { id: 'settings', label: 'Settings', Icon: Settings },
  ];

  const thCell: React.CSSProperties = {
    padding: '10px 16px', ...DM, fontSize: 11, fontWeight: 600,
    color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em',
    textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #ebebeb',
  };

  const tdCell: React.CSSProperties = {
    padding: '12px 16px', ...DM, fontSize: 13, color: '#3f3f46',
    borderBottom: '1px solid #f4f4f5',
  };

  const badge: React.CSSProperties = {
    display: 'inline-block', padding: '3px 8px', borderRadius: 20,
    ...DM, fontSize: 11, fontWeight: 600,
  };

  const WhatsAppConfig = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={15} style={{ color: '#22c55e' }} />
            </div>
            <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>Setup New Config</span>
          </div>
          <p style={{ ...DM, fontSize: 12, color: '#71717a', margin: 0 }}>Use the dedicated WhatsApp setup for agents without configuration</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={15} style={{ color: '#22c55e' }} />
            </div>
            <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>Agent Dashboard Integration</span>
          </div>
          <p style={{ ...DM, fontSize: 12, color: '#71717a', margin: 0 }}>Agents can manage their own WhatsApp settings from their dashboard</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb' }}>
          <span style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>Agent WhatsApp Status</span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', ...DM, fontSize: 13, color: '#71717a' }}>Loading…</div>
        ) : agents.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', ...DM, fontSize: 13, color: '#71717a' }}>No agents to display</div>
        ) : (
          <>
            {/* Mobile/Tablet Card Layout */}
            <div className="block lg:hidden">
              <div className="flex flex-col divide-y divide-[#f4f4f5]">
                {agents.map((agent) => (
                  <div key={agent.id} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{agent.user_name}</div>
                        <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>{agent.user_email}</div>
                      </div>
                      <span style={{ ...badge, ...getWAStatusStyle(agent), flexShrink: 0 }}>
                        {agent.whatsapp_config?.is_active ? 'Active' : agent.whatsapp_config ? 'Inactive' : 'Not Set'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', padding: '8px 12px', borderRadius: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>WhatsApp Number</span>
                        <span style={{ ...DM, fontSize: 12, color: '#0c1a0e', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {agent.whatsapp_config?.whatsapp_number || 'Not configured'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0, flex: 1 }}>
                        <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Webhook</span>
                        {agent.whatsapp_config?.webhook_url ? (
                          <a href={agent.whatsapp_config.webhook_url} target="_blank" rel="noopener noreferrer" style={{ ...DM, fontSize: 12, color: '#22c55e', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>View Webhook</a>
                        ) : <span style={{ color: '#a1a1aa', fontSize: 12 }}>—</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                      {agent.whatsapp_config ? (
                        <button onClick={() => handleWhatsAppConfigure(agent)} style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          Configure
                        </button>
                      ) : (
                        <button onClick={() => handleWhatsAppSetup(agent)} style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          Setup
                        </button>
                      )}
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
                    {['Agent', 'WhatsApp Number', 'Status', 'Webhook', 'Actions'].map(h => (
                      <th key={h} style={thCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.id}>
                      <td style={tdCell}>
                        <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{agent.user_name}</div>
                        <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>{agent.user_email}</div>
                      </td>
                      <td style={tdCell}>{agent.whatsapp_config?.whatsapp_number || <span style={{ color: '#a1a1aa' }}>Not configured</span>}</td>
                      <td style={tdCell}>
                        <span style={{ ...badge, ...getWAStatusStyle(agent) }}>
                          {agent.whatsapp_config?.is_active ? 'Active' : agent.whatsapp_config ? 'Inactive' : 'Not Set'}
                        </span>
                      </td>
                      <td style={{ ...tdCell, maxWidth: 180 }}>
                        {agent.whatsapp_config?.webhook_url ? (
                          <a href={agent.whatsapp_config.webhook_url} target="_blank" rel="noopener noreferrer" style={{ ...DM, fontSize: 12, color: '#22c55e', textDecoration: 'none' }}>View Webhook</a>
                        ) : <span style={{ color: '#a1a1aa' }}>—</span>}
                      </td>
                      <td style={tdCell}>
                        {agent.whatsapp_config ? (
                          <button onClick={() => handleWhatsAppConfigure(agent)} style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            Configure
                          </button>
                        ) : (
                          <button onClick={() => handleWhatsAppSetup(agent)} style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            Setup
                          </button>
                        )}
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

  const AnalyticsWidgets = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#fff', borderRadius: 14, padding: '22px 24px', border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={17} style={{ color: '#22c55e' }} />
          </div>
          <span style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#71717a' }}>Total Agents</span>
        </div>
        <div style={{ ...SYNE, fontSize: 36, fontWeight: 800, color: '#0c1a0e', lineHeight: 1, marginBottom: 6 }}>{analytics.total_agents}</div>
        <div style={{ ...DM, fontSize: 12, color: '#a1a1aa' }}>
          {agents.filter(a => a.whatsapp_config?.is_active).length} with active WhatsApp
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ background: '#fff', borderRadius: 14, padding: '22px 24px', border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={17} style={{ color: '#7c3aed' }} />
          </div>
          <span style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#71717a' }}>Total Messages</span>
        </div>
        <div style={{ ...SYNE, fontSize: 36, fontWeight: 800, color: '#0c1a0e', lineHeight: 1, marginBottom: 6 }}>{analytics.total_messages}</div>
        <div style={{ ...DM, fontSize: 12, color: '#a1a1aa' }}>Messages processed via WhatsApp</div>
      </motion.div>
    </div>
  );

  const AgentsTable = () => (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e' }}>Agents Management</span>
        <button
          onClick={() => { setEditingAgent(null); setShowAddModal(true); }}
          disabled={!adminUserId || !customUser}
          style={{ background: (!adminUserId || !customUser) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: (!adminUserId || !customUser) ? 'not-allowed' : 'pointer', boxShadow: (!adminUserId || !customUser) ? 'none' : '0 4px 12px rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} />
          {adminUserId && customUser ? 'Add Agent' : 'Loading…'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', ...DM, fontSize: 13, color: '#71717a' }}>Loading…</div>
      ) : error ? (
        <div style={{ padding: '14px 20px', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.12)', margin: 16, borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e' }}>
          {error}
        </div>
      ) : agents.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Users size={20} style={{ color: '#d4d4d8' }} />
          </div>
          <div style={{ ...SYNE, fontSize: 15, fontWeight: 600, color: '#0c1a0e', marginBottom: 4 }}>No agents found</div>
          <div style={{ ...DM, fontSize: 12, color: '#71717a' }}>Get started by creating your first agent.</div>
        </div>
      ) : (
        <>
          {/* Mobile/Tablet Card Layout */}
          <div className="block lg:hidden">
            <div className="flex flex-col divide-y divide-[#f4f4f5]">
              {agents.map((agent) => (
                <div key={agent.id} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ ...SYNE, fontSize: 11, fontWeight: 700, color: '#fff' }}>{agent.user_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{agent.user_name}</div>
                        <div style={{ ...DM, fontSize: 11, color: '#71717a' }}>{agent.user_email}</div>
                      </div>
                    </div>
                    <span style={{ ...badge, ...getBizTypeStyle(agent.business_type), flexShrink: 0 }}>{agent.business_type}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', padding: '8px 12px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Prefix</span>
                      <span style={{ ...DM, fontSize: 12, color: '#71717a', fontFamily: 'monospace', fontWeight: 500 }}>{agent.agent_prefix}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>WhatsApp</span>
                      <span style={{ ...badge, ...getWAStatusStyle(agent), marginTop: 2 }}>
                        {agent.whatsapp_config ? (agent.whatsapp_config.is_active ? 'Active' : 'Inactive') : 'Not Configured'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Created</span>
                      <span style={{ ...DM, fontSize: 12, color: '#71717a', fontWeight: 500 }}>{new Date(agent.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Email:</span>
                      {agent.is_email_verified ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={13} style={{ color: '#22c55e' }} />
                          <span style={{ ...badge, background: 'rgba(34,197,94,0.1)', color: '#059669' }}>Verified</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ ...badge, background: 'rgba(244,63,94,0.08)', color: '#f43f5e' }}>Unverified</span>
                          <button
                            onClick={() => handleConfirmEmail(agent.user_id)}
                            style={{ ...DM, fontSize: 11, fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#059669', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                          >
                            Confirm
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleEdit(agent)} style={{ display: 'flex', alignItems: 'center', gap: 4, ...DM, fontSize: 12, fontWeight: 600, color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => handleDelete(agent.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, ...DM, fontSize: 12, fontWeight: 600, color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <Trash2 size={12} /> Delete
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
                  {['Agent', 'Email', 'Business', 'Prefix', 'WhatsApp', 'Created', 'Email Status', 'Actions'].map(h => (
                    <th key={h} style={thCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td style={tdCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ ...SYNE, fontSize: 11, fontWeight: 700, color: '#fff' }}>{agent.user_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', whiteSpace: 'nowrap' }}>{agent.user_name}</span>
                      </div>
                    </td>
                    <td style={{ ...tdCell, color: '#71717a' }}>{agent.user_email}</td>
                    <td style={tdCell}>
                      <span style={{ ...badge, ...getBizTypeStyle(agent.business_type) }}>{agent.business_type}</span>
                    </td>
                    <td style={{ ...tdCell, fontFamily: 'monospace', fontSize: 12, color: '#71717a' }}>{agent.agent_prefix}</td>
                    <td style={tdCell}>
                      <span style={{ ...badge, ...getWAStatusStyle(agent) }}>
                        {agent.whatsapp_config ? (agent.whatsapp_config.is_active ? 'Active' : 'Inactive') : 'Not Configured'}
                      </span>
                    </td>
                    <td style={{ ...tdCell, color: '#71717a', whiteSpace: 'nowrap' }}>
                      {new Date(agent.created_at).toLocaleDateString()}
                    </td>
                    <td style={tdCell}>
                      {agent.is_email_verified ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <ShieldCheck size={13} style={{ color: '#22c55e' }} />
                          <span style={{ ...badge, background: 'rgba(34,197,94,0.1)', color: '#059669' }}>Verified</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ ...badge, background: 'rgba(244,63,94,0.08)', color: '#f43f5e' }}>Unverified</span>
                          <button
                            onClick={() => handleConfirmEmail(agent.user_id)}
                            style={{ ...DM, fontSize: 11, fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#059669', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                          >
                            Confirm
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={tdCell}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleEdit(agent)} style={{ display: 'flex', alignItems: 'center', gap: 4, ...DM, fontSize: 12, fontWeight: 600, color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={() => handleDelete(agent.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, ...DM, fontSize: 12, fontWeight: 600, color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <Trash2 size={12} /> Delete
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
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AnalyticsWidgets />
          </div>
        );
      case 'agents':
        return <AgentsTable />;
      case 'whatsapp':
        return <WhatsAppConfig />;
      case 'analytics':
        return <AnalyticsWidgets />;
      case 'settings':
        return (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <span style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e' }}>Settings</span>
          </div>
        );
      default:
        return null;
    }
  };

  const tabLabel = navLinks.find(n => n.id === activeTab)?.label || activeTab;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8faf8', overflow: 'hidden' }}>
      <style>{`@keyframes adm-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static md:inset-auto flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          width: 240,
          background: '#0c1a0e',
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'transform 0.25s ease-out',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageSquare size={15} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#fff' }}>WhatsBi</div>
                <div style={{ ...DM, fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin Panel</div>
              </div>
            </div>
            
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navLinks.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9, border: 'none',
                  background: isActive ? 'rgba(34,197,94,0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #22c55e' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Icon size={15} style={{ color: isActive ? '#4ade80' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                <span style={{ ...DM, fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : 'rgba(255,255,255,0.55)' }}>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {customUser && (
            <div style={{ padding: '8px 12px', marginBottom: 8 }}>
              <div style={{ ...DM, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{customUser.name}</div>
              <div style={{ ...DM, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{customUser.email}</div>
            </div>
          )}
          <button
            onClick={() => { localStorage.removeItem('auth_token'); navigate('/login'); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <LogOut size={15} style={{ color: 'rgba(248,113,113,0.7)' }} />
            <span style={{ ...DM, fontSize: 13, color: 'rgba(248,113,113,0.7)' }}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header
          className="px-4 py-3.5 md:px-6 md:py-4"
          style={{ background: '#fff', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden flex items-center"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 6,
                color: '#71717a',
                borderRadius: 8,
              }}
            >
              <Menu size={20} />
            </button>
            <span style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e' }}>{tabLabel}</span>
          </div>
          {error && (
            <div style={{ padding: '6px 12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 8, ...DM, fontSize: 12, color: '#f43f5e', maxWidth: 400 }}>
              {error}
            </div>
          )}
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {renderContent()}
        </main>
      </div>

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
        initialData={editingAgent ? { agent_name: editingAgent.user_name, email: editingAgent.user_email } : { agent_name: '', email: '' }}
        createdByUserId={adminUserId ?? undefined}
      />

      <WhatsAppSetupModal
        isOpen={showWhatsAppModal}
        onClose={() => { setShowWhatsAppModal(false); setSelectedAgentForSetup(null); setCurrentConfig(null); }}
        onSuccess={handleWhatsAppSetupSuccess}
        selectedAgent={selectedAgentForSetup}
        initialConfig={currentConfig}
      />
    </div>
  );
};

export default AdminDashboard;
