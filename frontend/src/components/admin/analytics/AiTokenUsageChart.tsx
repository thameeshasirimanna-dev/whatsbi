import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { AiTelemetryData } from './types';

interface AiTokenUsageChartProps {
  data: AiTelemetryData;
}

export const AiTokenUsageChart: React.FC<AiTokenUsageChartProps> = ({ data }) => {
  const [interval, setInterval] = useState<'monthly' | 'weekly'>('monthly');
  const history = data.monthlyTokensHistory;
  const maxTokens = Math.max(...history.map((h) => h.tokens), 8.0);

  // Map monthly data to SVG area path (width 320, height 95)
  const coords = history.map((item, idx) => {
    const x = 15 + (idx / (history.length - 1 || 1)) * 290;
    const y = 80 - (item.tokens / maxTokens) * 60;
    return { x, y, label: item.label || item.month || '', tokens: item.tokens };
  });

  const pathD = coords.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1]?.x || 305} 85 L ${coords[0]?.x || 15} 85 Z`;

  return (
    <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
              AI Token Consumption
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D]">
              DeepSeek V3
            </span>
          </div>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Autonomous agent inference volume and monthly consumption velocity
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInterval(interval === 'monthly' ? 'weekly' : 'monthly')}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16281D] bg-[#F4F7F4] px-3 py-1.5 rounded-full border border-black/5 hover:bg-[#EAEFEA] transition-colors cursor-pointer"
        >
          <Clock size={12} className="text-[#059669]" />
          <span className="capitalize">{interval}</span>
          <ChevronDown size={12} className="text-[#71717A]" />
        </button>
      </div>

      {/* Area Chart Visualization (Matching TelemetryGrid.tsx) */}
      <div className="relative my-3 h-32 flex items-center justify-center">
        <svg viewBox="0 0 320 95" className="w-full h-full overflow-visible" fill="none">
          <defs>
            <linearGradient id="tokenGradFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9FE870" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#9FE870" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Baseline Grid */}
          <path d="M 10 50 L 310 50" stroke="#F4F7F4" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M 10 85 L 310 85" stroke="#EAEAEA" strokeWidth="1" />

          {/* Fill Area */}
          <path d={areaD} fill="url(#tokenGradFill)" />

          {/* Curve Stroke */}
          <path
            d={pathD}
            stroke="#9FE870"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Peak Point Markers */}
          {coords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill="#9FE870"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          ))}
        </svg>

        {/* Floating Lime Tooltip Badge */}
        <div className="absolute right-[28%] top-[8px] bg-[#9FE870] text-[#16281D] font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-[0_2px_8px_rgba(159,232,112,0.45)]">
          {(data.totalTokens / 1_000_000).toFixed(1)}M tokens
        </div>

        {/* Big Numeric Callout */}
        <div className="absolute right-2 bottom-1 text-right">
          <span className="text-2xl md:text-3xl font-extrabold text-[#16281D] leading-none tracking-tight">
            {(data.totalTokens / 1_000_000).toFixed(1)}M
          </span>
          <span className="text-[11px] text-[#8FA89B] font-bold ml-1">
            tokens
          </span>
        </div>
      </div>

      {/* Month Axis */}
      <div className="flex justify-between text-[10px] font-medium text-[#A1A1AA] pt-2 pb-3 border-t border-[#F4F4F5]">
        {coords.map((c, idx) => (
          <span key={idx}>{c.label}</span>
        ))}
      </div>

      {/* Footer Metrics Row */}
      <div className="pt-3 border-t border-[#F4F4F5] flex items-center justify-between text-xs text-[#71717A] font-medium">
        <span>Avg Tokens/Turn: <strong className="text-[#16281D]">{data.avgTokensPerTurn}</strong></span>
        <span>Latency: <strong className="text-[#059669]">{data.engineLatencyMs}ms</strong></span>
        <span>Engine Uptime: <strong className="text-[#16281D]">{data.uptimePercent}%</strong></span>
      </div>
    </div>
  );
};
