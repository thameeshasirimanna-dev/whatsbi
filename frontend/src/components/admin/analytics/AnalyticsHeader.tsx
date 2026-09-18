import React from 'react';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { TimeframeRange } from './types';
import { DatePicker } from '../../agent/shared/DatePicker';

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
      <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
        {/* Segmented Capsule Switch (Style Guide Section 9) */}
        <div className="flex items-center bg-[#E8ECE8] p-1 rounded-full border border-black/5 overflow-x-auto w-full sm:w-auto justify-between">
          {TIMEFRAME_OPTIONS.map((opt) => {
            const isActive = timeframe === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onTimeframeChange(opt.id)}
                className={`flex-1 sm:flex-initial text-center px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
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
          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
            <DatePicker
              value={customStartDate || null}
              onChange={(val) => onCustomDateChange(val || '', customEndDate)}
              placeholder="Start Date"
              size="sm"
              variant="white"
              maxDate={customEndDate || undefined}
            />
            <ChevronRight size={12} className="text-[#A1A1AA] shrink-0" />
            <DatePicker
              value={customEndDate || null}
              onChange={(val) => onCustomDateChange(customStartDate, val || '')}
              placeholder="End Date"
              size="sm"
              variant="white"
              minDate={customStartDate || undefined}
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
