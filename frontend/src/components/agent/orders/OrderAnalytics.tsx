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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
      {cards.map(({ Icon, label, value, iconColor, iconBg }) => (
        <div key={label} className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-md hover:border-[#16281D]/20">
          <div style={{ width: 44, height: 44, borderRadius: 14, background: iconBg }} className="flex items-center justify-center shrink-0">
            <Icon size={20} style={{ color: iconColor }} />
          </div>
          <div>
            <div className="font-sans text-xs font-semibold text-[#71717A] mb-1">{label}</div>
            <div className="font-mono text-2xl font-bold text-[#16281D] leading-none">{value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderAnalytics;
