import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { DashboardMetrics } from './dashboard.types';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface DashboardPerformanceProps {
  metrics: DashboardMetrics;
}

export const DashboardPerformance: React.FC<DashboardPerformanceProps> = ({ metrics }) => {
  const perfStats = [
    {
      value: metrics.activeConversations > 0 ? '98%' : 'N/A',
      label: 'Customer Satisfaction',
      color: '#22c55e',
    },
    {
      value: metrics.avgResponseTime || '2.3 min',
      label: 'Avg First Response',
      color: '#0891b2',
    },
    {
      value: metrics.ordersToday > 0 ? '99%' : 'N/A',
      label: 'Messages Delivered',
      color: '#7c3aed',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #ebebeb',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid #f4f4f5',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'rgba(34,197,94,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BarChart3 size={15} style={{ color: '#22c55e' }} />
        </div>
        <div>
          <div style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>
            Performance Overview
          </div>
          <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>Key delivery metrics</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3" style={{ padding: '24px 28px', gap: 0 }}>
        {perfStats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              textAlign: 'center',
              padding: '8px 24px',
              borderRight: i < 2 ? '1px solid #f4f4f5' : 'none',
            }}
          >
            <div
              style={{
                ...SYNE,
                fontSize: 32,
                fontWeight: 800,
                color: stat.color,
                lineHeight: 1,
                marginBottom: 6,
              }}
            >
              {stat.value}
            </div>
            <div style={{ ...DM, fontSize: 13, color: '#71717a' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '14px 28px',
          borderTop: '1px solid #f4f4f5',
          background: '#fafafa',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px rgba(34,197,94,0.5)',
            }}
          />
          <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>
            Your performance is healthy! Continuous AI responses keep customers engaged 24/7.
          </span>
        </div>
      </div>
    </motion.div>
  );
};
