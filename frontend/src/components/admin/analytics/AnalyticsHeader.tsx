import React from 'react';
import { RefreshCw, Calendar, ChevronRight } from 'lucide-react';
import { TimeframeRange } from './types';

interface AnalyticsHeaderProps {
  timeframe: TimeframeRange;
  onTimeframeChange: (tf: TimeframeRange) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomDateChange: (start: string, end: string) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const TIMEFRAME_OPTIONS: Array<{ id: TimeframeRange; label: string }> = [
  { id: '24h', label: '24 Hours' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' },
];

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  timeframe,
  onTimeframeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  isRefreshing,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
      {/* Left: Time Ranges Switcher + Custom Date Inputs */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Segmented Capsule Switch (Style Guide Section 9) */}
        <div className="flex items-center bg-[#E8ECE8] p-1 rounded-full border border-black/5 overflow-x-auto max-w-full">
          {TIMEFRAME_OPTIONS.map((opt) => {
            const isActive = timeframe === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onTimeframeChange(opt.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#16281D] text-white shadow-xs'
                    : 'bg-transparent text-[#52525B] hover:text-[#16281D]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Range Picker when 'custom' is active */}
        {timeframe === 'custom' && (
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-[#EAEAEA] shadow-2xs text-xs animate-in fade-in zoom-in-95 duration-150">
            <Calendar size={13} className="text-[#059669] shrink-0" />
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onCustomDateChange(e.target.value, customEndDate)}
              aria-label="Start Date"
              className="bg-transparent border-0 outline-none text-xs font-semibold text-[#16281D] cursor-pointer"
            />
            <ChevronRight size={12} className="text-[#A1A1AA] shrink-0" />
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onCustomDateChange(customStartDate, e.target.value)}
              aria-label="End Date"
              className="bg-transparent border-0 outline-none text-xs font-semibold text-[#16281D] cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Right: Refresh Button */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Refresh telemetry"
        className="h-9 px-4 rounded-full bg-white border border-[#EAEAEA] text-[#16281D] hover:border-[#9FE870] hover:bg-[#F4F7F4] text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
      >
        <RefreshCw
          size={13}
          strokeWidth={2.4}
          className={`${isRefreshing ? 'animate-spin text-[#059669]' : 'text-[#71717A]'}`}
        />
        <span>Refresh</span>
      </button>
    </div>
  );
};
