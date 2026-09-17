import React from 'react';
import { Users, ShoppingBag, DollarSign, CalendarDays } from 'lucide-react';
import type { AnalyticsData } from '../../../hooks/useAnalytics';

interface AnalyticsMetricCardsProps {
  analytics: AnalyticsData;
}

const AnalyticsMetricCards: React.FC<AnalyticsMetricCardsProps> = ({ analytics }) => {
  const cards = [
    {
      title: 'Total Customers',
      value: analytics.totalCustomers.toLocaleString(),
      percentage: analytics.customerGrowth,
      icon: Users,
      iconBg: 'bg-[#9FE870]/20',
      iconColor: 'text-[#16281D]',
    },
    {
      title: 'Total Orders',
      value: analytics.totalOrders.toLocaleString(),
      percentage: analytics.orderGrowth,
      icon: ShoppingBag,
      iconBg: 'bg-[#3B82F6]/10',
      iconColor: 'text-[#2563EB]',
    },
    {
      title: 'Total Revenue',
      value: `$${analytics.totalRevenue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      percentage: analytics.revenueGrowth,
      icon: DollarSign,
      iconBg: 'bg-[#22C55E]/10',
      iconColor: 'text-[#15803D]',
    },
    {
      title: 'Total Appointments',
      value: analytics.totalAppointments.toLocaleString(),
      percentage: analytics.appointmentGrowth,
      icon: CalendarDays,
      iconBg: 'bg-[#7C3AED]/10',
      iconColor: 'text-[#7C3AED]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositive = card.percentage ? card.percentage.startsWith('+') : true;

        return (
          <div
            key={card.title}
            className="bg-white rounded-[20px] p-5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-[#71717A] mb-1">{card.title}</p>
              <h3 className="font-mono text-2xl font-extrabold text-[#16281D] tracking-tight">
                {card.value}
              </h3>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div
                className={`w-10 h-10 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}
              >
                <Icon size={18} />
              </div>
              {card.percentage && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                    isPositive
                      ? 'bg-[#22C55E]/10 text-[#15803D]'
                      : 'bg-[#EF4444]/10 text-[#EF4444]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPositive ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                    }`}
                  />
                  {card.percentage}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalyticsMetricCards;
