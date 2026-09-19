import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OrderNavigationControlsProps {
  prevOrderId: number | null;
  nextOrderId: number | null;
  currentIndex?: number;
  totalCount?: number;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  isCompact?: boolean;
}

export const OrderNavigationControls: React.FC<OrderNavigationControlsProps> = ({
  prevOrderId,
  nextOrderId,
  currentIndex,
  totalCount,
  onNavigatePrev,
  onNavigateNext,
  isCompact = false,
}) => {
  const hasPrev = prevOrderId !== null;
  const hasNext = nextOrderId !== null;
  const hasPosition = currentIndex !== undefined && currentIndex >= 0 && totalCount !== undefined && totalCount > 0;

  return (
    <div
      className={`inline-flex items-center bg-[#F4F7F4] p-1 rounded-full border border-[#EAEAEA] shadow-2xs select-none ${
        isCompact ? 'scale-95 origin-left' : ''
      }`}
    >
      {/* Previous Button */}
      <button
        type="button"
        onClick={onNavigatePrev}
        disabled={!hasPrev}
        title={
          hasPrev
            ? `Previous: Order #${String(prevOrderId).padStart(4, '0')} (Left Arrow)`
            : 'No previous order'
        }
        aria-label={hasPrev ? `Go to Order #${prevOrderId}` : 'No previous order'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
          hasPrev
            ? 'text-[#16281D] hover:bg-white hover:shadow-xs active:scale-95 cursor-pointer'
            : 'text-[#A1A1AA] cursor-not-allowed opacity-40'
        }`}
      >
        <ChevronLeft size={14} strokeWidth={2.4} />
        <span>Prev</span>
        {hasPrev && (
          <span className="font-mono text-[11px] font-medium text-[#71717A] hidden sm:inline">
            #{String(prevOrderId).padStart(4, '0')}
          </span>
        )}
      </button>

      {/* Position Counter */}
      {hasPosition && (
        <span className="px-2.5 text-[11px] font-bold text-[#71717A] border-x border-[#EAEAEA] leading-none whitespace-nowrap">
          {currentIndex + 1} of {totalCount}
        </span>
      )}

      {/* Next Button */}
      <button
        type="button"
        onClick={onNavigateNext}
        disabled={!hasNext}
        title={
          hasNext
            ? `Next: Order #${String(nextOrderId).padStart(4, '0')} (Right Arrow)`
            : 'No next order'
        }
        aria-label={hasNext ? `Go to Order #${nextOrderId}` : 'No next order'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
          hasNext
            ? 'text-[#16281D] hover:bg-white hover:shadow-xs active:scale-95 cursor-pointer'
            : 'text-[#A1A1AA] cursor-not-allowed opacity-40'
        }`}
      >
        {hasNext && (
          <span className="font-mono text-[11px] font-medium text-[#71717A] hidden sm:inline">
            #{String(nextOrderId).padStart(4, '0')}
          </span>
        )}
        <span>Next</span>
        <ChevronRight size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
};

export default OrderNavigationControls;
