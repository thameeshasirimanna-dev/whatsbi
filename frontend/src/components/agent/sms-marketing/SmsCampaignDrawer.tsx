import React, { useState } from 'react';
import { X, RefreshCw, Trash2, Search, AlertCircle } from 'lucide-react';
import type { Broadcast } from '../../../lib/api';
import Portal from '../shared/Portal';
import { calculateSmsParts } from './smsHelpers';

interface SmsCampaignDrawerProps {
  isOpen: boolean;
  campaign: Broadcast | null;
  loadingDetails: boolean;
  smsSenderId?: string;
  onClose: () => void;
  onResendFailed: (c: Broadcast) => void;
  onDelete: (c: Broadcast) => void;
}

const getStatusBadge = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'delivered' || s === 'sent' || s === 'completed') {
    return { dot: 'bg-[#22C55E]', bg: 'bg-[#22C55E]/10 text-[#15803D]' };
  }
  if (s === 'processing' || s === 'sending') {
    return { dot: 'bg-[#3B82F6]', bg: 'bg-[#3B82F6]/10 text-[#2563EB]' };
  }
  if (s === 'pending') {
    return { dot: 'bg-[#F59E0B]', bg: 'bg-[#F59E0B]/10 text-[#D97706]' };
  }
  return { dot: 'bg-[#EF4444]', bg: 'bg-[#EF4444]/10 text-[#EF4444]' };
};

export const SmsCampaignDrawer: React.FC<SmsCampaignDrawerProps> = ({
  isOpen,
  campaign,
  loadingDetails,
  onClose,
  onResendFailed,
  onDelete,
}) => {
  const [recipientSearch, setRecipientSearch] = useState('');

  if (!isOpen || !campaign) return null;

  const partsInfo = calculateSmsParts(campaign.message || '');
  const deliveryPct =
    campaign.total_recipients > 0
      ? Math.round(((campaign.sent_count || 0) / campaign.total_recipients) * 100)
      : 0;

  const recipients = campaign.recipients || [];
  const filteredRecipients = recipients.filter((r) => {
    const q = recipientSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
      (r.phone && r.phone.toLowerCase().includes(q))
    );
  });

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-[#16281D]/65 flex justify-end animate-modal-backdrop font-sans">
        <div className="fixed inset-0" onClick={onClose} />
        <div className="relative w-full max-w-full sm:max-w-lg bg-white h-full shadow-[0_24px_64px_rgba(22,40,29,0.15)] z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="shrink-0 px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="min-w-0 mr-2">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block truncate">
                SMS Campaign Details
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#16281D] mt-0.5 truncate">
                {campaign.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors shrink-0 cursor-pointer border-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 bg-[#F4F7F4] p-4 rounded-2xl border border-[#EAEAEA]">
              <div>
                <span className="text-[11px] font-medium text-[#71717A] block">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 capitalize ${
                    getStatusBadge(campaign.status).bg
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(campaign.status).dot}`}
                  />
                  {campaign.status}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-[#71717A] block">Channel</span>
                <span className="text-xs font-bold text-[#059669] uppercase tracking-wider block mt-1">
                  Normal SMS (Text.lk)
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-[#71717A] block">Delivered Count</span>
                <span className="font-mono text-sm font-bold text-[#15803D] block mt-1">
                  {campaign.sent_count} / {campaign.total_recipients} ({deliveryPct}%)
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-[#71717A] block">Failed Count</span>
                <span className="font-mono text-sm font-bold text-[#EF4444] block mt-1">
                  {campaign.failed_count}
                </span>
              </div>
            </div>

            {/* Campaign Actions */}
            <div className="space-y-2">
              {campaign.failed_count > 0 && (campaign.status === 'completed' || campaign.status === 'failed') && (
                <button
                  onClick={() => onResendFailed(campaign)}
                  className="w-full py-2.5 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold shadow-[0_4px_16px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  <RefreshCw size={13} />
                  <span>Resend Failed Messages ({campaign.failed_count})</span>
                </button>
              )}

              {campaign.status !== 'processing' && (
                <button
                  onClick={() => onDelete(campaign)}
                  className="w-full py-2.5 rounded-full border border-[#EF4444]/30 hover:bg-[#EF4444]/10 text-[#EF4444] text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  <Trash2 size={13} />
                  <span>Delete Campaign</span>
                </button>
              )}
            </div>

            {/* Delivery Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#71717A]">Delivery Progress</span>
                <span className="text-[#16281D] font-mono">{deliveryPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#F4F7F4] rounded-full overflow-hidden flex">
                <div
                  className="bg-[#22C55E] h-full transition-all duration-300"
                  style={{ width: `${deliveryPct}%` }}
                />
                {campaign.failed_count > 0 && (
                  <div
                    className="bg-[#EF4444] h-full transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (campaign.failed_count / (campaign.total_recipients || 1)) * 100
                      )}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Message Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#16281D]">SMS Message Content</span>
                <span className="text-[11px] font-mono text-[#71717A]">
                  {partsInfo.parts} part{partsInfo.parts === 1 ? '' : 's'} • {partsInfo.length} chars
                </span>
              </div>
              <div className="p-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] leading-relaxed whitespace-pre-wrap font-sans">
                {campaign.message || '(No message body)'}
              </div>
            </div>

            {/* Recipients Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#16281D]">
                  Recipient Delivery Log ({recipients.length})
                </span>
                <div className="relative w-36 sm:w-44">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder="Search logs..."
                    className="w-full pl-7 pr-2.5 py-1 bg-[#F4F7F4] border border-[#EAEAEA] rounded-full text-xs outline-none focus:border-[#9FE870]"
                  />
                </div>
              </div>

              {loadingDetails ? (
                <div className="py-8 text-center text-xs text-[#71717A]">
                  Loading recipients log…
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#71717A] italic">
                  {recipientSearch ? 'No matching recipients found.' : 'No recipient logs available.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredRecipients.map((r, i) => {
                    const badge = getStatusBadge(r.status);
                    return (
                      <div
                        key={r.id || i}
                        className="p-3 bg-white border border-[#EAEAEA] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-[#16281D] truncate">
                            {r.customer_name || 'Customer'}
                          </p>
                          <p className="font-mono text-[11px] text-[#71717A] mt-0.5">{r.phone}</p>
                          {r.error_message && (
                            <p className="text-[11px] text-[#EF4444] flex items-center gap-1 mt-1">
                              <AlertCircle size={10} /> {r.error_message}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 capitalize ${badge.bg}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                          {r.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};
