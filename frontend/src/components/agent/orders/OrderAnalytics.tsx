import React from 'react';
import { ShoppingBag, Clock, CheckCircle } from 'lucide-react';

interface OrderAnalyticsProps {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
}

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const OrderAnalytics: React.FC<OrderAnalyticsProps> = ({ totalOrders, pendingOrders, completedOrders }) => {
  const cards = [
    { Icon: ShoppingBag, label: 'Total Orders', value: totalOrders, iconColor: '#22c55e', iconBg: 'rgba(34,197,94,0.1)' },
    { Icon: Clock, label: 'Pending Orders', value: pendingOrders, iconColor: '#d97706', iconBg: 'rgba(217,119,6,0.1)' },
    { Icon: CheckCircle, label: 'Completed Orders', value: completedOrders, iconColor: '#0891b2', iconBg: 'rgba(8,145,178,0.1)' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5" style={{ marginBottom: 24 }}>
      {cards.map(({ Icon, label, value, iconColor, iconBg }) => (
        <div key={label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} style={{ color: iconColor }} />
          </div>
          <div>
            <div style={{ ...DM, fontSize: 12, fontWeight: 500, color: '#71717a', marginBottom: 2 }}>{label}</div>
            <div style={{ ...SYNE, fontSize: 26, fontWeight: 800, color: '#0c1a0e', lineHeight: 1 }}>{value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderAnalytics;
