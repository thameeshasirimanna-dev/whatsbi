import React from 'react';
import {
  Coins,
  MessageSquare,
  ArrowRight,
  Search,
  Pencil,
  AlertTriangle,
  Users,
  Clock,
} from 'lucide-react';
import { Agent } from '../admin.types';
import { formatLastLogin } from '../adminFormatters';

export type FilterStatus = 'all' | 'active' | 'low_balance' | 'needs_setup';

interface DashboardRecentAgentsProps {
  agents: Agent[];
  activeWhatsAppCount: number;
  lowBalanceCount: number;
  needsSetupCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterStatus: FilterStatus;
  setFilterStatus: (s: FilterStatus) => void;
  onNavigate?: (tab: string) => void;
  onTopUp?: (agent: Agent) => void;
  onConfigureWhatsApp?: (agent: Agent) => void;
  onEditAgent?: (agent: Agent) => void;
}

export const DashboardRecentAgents: React.FC<DashboardRecentAgentsProps> = ({
  agents,
  activeWhatsAppCount,
  lowBalanceCount,
  needsSetupCount,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  onNavigate,
  onTopUp,
  onConfigureWhatsApp,
  onEditAgent,
}) => {
  // Filter agents for recent list
  const filteredAgents = agents.filter((agent) => {
    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = agent.user_name.toLowerCase().includes(q);
      const matchEmail = agent.user_email.toLowerCase().includes(q);
      const matchPrefix = agent.agent_prefix.toLowerCase().includes(q);
      const matchPhone = agent.whatsapp_config?.whatsapp_number?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPrefix && !matchPhone) return false;
    }

    // Status tab filter
    if (filterStatus === 'active') return Boolean(agent.whatsapp_config?.is_active);
    if (filterStatus === 'low_balance') {
      const bal = parseFloat(String(agent.ai_balance ?? '0')) || 0;
      return bal < 2.0;
    }
    if (filterStatus === 'needs_setup') {
      return !agent.whatsapp_config || !agent.whatsapp_config.is_active;
    }
    return true;
  });

  const recentList = filteredAgents.slice(0, 6);

  return (
    <div className="bg-white rounded-[28px] border border-[#EAEAEA] shadow-sm overflow-hidden flex flex-col font-sans">
      {/* Section Header */}
      <div className="p-5 sm:p-6 border-b border-[#EAEAEA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#16281D] m-0 tracking-tight">
            Recent Agent Instances & Telemetry
          </h2>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Live status, DeepSeek AI balances, and WhatsApp Cloud API connections.
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('agents')}
            className="inline-flex items-center gap-1.5 bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] px-3.5 py-1.5 rounded-full text-xs font-bold border border-[#EAEAEA] cursor-pointer transition-all self-start sm:self-auto"
          >
            <span>View full fleet ({agents.length})</span>
            <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* Filter Pills Toolbar */}
      <div className="px-5 py-3 bg-[#F4F7F4] border-b border-[#EAEAEA] flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
            filterStatus === 'all'
              ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
              : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
          }`}
        >
          All Agents ({agents.length})
        </button>

        <button
          onClick={() => setFilterStatus('active')}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
            filterStatus === 'active'
              ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
              : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
          }`}
        >
          Active WhatsApp ({activeWhatsAppCount})
        </button>

        <button
          onClick={() => setFilterStatus('low_balance')}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
            filterStatus === 'low_balance'
              ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
              : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
          }`}
        >
          Low Balance (&lt; $2) ({lowBalanceCount})
        </button>

        <button
          onClick={() => setFilterStatus('needs_setup')}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
            filterStatus === 'needs_setup'
              ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
              : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
          }`}
        >
          Needs Config ({needsSetupCount})
        </button>
      </div>

      {/* Empty State */}
      {recentList.length === 0 ? (
        <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#F4F7F4] flex items-center justify-center text-[#8FA89B]">
            <Search size={20} />
          </div>
          <div className="font-bold text-sm text-[#16281D]">No agents match this filter</div>
          <p className="text-xs text-[#71717A] max-w-sm m-0">
            Try adjusting your search query or reset filter pills to view available tenant accounts.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('all');
            }}
            className="mt-2 px-4 py-1.5 rounded-full text-xs font-bold bg-[#16281D] text-white hover:bg-[#203628] border-0 cursor-pointer transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#FAFCFA] border-b border-[#EAEAEA]">
                  {['Agent', 'Prefix', 'Audience', 'Last Login', 'WhatsApp Status', 'DeepSeek AI', 'Credits', 'Quick Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[11px] font-bold text-[#52525B] uppercase tracking-wider text-left whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F5]">
                {recentList.map((agent) => {
                  const isWaActive = Boolean(agent.whatsapp_config?.is_active);
                  const aiVal = parseFloat(String(agent.ai_balance ?? '0')) || 0;
                  const credVal = parseFloat(String(agent.credits ?? '0')) || 0;
                  const isLowAi = aiVal < 2.0;

                  return (
                    <tr key={agent.id} className="hover:bg-[#F0FDF4] transition-colors">
                      {/* Agent Info */}
                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center font-bold text-xs shrink-0">
                            {agent.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#16281D] truncate">{agent.user_name}</div>
                            <div className="text-[11px] text-[#71717A] truncate font-medium max-w-[170px]">
                              {agent.user_email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Prefix */}
                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-mono bg-[#F4F7F4] text-[#52525B] border border-black/5 px-2.5 py-0.5 rounded-md text-[11px] font-medium">
                          {agent.agent_prefix}
                        </span>
                      </td>

                      {/* Audience (Customers & Conversations) */}
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-[#16281D]">
                            <Users size={12} className="text-[#059669] shrink-0" />
                            <span>{agent.total_customers ?? 0} customers</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] font-medium">
                            <MessageSquare size={11} className="text-[#0284C7] shrink-0" />
                            <span>{agent.total_conversations ?? 0} convs</span>
                          </div>
                        </div>
                      </td>

                      {/* Last Login Date */}
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock
                            size={12}
                            className={agent.last_login_at ? 'text-[#059669]' : 'text-[#A1A1AA]'}
                          />
                          <span
                            className={
                              agent.last_login_at ? 'text-[#16281D] font-medium' : 'text-[#71717A]'
                            }
                          >
                            {formatLastLogin(agent.last_login_at)}
                          </span>
                        </div>
                      </td>

                      {/* WhatsApp Routing */}
                      <td className="px-4 py-3.5 text-xs">
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
                          {isWaActive ? 'Active' : agent.whatsapp_config ? 'Configured' : 'Not Setup'}
                        </span>
                      </td>

                      {/* AI Balance */}
                      <td className="px-5 py-3.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={isLowAi ? 'text-[#D97706]' : 'text-[#16281D]'}>
                            ${aiVal.toFixed(2)} USD
                          </span>
                          {isLowAi && (
                            <span
                              title="Low AI token balance"
                              className="inline-flex items-center text-[#D97706]"
                            >
                              <AlertTriangle size={12} />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Template Credits */}
                      <td className="px-5 py-3.5 text-xs font-bold text-[#059669]">
                        {credVal.toFixed(2)}
                      </td>

                      {/* Quick Actions Buttons */}
                      <td className="px-5 py-3.5 text-xs">
                        <div className="flex items-center gap-2">
                          {onTopUp && (
                            <button
                              onClick={() => onTopUp(agent)}
                              title="Top up balance"
                              className="inline-flex items-center gap-1.5 bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] px-3 py-1.5 rounded-full font-bold text-xs shadow-sm cursor-pointer border-0 transition-all"
                            >
                              <Coins size={12} strokeWidth={2.4} />
                              <span>Top Up</span>
                            </button>
                          )}

                          {onConfigureWhatsApp && (
                            <button
                              onClick={() => onConfigureWhatsApp(agent)}
                              title="Configure WhatsApp Cloud API"
                              className="inline-flex items-center gap-1 bg-white hover:bg-[#F4F7F4] active:scale-[0.98] text-[#16281D] px-2.5 py-1.5 rounded-full font-bold text-xs border border-[#EAEAEA] cursor-pointer transition-all"
                            >
                              <MessageSquare size={12} strokeWidth={2.2} />
                              <span>Config</span>
                            </button>
                          )}

                          {onEditAgent && (
                            <button
                              onClick={() => onEditAgent(agent)}
                              title="Edit agent details"
                              className="w-7 h-7 rounded-full bg-white hover:bg-[#F4F7F4] active:scale-[0.98] text-[#71717A] hover:text-[#16281D] flex items-center justify-center border border-[#EAEAEA] cursor-pointer transition-all"
                            >
                              <Pencil size={11} strokeWidth={2.4} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List View */}
          <div className="block md:hidden divide-y divide-[#F4F4F5]">
            {recentList.map((agent) => {
              const isWaActive = Boolean(agent.whatsapp_config?.is_active);
              const aiVal = parseFloat(String(agent.ai_balance ?? '0')) || 0;
              const credVal = parseFloat(String(agent.credits ?? '0')) || 0;

              return (
                <div key={agent.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center font-bold text-xs shrink-0">
                        {agent.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#16281D] truncate">
                          {agent.user_name}
                        </div>
                        <div className="text-[11px] text-[#71717A] truncate font-medium">
                          {agent.user_email}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono bg-[#F4F7F4] text-[#52525B] border border-black/5 px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0">
                      {agent.agent_prefix}
                    </span>
                  </div>

                  {/* Audience Metric Strip */}
                  <div className="grid grid-cols-2 gap-2 bg-[#F4F7F4] p-2.5 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#E8F8E0] text-[#059669] flex items-center justify-center shrink-0">
                        <Users size={12} />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#71717A] uppercase font-bold block leading-none mb-0.5">
                          Customers
                        </span>
                        <span className="font-bold text-[#16281D] text-xs">
                          {agent.total_customers ?? 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                        <MessageSquare size={12} />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#71717A] uppercase font-bold block leading-none mb-0.5">
                          Convs
                        </span>
                        <span className="font-bold text-[#16281D] text-xs">
                          {agent.total_conversations ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#F4F7F4] p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-[#8FA89B] uppercase block">
                        AI Balance
                      </span>
                      <span className="font-bold text-[#16281D]">${aiVal.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#8FA89B] uppercase block">
                        Credits
                      </span>
                      <span className="font-bold text-[#059669]">{credVal.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#8FA89B] uppercase block">
                        WhatsApp
                      </span>
                      <span
                        className={`font-bold text-[11px] ${
                          isWaActive ? 'text-[#15803D]' : 'text-[#71717A]'
                        }`}
                      >
                        {isWaActive ? 'Active' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Last Login Info */}
                  <div className="flex items-center justify-between text-[11px] text-[#71717A] px-1">
                    <span className="flex items-center gap-1.5">
                      <Clock
                        size={12}
                        className={agent.last_login_at ? 'text-[#059669]' : 'text-[#A1A1AA]'}
                      />
                      <span>Last login:</span>
                      <span
                        className={`font-medium ${
                          agent.last_login_at ? 'text-[#16281D]' : 'text-[#71717A]'
                        }`}
                      >
                        {formatLastLogin(agent.last_login_at)}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {onTopUp && (
                      <button
                        onClick={() => onTopUp(agent)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] py-1.5 rounded-full font-bold text-xs shadow-sm cursor-pointer border-0"
                      >
                        <Coins size={12} strokeWidth={2.4} /> Top Up
                      </button>
                    )}
                    {onConfigureWhatsApp && (
                      <button
                        onClick={() => onConfigureWhatsApp(agent)}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-white text-[#16281D] py-1.5 rounded-full font-bold text-xs border border-[#EAEAEA] cursor-pointer"
                      >
                        <MessageSquare size={12} strokeWidth={2.2} /> Setup
                      </button>
                    )}
                    {onEditAgent && (
                      <button
                        onClick={() => onEditAgent(agent)}
                        className="w-8 h-8 rounded-full bg-white text-[#52525B] flex items-center justify-center border border-[#EAEAEA] cursor-pointer"
                      >
                        <Pencil size={12} strokeWidth={2.4} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
