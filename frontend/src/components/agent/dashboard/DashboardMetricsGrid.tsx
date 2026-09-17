import React from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  MessageSquare,
  Users,
  ShoppingBag,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { DashboardMetrics } from './dashboard.types';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface DashboardMetricsGridProps {
  metrics: DashboardMetrics;
  balance?: number;
}

export const DashboardMetricsGrid: React.FC<DashboardMetricsGridProps> = ({
  metrics,
  balance = 4.0,
}) => {
  const formattedBalance = typeof balance === 'number' ? balance.toFixed(2) : parseFloat(String(balance) || '0').toFixed(2);

  const metricCards = [
    {
      title: 'Available Balance',
      value: `$${formattedBalance}`,
      badge: 'USD',
      trend: 'up' as const,
      change: 'USD',
      icon: Wallet,
      iconColor: '#16a34a',
      iconBg: 'rgba(22, 163, 74, 0.1)',
      description: 'AI query balance',
    },
    {
      title: 'Active Conversations',
      value: metrics.activeConversations,
      badge: null,
      trend: 'up' as const,
      change: `+${metrics.activeConversations}`,
      icon: MessageSquare,
      iconColor: '#22c55e',
      iconBg: 'rgba(34, 197, 94, 0.1)',
      description: 'Live customer conversations',
    },
    {
      title: 'Total Customers',
      value: metrics.totalCustomers,
      badge: null,
      trend: 'up' as const,
      change: `+${metrics.totalCustomers}`,
      icon: Users,
      iconColor: '#059669',
      iconBg: 'rgba(5, 150, 105, 0.1)',
      description: 'Registered customers',
    },
    {
      title: 'Orders Today',
      value: metrics.ordersToday,
      badge: null,
      trend: 'down' as const,
      change: '0',
      icon: ShoppingBag,
      iconColor: '#0891b2',
      iconBg: 'rgba(8, 145, 178, 0.1)',
      description: 'New orders received',
    },
    {
      title: 'Avg Response Time',
      value: metrics.avgResponseTime || '2.3 min',
      badge: null,
      trend: 'down' as const,
      change: '-0.4',
      icon: Clock,
      iconColor: '#d97706',
      iconBg: 'rgba(217, 119, 6, 0.1)',
      description: 'Average reply time',
    },
  ];

  const getTrendIcon = (trend: 'up' | 'down') =>
    trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
      {metricCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.35 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: '20px 20px',
              border: '1px solid #ebebeb',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              cursor: 'default',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: card.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} style={{ color: card.iconColor }} />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 9999,
                    background:
                      card.badge
                        ? 'rgba(22, 163, 74, 0.08)'
                        : card.trend === 'up'
                        ? 'rgba(34,197,94,0.08)'
                        : 'rgba(244,63,94,0.08)',
                    color:
                      card.badge
                        ? '#15803d'
                        : card.trend === 'up'
                        ? '#059669'
                        : '#f43f5e',
                    ...DM,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {!card.badge && getTrendIcon(card.trend)}
                  {card.badge ? card.badge : card.change}
                </div>
              </div>

              <div
                style={{
                  ...SYNE,
                  fontSize: 26,
                  fontWeight: 700,
                  color: '#0c1a0e',
                  lineHeight: 1,
                  marginBottom: 4,
                  letterSpacing: '-0.02em',
                }}
              >
                {card.value}
              </div>

              <div
                style={{
                  ...DM,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#3f3f46',
                  marginBottom: 2,
                }}
              >
                {card.title}
              </div>
            </div>

            <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginTop: 6 }}>
              {card.description}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
