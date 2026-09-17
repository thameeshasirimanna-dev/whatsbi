import React, { useState } from 'react';
import {
  X,
  Users,
  MessageSquare,
  Clock,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Coins,
  Pencil,
  Briefcase,
  ShoppingBag,
  Phone,
  Zap,
} from 'lucide-react';
import { Agent } from './admin.types';
import { formatLastLogin } from './adminFormatters';

interface AgentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
  onEditAgent?: (agent: Agent) => void;
  onTopUp?: (agent: Agent) => void;
  onConfigureWhatsApp?: (agent: Agent) => void;
  onConfirmEmail?: (userId: string) => void;
}

export const AgentDetailsModal: React.FC<AgentDetailsModalProps> = ({
  isOpen,
  onClose,
  agent,
  onEditAgent,
  onTopUp,
  onConfigureWhatsApp,
  onConfirmEmail,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !agent) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isWaActive = Boolean(agent.whatsapp_config?.is_active);
  const aiVal = parseFloat(String(agent.ai_balance ?? '0')) || 0;
  const credVal = parseFloat(String(agent.credits ?? '0')) || 0;
  const isLowAi = aiVal < 2.0;
  const isProduct = agent.business_type === 'product';

  const formattedCreatedDate = agent.created_at
    ? new Date(agent.created_at).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  const formattedLastLoginExact = (() => {
    if (!agent.last_login_at) return 'Never logged in';
    const d = new Date(agent.last_login_at);
    if (isNaN(d.getTime())) return 'Never logged in';
    return `${d.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  })();

  const lastActiveData = (() => {
    if (!agent.last_login_at) return { label: 'Never', time: 'No activity yet' };
    const d = new Date(agent.last_login_at);
    if (isNaN(d.getTime())) return { label: 'Never', time: 'No activity yet' };
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffMins < 1) return { label: 'Just now', time };
    if (diffMins < 60) return { label: `${diffMins}m ago`, time };
    if (diffHours < 24 && now.getDate() === d.getDate()) return { label: 'Today', time };
    if (Math.floor(diffHours / 24) <= 1) return { label: 'Yesterday', time };
    return { label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), time };
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-[28px] max-w-2xl w-full border border-[#EAEAEA] shadow-[0_24px_60px_rgba(20,40,24,0.2)] overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#16281D] text-[#9FE870] font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
              {agent.user_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-[#16281D] m-0 tracking-tight truncate">
                  {agent.user_name}
                </h3>
                <span className="font-mono bg-[#F4F7F4] text-[#16281D] border border-black/5 px-2 py-0.5 rounded-md text-[11px] font-bold">
                  {agent.agent_prefix}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F7F4] text-[#52525B] border border-black/5 capitalize">
                  {isProduct ? <ShoppingBag size={11} className="text-[#059669]" /> : <Briefcase size={11} className="text-[#059669]" />}
                  <span>{agent.business_type} Model</span>
                </span>
              </div>
              <p className="text-xs text-[#71717A] m-0 mt-0.5 truncate font-medium">
                {agent.user_email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center border-0 cursor-pointer transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          {/* Status Chips Row */}
          <div className="flex items-center gap-2 flex-wrap">
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
                className={`w-2 h-2 rounded-full ${
                  isWaActive ? 'bg-[#22C55E]' : agent.whatsapp_config ? 'bg-[#F59E0B]' : 'bg-[#A1A1AA]'
                }`}
              />
              {isWaActive
                ? 'WhatsApp Cloud API Live'
                : agent.whatsapp_config
                ? 'WhatsApp Configured (Inactive)'
                : 'WhatsApp Pending Setup'}
            </span>

            {agent.is_email_verified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                <ShieldCheck size={13} strokeWidth={2.4} />
                <span>Email Verified</span>
              </span>
            ) : (
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
                  <AlertCircle size={13} strokeWidth={2.4} />
                  <span>Email Unverified</span>
                </span>
                {onConfirmEmail && (
                  <button
                    type="button"
                    onClick={() => onConfirmEmail(agent.user_id)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] cursor-pointer border-0 shadow-2xs transition-all"
                  >
                    Confirm Now
                  </button>
                )}
              </div>
            )}

            {/* Last Active Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F4F7F4] text-[#16281D] border border-[#EAEAEA]">
              <Clock size={12} className={agent.last_login_at ? 'text-[#059669]' : 'text-[#A1A1AA]'} />
              <span className="text-[#71717A] font-medium">Last active:</span>
              <span className="text-[#16281D] font-bold">
                {formatLastLogin(agent.last_login_at)}
              </span>
            </div>
          </div>

          {/* Operational Audience KPI Grid (4 Cards) */}
          <div>
            <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
              Audience & Interaction Intelligence
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Total Customers */}
              <div className="bg-[#F4F7F4] p-3.5 rounded-2xl border border-black/5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase">Customers</span>
                  <div className="w-6 h-6 rounded-lg bg-[#E8F8EE] text-[#059669] flex items-center justify-center">
                    <Users size={13} />
                  </div>
                </div>
                <div className="text-xl font-extrabold text-[#16281D]">
                  {agent.total_customers ?? 0}
                </div>
                <span className="text-[10px] text-[#71717A] mt-0.5">Unique leads</span>
              </div>

              {/* Total Conversations */}
              <div className="bg-[#F4F7F4] p-3.5 rounded-2xl border border-black/5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase">Convs</span>
                  <div className="w-6 h-6 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                    <MessageSquare size={13} />
                  </div>
                </div>
                <div className="text-xl font-extrabold text-[#16281D]">
                  {agent.total_conversations ?? 0}
                </div>
                <span className="text-[10px] text-[#71717A] mt-0.5">Chat threads</span>
              </div>

              {/* Total Messages */}
              <div className="bg-[#F4F7F4] p-3.5 rounded-2xl border border-black/5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase">Messages</span>
                  <div className="w-6 h-6 rounded-lg bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center">
                    <Zap size={13} />
                  </div>
                </div>
                <div className="text-xl font-extrabold text-[#16281D]">
                  {agent.total_messages ?? 0}
                </div>
                <span className="text-[10px] text-[#71717A] mt-0.5">Exchanged</span>
              </div>

              {/* Orders or Recent Activity */}
              <div className="bg-[#F4F7F4] p-3.5 rounded-2xl border border-black/5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                    {isProduct ? 'Orders' : 'Last Active'}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                    {isProduct ? <ShoppingBag size={13} /> : <Clock size={13} />}
                  </div>
                </div>
                {isProduct ? (
                  <div>
                    <div className="text-xl font-extrabold text-[#16281D]">
                      {agent.total_orders ?? 0}
                    </div>
                    <span className="text-[10px] text-[#71717A] mt-0.5 block">Total processed</span>
                  </div>
                ) : (
                  <div className="flex flex-col min-w-0">
                    <div className="text-base sm:text-lg font-extrabold text-[#16281D] leading-tight">
                      {lastActiveData.label}
                    </div>
                    <span className="text-[11px] font-bold text-[#059669] mt-0.5 flex items-center gap-1 leading-tight">
                      <Clock size={10} className="shrink-0" />
                      <span>{lastActiveData.time}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financials & Balance Strip */}
          <div className="bg-[#F4F7F4] p-4 rounded-2xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                  AI Inference Balance
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-[#16281D]">
                    ${aiVal.toFixed(2)} USD
                  </span>
                  {isLowAi && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                      <AlertCircle size={11} /> Low
                    </span>
                  )}
                </div>
              </div>

              <div className="h-8 w-px bg-[#EAEAEA]" />

              <div>
                <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                  Platform Credits
                </div>
                <span className="text-lg font-extrabold text-[#059669]">
                  {credVal.toFixed(2)}
                </span>
              </div>
            </div>

            {onTopUp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTopUp(agent);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] cursor-pointer border-0 shadow-sm transition-all"
              >
                <Coins size={13} strokeWidth={2.4} /> Top Up Balance
              </button>
            )}
          </div>

          {/* WhatsApp Cloud API Configuration Card */}
          <div className="bg-white rounded-2xl border border-[#EAEAEA] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#16281D] text-xs">
                <Phone size={14} className="text-[#059669]" />
                <span>WhatsApp Cloud API Configuration</span>
              </div>
              {onConfigureWhatsApp && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onConfigureWhatsApp(agent);
                  }}
                  className="text-xs font-bold text-[#059669] hover:text-[#047857] cursor-pointer bg-transparent border-0"
                >
                  Configure
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] font-bold text-[#71717A] uppercase block mb-0.5">
                  Phone Number
                </span>
                <span className="font-mono text-xs text-[#16281D]">
                  {agent.whatsapp_config?.whatsapp_number || 'Not provided'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#71717A] uppercase block mb-0.5">
                  Phone Number ID
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#16281D] truncate max-w-[200px]">
                    {agent.whatsapp_config?.phone_number_id || 'Not configured'}
                  </span>
                  {agent.whatsapp_config?.phone_number_id && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(agent.whatsapp_config!.phone_number_id!, 'phone_id')}
                      className="text-[#71717A] hover:text-[#16281D] cursor-pointer bg-transparent border-0 p-0"
                      title="Copy Phone ID"
                    >
                      {copiedKey === 'phone_id' ? <Check size={13} className="text-[#059669]" /> : <Copy size={13} />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#71717A] uppercase block mb-0.5">
                  WABA Account ID
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#16281D] truncate max-w-[200px]">
                    {agent.whatsapp_config?.business_account_id || 'Not configured'}
                  </span>
                  {agent.whatsapp_config?.business_account_id && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(agent.whatsapp_config!.business_account_id!, 'waba_id')}
                      className="text-[#71717A] hover:text-[#16281D] cursor-pointer bg-transparent border-0 p-0"
                      title="Copy WABA ID"
                    >
                      {copiedKey === 'waba_id' ? <Check size={13} className="text-[#059669]" /> : <Copy size={13} />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#71717A] uppercase block mb-0.5">
                  DeepSeek AI Key
                </span>
                <span className="text-xs text-[#16281D]">
                  {agent.whatsapp_config?.deepseek_api_key ? 'Encrypted / Active' : 'System Default Key'}
                </span>
              </div>
            </div>
          </div>

          {/* Account System Identifiers & Timestamps */}
          <div className="bg-white rounded-2xl border border-[#EAEAEA] p-4 flex flex-col gap-2.5">
            <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
              Platform Identifiers & Activity Timeline
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#71717A] uppercase block mb-0.5">
                  Agent ID
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[#52525B] truncate max-w-[200px]">
                    {agent.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(agent.id, 'agent_id')}
                    className="text-[#71717A] hover:text-[#16281D] cursor-pointer bg-transparent border-0 p-0"
                    title="Copy Agent ID"
                  >
                    {copiedKey === 'agent_id' ? <Check size={13} className="text-[#059669]" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#71717A] uppercase block mb-0.5">
                  User ID
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[#52525B] truncate max-w-[200px]">
                    {agent.user_id}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(agent.user_id, 'user_id')}
                    className="text-[#71717A] hover:text-[#16281D] cursor-pointer bg-transparent border-0 p-0"
                    title="Copy User ID"
                  >
                    {copiedKey === 'user_id' ? <Check size={13} className="text-[#059669]" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#71717A] uppercase block mb-0.5">
                  Account Created
                </span>
                <span className="text-xs font-semibold text-[#16281D]">{formattedCreatedDate}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#71717A] uppercase block mb-0.5">
                  Last Active Recorded
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-[#16281D]">{formattedLastLoginExact}</span>
                  {agent.last_login_at && (
                    <span className="text-[10px] font-bold text-[#059669] bg-[#E8F8EE] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                      {formatLastLogin(agent.last_login_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#FAFCFA] flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            {onEditAgent && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditAgent(agent);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-[#F4F7F4] text-[#16281D] border border-[#EAEAEA] cursor-pointer transition-all"
              >
                <Pencil size={12} strokeWidth={2.4} /> Edit Agent
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-bold bg-[#16281D] hover:bg-[#203628] text-white border-0 cursor-pointer transition-all shadow-xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
