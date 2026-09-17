import React, { useState, useMemo } from 'react';
import { Plus, MessageSquare, Settings, Zap, Sparkles, Search, X } from 'lucide-react';
import { Agent } from './admin.types';

interface WhatsAppConfigTabProps {
  loading: boolean;
  agents: Agent[];
  onConfigure: (agent: Agent) => void;
  onSetup: (agent: Agent) => void;
}

type FilterTab = 'all' | 'active' | 'configured' | 'unconfigured';

export const WhatsAppConfigTab: React.FC<WhatsAppConfigTabProps> = ({
  loading,
  agents,
  onConfigure,
  onSetup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const activeCount = useMemo(
    () => agents.filter((a) => a.whatsapp_config?.is_active).length,
    [agents]
  );
  const configuredCount = useMemo(
    () => agents.filter((a) => Boolean(a.whatsapp_config) && !a.whatsapp_config?.is_active).length,
    [agents]
  );
  const unconfiguredCount = useMemo(
    () => agents.filter((a) => !a.whatsapp_config).length,
    [agents]
  );

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = a.user_name.toLowerCase().includes(q);
        const matchEmail = a.user_email.toLowerCase().includes(q);
        const matchPrefix = a.agent_prefix.toLowerCase().includes(q);
        const matchNumber = a.whatsapp_config?.whatsapp_number?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPrefix && !matchNumber) return false;
      }
      if (filterTab === 'active') return Boolean(a.whatsapp_config?.is_active);
      if (filterTab === 'configured') return Boolean(a.whatsapp_config) && !a.whatsapp_config?.is_active;
      if (filterTab === 'unconfigured') return !a.whatsapp_config;
      return true;
    });
  }, [agents, searchQuery, filterTab]);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Page Title & Context Header (No dark banner on table pages) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0">
              <MessageSquare size={16} strokeWidth={2.4} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#16281D] m-0 tracking-tight leading-tight">
              WhatsApp Cloud API Fleet
            </h1>
          </div>
          <p className="text-xs sm:text-[13px] text-[#71717A] m-0 font-medium">
            Meta Business Cloud API status, phone number IDs, and automated webhook routing.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards Grid (2 Columns on Mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#EAEAEA] p-3.5 sm:p-5 md:p-6 shadow-sm hover:border-[#9FE870] transition-all flex flex-col justify-between gap-2.5 sm:gap-3 group">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
              Fleet Connectivity
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <Zap size={14} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1">
              {activeCount} / {agents.length}
            </div>
            <p className="text-[11px] sm:text-xs text-[#8FA89B] font-medium m-0 truncate">
              Verified numbers
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#EAEAEA] p-3.5 sm:p-5 md:p-6 shadow-sm hover:border-[#9FE870] transition-all flex flex-col justify-between gap-2.5 sm:gap-3 group">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
              Webhook Delivery
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <MessageSquare size={14} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1">
              99.9%
            </div>
            <p className="text-[11px] sm:text-xs text-[#8FA89B] font-medium m-0 truncate">
              Zero-loss events
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#EAEAEA] p-3.5 sm:p-5 md:p-6 col-span-2 sm:col-span-1 shadow-sm hover:border-[#9FE870] transition-all flex flex-col justify-between gap-2.5 sm:gap-3 group">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
              AI Routing Core
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <Sparkles size={14} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1">
              DeepSeek V3
            </div>
            <p className="text-[11px] sm:text-xs text-[#8FA89B] font-medium m-0 truncate">
              Autonomous routing
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
              placeholder="Search by agent name, email, prefix, or WhatsApp phone number..."
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
              All Accounts ({agents.length})
            </button>

            <button
              onClick={() => setFilterTab('active')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'active'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              Connected & Active ({activeCount})
            </button>

            <button
              onClick={() => setFilterTab('configured')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'configured'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              Configured ({configuredCount})
            </button>

            <button
              onClick={() => setFilterTab('unconfigured')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'unconfigured'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              Needs Setup ({unconfiguredCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-medium text-[#71717A] flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-[#9FE870] border-t-transparent rounded-full animate-spin" />
            <span>Loading WhatsApp configurations…</span>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#F4F7F4] text-[#8FA89B] flex items-center justify-center mb-3">
              <MessageSquare size={20} strokeWidth={2.2} />
            </div>
            <div className="text-sm font-bold text-[#16281D] mb-1">
              {searchQuery || filterTab !== 'all'
                ? 'No matching WhatsApp instances found'
                : 'No agents registered yet'}
            </div>
            <div className="text-xs text-[#71717A]">
              {searchQuery || filterTab !== 'all'
                ? 'Try adjusting your search query or switching active filter tabs.'
                : 'Agents will appear here once registered.'}
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
            {/* Mobile Cards */}
            <div className="block lg:hidden divide-y divide-[#F4F4F5]">
              {filteredAgents.map((agent) => {
                const isWaActive = Boolean(agent.whatsapp_config?.is_active);

                return (
                  <div key={agent.id} className="p-4 flex flex-col gap-3 hover:bg-[#FAFFFE] transition-colors">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#16281D] truncate">
                          {agent.user_name}
                        </div>
                        <div className="text-[11px] text-[#71717A] font-medium truncate">
                          {agent.user_email}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                          isWaActive
                            ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                            : agent.whatsapp_config
                            ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                            : 'bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isWaActive
                              ? 'bg-[#22C55E]'
                              : agent.whatsapp_config
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#A1A1AA]'
                          }`}
                        />
                        {isWaActive ? 'Active' : agent.whatsapp_config ? 'Configured' : 'Not Set'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-[#F4F7F4] p-3 rounded-2xl border border-black/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#8FA89B] uppercase tracking-wider">Number</span>
                        <span className="font-mono text-xs font-semibold text-[#16281D]">
                          {agent.whatsapp_config?.whatsapp_number || 'None'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-[#8FA89B] uppercase tracking-wider">Engine</span>
                        <span className="text-xs font-bold text-[#15803D]">
                          DeepSeek V3
                        </span>
                      </div>
                    </div>

                    <div>
                      {agent.whatsapp_config ? (
                        <button
                          onClick={() => onConfigure(agent)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full text-xs font-bold bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-[0.98] text-[#16281D] border border-[#EAEAEA] cursor-pointer transition-all"
                        >
                          <Settings size={13} strokeWidth={2.4} /> Configure WhatsApp
                        </button>
                      ) : (
                        <button
                          onClick={() => onSetup(agent)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full text-xs font-bold bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] shadow-sm cursor-pointer border-0 transition-all"
                        >
                          <Plus size={14} strokeWidth={2.6} /> Setup WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#FAFCFA] border-b border-[#EAEAEA]">
                    {['Agent', 'WhatsApp Number', 'Status', 'AI Engine', 'Action'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-[11px] font-bold text-[#52525B] uppercase tracking-wider text-left whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5]">
                  {filteredAgents.map((agent) => {
                    const isWaActive = Boolean(agent.whatsapp_config?.is_active);

                    return (
                      <tr key={agent.id} className="hover:bg-[#F0FDF4] transition-colors">
                        <td className="px-5 py-3.5 text-xs">
                          <div className="font-bold text-[#16281D]">{agent.user_name}</div>
                          <div className="text-[11px] text-[#71717A] font-medium">{agent.user_email}</div>
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {agent.whatsapp_config?.whatsapp_number ? (
                            <span className="font-mono text-xs font-semibold text-[#16281D] bg-[#F4F7F4] px-2.5 py-0.5 rounded-md border border-black/5">
                              {agent.whatsapp_config.whatsapp_number}
                            </span>
                          ) : (
                            <span className="text-[#A1A1AA] text-xs font-medium">Not configured</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                              isWaActive
                                ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                                : agent.whatsapp_config
                                ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                                : 'bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isWaActive
                                  ? 'bg-[#22C55E]'
                                  : agent.whatsapp_config
                                  ? 'bg-[#F59E0B]'
                                  : 'bg-[#A1A1AA]'
                              }`}
                            />
                            {isWaActive ? 'Active' : agent.whatsapp_config ? 'Configured' : 'Not Set'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                            DeepSeek V3 Core
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {agent.whatsapp_config ? (
                            <button
                              onClick={() => onConfigure(agent)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-[0.98] text-[#16281D] border border-[#EAEAEA] cursor-pointer transition-all"
                            >
                              <Settings size={12} strokeWidth={2.4} /> Configure
                            </button>
                          ) : (
                            <button
                              onClick={() => onSetup(agent)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] shadow-sm cursor-pointer border-0 transition-all"
                            >
                              <Plus size={12} strokeWidth={2.6} /> Setup
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3.5 sm:p-4 bg-[#FAFCFA] border-t border-[#EAEAEA] flex items-center justify-between text-xs text-[#71717A] font-medium">
              <span>
                Showing <strong className="text-[#16281D] font-bold">{filteredAgents.length}</strong> of{' '}
                <strong className="text-[#16281D] font-bold">{agents.length}</strong> instances
              </span>
              <span className="text-[11px] text-[#8FA89B]">
                Meta Cloud API v20.0 • DeepSeek V3 Core
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

