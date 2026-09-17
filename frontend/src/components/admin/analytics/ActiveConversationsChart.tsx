import React, { useState } from 'react';
import { Clock, ChevronDown, Zap } from 'lucide-react';

interface ActiveConversationsChartProps {
  totalActiveConversations?: number;
}

export const ActiveConversationsChart: React.FC<ActiveConversationsChartProps> = ({
  totalActiveConversations = 4120,
}) => {
  const [interval, setInterval] = useState<'hourly' | 'daily'>('hourly');

  // Dumbbell vertical range data across 8 intervals
  const intervals = [
    { time: '08:00', x: 28, y1: 30, y2: 68, active: 1840 },
    { time: '10:00', x: 64, y1: 20, y2: 74, active: 3120 },
    { time: '12:00', x: 100, y1: 15, y2: 78, active: 4120 }, // Peak
    { time: '14:00', x: 136, y1: 22, y2: 72, active: 3680 },
    { time: '16:00', x: 172, y1: 18, y2: 75, active: 3950 },
    { time: '18:00', x: 208, y1: 24, y2: 70, active: 3410 },
    { time: '20:00', x: 244, y1: 32, y2: 64, active: 2200 },
    { time: '22:00', x: 280, y1: 40, y2: 58, active: 1420 },
  ];

  return (
    <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
              Active Conversations
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F8EE] text-[#059669]">
              Live Sessions
            </span>
          </div>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Simultaneous customer chat threads managed across agent instances
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInterval(interval === 'hourly' ? 'daily' : 'hourly')}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16281D] bg-[#F4F7F4] px-3 py-1.5 rounded-full border border-black/5 hover:bg-[#EAEFEA] transition-colors cursor-pointer"
        >
          <Clock size={12} className="text-[#059669]" />
          <span className="capitalize">{interval}</span>
          <ChevronDown size={12} className="text-[#71717A]" />
        </button>
      </div>

      {/* Barbell / Dumbbell Ranges Visualization */}
      <div className="relative my-3 h-32 flex items-center justify-center">
        <svg viewBox="0 0 310 95" className="w-full h-full overflow-visible" fill="none">
          {/* Baseline horizontal grid guide */}
          <line x1="15" y1="48" x2="295" y2="48" stroke="#F4F7F4" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Render Dumbbells */}
          {intervals.map((b, i) => {
            const isPeak = b.time === '12:00';
            const strokeColor = isPeak ? '#059669' : '#16281D';
            const circleFill = isPeak ? '#9FE870' : '#16281D';

            return (
              <g key={i} className="group">
                {/* Connecting vertical stroke */}
                <line
                  x1={b.x}
                  y1={b.y1}
                  x2={b.x}
                  y2={b.y2}
                  stroke={strokeColor}
                  strokeWidth={isPeak ? '4' : '3'}
                  strokeLinecap="round"
                />
                {/* Top cap */}
                <circle cx={b.x} cy={b.y1} r={isPeak ? '3.5' : '2.8'} fill={circleFill} />
                {/* Bottom cap */}
                <circle cx={b.x} cy={b.y2} r={isPeak ? '3.5' : '2.8'} fill={circleFill} />
              </g>
            );
          })}
        </svg>

        {/* Floating peak indicator badge */}
        <div className="absolute left-[31%] top-[8px] bg-[#16281D] text-[#9FE870] font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
          Peak {totalActiveConversations.toLocaleString()} chats
        </div>

        {/* Big Numeric Callout */}
        <div className="absolute right-2 bottom-1 text-right">
          <span className="text-2xl md:text-3xl font-extrabold text-[#16281D] leading-none tracking-tight">
            {totalActiveConversations.toLocaleString()}
          </span>
          <span className="text-[11px] text-[#8FA89B] font-bold ml-1">
            chats
          </span>
        </div>
      </div>

      {/* Time axis */}
      <div className="flex justify-between text-[10px] font-medium text-[#A1A1AA] pt-2 pb-3 border-t border-[#F4F4F5]">
        {intervals.map((item, idx) => (
          <span key={idx} className={item.time === '12:00' ? 'font-bold text-[#16281D]' : ''}>
            {item.time}
          </span>
        ))}
      </div>

      {/* Footnote Context */}
      <div className="pt-3 border-t border-[#F4F4F5] flex items-center justify-between text-xs text-[#71717A] font-medium">
        <span>Autonomous Bot Handled: <strong className="text-[#16281D]">94.2%</strong></span>
        <span>Human Escalated: <strong className="text-[#16281D]">5.8%</strong></span>
      </div>
    </div>
  );
};
