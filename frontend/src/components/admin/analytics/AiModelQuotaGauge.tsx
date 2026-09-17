import React from 'react';
import { Gauge, ShieldCheck } from 'lucide-react';
import { AiTelemetryData } from './types';

interface AiModelQuotaGaugeProps {
  data: AiTelemetryData;
}

export const AiModelQuotaGauge: React.FC<AiModelQuotaGaugeProps> = ({ data }) => {
  const percent = data.quotaUtilizationPercent || 65;
  const thresholdIdx = Math.round((percent / 100) * 40);

  return (
    <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
              AI Model Tier Quota
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F8EE] text-[#059669]">
              Enterprise Tier
            </span>
          </div>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Allocated DeepSeek V3 API quota and headroom threshold
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-[#16281D] bg-[#F4F7F4] px-3 py-1 rounded-full border border-black/5">
          <ShieldCheck size={13} className="text-[#059669]" />
          <span>10M Cap</span>
        </div>
      </div>

      {/* Speedometer Radial Gauge (Matching TelemetryGrid.tsx) */}
      <div className="relative my-2 h-32 flex items-center justify-center pt-2">
        <svg viewBox="0 0 320 110" className="w-full h-full overflow-visible">
          {/* Generate radiating gauge ticks around a 180° semi-circle */}
          {Array.from({ length: 41 }).map((_, idx) => {
            const angle = 180 + (idx / 40) * 180;
            const rad = (angle * Math.PI) / 180;
            const cx = 160;
            const cy = 100;
            const r1 = 76;
            const r2 = idx % 5 === 0 ? 92 : 85;
            const x1 = cx + r1 * Math.cos(rad);
            const y1 = cy + r1 * Math.sin(rad);
            const x2 = cx + r2 * Math.cos(rad);
            const y2 = cy + r2 * Math.sin(rad);

            const isHighlighted = idx <= thresholdIdx;

            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isHighlighted ? '#9FE870' : '#27272A'}
                strokeWidth={idx % 5 === 0 ? 2.4 : 1.2}
                strokeLinecap="round"
              />
            );
          })}

          {/* Solid Dark Base Arc */}
          <path d="M 102 100 A 58 58 0 0 1 218 100 Z" fill="#16281D" />
        </svg>

        {/* Radial Quota Percent Tags along the curve */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* 45% */}
          <div className="absolute left-[16%] bottom-[16px] text-[11px] font-bold text-[#A1A1AA]">
            45<span className="text-[9px] font-normal">%</span>
          </div>

          {/* 55% */}
          <div className="absolute left-[33%] top-[28px] text-[11px] font-bold text-[#71717A]">
            55<span className="text-[9px] font-normal">%</span>
          </div>

          {/* Central Lime Badge */}
          <div className="absolute top-[4px] bg-[#9FE870] text-[#16281D] px-3.5 py-1 rounded-xl font-extrabold text-xs shadow-[0_3px_10px_rgba(159,232,112,0.4)] flex flex-col items-center leading-tight">
            <span>{percent}</span>
            <span className="text-[8px] font-bold tracking-tight">% used</span>
          </div>

          {/* 75% */}
          <div className="absolute right-[33%] top-[28px] text-[11px] font-bold text-[#71717A]">
            75<span className="text-[9px] font-normal">%</span>
          </div>

          {/* 85% */}
          <div className="absolute right-[16%] bottom-[16px] text-[11px] font-bold text-[#A1A1AA]">
            85<span className="text-[9px] font-normal">%</span>
          </div>
        </div>
      </div>

      {/* Range Axis */}
      <div className="flex justify-between text-[10px] font-medium text-[#A1A1AA] pt-2 pb-3 border-t border-[#F4F4F5]">
        <span>0% (Idle)</span>
        <span>50% (Normal Velocity)</span>
        <span>100% (Monthly Cap)</span>
      </div>

      {/* Headroom & Solvency Context */}
      <div className="pt-3 border-t border-[#F4F4F5] flex items-center justify-between text-xs text-[#71717A] font-medium">
        <span>Available Tier Headroom: <strong className="text-[#059669]">{(100 - percent)}% (3.6M tok)</strong></span>
        <span>Rate Limit Status: <strong className="text-[#16281D]">Unrestricted</strong></span>
      </div>
    </div>
  );
};
