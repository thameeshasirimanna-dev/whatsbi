import React from 'react';
import {
  Trophy,
  Briefcase,
  ShoppingBag,
  ArrowRight,
  Zap,
  AlertCircle,
  Users,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { TopAgentRecord } from './types';
import { formatLastLogin } from '../adminFormatters';

interface AgentLeaderboardProps {
  agents: TopAgentRecord[];
  onNavigateToAgents?: () => void;
  onTopUp?: (agentId: string) => void;
}

export const AgentLeaderboard: React.FC<AgentLeaderboardProps> = ({
  agents,
  onNavigateToAgents,
}) => {
  return (
    <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FEF9C3] text-[#A16207] flex items-center justify-center shrink-0 shadow-2xs">
            <Trophy size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#16281D] m-0 tracking-tight leading-snug">
              High-Velocity Tenant Leaderboard
            </h3>
            <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
              Ranked tenant agents by AI inference activity, message volume, and account readiness
            </p>
          </div>
        </div>

        {onNavigateToAgents && (
          <button
            type="button"
            onClick={onNavigateToAgents}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:text-[#047857] transition-colors cursor-pointer bg-transparent border-0"
          >
            <span>View all agents</span>
            <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* Table / List Container */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[#EAEAEA] text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
              <th className="pb-3 pl-2 w-12">Rank</th>
              <th className="pb-3">Agent Profile</th>
              <th className="pb-3">Audience</th>
              <th className="pb-3">Last Active</th>
              <th className="pb-3">Business Model</th>
              <th className="pb-3">WhatsApp Cloud API</th>
              <th className="pb-3">AI Balance</th>
              <th className="pb-3 pr-2 text-right">Liquidity Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F4F5] text-xs">
            {agents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#71717A] font-medium">
                  No tenant agents provisioned yet.
                </td>
              </tr>
            ) : (
              agents.map((agent, index) => {
                const isService = agent.business_type === 'service';
                const isLow = agent.ai_balance < 2.0;
                const isCritical = agent.ai_balance < 0.5;

                return (
                  <tr
                    key={agent.id}
                    className="hover:bg-[#F8FAF8] transition-colors group cursor-default"
                  >
                    {/* Rank */}
                    <td className="py-3.5 pl-2 font-bold text-[#16281D]">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                          index === 0
                            ? 'bg-[#9FE870] text-[#16281D] font-extrabold'
                            : index === 1
                            ? 'bg-[#E4E4E7] text-[#16281D] font-bold'
                            : index === 2
                            ? 'bg-[#FEF3C7] text-[#92400E] font-bold'
                            : 'text-[#71717A]'
                        }`}
                      >
                        {index + 1}
                      </div>
                    </td>

                    {/* Profile */}
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] font-bold text-xs flex items-center justify-center shrink-0">
                          {agent.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-[#16281D] truncate leading-tight">
                            {agent.user_name}
                          </span>
                          <span className="text-[11px] text-[#71717A] truncate">
                            {agent.user_email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Audience (Customers & Conversations) */}
                    <td className="py-3.5">
                      <div className="flex flex-col gap-0.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-[#16281D]">
                          <Users size={12} className="text-[#059669] shrink-0" />
                          <span>{agent.total_customers ?? 0} cust</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
                          <MessageSquare size={11} className="text-[#0284C7] shrink-0" />
                          <span>{agent.total_conversations ?? 0} convs</span>
                        </div>
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs">
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

                    {/* Business Model */}
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F4F7F4] text-[#16281D] border border-black/5">
                        {isService ? (
                          <>
                            <Briefcase size={12} className="text-[#059669]" />
                            <span>Service</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={12} className="text-[#059669]" />
                            <span>Product</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* WhatsApp Status */}
                    <td className="py-3.5">
                      {agent.whatsapp_active ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                          <span>Routing Live</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#71717A] bg-[#F4F4F5] px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA]" />
                          <span>Pending Setup</span>
                        </span>
                      )}
                    </td>

                    {/* AI Balance */}
                    <td className="py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#16281D]">
                          ${agent.ai_balance.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#71717A]">
                          {agent.credits.toFixed(0)} credits
                        </span>
                      </div>
                    </td>

                    {/* Liquidity Health */}
                    <td className="py-3.5 pr-2 text-right">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E11D48] bg-[#FFF1F2] border border-[#FECDD3] px-2 py-0.5 rounded-full">
                          <AlertCircle size={12} />
                          <span>Critical Depleted</span>
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                          <AlertCircle size={12} />
                          <span>Low (&lt; $2.00)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-[#E8F8EE] px-2 py-0.5 rounded-full">
                          <span>Sufficient</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
