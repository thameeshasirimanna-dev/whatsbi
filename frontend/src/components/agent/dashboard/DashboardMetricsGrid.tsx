import React from 'react';
import {
  Wallet,
  FileText,
  MessageSquare,
  Users,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import { DashboardMetrics } from './dashboard.types';

interface DashboardMetricsGridProps {
  metrics: DashboardMetrics;
  balance?: number;
  templateCredits?: number;
}

export const DashboardMetricsGrid: React.FC<DashboardMetricsGridProps> = ({
  metrics,
  balance = 4.0,
  templateCredits,
}) => {
  const formattedBalance =
    typeof balance === 'number'
      ? balance.toFixed(1)
      : parseFloat(String(balance) || '0').toFixed(1);

  const rawCredits = templateCredits ?? metrics.template_credits ?? 0;
  const formattedCredits =
    typeof rawCredits === 'number'
      ? Math.floor(rawCredits)
      : parseInt(String(rawCredits) || '0', 10);

  const metricCards = [
    {
      title: 'AI Balance',
      value: `$${formattedBalance}`,
      badge: 'USD',
      trend: 'up' as const,
      change: 'USD',
      icon: Wallet,
      iconColor: 'text-[#15803D]',
      iconBg: 'bg-[#F0FDF4] border border-[#BBF7D0]',
      description: 'Live AI query liquidity',
    },
    {
      title: 'Template Credits',
      value: formattedCredits,
      badge: 'Msg',
      trend: 'up' as const,
      change: 'Credits',
      icon: FileText,
      iconColor: 'text-[#059669]',
      iconBg: 'bg-[#ECFDF5] border border-[#A7F3D0]',
      description: 'WhatsApp template credits',
    },
    {
      title: 'Active Conversations',
      value: metrics.activeConversations,
      badge: null,
      trend: 'up' as const,
      change: `+${metrics.activeConversations}`,
      icon: MessageSquare,
      iconColor: 'text-[#16A34A]',
      iconBg: 'bg-[#F0FDF4] border border-[#BBF7D0]',
      description: 'Active customer chats',
    },
    {
      title: 'Total Customers',
      value: metrics.totalCustomers,
      badge: null,
      trend: 'up' as const,
      change: `+${metrics.totalCustomers}`,
      icon: Users,
      iconColor: 'text-[#0284C7]',
      iconBg: 'bg-[#F0F9FF] border border-[#BAE6FD]',
      description: 'Verified contact profiles',
    },
    {
      title: 'Orders Today',
      value: metrics.ordersToday,
      badge: null,
      trend: metrics.ordersToday > 0 ? ('up' as const) : ('neutral' as const),
      change: `${metrics.ordersToday}`,
      icon: ShoppingBag,
      iconColor: 'text-[#7C3AED]',
      iconBg: 'bg-[#F5F3FF] border border-[#DDD6FE]',
      description: 'WhatsApp catalog orders',
    },
    {
      title: 'Avg Response Time',
      value: metrics.avgResponseTime || '1.8 min',
      badge: null,
      trend: 'down' as const,
      change: '-0.4',
      icon: Clock,
      iconColor: 'text-[#D97706]',
      iconBg: 'bg-[#FFFBEB] border border-[#FDE68A]',
      description: 'Automated AI reply speed',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3 md:gap-3.5">
      {metricCards.map((card) => {
        const Icon = card.icon;
        const isPositive = card.trend === 'up';
        const isNegative = card.trend === 'down';

        return (
          <div
            key={card.title}
            className="col-span-1 bg-white rounded-[20px] sm:rounded-[24px] border border-[#EAEAEA] p-3 sm:p-4 md:p-5 shadow-xs hover:shadow-[0_12px_28px_rgba(20,40,24,0.08)] transition-shadow duration-200 flex flex-col justify-between min-w-0"
          >
            <div>
              {/* Header: Icon container + Trend/Status Badge */}
              <div className="flex items-start justify-between gap-1 mb-2 sm:mb-3">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 shadow-xs`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.4} />
                </div>

                <div
                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold shrink-0 ${
                    card.badge
                      ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                      : isPositive
                      ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                      : isNegative
                      ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]'
                      : 'bg-[#F4F7F4] text-[#52525B] border border-black/5'
                  }`}
                >
                  {!card.badge ? (
                    <>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isPositive ? 'bg-[#22C55E]' : isNegative ? 'bg-[#EF4444]' : 'bg-[#71717A]'
                        }`}
                      />
                      <span className="truncate max-w-[45px] sm:max-w-none">{card.change}</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                      <span>{card.badge}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Numeric Value */}
              <div className="text-lg sm:text-2xl lg:text-[25px] font-extrabold text-[#16281D] tracking-tight leading-tight font-mono truncate">
                {card.value}
              </div>

              {/* Title */}
              <div className="text-xs sm:text-[13px] font-bold text-[#52525B] mt-0.5 sm:mt-1 truncate">
                {card.title}
              </div>
            </div>

            {/* Description / Footer */}
            <div className="text-[10px] sm:text-[11px] text-[#71717A] mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-[#F4F4F5] flex items-center justify-between font-medium">
              <span className="truncate">{card.description}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
