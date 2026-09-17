import React, { useState, useMemo } from 'react';
import { Plus, Users, Search, AlertCircle, Zap, ShieldCheck, X } from 'lucide-react';
import { Agent, User } from './admin.types';
import { AgentsMobileList } from './AgentsMobileList';
import { AgentsDesktopTable } from './AgentsDesktopTable';
import { AgentDetailsModal } from './AgentDetailsModal';

interface AgentsTableProps {
  loading: boolean;
  error: string | null;
  agents: Agent[];
  adminUserId: string | null;
  customUser: User | null;
  onAddAgent: () => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onConfirmEmail: (userId: string) => void;
  onTopUp?: (agent: Agent) => void;
  onConfigureWhatsApp?: (agent: Agent) => void;
}

type FilterTab = 'all' | 'active_wa' | 'inactive_wa' | 'verified' | 'unverified';

export const AgentsTable: React.FC<AgentsTableProps> = ({
  loading,
  error,
  agents,
  adminUserId,
  customUser,
  onAddAgent,
  onEditAgent,
  onDeleteAgent,
  onConfirmEmail,
  onTopUp,
  onConfigureWhatsApp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);

  const activeWaCount = useMemo(
    () => agents.filter((a) => a.whatsapp_config?.is_active).length,
    [agents]
  );
  const inactiveWaCount = agents.length - activeWaCount;

  const verifiedCount = useMemo(
    () => agents.filter((a) => a.is_email_verified).length,
    [agents]
  );
  const unverifiedCount = agents.length - verifiedCount;

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = a.user_name.toLowerCase().includes(q);
        const matchEmail = a.user_email.toLowerCase().includes(q);
        const matchPrefix = a.agent_prefix.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPrefix) return false;
      }
      if (filterTab === 'active_wa') return Boolean(a.whatsapp_config?.is_active);
      if (filterTab === 'inactive_wa') return !a.whatsapp_config?.is_active;
      if (filterTab === 'verified') return a.is_email_verified;
      if (filterTab === 'unverified') return !a.is_email_verified;
      return true;
    });
  }, [agents, searchQuery, filterTab]);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Page Title & Actions Header (No dark banner on table pages) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0">
              <Users size={16} strokeWidth={2.4} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#16281D] m-0 tracking-tight leading-tight">
              Agents Management
            </h1>
          </div>
          <p className="text-xs sm:text-[13px] text-[#71717A] m-0 font-medium">
            Registered tenant accounts, system prefixes, WhatsApp bindings, and credentials.
          </p>
        </div>

        <button
          onClick={onAddAgent}
          disabled={!adminUserId || !customUser}
          className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-5 rounded-full text-xs font-bold transition-all border-0 self-start sm:self-auto ${
            !adminUserId || !customUser
              ? 'bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed'
              : 'bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer'
          }`}
        >
          <Plus size={15} strokeWidth={2.6} />
          <span>{adminUserId && customUser ? 'Register New Agent' : 'Loading…'}</span>
        </button>
      </div>

      {/* Summary KPI Cards Grid (2 Columns on Mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-5 md:p-6 border border-[#EAEAEA] shadow-sm hover:border-[#9FE870] transition-all flex flex-col justify-between gap-2.5 sm:gap-3 group">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
              Total Agents
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <Users size={14} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1">
              {agents.length}
            </div>
            <p className="text-[11px] sm:text-xs text-[#8FA89B] font-medium m-0 truncate">
              Registered tenant instances
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-5 md:p-6 border border-[#EAEAEA] shadow-sm hover:border-[#9FE870] transition-all flex flex-col justify-between gap-2.5 sm:gap-3 group">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
              Active WhatsApp
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <Zap size={14} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1">
              {activeWaCount}
            </div>
            <p className="text-[11px] sm:text-xs text-[#8FA89B] font-medium m-0 truncate">
              Connected webhooks
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-5 md:p-6 col-span-2 sm:col-span-1 border border-[#EAEAEA] shadow-sm hover:border-[#9FE870] transition-all flex flex-col justify-between gap-2.5 sm:gap-3 group">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
              Verified Accounts
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <ShieldCheck size={14} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1">
              {verifiedCount}
            </div>
            <p className="text-[11px] sm:text-xs text-[#8FA89B] font-medium m-0 truncate">
              Security verified accounts
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Container with Search and Filters Toolbar */}
      <div className="bg-white rounded-[28px] border border-[#EAEAEA] shadow-sm overflow-hidden font-sans flex flex-col">
        {/* Search & Filters Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#EAEAEA] flex flex-col gap-3.5">
          {/* Global Search Input */}
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8FA89B] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search agents by name, email, or prefix..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-full text-xs sm:text-sm font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA89B] hover:text-[#16281D] cursor-pointer border-0 bg-transparent p-0.5"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              All Agents ({agents.length})
            </button>

            <button
              onClick={() => setFilterTab('active_wa')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'active_wa'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              WhatsApp Active ({activeWaCount})
            </button>

            <button
              onClick={() => setFilterTab('inactive_wa')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'inactive_wa'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              Disconnected ({inactiveWaCount})
            </button>

            <button
              onClick={() => setFilterTab('verified')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'verified'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              Email Verified ({verifiedCount})
            </button>

            <button
              onClick={() => setFilterTab('unverified')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'unverified'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              Unverified ({unverifiedCount})
            </button>
          </div>
        </div>

        {/* Loading / Error / Content */}
        {loading ? (
          <div className="p-12 text-center text-xs font-medium text-[#71717A] flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-[#9FE870] border-t-transparent rounded-full animate-spin" />
            <span>Loading agent instances…</span>
          </div>
        ) : error ? (
          <div className="p-4 m-5 bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl text-xs font-medium text-[#E11D48] flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#F4F7F4] text-[#8FA89B] flex items-center justify-center mb-3">
              <Users size={20} strokeWidth={2.2} />
            </div>
            <div className="text-sm font-bold text-[#16281D] mb-1">
              No matching agents found
            </div>
            <div className="text-xs text-[#71717A]">
              Try adjusting your search keywords or reset filter pills.
            </div>
            {(searchQuery || filterTab !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterTab('all');
                }}
                className="mt-3 px-4 py-1.5 rounded-full text-xs font-bold bg-[#16281D] text-white hover:bg-[#203628] border-0 cursor-pointer transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <AgentsMobileList
              agents={filteredAgents}
              onViewAgent={(agent) => setViewingAgent(agent)}
              onEditAgent={onEditAgent}
              onDeleteAgent={onDeleteAgent}
              onConfirmEmail={onConfirmEmail}
            />
            <AgentsDesktopTable
              agents={filteredAgents}
              onViewAgent={(agent) => setViewingAgent(agent)}
              onEditAgent={onEditAgent}
              onDeleteAgent={onDeleteAgent}
              onConfirmEmail={onConfirmEmail}
            />

            <AgentDetailsModal
              isOpen={Boolean(viewingAgent)}
              onClose={() => setViewingAgent(null)}
              agent={viewingAgent}
              onEditAgent={onEditAgent}
              onTopUp={onTopUp}
              onConfigureWhatsApp={onConfigureWhatsApp}
              onConfirmEmail={onConfirmEmail}
            />
          </>
        )}
      </div>
    </div>
  );
};
