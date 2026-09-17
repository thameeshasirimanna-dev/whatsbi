import React, { useState } from 'react';
import { Clock, ChevronDown, ArrowUpRight, MessageSquareCode } from 'lucide-react';
import { MessageTelemetryData } from './types';

interface MessageThroughputChartProps {
  data: MessageTelemetryData;
}

export const MessageThroughputChart: React.FC<MessageThroughputChartProps> = ({ data }) => {
  const [interval, setInterval] = useState<'hourly' | 'daily'>('hourly');

  // Generate responsive wave coordinates from hourly throughput or fallback
  const throughputPoints = data.hourlyThroughput.length > 0
    ? data.hourlyThroughput
    : [
        { hour: '08:00', count: 42 },
        { hour: '10:00', count: 90 },
        { hour: '12:00', count: 68 },
        { hour: '14:00', count: 75 },
        { hour: '16:00', count: 88 },
        { hour: '18:00', count: 54 },
      ];

  const maxVal = Math.max(...throughputPoints.map((p) => p.count), 100);

  // Map to SVG coordinates (width 320, height 90)
  const coords = throughputPoints.map((pt, idx) => {
    const x = 15 + (idx / (throughputPoints.length - 1 || 1)) * 290;
    // higher count -> lower y in SVG (invert)
    const y = 80 - (pt.count / maxVal) * 60;
    return { x, y, label: pt.label || pt.hour || '', count: pt.count };
  });

  // Construct SVG cubic path
  const pathD = coords.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
  }, '');

  // Area under path
  const areaD = `${pathD} L ${coords[coords.length - 1]?.x || 305} 85 L ${coords[0]?.x || 15} 85 Z`;

  const total = data.inboundMessages + data.outboundMessages || 1;
  const inboundPercent = Math.round((data.inboundMessages / total) * 100);
  const outboundPercent = 100 - inboundPercent;

  return (
    <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
              Message Throughput Waveform
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F8EE] text-[#059669]">
              Real-time
            </span>
          </div>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Live velocity of inbound inquiries and autonomous AI responses
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

      {/* Traffic Waveform Visualization (Style Guide Section 1) */}
      <div className="relative my-3 h-32 flex items-center justify-center">
        <svg viewBox="0 0 320 95" className="w-full h-full overflow-visible" fill="none">
          <defs>
            <linearGradient id="waveFillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9FE870" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#9FE870" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Baseline reference lines */}
          <path d="M 10 50 L 310 50" stroke="#F4F7F4" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M 10 85 L 310 85" stroke="#EAEAEA" strokeWidth="1" />

          {/* Area fill */}
          <path d={areaD} fill="url(#waveFillGrad)" />

          {/* Wave stroke line */}
          <path
            d={pathD}
            stroke="#9FE870"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Peak point circles */}
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

        {/* Floating Peak Callout Badge */}
        <div className="absolute left-[36%] top-[8px] bg-[#9FE870] text-[#16281D] font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-[0_2px_8px_rgba(159,232,112,0.45)]">
          {data.peakRate} msg/s peak
        </div>

        {/* Big Numeric Callout */}
        <div className="absolute right-2 bottom-1 text-right">
          <span className="text-2xl md:text-3xl font-extrabold text-[#16281D] leading-none tracking-tight">
            {data.peakRate}
          </span>
          <span className="text-[11px] text-[#8FA89B] font-bold ml-1">
            msg/s
          </span>
        </div>
      </div>

      {/* Time axis */}
      <div className="flex justify-between text-[10px] font-medium text-[#A1A1AA] pt-2 pb-3 border-t border-[#F4F4F5]">
        {coords.map((c, idx) => (
          <span key={idx}>{c.label}</span>
        ))}
      </div>

      {/* Traffic Composition Breakdown Pill */}
      <div className="pt-3 border-t border-[#F4F4F5] flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#16281D]">
          <span>Fleet Message Composition</span>
          <span className="text-[11px] text-[#71717A] font-semibold">
            {data.totalMessages.toLocaleString()} Total
          </span>
        </div>

        {/* Multi-segment progress bar */}
        <div className="w-full h-2 rounded-full bg-[#F4F7F4] overflow-hidden flex">
          <div
            style={{ width: `${inboundPercent}%` }}
            className="h-full bg-[#16281D] rounded-l-full transition-all duration-500"
            title={`Inbound: ${data.inboundMessages.toLocaleString()}`}
          />
          <div
            style={{ width: `${outboundPercent}%` }}
            className="h-full bg-[#9FE870] rounded-r-full transition-all duration-500"
            title={`Outbound AI: ${data.outboundMessages.toLocaleString()}`}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] font-medium pt-1">
          <div className="flex items-center gap-1.5 text-[#16281D]">
            <span className="w-2 h-2 rounded-full bg-[#16281D]" />
            <span>Inbound ({inboundPercent}%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#059669]">
            <span className="w-2 h-2 rounded-full bg-[#9FE870]" />
            <span>Outbound AI ({outboundPercent}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
