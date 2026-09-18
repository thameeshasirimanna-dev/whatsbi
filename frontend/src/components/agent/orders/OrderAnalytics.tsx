import React from 'react';
import { ShoppingBag, Clock, CheckCircle } from 'lucide-react';

interface OrderAnalyticsProps {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
}

const OrderAnalytics: React.FC<OrderAnalyticsProps> = ({ totalOrders, pendingOrders, completedOrders }) => {
  const cards = [
    { Icon: ShoppingBag, label: 'Total Orders', value: totalOrders, iconColor: '#16281D', iconBg: 'rgba(159,232,112,0.3)' },
    { Icon: Clock, label: 'Pending Orders', value: pendingOrders, iconColor: '#D97706', iconBg: '#FEF3C7' },
    { Icon: CheckCircle, label: 'Completed Orders', value: completedOrders, iconColor: '#22C55E', iconBg: '#DCFCE7' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      {cards.map(({ Icon, label, value, iconColor, iconBg }) => (
        <div
          key={label}
          className="col-span-1 last:col-span-2 md:last:col-span-1 bg-white rounded-[16px] sm:rounded-[20px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-3 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all duration-200 hover:shadow-md hover:border-[#16281D]/20 min-w-0"
        >
          <div
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: iconBg }}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: iconColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-sans text-xs font-semibold text-[#71717A] mb-0.5 sm:mb-1 truncate">{label}</div>
            <div className="font-mono text-base sm:text-2xl font-bold text-[#16281D] leading-none truncate">{value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderAnalytics;
