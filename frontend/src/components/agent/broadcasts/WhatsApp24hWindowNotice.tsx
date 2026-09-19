import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  PhoneOff,
  Files,
  Radio,
  Search,
  Users,
} from 'lucide-react';
import type { Customer } from '../../../lib/api';
import { formatHoursSinceLastMessage } from './broadcastHelpers';

interface WhatsApp24hWindowNoticeProps {
  within24hCount: number;
  blockedCustomers: Customer[];
  onSwitchToTemplate?: () => void;
  onSwitchToSms?: () => void;
  compact?: boolean;
}

export const WhatsApp24hWindowNotice: React.FC<WhatsApp24hWindowNoticeProps> = ({
  within24hCount,
  blockedCustomers,
  onSwitchToTemplate,
  onSwitchToSms,
  compact = false,
}) => {
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const blockedCount = blockedCustomers.length;
  const isAllBlocked = within24hCount === 0 && blockedCount > 0;

  if (blockedCount === 0) {
    return (
      <div className="p-3 bg-[#E8F8EE] border border-[#BBF7D0] rounded-2xl flex items-start gap-2.5 text-xs text-[#15803D] font-sans">
        <ShieldCheck size={16} className="text-[#22C55E] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">24-Hour Policy Compliant: </span>
          All {within24hCount} customer{within24hCount === 1 ? '' : 's'} are within the 24-hour service window and eligible to receive free-form text.
        </div>
      </div>
    );
  }

  const filteredBlocked = blockedCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  return (
    <div
      className={`rounded-2xl border transition-all font-sans ${
        isAllBlocked
          ? 'bg-[#FEF2F2] border-[#FCA5A5]/70 text-[#991B1B]'
          : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
      } p-3.5 sm:p-4`}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          size={18}
          className={`shrink-0 mt-0.5 ${
            isAllBlocked ? 'text-[#EF4444]' : 'text-[#D97706]'
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-bold tracking-tight">
              {isAllBlocked
                ? 'All Selected Numbers Blocked for WhatsApp Free Text'
                : 'WhatsApp 24-Hour Window: Some Numbers Blocked'}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                isAllBlocked
                  ? 'bg-[#EF4444]/15 text-[#EF4444]'
                  : 'bg-[#D97706]/15 text-[#B45309]'
              }`}
            >
              {blockedCount} Blocked
            </span>
          </div>

          <p className="text-xs mt-1 leading-relaxed opacity-95">
            {isAllBlocked ? (
              <>
                Meta WhatsApp policy forbids free-form text messages to contacts outside the 24-hour customer service window. None of your <strong>{blockedCount}</strong> selected customer{blockedCount === 1 ? '' : 's'} have messaged in the last 24h.
              </>
            ) : (
              <>
                <strong>{within24hCount}</strong> customer{within24hCount === 1 ? '' : 's'} are within the 24h window and will receive this message. <strong>{blockedCount}</strong> customer{blockedCount === 1 ? '' : 's'} are outside the window and have been <strong>automatically blocked</strong> from receiving free text.
              </>
            )}
          </p>

          {/* Quick Alternatives */}
          {(onSwitchToTemplate || onSwitchToSms) && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold opacity-80">
                Alternative channels to reach all {within24hCount + blockedCount}:
              </span>
              {onSwitchToTemplate && (
                <button
                  type="button"
                  onClick={onSwitchToTemplate}
                  className="px-3 py-1 rounded-full bg-white hover:bg-[#F4F7F4] text-[#16281D] font-bold text-xs border border-[#EAEAEA] shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Files size={12} className="text-[#15803D]" />
                  <span>Use Approved Meta Template</span>
                </button>
              )}
              {onSwitchToSms && (
                <button
                  type="button"
                  onClick={onSwitchToSms}
                  className="px-3 py-1 rounded-full bg-white hover:bg-[#F4F7F4] text-[#16281D] font-bold text-xs border border-[#EAEAEA] shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Radio size={12} className="text-[#2563EB]" />
                  <span>Send via Normal SMS (Text.lk)</span>
                </button>
              )}
            </div>
          )}

          {/* Collapsible Blocked Numbers Section */}
          <div className="mt-3.5 pt-3 border-t border-black/10">
            <button
              type="button"
              onClick={() => setShowBlockedList(!showBlockedList)}
              className="flex items-center gap-1.5 text-xs font-bold text-inherit hover:underline cursor-pointer"
            >
              <PhoneOff size={13} />
              <span>
                {showBlockedList ? 'Hide Blocked Numbers' : 'View Blocked Numbers'} ({blockedCount})
              </span>
              {showBlockedList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showBlockedList && (
              <div className="mt-2.5 space-y-2 bg-white rounded-xl border border-black/10 p-2.5 shadow-sm text-[#16281D]">
                {blockedCount > 4 && (
                  <div className="relative">
                    <Search
                      size={12}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717A]"
                    />
                    <input
                      type="text"
                      placeholder="Search blocked customer or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-[#F4F7F4] rounded-lg text-xs outline-none border border-transparent focus:border-[#EAEAEA]"
                    />
                  </div>
                )}

                <div className="max-h-40 overflow-y-auto divide-y divide-[#EAEAEA] text-xs">
                  {filteredBlocked.map((c) => (
                    <div
                      key={c.id}
                      className="py-1.5 px-1 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-[#16281D] truncate block">
                          {c.name}
                        </span>
                        <span className="text-[11px] font-mono text-[#71717A]">
                          {c.phone}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#EF4444]/10 text-[#DC2626]">
                          {formatHoursSinceLastMessage(c.last_user_message_time)}
                        </span>
                        <span className="block text-[9px] text-[#71717A] mt-0.5">
                          Blocked for Free Text
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
