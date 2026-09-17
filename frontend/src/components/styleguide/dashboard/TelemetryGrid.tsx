import React from 'react';
import { Clock, ChevronDown } from 'lucide-react';

export const TelemetryGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
      {/* 1. Message Throughput Card */}
      <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-[15px] text-[#16281D] m-0">
            Message throughput
          </h3>
          <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16281D] bg-[#F4F7F4] px-3 py-1 rounded-full border border-black/5 hover:bg-[#EAEFEA] transition-colors cursor-pointer">
            <Clock size={11} className="text-[#16281D]" /> Hourly{' '}
            <ChevronDown size={11} />
          </button>
        </div>

        {/* Traffic Waveform Visualization */}
        <div className="relative my-2 h-28 flex items-center justify-center">
          <svg
            viewBox="0 0 320 90"
            className="w-full h-full overflow-visible"
            fill="none"
          >
            {/* Background baseline reference */}
            <path
              d="M 10 45 L 310 45"
              stroke="#F0F4F0"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Smooth Traffic Pulse Wave */}
            <path
              d="M 10 45 Q 25 45, 35 42 T 55 45 T 75 42 T 95 45 T 108 55 T 116 12 T 124 78 T 132 30 T 142 45 T 165 42 T 185 45 T 205 38 T 225 45 T 255 45 L 305 45"
              stroke="#9FE870"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Floating Lime 90 msg/s Badge above traffic peak */}
          <div className="absolute left-[34%] top-[10px] bg-[#9FE870] text-[#16281D] font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-[0_2px_6px_rgba(159,232,112,0.4)]">
            90 msg/s
          </div>

          {/* Big Numeric Callout */}
          <div className="absolute right-3 bottom-2 text-right">
            <span className="text-2xl md:text-3xl font-extrabold text-[#16281D] leading-none tracking-tight">
              90
            </span>
            <span className="text-[11px] text-[#8FA89B] font-semibold ml-1">
              msg/s
            </span>
          </div>
        </div>

        {/* Time axis */}
        <div className="flex justify-between text-[10px] font-medium text-[#A1A1AA] pt-3 border-t border-[#F4F4F5]">
          <span>08:00</span>
          <span>09:00</span>
          <span>10:00</span>
          <span>11:00</span>
          <span>12:00</span>
          <span>01:00</span>
        </div>
      </div>

      {/* 2. AI Token Usage Card */}
      <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-[15px] text-[#16281D] m-0">
            AI token usage
          </h3>
          <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16281D] bg-[#F4F7F4] px-3 py-1 rounded-full border border-black/5 hover:bg-[#EAEFEA] transition-colors cursor-pointer">
            <Clock size={11} className="text-[#16281D]" /> Monthly{' '}
            <ChevronDown size={11} />
          </button>
        </div>

        {/* Token Usage Area Chart */}
        <div className="relative my-2 h-28 flex items-center justify-center">
          <svg
            viewBox="0 0 320 90"
            className="w-full h-full overflow-visible"
            fill="none"
          >
            <defs>
              <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9FE870" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#9FE870" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Fill Area */}
            <path
              d="M 10 75 Q 35 40, 60 45 T 110 30 T 160 55 T 210 20 T 260 50 T 310 35 L 310 80 L 10 80 Z"
              fill="url(#tokenGrad)"
            />

            {/* Stroke Line */}
            <path
              d="M 10 75 Q 35 40, 60 45 T 110 30 T 160 55 T 210 20 T 260 50 T 310 35"
              stroke="#9FE870"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Circular Peak Markers */}
            {[
              { x: 60, y: 45 },
              { x: 110, y: 30 },
              { x: 160, y: 55 },
              { x: 210, y: 20 },
              { x: 260, y: 50 },
              { x: 310, y: 35 },
            ].map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill="#9FE870"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}
          </svg>

          {/* Floating Lime 6M tokens Tooltip Badge */}
          <div className="absolute right-[32%] top-[6px] bg-[#9FE870] text-[#16281D] font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-[0_2px_6px_rgba(159,232,112,0.4)]">
            6M tokens
          </div>
        </div>

        {/* Month Axis */}
        <div className="flex justify-between text-[9px] font-medium text-[#A1A1AA] pt-3 border-t border-[#F4F4F5]">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
            (m) => (
              <span key={m}>{m}</span>
            )
          )}
        </div>
      </div>

      {/* 3. Active Conversations Card */}
      <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-[15px] text-[#16281D] m-0">
            Active conversations
          </h3>
          <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16281D] bg-[#F4F7F4] px-3 py-1 rounded-full border border-black/5 hover:bg-[#EAEFEA] transition-colors cursor-pointer">
            <Clock size={11} className="text-[#16281D]" /> Hourly{' '}
            <ChevronDown size={11} />
          </button>
        </div>

        {/* Dumbbell / Barbell Ranges Visualization */}
        <div className="relative my-2 h-28 flex items-center justify-center">
          <svg
            viewBox="0 0 320 90"
            className="w-full h-full overflow-visible"
            fill="none"
          >
            {/* 8 Barbell vertical indicators */}
            {[
              { x: 30, y1: 25, y2: 65 },
              { x: 65, y1: 35, y2: 55 },
              { x: 100, y1: 42, y2: 48 },
              { x: 135, y1: 22, y2: 68 },
              { x: 165, y1: 20, y2: 70 },
              { x: 195, y1: 18, y2: 72 },
              { x: 225, y1: 22, y2: 68 },
              { x: 255, y1: 15, y2: 75 },
            ].map((b, i) => (
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
          <div className="absolute right-3 bottom-2 text-right">
            <span className="text-2xl md:text-3xl font-extrabold text-[#16281D] leading-none tracking-tight">
              4000
            </span>
            <span className="text-[11px] text-[#8FA89B] font-semibold ml-1">
              chats
            </span>
          </div>
        </div>

        {/* Time axis */}
        <div className="flex justify-between text-[10px] font-medium text-[#A1A1AA] pt-3 border-t border-[#F4F4F5]">
          <span>08:00</span>
          <span>09:00</span>
          <span>10:00</span>
          <span>11:00</span>
          <span>12:00</span>
          <span>01:00</span>
        </div>
      </div>

      {/* 4. AI Model Quota Card (Speedometer Arc Gauge) */}
      <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-[15px] text-[#16281D] m-0">
            AI model quota
          </h3>
          <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16281D] bg-[#F4F7F4] px-3 py-1 rounded-full border border-black/5 hover:bg-[#EAEFEA] transition-colors cursor-pointer">
            <Clock size={11} className="text-[#16281D]" /> Monthly{' '}
            <ChevronDown size={11} />
          </button>
        </div>

        {/* Speedometer Radial Gauge */}
        <div className="relative my-2 h-28 flex items-center justify-center pt-2">
          <svg viewBox="0 0 320 110" className="w-full h-full overflow-visible">
            {/* Generate radiating gauge ticks around a 180° semi-circle */}
            {Array.from({ length: 41 }).map((_, idx) => {
              const angle = 180 + (idx / 40) * 180;
              const rad = (angle * Math.PI) / 180;
              const cx = 160;
              const cy = 100;
              const r1 = 80;
              const r2 = idx % 5 === 0 ? 94 : 88;
              const x1 = cx + r1 * Math.cos(rad);
              const y1 = cy + r1 * Math.sin(rad);
              const x2 = cx + r2 * Math.cos(rad);
              const y2 = cy + r2 * Math.sin(rad);

              const isHighlighted = idx >= 17 && idx <= 23;

              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isHighlighted ? '#9FE870' : '#27272A'}
                  strokeWidth={idx % 5 === 0 ? 2 : 1.2}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Solid Dark Base Arc */}
            <path
              d="M 100 100 A 60 60 0 0 1 220 100 Z"
              fill="#16281D"
            />
          </svg>

          {/* Radial Quota Tags along the curve */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* 45% */}
            <div className="absolute left-[16%] bottom-[22px] text-[11px] font-bold text-[#A1A1AA]">
              45 <span className="text-[9px] font-normal">%</span>
            </div>

            {/* 55% */}
            <div className="absolute left-[33%] top-[34px] text-[11px] font-bold text-[#71717A]">
              55 <span className="text-[9px] font-normal">%</span>
            </div>

            {/* 65% (Selected Lime Badge) */}
            <div className="absolute top-[6px] bg-[#9FE870] text-[#16281D] px-3.5 py-1 rounded-xl font-extrabold text-[13px] shadow-[0_3px_10px_rgba(159,232,112,0.4)] flex flex-col items-center leading-tight">
              <span>65</span>
              <span className="text-[8px] font-bold tracking-tight">% used</span>
            </div>

            {/* 75% */}
            <div className="absolute right-[33%] top-[34px] text-[11px] font-bold text-[#71717A]">
              75 <span className="text-[9px] font-normal">%</span>
            </div>

            {/* 85% */}
            <div className="absolute right-[16%] bottom-[22px] text-[11px] font-bold text-[#A1A1AA]">
              85 <span className="text-[9px] font-normal">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
