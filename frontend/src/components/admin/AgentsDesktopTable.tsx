import React from 'react';
import { Pencil, Trash2, ShieldCheck, Users, MessageSquare, Clock, Eye } from 'lucide-react';
import { Agent } from './admin.types';
import { formatLastLogin } from './adminFormatters';

interface AgentsDesktopTableProps {
  agents: Agent[];
  onViewAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onConfirmEmail: (userId: string) => void;
}

export const AgentsDesktopTable: React.FC<AgentsDesktopTableProps> = ({
  agents,
  onViewAgent,
  onEditAgent,
  onDeleteAgent,
  onConfirmEmail,
}) => {
  return (
    <div className="hidden lg:block overflow-x-auto font-sans">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#F4F7F4] border-b border-[#EAEAEA]">
            {[
              'Agent',
              'Prefix & Model',
              'Audience',
              'Last Login',
              'WhatsApp Status',
              'Email Verification',
              'Actions',
            ].map((h) => (
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
          {agents.map((agent) => {
            const isWaActive = Boolean(agent.whatsapp_config?.is_active);

            return (
              <tr key={agent.id} className="hover:bg-[#F0FDF4] transition-colors">
                {/* Agent Profile Cell */}
                <td className="px-4 py-3.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center font-bold text-xs shrink-0">
                      {agent.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#16281D] whitespace-nowrap">
                        {agent.user_name}
                      </div>
                      <div className="text-[11px] text-[#71717A] font-medium truncate max-w-[180px]">
                        {agent.user_email}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Prefix & Business Model Cell */}
                <td className="px-4 py-3.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono bg-[#F4F7F4] text-[#16281D] border border-black/5 px-2 py-0.5 rounded-md text-[11px] font-bold">
                      {agent.agent_prefix}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F7F4] text-[#52525B] border border-black/5 capitalize">
                      {agent.business_type}
                    </span>
                  </div>
                </td>

                {/* Audience Cell (Customers & Conversations) */}
                <td className="px-4 py-3.5 text-xs">
                  <div className="flex flex-col gap-0.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-bold text-[#16281D]">
                      <Users size={12} className="text-[#059669] shrink-0" />
                      <span>{agent.total_customers ?? 0} customers</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] font-medium">
                      <MessageSquare size={11} className="text-[#0284C7] shrink-0" />
                      <span>{agent.total_conversations ?? 0} convs</span>
                      {(agent.total_messages ?? 0) > 0 && (
                        <span className="text-[10px] text-[#8FA89B]">
                          • {agent.total_messages} msgs
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Last Login Date Cell */}
                <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock
                      size={12}
                      className={agent.last_login_at ? 'text-[#059669]' : 'text-[#A1A1AA]'}
                    />
                    <span
                      className={`font-semibold ${
                        agent.last_login_at ? 'text-[#16281D]' : 'text-[#A1A1AA]'
                      }`}
                    >
                      {formatLastLogin(agent.last_login_at)}
                    </span>
                  </div>
                </td>

                {/* WhatsApp Status Cell */}
                <td className="px-4 py-3.5 text-xs whitespace-nowrap">
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
                    {isWaActive
                      ? 'Active'
                      : agent.whatsapp_config
                      ? 'Inactive'
                      : 'Not Configured'}
                  </span>
                </td>

                {/* Email Verification Cell */}
                <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                  {agent.is_email_verified ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <ShieldCheck size={13} strokeWidth={2.4} />
                      <span>Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
                        Unverified
                      </span>
                      <button
                        onClick={() => onConfirmEmail(agent.user_id)}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] cursor-pointer border-0 shadow-sm transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </td>

                {/* Actions Cell */}
                <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onViewAgent(agent)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F8EE] hover:bg-[#D4F3E0] text-[#059669] border border-[#BBF7D0] cursor-pointer transition-all"
                      title="View full agent details"
                    >
                      <Eye size={12} strokeWidth={2.4} /> View
                    </button>
                    <button
                      onClick={() => onEditAgent(agent)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA] cursor-pointer transition-all"
                    >
                      <Pencil size={12} strokeWidth={2.4} /> Edit
                    </button>
                    <button
                      onClick={() => onDeleteAgent(agent.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FECDD3] cursor-pointer transition-all"
                    >
                      <Trash2 size={12} strokeWidth={2.4} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
