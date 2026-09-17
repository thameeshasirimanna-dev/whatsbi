import React from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { TelemetryPoint } from '../dashboard.types';

export interface ActiveConversationsCardData {
  points: TelemetryPoint[];
  barbells: { x: number; y1: number; y2: number; value: number; label: string }[];
  totalCount: number;
}

interface ActiveConversationsCardProps {
  range: 'Hourly' | 'Daily';
  onToggleRange: () => void;
  data: ActiveConversationsCardData;
}

export const ActiveConversationsCard: React.FC<ActiveConversationsCardProps> = ({
  range,
  onToggleRange,
  data,
}) => {
  return (
    <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_rgba(20,40,24,0.06)] transition-all duration-200 flex flex-col justify-between relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-[15px] text-[#16281D] m-0">
          Active conversations
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

      {/* Dumbbell / Barbell Ranges Visualization */}
      <div className="relative my-2 h-28 flex items-center justify-center">
        <svg viewBox="0 0 320 90" className="w-full h-full overflow-visible" fill="none">
          {data.barbells.map((b, i) => (
            <g key={i}>
              <line
                x1={b.x}
                y1={b.y1}
                x2={b.x}
                y2={b.y2}
                stroke="#F87171"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx={b.x} cy={b.y1} r="2.5" fill="#EF4444" />
              <circle cx={b.x} cy={b.y2} r="2.5" fill="#EF4444" />
            </g>
          ))}
        </svg>

        {/* Big Numeric Callout */}
        <div className="absolute right-3 bottom-2 text-right pointer-events-none">
          <span className="text-2xl md:text-3xl font-extrabold text-[#16281D] leading-none tracking-tight font-mono">
            {data.totalCount}
          </span>
          <span className="text-[11px] text-[#8FA89B] font-semibold ml-1">
            chats
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
