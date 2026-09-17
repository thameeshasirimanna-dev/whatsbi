import React from 'react';
import { MessageSquare, Cpu, Coins, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { FleetOverviewData, MessageTelemetryData, AiTelemetryData } from './types';

interface AnalyticsKpiStripProps {
  fleet: FleetOverviewData;
  messages: MessageTelemetryData;
  ai: AiTelemetryData;
}

export const AnalyticsKpiStrip: React.FC<AnalyticsKpiStripProps> = ({
  fleet,
  messages,
  ai,
}) => {
  const activePercent =
    fleet.totalAgents > 0
      ? Math.round((fleet.activeWhatsAppCount / fleet.totalAgents) * 100)
      : 0;

  const tokensToDisplay = ai.tokensInPeriod || ai.totalTokens;
  const totalTokensFormatted =
    tokensToDisplay >= 1_000_000
      ? `${(tokensToDisplay / 1_000_000).toFixed(1)}M`
      : `${(tokensToDisplay / 1_000).toFixed(0)}k`;

  const messagesToDisplay = messages.messagesInPeriod || messages.totalMessages;

  const kpis = [
    {
      id: 'throughput',
      label: 'Message Throughput',
      mainValue: messagesToDisplay.toLocaleString(),
      unit: 'msgs',
      badge: `${messages.peakRate} msg/s peak`,
      badgeColor: 'bg-[#9FE870] text-[#16281D]',
      subText: `Total fleet: ${messages.totalMessages.toLocaleString()} all-time`,
      Icon: MessageSquare,
      iconBg: 'bg-[#E8F8EE] text-[#059669]',
    },
    {
      id: 'tokens',
      label: 'DeepSeek AI Tokens',
      mainValue: totalTokensFormatted,
      unit: 'tokens',
      badge: `${ai.avgTokensPerTurn} tok/turn`,
      badgeColor: 'bg-[#F4F7F4] text-[#16281D]',
      subText: `${ai.quotaUtilizationPercent}% monthly quota used`,
      Icon: Cpu,
      iconBg: 'bg-[#F0FDF4] text-[#15803D]',
    },
    {
      id: 'liquidity',
      label: 'Fleet AI Liquidity',
      mainValue: `$${fleet.totalAiBalance.toFixed(2)}`,
      unit: 'USD',
      badge:
        fleet.lowBalanceCount > 0
          ? `${fleet.lowBalanceCount} low (< $2)`
          : 'Healthy liquidity',
      badgeColor:
        fleet.lowBalanceCount > 0
          ? 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
          : 'bg-[#F0FDF4] text-[#15803D]',
      subText: `${fleet.totalCredits.toFixed(0)} platform credits held`,
      Icon: Coins,
      iconBg: 'bg-[#FEF9C3] text-[#A16207]',
    },
    {
      id: 'connectivity',
      label: 'Fleet Connectivity',
      mainValue: `${activePercent}%`,
      unit: 'active',
      badge: `${ai.uptimePercent}% uptime`,
      badgeColor: 'bg-[#E8F8EE] text-[#059669]',
      subText: `${fleet.activeWhatsAppCount} of ${fleet.totalAgents} routing live`,
      Icon: Zap,
      iconBg: 'bg-[#E0F2FE] text-[#0284C7]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi) => {
        const IconComponent = kpi.Icon;
        return (
          <div
            key={kpi.id}
            className="bg-white rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-5 md:p-6 border border-[#EAEAEA] shadow-sm hover:border-[#9FE870] hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-4"
          >
            {/* Top row: Label + Icon */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
                {kpi.label}
              </span>
              <div
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full ${kpi.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}
              >
                <IconComponent size={15} strokeWidth={2.4} />
              </div>
            </div>

            {/* Middle: Big Metric + Unit */}
            <div>
              <div className="flex items-baseline gap-1 leading-none mb-1.5 sm:mb-2">
                <span className="text-xl sm:text-3xl font-extrabold text-[#16281D] tracking-tight">
                  {kpi.mainValue}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-[#8FA89B]">
                  {kpi.unit}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.badgeColor} truncate`}
                >
                  {kpi.badge}
                </span>
              </div>
            </div>

            {/* Bottom Row: Context subText */}
            <div className="pt-2 sm:pt-2.5 border-t border-[#F4F4F5] flex items-center justify-between text-[10px] sm:text-xs font-medium text-[#71717A] truncate">
              <span className="truncate">{kpi.subText}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
