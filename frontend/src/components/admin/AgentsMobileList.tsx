import React from 'react';
import { Pencil, Trash2, ShieldCheck, Users, MessageSquare, Clock, Eye } from 'lucide-react';
import { Agent } from './admin.types';
import { formatLastLogin } from './adminFormatters';

interface AgentsMobileListProps {
  agents: Agent[];
  onViewAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onConfirmEmail: (userId: string) => void;
}

export const AgentsMobileList: React.FC<AgentsMobileListProps> = ({
  agents,
  onViewAgent,
  onEditAgent,
  onDeleteAgent,
  onConfirmEmail,
}) => {
  return (
    <div className="block lg:hidden font-sans">
      <div className="flex flex-col divide-y divide-[#F4F4F5]">
        {agents.map((agent) => {
          const isWaActive = Boolean(agent.whatsapp_config?.is_active);

          return (
            <div key={agent.id} className="p-4 flex flex-col gap-3 hover:bg-[#FAFFFE] transition-colors">
              {/* Header Row */}
              <div className="flex items-center justify-between gap-2.5">
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] font-bold text-[#52525B] bg-[#F4F7F4] border border-black/5 px-1.5 py-0.5 rounded-md">
                    {agent.agent_prefix}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F7F4] text-[#16281D] border border-black/5 capitalize">
                    {agent.business_type}
                  </span>
                </div>
              </div>

              {/* Audience Metrics: Customers & Conversations */}
              <div className="grid grid-cols-2 gap-2 bg-[#F4F7F4] p-2.5 rounded-xl border border-black/5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0">
                    <Users size={13} strokeWidth={2.4} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-[#8FA89B] uppercase">Customers</span>
                    <span className="font-bold text-[#16281D] truncate">
                      {agent.total_customers ?? 0}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                    <MessageSquare size={13} strokeWidth={2.4} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-[#8FA89B] uppercase">Convs</span>
                    <span className="font-bold text-[#16281D] truncate">
                      {agent.total_conversations ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Status & Last Login Strip */}
              <div className="flex items-center justify-between text-xs px-0.5">
                <div className="flex items-center gap-1.5">
                  <Clock
                    size={12}
                    className={agent.last_login_at ? 'text-[#059669]' : 'text-[#A1A1AA]'}
                  />
                  <span className="text-[11px] text-[#71717A]">
                    Last login:{' '}
                    <strong className={agent.last_login_at ? 'text-[#16281D]' : 'text-[#8FA89B]'}>
                      {formatLastLogin(agent.last_login_at)}
                    </strong>
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    isWaActive
                      ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                      : agent.whatsapp_config
                      ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                      : 'bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isWaActive ? 'bg-[#22C55E]' : agent.whatsapp_config ? 'bg-[#F59E0B]' : 'bg-[#A1A1AA]'
                    }`}
                  />
                  {isWaActive ? 'WA Active' : agent.whatsapp_config ? 'Configured' : 'No Setup'}
                </span>
              </div>

              {/* Actions & Verification Row */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div>
                  {agent.is_email_verified ? (
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full">
                      <ShieldCheck size={12} strokeWidth={2.4} />
                      <span>Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#E11D48] bg-[#FFF1F2] border border-[#FECDD3] px-2 py-0.5 rounded-full">
                        Unverified
                      </span>
                      <button
                        onClick={() => onConfirmEmail(agent.user_id)}
                        className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] cursor-pointer border-0 shadow-sm transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onViewAgent(agent)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F8EE] text-[#059669] hover:bg-[#D4F3E0] border border-[#BBF7D0] cursor-pointer transition-all"
                  >
                    <Eye size={11} strokeWidth={2.4} /> View
                  </button>
                  <button
                    onClick={() => onEditAgent(agent)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F4F7F4] text-[#16281D] hover:bg-[#EAEAEA] border border-[#EAEAEA] cursor-pointer transition-all"
                  >
                    <Pencil size={11} strokeWidth={2.4} /> Edit
                  </button>
                  <button
                    onClick={() => onDeleteAgent(agent.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFF1F2] text-[#E11D48] hover:bg-[#FFE4E6] border border-[#FECDD3] cursor-pointer transition-all"
                  >
                    <Trash2 size={11} strokeWidth={2.4} /> Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
