import React from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Users,
  ShoppingBag,
  BarChart3,
  Settings,
  ChevronRight,
} from 'lucide-react';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export const DashboardQuickActions: React.FC = () => {
  const quickActions = [
    {
      Icon: MessageSquare,
      title: 'Start New Conversation',
      description: 'Message a customer',
      href: '/agent/conversations',
      iconColor: '#22c55e',
      iconBg: 'rgba(34,197,94,0.1)',
    },
    {
      Icon: Users,
      title: 'View Customer Profile',
      description: 'Access customer details',
      href: '/agent/customers',
      iconColor: '#059669',
      iconBg: 'rgba(5,150,105,0.1)',
    },
    {
      Icon: ShoppingBag,
      title: 'Create Order',
      description: 'Process new order',
      href: '/agent/orders',
      iconColor: '#0891b2',
      iconBg: 'rgba(8,145,178,0.1)',
    },
    {
      Icon: BarChart3,
      title: 'View Analytics',
      description: 'Performance reports',
      href: '/agent/analytics',
      iconColor: '#7c3aed',
      iconBg: 'rgba(124,58,237,0.1)',
    },
    {
      Icon: Settings,
      title: 'Account & Balance',
      description: 'Credits & preferences',
      href: '/agent/settings',
      iconColor: '#71717a',
      iconBg: 'rgba(113,113,122,0.1)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
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
          <Plus size={15} style={{ color: '#22c55e' }} />
        </div>
        <div>
          <div style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>
            Quick Actions
          </div>
          <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>Jump to key areas</div>
        </div>
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {quickActions.map((action, index) => (
          <motion.a
            key={action.title}
            href={action.href}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + index * 0.05 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(34,197,94,0.04)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(34,197,94,0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'transparent';
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                flexShrink: 0,
                background: action.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <action.Icon size={16} style={{ color: action.iconColor }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#0c1a0e' }}>
                {action.title}
              </div>
              <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>{action.description}</div>
            </div>
            <ChevronRight size={14} style={{ color: '#d4d4d8', flexShrink: 0 }} />
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
};
