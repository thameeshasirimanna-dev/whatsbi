import React from 'react';
import { X, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import type { Broadcast } from '../../../lib/api';
import Portal from '../shared/Portal';

interface BroadcastDetailsDrawerProps {
  isOpen: boolean;
  broadcast: Broadcast | null;
  loadingDetails: boolean;
  onClose: () => void;
  onResendFailed: (b: Broadcast) => void;
  onDelete: (b: Broadcast) => void;
}

const getStatusBadge = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'delivered' || s === 'sent' || s === 'completed') {
    return { dot: 'bg-[#22C55E]', bg: 'bg-[#22C55E]/10 text-[#15803D]' };
  }
  if (s === 'processing' || s === 'read') {
    return { dot: 'bg-[#3B82F6]', bg: 'bg-[#3B82F6]/10 text-[#2563EB]' };
  }
  if (s === 'pending') {
    return { dot: 'bg-[#F59E0B]', bg: 'bg-[#F59E0B]/10 text-[#D97706]' };
  }
  return { dot: 'bg-[#EF4444]', bg: 'bg-[#EF4444]/10 text-[#EF4444]' };
};

const BroadcastDetailsDrawer: React.FC<BroadcastDetailsDrawerProps> = ({
  isOpen,
  broadcast,
  loadingDetails,
  onClose,
  onResendFailed,
  onDelete,
}) => {
  if (!isOpen || !broadcast) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-[#16281D]/65 flex justify-end animate-modal-backdrop">
        <div
          className="fixed inset-0"
          onClick={onClose}
        />
        <div className="relative w-full max-w-lg bg-white h-full shadow-[0_24px_64px_rgba(22,40,29,0.15)] z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="shrink-0 px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                Broadcast Campaign Details
              </span>
              <h3 className="text-base font-bold text-[#16281D] mt-0.5">{broadcast.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 bg-[#F4F7F4] p-4 rounded-2xl border border-[#EAEAEA]">
              <div>
                <span className="text-[11px] font-medium text-[#71717A] block">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${getStatusBadge(broadcast.status).bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(broadcast.status).dot}`} />
                  {broadcast.status}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-[#71717A] block">Format</span>
                <span className="text-xs font-bold text-[#16281D] uppercase tracking-wider block mt-1">
                  {broadcast.message_type}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-[#71717A] block">Delivered Count</span>
                <span className="font-mono text-sm font-bold text-[#15803D] block mt-1">
                  {broadcast.sent_count} / {broadcast.total_recipients}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-[#71717A] block">Failed Count</span>
                <span className="font-mono text-sm font-bold text-[#EF4444] block mt-1">
                  {broadcast.failed_count}
                </span>
              </div>
            </div>

            {/* Campaign Actions */}
            <div className="space-y-2">
              {broadcast.failed_count > 0 && (broadcast.status === 'completed' || broadcast.status === 'failed') && (
                <button
                  onClick={() => onResendFailed(broadcast)}
                  className="w-full py-2.5 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold shadow-[0_4px_16px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={13} /> Resend Failed Messages ({broadcast.failed_count})
                </button>
              )}

              {broadcast.status !== 'processing' && (
                <button
                  onClick={() => onDelete(broadcast)}
                  className="w-full py-2.5 rounded-full border border-[#EF4444]/30 hover:bg-[#EF4444]/10 text-[#EF4444] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={13} /> Delete Broadcast Campaign
                </button>
              )}
            </div>

            {/* Message Body or Template */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#16281D] block">
                {broadcast.message_type === 'template' ? "WhatsApp Template" : "Message Body"}
              </span>
              {broadcast.message_type === 'template' ? (
                <div className="p-3 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl font-mono text-xs text-[#16281D]">
                  {broadcast.template_name}
                </div>
              ) : (
                <div className="p-3 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] whitespace-pre-wrap leading-relaxed">
                  {broadcast.message}
                </div>
              )}
            </div>

            {/* Recipient Log */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#16281D] block">
                Recipient Delivery Log
              </span>
              {loadingDetails ? (
                <div className="py-8 text-center text-xs text-[#71717A]">
                  Loading recipients log…
                </div>
              ) : !broadcast.recipients || broadcast.recipients.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#71717A] italic">
                  No recipient logs available.
                </div>
              ) : (
                <div className="space-y-2">
                  {broadcast.recipients.map((rec) => {
                    const badge = getStatusBadge(rec.status);
                    return (
                      <div
                        key={rec.id}
                        className="p-3 bg-white border border-[#EAEAEA] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-[#16281D] truncate">{rec.customer_name || 'Unknown Contact'}</p>
                          <p className="font-mono text-[11px] text-[#71717A] mt-0.5">{rec.phone}</p>
                          {rec.error_message && (
                            <p className="text-[11px] text-[#EF4444] flex items-center gap-1 mt-1">
                              <AlertCircle size={10} /> {rec.error_message}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${badge.bg}`}>
                          <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                          {rec.status}
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

export default BroadcastDetailsDrawer;
