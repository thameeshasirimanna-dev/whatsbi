import React, { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

export interface BulkProgress {
  actionLabel: string;
  current: number;
  total: number;
}

export function getBulkPercentage(progress: BulkProgress | null | undefined): number {
  if (!progress || progress.total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((progress.current / progress.total) * 100)));
}

export function useBulkProgress() {
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);

  const startBulkProgress = useCallback((actionLabel: string, total: number) => {
    setBulkProgress({ actionLabel, current: 0, total });
  }, []);

  const updateBulkProgress = useCallback((current: number) => {
    setBulkProgress((prev) => (prev ? { ...prev, current } : null));
  }, []);

  const finishBulkProgress = useCallback(() => {
    setBulkProgress(null);
  }, []);

  return {
    bulkProgress,
    isProcessing: bulkProgress !== null,
    startBulkProgress,
    updateBulkProgress,
    finishBulkProgress,
    setBulkProgress,
  };
}

/**
 * Renders an inline progress bar tracker inside bulk actions bars.
 */
export const BulkProgressTracker: React.FC<{ progress: BulkProgress }> = ({ progress }) => {
  const percentage = getBulkPercentage(progress);

  return (
    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 py-0.5 animate-dropdown">
      <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
        <div className="w-7 h-7 rounded-full bg-[#9FE870]/20 flex items-center justify-center shrink-0">
          <Loader2 className="w-3.5 h-3.5 text-[#9FE870] animate-spin" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white truncate leading-tight">
            {progress.actionLabel}
          </div>
          <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1.5 leading-tight mt-0.5">
            <span>Processing</span>
            <span className="text-white font-mono font-bold">
              {progress.current} of {progress.total}
            </span>
            <span>items</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-60 md:w-72 shrink-0">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#9FE870] to-[#22C55E] rounded-full transition-all duration-200 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="font-mono text-xs font-bold text-[#9FE870] shrink-0 min-w-[36px] text-right">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

/**
 * Renders a floating, sticky progress card anchored to the bottom-center of the viewport,
 * ensuring users see active bulk operation progress even when scrolled down long tables.
 */
export const FloatingBulkProgress: React.FC<{ progress?: BulkProgress | null }> = ({ progress }) => {
  if (!progress) return null;
  const percentage = getBulkPercentage(progress);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300"
    >
      <div className="pointer-events-auto bg-[#16281D]/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl border border-[#9FE870]/30 shadow-[0_16px_40px_rgba(0,0,0,0.45)] flex items-center gap-3.5 min-w-[280px] sm:min-w-[360px] max-w-[90vw]">
        <div className="w-8 h-8 rounded-full bg-[#9FE870]/20 flex items-center justify-center shrink-0">
          <Loader2 className="w-4 h-4 text-[#9FE870] animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-white truncate">
              {progress.actionLabel}
            </span>
            <span className="font-mono text-xs font-bold text-[#9FE870] shrink-0">
              {percentage}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#9FE870] to-[#22C55E] rounded-full transition-all duration-200 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#A1A1AA] shrink-0">
              {progress.current}/{progress.total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkProgressTracker;
