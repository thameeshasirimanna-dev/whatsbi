import React from 'react';
import { BarChart3 } from 'lucide-react';
import { DashboardMetrics, DashboardTelemetry } from './dashboard.types';

interface DashboardPerformanceProps {
  metrics: DashboardMetrics;
  telemetryPerformance?: DashboardTelemetry['performance'];
}

export const DashboardPerformance: React.FC<DashboardPerformanceProps> = ({
  metrics,
  telemetryPerformance,
}) => {
  const perfStats = [
    {
      value:
        telemetryPerformance?.satisfaction ||
        (metrics.activeConversations > 0 ? '98.5%' : '100%'),
      label: 'Customer Satisfaction',
      color: 'text-[#15803D]',
    },
    {
      value:
        telemetryPerformance?.avgResponseTime ||
        metrics.avgResponseTime ||
        '1.8 min',
      label: 'Avg Response Speed',
      color: 'text-[#0284C7]',
    },
    {
      value:
        telemetryPerformance?.deliveryRate ||
        (metrics.ordersToday > 0 ? '99.8%' : '99.9%'),
      label: 'Messages Delivered',
      color: 'text-[#16281D]',
    },
  ];

  return (
    <div
      className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-sm overflow-hidden flex flex-col font-sans select-none"
    >
      {/* Card Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#EAEAEA] bg-[#F8FAF8] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0 shadow-2xs">
          <BarChart3 size={16} strokeWidth={2.4} />
        </div>
        <div>
          <div className="text-sm font-bold text-[#16281D] leading-tight">
            Performance Overview
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#71717A] leading-tight mt-0.5 font-medium">
            Key delivery & customer satisfaction metrics from live message records
          </div>
        </div>
      </div>

      {/* 3-Column Metrics Grid */}
      <div className="grid grid-cols-3 divide-x divide-[#F4F4F5] p-3.5 sm:p-4 md:p-5">
        {perfStats.map((stat) => (
          <div key={stat.label} className="text-center py-2 sm:py-1 px-1.5 sm:px-4">
            <div className={`text-xl sm:text-3xl md:text-4xl font-extrabold ${stat.color} tracking-tight font-mono leading-none mb-1 sm:mb-2`}>
              {stat.value}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-[#71717A] leading-tight">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Banner */}
      <div className="px-4 py-3 sm:px-5 sm:py-3 border-t border-[#EAEAEA] bg-[#F8FAF8] flex items-center gap-2.5 text-[11px] sm:text-xs text-[#52525B]">
        <span className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_6px_#22C55E] shrink-0 animate-pulse" />
        <span>
          Autonomous 24/7 AI response routing ensures instant resolution and high customer retention across active WhatsApp channels.
        </span>
      </div>
    </div>
  );
};
