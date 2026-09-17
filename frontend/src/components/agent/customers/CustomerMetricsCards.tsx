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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-[20px] p-4 sm:p-5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] hover:shadow-md hover:border-[#16281D]/20 transition-all duration-200"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <card.Icon size={19} style={{ color: card.iconColor }} />
            </div>
            {'trend' in card && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, ...MONO, fontSize: 11, fontWeight: 700, color: card.trend! >= 0 ? '#15803D' : '#EF4444', background: card.trend! >= 0 ? '#DCFCE7' : '#FEE2E2', padding: '3px 8px', borderRadius: 9999 }}>
                {card.trend! >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {Math.abs(card.trend!)}%
              </div>
            )}
          </div>
          <div style={{ ...MONO, fontSize: 26, fontWeight: 700, color: '#16281D', lineHeight: 1, marginBottom: 4 }}>
            {card.value}
          </div>
          <div style={{ ...PJS, fontSize: 13, fontWeight: 600, color: '#71717A', marginBottom: 2 }}>
            {card.label}
          </div>
          {'trend' in card ? (
            <div style={{ ...PJS, fontSize: 11, color: '#A1A1AA' }}>{metrics.prevLabel}</div>
          ) : (
            <div style={{ ...PJS, fontSize: 11, color: '#A1A1AA' }}>{card.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CustomerMetricsCards;
