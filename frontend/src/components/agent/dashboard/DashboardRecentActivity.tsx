import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MessageSquare, ShoppingBag, Users, Search } from 'lucide-react';
import { RecentActivity } from './dashboard.types';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const formatRelativeTime = (timeStr: string) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((todayMidnight.getTime() - targetMidnight.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }
};

const getStatusColor = (status: RecentActivity['status']): React.CSSProperties => {
  switch (status) {
    case 'new':
      return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
    case 'active':
      return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
    case 'completed':
      return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
    default:
      return { background: 'rgba(113,113,122,0.1)', color: '#71717a' };
  }
};

const getActivityIconColor = (type: RecentActivity['type']): { bg: string; color: string } => {
  switch (type) {
    case 'conversation':
      return { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' };
    case 'order':
      return { bg: 'rgba(8,145,178,0.1)', color: '#0891b2' };
    case 'customer':
      return { bg: 'rgba(5,150,105,0.1)', color: '#059669' };
  }
};

interface DashboardRecentActivityProps {
  recentActivity: RecentActivity[];
}

export const DashboardRecentActivity: React.FC<DashboardRecentActivityProps> = ({
  recentActivity,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="lg:col-span-2"
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
          <Clock size={15} style={{ color: '#22c55e' }} />
        </div>
        <div>
          <div style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>
            Recent Activity
          </div>
          <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>
            {recentActivity.length} events
          </div>
        </div>
      </div>

      <div>
        {recentActivity.map((activity, index) => {
          const actColor = getActivityIconColor(activity.type);
          const statusStyle = getStatusColor(activity.status);
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.07 }}
              style={{
                padding: '14px 22px',
                borderBottom: '1px solid #f9f9f9',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                transition: 'background 0.12s',
                cursor: 'default',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(34,197,94,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: actColor.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activity.type === 'conversation' && (
                  <MessageSquare size={16} style={{ color: actColor.color }} />
                )}
                {activity.type === 'order' && (
                  <ShoppingBag size={16} style={{ color: actColor.color }} />
                )}
                {activity.type === 'customer' && (
                  <Users size={16} style={{ color: actColor.color }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 3,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      ...DM,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0c1a0e',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {activity.title}
                  </span>
                  <span
                    style={{
                      ...DM,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 9999,
                      ...statusStyle,
                      textTransform: 'capitalize',
                      flexShrink: 0,
                    }}
                  >
                    {activity.status}
                  </span>
                </div>
                <div style={{ ...DM, fontSize: 12, color: '#71717a', marginBottom: 2 }}>
                  {activity.description}
                </div>
                <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>
                  {formatRelativeTime(activity.time)}
                </div>
              </div>
            </motion.div>
          );
        })}

        {recentActivity.length === 0 && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <Search size={20} style={{ color: '#d4d4d8' }} />
            </div>
            <div
              style={{ ...DM, fontSize: 14, fontWeight: 500, color: '#3f3f46', marginBottom: 4 }}
            >
              No recent activity
            </div>
            <div style={{ ...DM, fontSize: 12, color: '#a1a1aa' }}>
              Your activity will appear here as you interact with customers
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
