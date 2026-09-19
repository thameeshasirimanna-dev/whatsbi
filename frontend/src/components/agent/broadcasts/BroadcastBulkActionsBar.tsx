import React from 'react';
import { RefreshCw, Trash2, X } from 'lucide-react';

interface BroadcastBulkActionsBarProps {
  selectedCount: number;
  totalFailedInSelection: number;
  onBulkResendFailed: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

export const BroadcastBulkActionsBar: React.FC<BroadcastBulkActionsBarProps> = ({
  selectedCount,
  totalFailedInSelection,
  onBulkResendFailed,
  onBulkDelete,
  onClearSelection,
  isProcessing = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className="animate-dropdown select-none font-sans"
      style={{
        background: '#16281D',
        color: '#fff',
        borderRadius: 9999,
        padding: '8px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 12px 32px rgba(22,40,29,0.35)',
        border: '1px solid rgba(159,232,112,0.25)',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Left: Selected count */}
      <div className="flex items-center gap-2.5">
        <span
          className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full"
          style={{
            background: '#9FE870',
            color: '#16281D',
          }}
        >
          {selectedCount}
        </span>
        <span className="text-xs sm:text-sm font-semibold text-white">
          {selectedCount === 1 ? '1 campaign selected' : `${selectedCount} campaigns selected`}
        </span>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Bulk Resend Failed (if any failed messages exist in selection) */}
        {totalFailedInSelection > 0 && (
          <button
            type="button"
            onClick={onBulkResendFailed}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border disabled:opacity-50"
            style={{
              background: 'rgba(239,68,68,0.15)',
              borderColor: 'rgba(239,68,68,0.4)',
              color: '#FCA5A5',
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.background = '#EF4444';
                e.currentTarget.style.color = '#FFFFFF';
              }
            }}
            onMouseLeave={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                e.currentTarget.style.color = '#FCA5A5';
              }
            }}
          >
            <RefreshCw size={13} className={isProcessing ? 'animate-spin' : ''} />
            <span>Resend Failed ({totalFailedInSelection})</span>
          </button>
        )}

        {/* Bulk Delete */}
        <button
          type="button"
          onClick={onBulkDelete}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.1)',
            borderColor: 'rgba(255,255,255,0.2)',
            color: '#FFFFFF',
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = '#EF4444';
              e.currentTarget.style.borderColor = '#EF4444';
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }
          }}
        >
          <Trash2 size={13} />
          <span>Delete ({selectedCount})</span>
        </button>

        {/* Clear Selection */}
        <button
          type="button"
          onClick={onClearSelection}
          disabled={isProcessing}
          title="Clear selection"
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer border-0 disabled:opacity-50 ml-1"
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: '#A1A1AA',
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.color = '#A1A1AA';
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
            }
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default BroadcastBulkActionsBar;
