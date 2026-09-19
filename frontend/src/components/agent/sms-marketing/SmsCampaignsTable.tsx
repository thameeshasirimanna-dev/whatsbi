import React from 'react';
import { Calendar, Eye, RefreshCw, Trash2, Smartphone } from 'lucide-react';
import type { Broadcast } from '../../../lib/api';
import { EmptyTableState } from '../shared/EmptyTableState';
import { calculateSmsParts } from './smsHelpers';

interface SmsCampaignsTableProps {
  campaigns: Broadcast[];
  onViewDetails: (c: Broadcast) => void;
  onResendFailed: (c: Broadcast) => void;
  onDelete: (c: Broadcast) => void;
  onCreateClick: () => void;
  hasActiveFilters: boolean;
}

const getStatusBadge = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'sent' || s === 'delivered') {
    return {
      dot: 'bg-[#22C55E]',
      bg: 'bg-[#22C55E]/10 text-[#15803D]',
    };
  }
  if (s === 'processing' || s === 'sending') {
    return {
      dot: 'bg-[#3B82F6]',
      bg: 'bg-[#3B82F6]/10 text-[#2563EB]',
    };
  }
  if (s === 'pending') {
    return {
      dot: 'bg-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10 text-[#D97706]',
    };
  }
  return {
    dot: 'bg-[#EF4444]',
    bg: 'bg-[#EF4444]/10 text-[#EF4444]',
  };
};

export const SmsCampaignsTable: React.FC<SmsCampaignsTableProps> = ({
  campaigns,
  onViewDetails,
  onResendFailed,
  onDelete,
  onCreateClick,
  hasActiveFilters,
}) => {
  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] overflow-hidden">
        <EmptyTableState
          isFiltered={hasActiveFilters}
          filteredTitle="No SMS campaigns found"
          filteredMessage="Try adjusting your search query or status filter to find matching campaigns."
          icon={Smartphone}
          title="No SMS campaigns launched yet"
          description="Send direct text messages to your customers using your Text.lk SMS gateway."
          actionLabel="Create SMS Campaign"
          onAction={onCreateClick}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] overflow-hidden font-sans">
      {/* Mobile Card Layout */}
      <div className="block lg:hidden divide-y divide-[#F4F7F4]">
        {campaigns.map((c) => {
          const badge = getStatusBadge(c.status);
          const deliveryRate =
            c.total_recipients > 0 ? Math.round(((c.sent_count || 0) / c.total_recipients) * 100) : 0;
          const partsInfo = calculateSmsParts(c.message || '');

          return (
            <div key={c.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-[#16281D] leading-tight truncate">
                    {c.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] mt-1 font-mono">
                    <Calendar size={12} />
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{partsInfo.parts} part{partsInfo.parts === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 capitalize ${badge.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {c.status}
                </span>
              </div>

              {c.message && (
                <p className="text-xs text-[#71717A] line-clamp-2 bg-[#F4F7F4]/60 p-2.5 rounded-xl">
                  {c.message}
                </p>
              )}

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#71717A] text-[11px]">Delivery Progress</span>
                  <span className="font-mono font-bold text-[#16281D] text-xs">
                    {c.sent_count}/{c.total_recipients} ({deliveryRate}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#F4F7F4] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${deliveryRate}%` }}
                    className={`h-full rounded-full ${c.status === 'failed' ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-[#F4F7F4]">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#E8F8EE] border border-[#BBF7D0] text-[11px] font-bold text-[#059669]">
                  Normal SMS
                </span>

                <div className="flex items-center gap-1.5">
                  {c.failed_count > 0 && (c.status === 'completed' || c.status === 'failed') && (
                    <button
                      onClick={() => onResendFailed(c)}
                      className="w-8 h-8 rounded-full bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 flex items-center justify-center transition-colors cursor-pointer border-0"
                      title="Resend to failed recipients"
                    >
                      <RefreshCw size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => onViewDetails(c)}
                    className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#0891B2]/15 text-[#71717A] hover:text-[#0891B2] flex items-center justify-center transition-colors cursor-pointer border-0"
                    title="View details"
                  >
                    <Eye size={14} />
                  </button>
                  {c.status !== 'processing' && (
                    <button
                      onClick={() => onDelete(c)}
                      className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EF4444]/15 text-[#71717A] hover:text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer border-0"
                      title="Delete campaign"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]">
              <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                Campaign Name
              </th>
              <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                Launch Date
              </th>
              <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                Channel
              </th>
              <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                Recipients
              </th>
              <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                Delivery Progress
              </th>
              <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                Status
              </th>
              <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider text-[#71717A]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F7F4]">
            {campaigns.map((c) => {
              const badge = getStatusBadge(c.status);
              const deliveryRate =
                c.total_recipients > 0 ? Math.round(((c.sent_count || 0) / c.total_recipients) * 100) : 0;
              const partsInfo = calculateSmsParts(c.message || '');

              return (
                <tr key={c.id} className="hover:bg-[#F4F7F4]/40 transition-colors">
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#16281D] block truncate">
                        {c.name}
                      </span>
                      {c.message && (
                        <p className="text-[11px] text-[#71717A] truncate mt-0.5">
                          {c.message}
                        </p>
                      )}
                      <span className="text-[10px] font-mono text-[#71717A]">
                        {partsInfo.parts} part{partsInfo.parts === 1 ? '' : 's'} • {partsInfo.length} chars
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-[#71717A] font-mono">
                      <Calendar size={13} />
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E8F8EE] border border-[#BBF7D0] text-[11px] font-bold text-[#059669]">
                      Normal SMS
                    </span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-[#16281D]">
                      {c.total_recipients}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 min-w-[160px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#71717A]">
                        <span className="font-mono text-[11px] font-semibold">
                          {c.sent_count}/{c.total_recipients}
                        </span>
                        <span className="font-mono text-[11px]">{deliveryRate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F4F7F4] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${deliveryRate}%` }}
                          className={`h-full rounded-full ${c.status === 'failed' ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${badge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {c.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      {c.failed_count > 0 && (c.status === 'completed' || c.status === 'failed') && (
                        <button
                          onClick={() => onResendFailed(c)}
                          className="w-7 h-7 rounded-full bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 flex items-center justify-center transition-colors cursor-pointer border-0"
                          title="Resend to failed recipients"
                        >
                          <RefreshCw size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => onViewDetails(c)}
                        className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#0891B2]/15 text-[#71717A] hover:text-[#0891B2] flex items-center justify-center transition-colors cursor-pointer border-0"
                        title="View details"
                      >
                        <Eye size={13} />
                      </button>
                      {c.status !== 'processing' && (
                        <button
                          onClick={() => onDelete(c)}
                          className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#EF4444]/15 text-[#71717A] hover:text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer border-0"
                          title="Delete campaign"
                        >
                          <Trash2 size={13} />
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
    </div>
  );
};
