import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, AlertTriangle } from 'lucide-react';
import { AddAgentModal } from './AddAgentModal';
import { EditAgentModal } from './EditAgentModal';
import { WhatsAppSetupModal } from './WhatsAppSetupModal';
import { useDialog } from './agent/shared/DialogProvider';
import {
  User,
  Agent,
  Analytics,
  AdminSidebar,
  AnalyticsWidgets,
  WhatsAppConfigTab,
  AgentsTable,
  TopUpCreditsModal,
  TopUpsTab,
  AdminSettingsTab,
  AdminAnalyticsView,
} from './admin';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const AdminDashboard: React.FC = () => {
  const { confirm: dlgConfirm } = useDialog();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    return saved !== null ? saved === 'true' : true;
  });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleCollapseToggle = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedAgentForSetup, setSelectedAgentForSetup] = useState<Agent | null>(null);
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  // Super Admin Top Up Modal state
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedAgentForTopUp, setSelectedAgentForTopUp] = useState<Agent | null>(null);

  const [analytics, setAnalytics] = useState<Analytics>({ total_agents: 0, total_messages: 0 });
  const navigate = useNavigate();
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [customUser, setCustomUser] = useState<User | null>(null);
  const [maintenanceActive, setMaintenanceActive] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login?error=no-session');
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/get-admin-info`, {
          headers: { Authorization: `Bearer ${token}` },
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

        // Fetch maintenance status
        fetch(`${backendUrl}/maintenance-status`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success) setMaintenanceActive(Boolean(d.maintenance_mode));
          })
          .catch(() => {});
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
      if (!token) {
        setError('Please log in to continue');
        setAgents([]);
        return;
      }

      const response = await fetch(`${backendUrl}/get-agents`, {
        headers: { Authorization: `Bearer ${token}` },
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

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await dlgConfirm("Are you sure you want to delete this agent? This will also delete all associated customer data, messages, and account.", { danger: true }))) return;
    if (!adminUserId || !customUser) return setError('User not authenticated');

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return setError('Please log in to continue');

      const res = await fetch(`${backendUrl}/delete-agent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete agent');
      fetchAgents();
      setError(null);
    } catch (err: any) {
      setError(`Failed to delete agent: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmail = async (userId: string) => {
    if (!(await dlgConfirm("Are you sure you want to confirm this agent's email? This will mark their email as verified."))) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return setError('Please log in to continue');

      const res = await fetch(`${backendUrl}/update-user`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, updates: { email_verified: true } }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to confirm email');
      await fetchAgents();
      setError(null);
    } catch (err: any) {
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
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseData = await response.json();

      if (response.ok && responseData.success) {
        const raw = responseData.whatsapp_config;
        const actualConfig = Array.isArray(raw) && raw.length > 0 ? (raw[0].config || raw[0]) : (raw?.config || raw);

        if (actualConfig && typeof actualConfig === 'object') {
          return {
            whatsapp_number: actualConfig.whatsapp_number || '',
            webhook_url: actualConfig.webhook_url || '',
            api_key: actualConfig.api_key || '',
            business_account_id: actualConfig.business_account_id || '',
            phone_number_id: actualConfig.phone_number_id || '',
            whatsapp_app_secret: actualConfig.whatsapp_app_secret || '',
            deepseek_api_key: actualConfig.deepseek_api_key || '',
            is_active: Boolean(actualConfig.is_active),
          };
        }
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

  const handleTopUp = (agent: Agent) => {
    setSelectedAgentForTopUp(agent);
    setShowTopUpModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingAgent(null);
    setError(null);
  };

  const handleAgentSaved = () => {
    setActiveTab('agents');
    fetchAgents();
    handleModalClose();
  };

  const handleWhatsAppSetupSuccess = () => {
    setActiveTab('whatsapp');
    setAgents([]);
    fetchAgents();
    setShowWhatsAppModal(false);
    setSelectedAgentForSetup(null);
    setCurrentConfig(null);
    setError(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <AnalyticsWidgets
            analytics={analytics}
            activeWhatsAppCount={agents.filter((a) => a.whatsapp_config?.is_active).length}
            agents={agents}
            userName={customUser?.name}
            onNavigate={(tab) => setActiveTab(tab)}
            onAddAgent={() => {
              setEditingAgent(null);
              setShowAddModal(true);
            }}
            onTopUp={(agent) => handleTopUp(agent)}
            onConfigureWhatsApp={handleWhatsAppSetup}
            onEditAgent={handleEdit}
            onRefresh={fetchAgents}
          />
        );
      case 'agents':
        return (
          <AgentsTable
            loading={loading}
            error={error}
            agents={agents}
            adminUserId={adminUserId}
            customUser={customUser}
            onAddAgent={() => {
              setEditingAgent(null);
              setShowAddModal(true);
            }}
            onEditAgent={handleEdit}
            onDeleteAgent={handleDelete}
            onConfirmEmail={handleConfirmEmail}
            onTopUp={handleTopUp}
            onConfigureWhatsApp={handleWhatsAppSetup}
          />
        );
      case 'topups':
        return (
          <TopUpsTab
            loading={loading}
            error={error}
            agents={agents}
            onTopUp={handleTopUp}
          />
        );
      case 'whatsapp':
        return (
          <WhatsAppConfigTab
            loading={loading}
            agents={agents}
            onConfigure={handleWhatsAppSetup}
            onSetup={handleWhatsAppSetup}
          />
        );
      case 'analytics':
        return (
          <AdminAnalyticsView
            agents={agents}
            analytics={analytics}
            onNavigate={(tab) => setActiveTab(tab)}
            onTopUp={(agent) => handleTopUp(agent)}
          />
        );
      case 'settings':
        return (
          <AdminSettingsTab
            onMaintenanceStatusChange={(active) => setMaintenanceActive(active)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#F4F7F4] text-[#16281D] overflow-hidden font-sans">
      <style>{`@keyframes adm-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Extracted Admin Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={sidebarCollapsed}
        onCollapseToggle={handleCollapseToggle}
        customUser={customUser}
        onLogout={handleLogout}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header Bar */}
        <div className="md:hidden h-14 bg-white border-b border-[#EAEAEA] px-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA] transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo/icon-logo.svg" alt="Biz Agentz" className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0" />
              <span className="text-sm font-bold text-[#16281D] tracking-tight">
                Biz Agentz
              </span>
              <span className="text-[10px] font-bold text-[#059669] bg-[#E8F8EE] px-2 py-0.5 rounded-full">
                Super Admin
              </span>
            </div>
          </div>
          {customUser && (
            <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center text-xs font-bold shrink-0">
              {customUser.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Maintenance Mode Alert Banner */}
        {maintenanceActive && (
          <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-[#D97706]" />
              <span className="text-xs md:text-sm font-semibold text-[#78350F]">
                MAINTENANCE MODE IS ACTIVE — Regular agents and public users are currently blocked.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="bg-[#D97706] hover:bg-[#B45309] text-white border-0 rounded-full px-3.5 py-1 text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              Manage Settings
            </button>
          </div>
        )}

        <main key={activeTab} className="animate-fade-in flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-7">
          <div className="w-full flex flex-col gap-6">
            {error && (
              <div className="px-4 py-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl text-xs md:text-sm font-medium text-[#E11D48] flex justify-between items-center shadow-xs">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="bg-transparent border-0 cursor-pointer text-[#E11D48] hover:opacity-80 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>

      <AddAgentModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        onSuccess={handleAgentSaved}
        createdByUserId={adminUserId ?? undefined}
      />

      <EditAgentModal
        isOpen={showEditModal}
        onClose={handleModalClose}
        onSuccess={handleAgentSaved}
        agentId={editingAgent?.id || ''}
        initialData={
          editingAgent
            ? { agent_name: editingAgent.user_name, email: editingAgent.user_email }
            : { agent_name: '', email: '' }
        }
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

      {/* Super Admin Top Up Modal */}
      <TopUpCreditsModal
        isOpen={showTopUpModal}
        onClose={() => {
          setShowTopUpModal(false);
          setSelectedAgentForTopUp(null);
        }}
        agent={selectedAgentForTopUp}
        onSuccess={fetchAgents}
      />
    </div>
  );
};

export default AdminDashboard;
