import React from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { TelemetryPoint } from '../dashboard.types';

export interface ThroughputCardData {
  points: TelemetryPoint[];
  wavePath: string;
  peakPercent: number;
  latestRate: number;
  unit: string;
}

interface ThroughputCardProps {
  range: 'Hourly' | 'Daily';
  onToggleRange: () => void;
  data: ThroughputCardData;
}

export const ThroughputCard: React.FC<ThroughputCardProps> = ({
  range,
  onToggleRange,
  data,
}) => {
  return (
    <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_rgba(20,40,24,0.06)] transition-all duration-200 flex flex-col justify-between relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-[15px] text-[#16281D] m-0">
          Message throughput
        </h3>
        <button
          type="button"
          onClick={onToggleRange}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16281D] bg-[#F4F7F4] hover:bg-[#EAEFEA] active:scale-95 px-3 py-1 rounded-full border border-black/5 transition-all cursor-pointer"
        >
          <Clock size={11} className="text-[#16281D]" /> {range}{' '}
          <ChevronDown size={11} />
        </button>
      </div>

      {/* Traffic Waveform Visualization */}
      <div className="relative my-2 h-28 flex items-center justify-center">
        <svg viewBox="0 0 320 90" className="w-full h-full overflow-visible" fill="none">
          <path
            d="M 10 45 L 310 45"
            stroke="#F0F4F0"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <path
            d={data.wavePath}
            stroke="#9FE870"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Floating Rate Badge */}
        <div
          className="absolute top-[8px] bg-[#9FE870] text-[#16281D] font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-[0_2px_6px_rgba(159,232,112,0.4)] transition-all duration-300 pointer-events-none"
          style={{ left: `${data.peakPercent}%` }}
        >
          {data.latestRate} {data.unit}
        </div>

        {/* Big Numeric Callout */}
        <div className="absolute right-3 bottom-2 text-right pointer-events-none">
          <span className="text-2xl md:text-3xl font-extrabold text-[#16281D] leading-none tracking-tight font-mono">
            {data.latestRate}
          </span>
          <span className="text-[11px] text-[#8FA89B] font-semibold ml-1">
            {data.unit}
          </span>
        </div>
      </div>

      {/* Time axis */}
      <div className="flex justify-between text-[10px] font-medium text-[#A1A1AA] pt-3 border-t border-[#F4F4F5]">
        {data.points.map((pt, i) => (
          <span key={i}>{pt.label}</span>
        ))}
      </div>
    </div>
  );
};
