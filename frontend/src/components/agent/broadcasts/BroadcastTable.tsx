import React from 'react';
import { Calendar, Eye, RefreshCw, Trash2, Send, Search, Plus } from 'lucide-react';
import type { Broadcast } from '../../../lib/api';
import { EmptyTableState } from '../shared/EmptyTableState';

interface BroadcastTableProps {
  broadcasts: Broadcast[];
  onViewDetails: (b: Broadcast) => void;
  onResendFailed: (b: Broadcast) => void;
  onDelete: (b: Broadcast) => void;
  onCreateClick: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const getStatusBadge = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'completed') {
    return {
      dot: 'bg-[#22C55E]',
      bg: 'bg-[#22C55E]/10 text-[#15803D]',
    };
  }
  if (s === 'processing') {
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

const BroadcastTable: React.FC<BroadcastTableProps> = ({
  broadcasts,
  onViewDetails,
  onResendFailed,
  onDelete,
  onCreateClick,
  onClearFilters,
  hasActiveFilters,
}) => {
  if (broadcasts.length === 0) {
    return (
      <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] overflow-hidden">
        <EmptyTableState
          isFiltered={hasActiveFilters}
          filteredTitle="No broadcast campaigns found"
          filteredMessage="Try adjusting your search query or filter selections to find matching campaigns."
          icon={Send}
          title="No broadcasts sent yet"
          description="Launch your first WhatsApp broadcast campaign to engage your customer base."
          actionLabel="Create Broadcast"
          onAction={onCreateClick}
        />
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] overflow-hidden"
    >
      {/* Mobile Card Layout */}
      <div className="block lg:hidden divide-y divide-[#F4F7F4]">
        {broadcasts.map((b) => {
          const badge = getStatusBadge(b.status);
          const deliveryRate = b.total_recipients > 0 ? Math.round((b.sent_count / b.total_recipients) * 100) : 0;

          return (
            <div key={b.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[#16281D] leading-tight">{b.name}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-[#71717A] mt-1 font-mono">
                    <Calendar size={12} />
                    <span>{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${badge.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {b.status}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#71717A] text-[11px]">Delivery Progress</span>
                  <span className="font-mono font-bold text-[#16281D] text-xs">
                    {b.sent_count}/{b.total_recipients} ({deliveryRate}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#F4F7F4] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${deliveryRate}%` }}
                    className={`h-full rounded-full ${b.status === 'failed' ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#F4F7F4]">
                <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider bg-[#F4F7F4] px-2 py-0.5 rounded-full border border-[#EAEAEA]">
                  {b.message_type}
                </span>

                <div className="flex items-center gap-1.5">
                  {b.failed_count > 0 && (b.status === 'completed' || b.status === 'failed') && (
                    <button
                      onClick={() => onResendFailed(b)}
                      title="Resend Failed Messages"
                      className="w-8 h-8 rounded-full bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 flex items-center justify-center transition-colors"
                    >
                      <RefreshCw size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => onViewDetails(b)}
                    title="View Details"
                    className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#0891B2]/15 text-[#71717A] hover:text-[#0891B2] flex items-center justify-center transition-colors"
                  >
                    <Eye size={14} />
                  </button>
                  {b.status !== 'processing' && (
                    <button
                      onClick={() => onDelete(b)}
                      title="Delete Campaign"
                      className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EF4444]/15 text-[#71717A] hover:text-[#EF4444] flex items-center justify-center transition-colors"
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

      {/* Desktop Table */}
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
                Type
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
            {broadcasts.map((b) => {
              const badge = getStatusBadge(b.status);
              const deliveryRate = b.total_recipients > 0 ? Math.round((b.sent_count / b.total_recipients) * 100) : 0;

              return (
                <tr key={b.id} className="hover:bg-[#F4F7F4]/40 transition-colors">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="text-xs font-bold text-[#16281D]">{b.name}</span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-[#71717A] font-mono">
                      <Calendar size={13} />
                      <span>{new Date(b.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F4F7F4] border border-[#EAEAEA] text-[11px] font-medium text-[#71717A] uppercase tracking-wider">
                      {b.message_type}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-[#16281D]">
                      {b.total_recipients}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 min-w-[160px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#71717A]">
                        <span className="font-mono text-[11px] font-semibold">{b.sent_count}/{b.total_recipients}</span>
                        <span className="font-mono text-[11px]">{deliveryRate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F4F7F4] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${deliveryRate}%` }}
                          className={`h-full rounded-full ${b.status === 'failed' ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {b.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      {b.failed_count > 0 && (b.status === 'completed' || b.status === 'failed') && (
                        <button
                          onClick={() => onResendFailed(b)}
                          title="Resend Failed"
                          className="w-7 h-7 rounded-full bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 flex items-center justify-center transition-colors"
                        >
                          <RefreshCw size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => onViewDetails(b)}
                        title="View Details"
                        className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#0891B2]/15 text-[#71717A] hover:text-[#0891B2] flex items-center justify-center transition-colors"
                      >
                        <Eye size={13} />
                      </button>
                      {b.status !== 'processing' && (
                        <button
                          onClick={() => onDelete(b)}
                          title="Delete Campaign"
                          className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#EF4444]/15 text-[#71717A] hover:text-[#EF4444] flex items-center justify-center transition-colors"
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

export default BroadcastTable;
