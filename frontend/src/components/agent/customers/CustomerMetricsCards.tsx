import React from 'react';
import { Users, UserPlus, ShoppingBag, Globe, TrendingUp, TrendingDown } from 'lucide-react';
import { Metrics, MONO, PJS } from './CustomerTypes';
import { TimeRange } from '../shared/TimeRangeFilter';

interface CustomerMetricsCardsProps {
  metrics: Metrics;
  timeRange: TimeRange;
}

export const CustomerMetricsCards: React.FC<CustomerMetricsCardsProps> = ({
  metrics,
  timeRange,
}) => {
  const cards = [
    {
      Icon: Users,
      label: 'Total Customers',
      value: metrics.totalCustomers.toLocaleString(),
      sub: timeRange.preset ? 'Registered in period' : 'Registered contacts',
      iconColor: '#16281D',
      iconBg: 'rgba(159,232,112,0.3)',
    },
    {
      Icon: UserPlus,
      label: metrics.label,
      value: metrics.newThisMonth.toLocaleString(),
      sub: null,
      iconColor: '#15803D',
      iconBg: '#DCFCE7',
      trend: metrics.trendPercentage,
    },
    {
      Icon: ShoppingBag,
      label: 'Total Orders',
      value: metrics.totalOrders.toLocaleString(),
      sub: timeRange.preset ? 'Orders in period' : 'Across all customers',
      iconColor: '#0369A1',
      iconBg: '#E0F2FE',
    },
    {
      Icon: Globe,
      label: 'Active Countries',
      value: metrics.activeCountries.toString(),
      sub: timeRange.preset ? 'Active in period' : 'Unique regions',
      iconColor: '#7E22CE',
      iconBg: '#F3E8FF',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-[16px] sm:rounded-[20px] p-3 sm:p-5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] hover:shadow-md hover:border-[#16281D]/20 transition-all duration-200 min-w-0"
        >
          <div className="flex items-start justify-between mb-2 sm:mb-3.5 gap-1.5">
            <div
              className="w-8 h-8 sm:w-[42px] sm:h-[42px] rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: card.iconBg }}
            >
              <card.Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: card.iconColor }} />
            </div>
            {'trend' in card && (
              <div
                className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0"
                style={{
                  color: card.trend! >= 0 ? '#15803D' : '#EF4444',
                  background: card.trend! >= 0 ? '#DCFCE7' : '#FEE2E2',
                }}
              >
                {card.trend! >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(card.trend!)}%
              </div>
            )}
          </div>
          <div className="font-mono text-base sm:text-2xl font-bold text-[#16281D] leading-none mb-1 sm:mb-1.5 truncate">
            {card.value}
          </div>
          <div className="text-xs sm:text-[13px] font-semibold text-[#71717A] mb-0.5 sm:mb-1 truncate">
            {card.label}
          </div>
          {'trend' in card ? (
            <div className="text-[10px] sm:text-[11px] text-[#A1A1AA] truncate">{metrics.prevLabel}</div>
          ) : (
            <div className="text-[10px] sm:text-[11px] text-[#A1A1AA] truncate">{card.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CustomerMetricsCards;
