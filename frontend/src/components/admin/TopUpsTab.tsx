import React, { useState, useMemo } from 'react';
import { Search, Coins, Sparkles, Layers, Users, X, AlertTriangle } from 'lucide-react';
import { Agent } from './admin.types';

interface TopUpsTabProps {
  loading: boolean;
  error: string | null;
  agents: Agent[];
  onTopUp: (agent: Agent) => void;
}

type TopUpFilterTab = 'all' | 'low_ai' | 'low_credits' | 'funded';

export const TopUpsTab: React.FC<TopUpsTabProps> = ({
  loading,
  error,
  agents,
  onTopUp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<TopUpFilterTab>('all');

  const lowAiCount = useMemo(
    () =>
      agents.filter((a) => (parseFloat(String(a.ai_balance ?? '0')) || 0) < 2.0)
        .length,
    [agents]
  );

  const lowCreditsCount = useMemo(
    () =>
      agents.filter((a) => (parseFloat(String(a.credits ?? '0')) || 0) < 1.0)
        .length,
    [agents]
  );

  const fundedCount = useMemo(
    () =>
      agents.filter((a) => {
        const ai = parseFloat(String(a.ai_balance ?? '0')) || 0;
        const cr = parseFloat(String(a.credits ?? '0')) || 0;
        return ai >= 2.0 && cr >= 1.0;
      }).length,
    [agents]
  );

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = a.user_name.toLowerCase().includes(q);
        const matchEmail = a.user_email.toLowerCase().includes(q);
        const matchPrefix = a.agent_prefix.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPrefix) return false;
      }
      const ai = parseFloat(String(a.ai_balance ?? '0')) || 0;
      const cr = parseFloat(String(a.credits ?? '0')) || 0;
      if (filterTab === 'low_ai') return ai < 2.0;
      if (filterTab === 'low_credits') return cr < 1.0;
      if (filterTab === 'funded') return ai >= 2.0 && cr >= 1.0;
      return true;
    });
  }, [agents, searchQuery, filterTab]);

  const metrics = useMemo(() => {
    let totalAi = 0;
    let totalCredits = 0;
    for (const a of agents) {
      totalAi += parseFloat(String(a.ai_balance ?? '0')) || 0;
      totalCredits += parseFloat(String(a.credits ?? '0')) || 0;
    }
    return { totalAi, totalCredits, totalCount: agents.length };
  }, [agents]);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Page Title & Context Header (No dark banner on table pages) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0">
              <Coins size={16} strokeWidth={2.4} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#16281D] m-0 tracking-tight leading-tight">
              Agent Balances & Top Ups
            </h1>
          </div>
          <p className="text-xs sm:text-[13px] text-[#71717A] m-0 font-medium">
            Inspect real-time balances, allocate DeepSeek AI API funding, and top up broadcast credits.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards Grid (2 Columns on Mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total AI Balance */}
        <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#EAEAEA] p-3.5 sm:p-5 md:p-6 shadow-sm hover:border-[#9FE870] transition-all flex flex-col justify-between gap-2.5 sm:gap-3 group">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
              Total AI Balance
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <Sparkles size={14} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1">
              ${metrics.totalAi.toFixed(2)}{' '}
              <span className="text-[10px] sm:text-xs font-semibold text-[#8FA89B]">USD</span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#8FA89B] font-medium m-0 truncate">
              DeepSeek API budget
            </p>
          </div>
        </div>

        {/* Total Template Credits */}
        <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#EAEAEA] p-3.5 sm:p-5 md:p-6 shadow-sm hover:border-[#9FE870] transition-all flex flex-col justify-between gap-2.5 sm:gap-3 group">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
              Template Credits
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <Layers size={14} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1">
              {metrics.totalCredits.toFixed(2)}
            </div>
            <p className="text-[11px] sm:text-xs text-[#8FA89B] font-medium m-0 truncate">
              Template message credits
            </p>
          </div>
        </div>

        {/* Total Managed Agents */}
        <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#EAEAEA] p-3.5 sm:p-5 md:p-6 col-span-2 sm:col-span-1 shadow-sm hover:border-[#9FE870] transition-all flex flex-col justify-between gap-2.5 sm:gap-3 group">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
              Managed Agents
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <Users size={14} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1">
              {metrics.totalCount}
            </div>
            <p className="text-[11px] sm:text-xs text-[#8FA89B] font-medium m-0 truncate">
              Eligible for top-ups
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Container with Search and Filter Toolbar */}
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
              All Accounts ({agents.length})
            </button>

            <button
              onClick={() => setFilterTab('low_ai')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'low_ai'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              Low AI Balance (&lt; $2) ({lowAiCount})
            </button>

            <button
              onClick={() => setFilterTab('low_credits')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'low_credits'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              Low Credits (&lt; 1) ({lowCreditsCount})
            </button>

            <button
              onClick={() => setFilterTab('funded')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'funded'
                  ? 'bg-[#16281D] text-white border-[#16281D] shadow-xs'
                  : 'bg-white text-[#52525B] border-[#EAEAEA] hover:bg-[#F4F7F4]'
              }`}
            >
              Adequately Funded ({fundedCount})
            </button>
          </div>
        </div>

        {/* Loading / Error / Table Content */}
        {loading ? (
          <div className="p-12 text-center text-xs font-medium text-[#71717A] flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-[#9FE870] border-t-transparent rounded-full animate-spin" />
            <span>Loading agent balances…</span>
          </div>
        ) : error ? (
          <div className="p-4 m-5 bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl text-xs font-medium text-[#E11D48]">
            {error}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#F4F7F4] text-[#8FA89B] flex items-center justify-center mb-3">
              <Coins size={20} strokeWidth={2.2} />
            </div>
            <div className="text-sm font-bold text-[#16281D] mb-1">
              No matching agents found
            </div>
            <div className="text-xs text-[#71717A]">
              Try searching with a different keyword or reset filter pills.
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
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#FAFCFA] border-b border-[#EAEAEA]">
                    {['Agent', 'Email', 'Prefix', 'DeepSeek AI Balance', 'Template Credits', 'Action'].map((h) => (
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
                    const aiVal = parseFloat(String(agent.ai_balance ?? '0')) || 0;
                    const credVal = parseFloat(String(agent.credits ?? '0')) || 0;
                    const isLowAi = aiVal < 2.0;

                    return (
                      <tr key={agent.id} className="hover:bg-[#F0FDF4] transition-colors">
                        <td className="px-5 py-3.5 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center font-bold text-xs shrink-0">
                              {agent.user_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-[#16281D] whitespace-nowrap">
                              {agent.user_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#71717A] font-medium">
                          {agent.user_email}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className="font-mono bg-[#F4F7F4] text-[#52525B] border border-black/5 px-2.5 py-0.5 rounded-md text-[11px] font-medium">
                            {agent.agent_prefix}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className={isLowAi ? 'text-[#D97706]' : 'text-[#16281D]'}>
                              ${aiVal.toFixed(2)} USD
                            </span>
                            {isLowAi && (
                              <span title="Low AI token balance" className="text-[#D97706]">
                                <AlertTriangle size={12} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-[#059669]">
                          {credVal.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <button
                            onClick={() => onTopUp(agent)}
                            className="inline-flex items-center gap-1.5 bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm cursor-pointer border-0 transition-all"
                          >
                            <Coins size={12} strokeWidth={2.4} /> Top Up
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block lg:hidden divide-y divide-[#F4F4F5]">
              {filteredAgents.map((agent) => {
                const aiVal = parseFloat(String(agent.ai_balance ?? '0')) || 0;
                const credVal = parseFloat(String(agent.credits ?? '0')) || 0;

                return (
                  <div key={agent.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center font-bold text-xs shrink-0">
                          {agent.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#16281D]">{agent.user_name}</div>
                          <div className="text-[11px] text-[#71717A]">{agent.user_email}</div>
                        </div>
                      </div>
                      <span className="font-mono bg-[#F4F7F4] text-[#52525B] border border-black/5 px-2 py-0.5 rounded-md text-[10px] font-medium">
                        {agent.agent_prefix}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#F4F7F4] p-2.5 rounded-xl text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-[#8FA89B] uppercase block">
                          AI Balance
                        </span>
                        <span className="font-bold text-[#16281D]">${aiVal.toFixed(2)} USD</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#8FA89B] uppercase block">
                          Template Credits
                        </span>
                        <span className="font-bold text-[#059669]">{credVal.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onTopUp(agent)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-full text-xs font-bold bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] shadow-sm cursor-pointer border-0 transition-all"
                    >
                      <Coins size={13} strokeWidth={2.4} /> Top Up Balance
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
