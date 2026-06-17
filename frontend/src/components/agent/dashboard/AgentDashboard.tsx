import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getToken } from '../../../lib/auth';
import { SkeletonPage } from "../shared/Skeleton";
import {
  MessageSquare,
  Users,
  ShoppingBag,
  Clock,
  BarChart3,
  Settings,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const formatRelativeTime = (timeStr: string) => {
  if (!timeStr) return "";
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((todayMidnight.getTime() - targetMidnight.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }
};

interface Metric {
  title: string;
  value: string | number;
  change: string;
  trend: "up" | "down";
  color: string;
  icon: React.ReactNode;
  description?: string;
}

interface RecentActivity {
  id: string;
  type: 'conversation' | 'order' | 'customer';
  title: string;
  description: string;
  time: string;
  status: 'new' | 'active' | 'completed';
}

const METRIC_META = [
  { iconColor: '#22c55e', iconBg: 'rgba(34,197,94,0.1)', Icon: MessageSquare },
  { iconColor: '#059669', iconBg: 'rgba(5,150,105,0.1)', Icon: Users },
  { iconColor: '#0891b2', iconBg: 'rgba(8,145,178,0.1)', Icon: ShoppingBag },
  { iconColor: '#d97706', iconBg: 'rgba(217,119,6,0.1)', Icon: Clock },
];

const DashboardContent: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      title: "Active Conversations",
      value: "0",
      change: "+0",
      trend: "up" as const,
      color: "",
      icon: null,
      description: "Live customer conversations"
    },
    {
      title: "Total Customers",
      value: "0",
      change: "+0",
      trend: "up" as const,
      color: "",
      icon: null,
      description: "Registered customers"
    },
    {
      title: "Orders Today",
      value: "0",
      change: "0",
      trend: "down" as const,
      color: "",
      icon: null,
      description: "New orders received"
    },
    {
      title: "Avg Response Time",
      value: "0 min",
      change: "0",
      trend: "down" as const,
      color: "",
      icon: null,
      description: "Average reply time"
    }
  ]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [agent, setAgent] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) {
          setError("User not authenticated");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-dashboard-data`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          setError("Failed to fetch dashboard data");
          return;
        }

        const dashboardResponse = await response.json();
        if (!dashboardResponse.success || !dashboardResponse.data) {
          setError("Failed to load dashboard data");
          return;
        }

        const data = dashboardResponse.data;

        setAgent(data.agent);
        setRecentActivity(data.recentActivity);

        setMetrics(prev => [
          { ...prev[0], value: data.metrics.activeConversations, change: `+${data.metrics.activeConversations}` },
          { ...prev[1], value: data.metrics.totalCustomers, change: `+${data.metrics.totalCustomers}` },
          { ...prev[2], value: data.metrics.ordersToday, change: `+${data.metrics.ordersToday}` },
          { ...prev[3], value: data.metrics.avgResponseTime, change: "-0.4" }
        ]);

        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <SkeletonPage type="dashboard" />;
  }

  if (error) {
    return (
      <div style={{ minHeight: '100%', background: '#f8faf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <AlertTriangle size={24} style={{ color: '#f43f5e' }} />
          </div>
          <div style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e', marginBottom: 8 }}>
            Error Loading Dashboard
          </div>
          <div style={{ ...DM, fontSize: 14, color: '#71717a', marginBottom: 24 }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 9999,
              padding: '10px 24px',
              ...SYNE,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: "up" | "down") =>
    trend === "up"
      ? <TrendingUp size={12} />
      : <TrendingDown size={12} />;

  const getStatusColor = (status: RecentActivity['status']): React.CSSProperties => {
    switch (status) {
      case 'new': return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
      case 'active': return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
      case 'completed': return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
      default: return { background: 'rgba(113,113,122,0.1)', color: '#71717a' };
    }
  };

  const getActivityIconColor = (type: RecentActivity['type']): { bg: string; color: string } => {
    switch (type) {
      case 'conversation': return { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' };
      case 'order': return { bg: 'rgba(8,145,178,0.1)', color: '#0891b2' };
      case 'customer': return { bg: 'rgba(5,150,105,0.1)', color: '#059669' };
    }
  };

  const quickActions = [
    { Icon: MessageSquare, title: "Start New Conversation", description: "Message a customer", href: "/agent/conversations", iconColor: '#22c55e', iconBg: 'rgba(34,197,94,0.1)' },
    { Icon: Users, title: "View Customer Profile", description: "Access customer details", href: "/agent/customers", iconColor: '#059669', iconBg: 'rgba(5,150,105,0.1)' },
    { Icon: ShoppingBag, title: "Create Order", description: "Process new order", href: "/agent/orders", iconColor: '#0891b2', iconBg: 'rgba(8,145,178,0.1)' },
    { Icon: BarChart3, title: "View Analytics", description: "Performance reports", href: "/agent/analytics", iconColor: '#7c3aed', iconBg: 'rgba(124,58,237,0.1)' },
    { Icon: Settings, title: "Account Settings", description: "Update preferences", href: "/agent/settings", iconColor: '#71717a', iconBg: 'rgba(113,113,122,0.1)' },
  ];

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: '#0c1a0e',
          borderRadius: 16,
          padding: '28px 32px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -40, right: 80, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: 120, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(5,150,105,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.6)' }} />
            <span style={{ ...DM, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Live Dashboard</span>
          </div>
          <h1 style={{ ...SYNE, fontSize: 24, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4 }}>
            Welcome back, {agent?.name || 'Agent'}!
          </h1>
          <p style={{ ...DM, fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Monitor your WhatsApp business performance and customer interactions
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
          <div style={{ ...SYNE, fontSize: 22, fontWeight: 700, color: '#4ade80', letterSpacing: '0.02em' }}>
            {currentTime}
          </div>
          <div style={{ ...DM, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, index) => {
          const meta = METRIC_META[index];
          const Icon = meta.Icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: '20px 22px',
                border: '1px solid #ebebeb',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                cursor: 'default',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: meta.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} style={{ color: meta.iconColor }} />
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 9999,
                  background: metric.trend === 'up' ? 'rgba(34,197,94,0.08)' : 'rgba(244,63,94,0.08)',
                  color: metric.trend === 'up' ? '#059669' : '#f43f5e',
                  ...DM, fontSize: 11, fontWeight: 600,
                }}>
                  {getTrendIcon(metric.trend)}
                  {metric.change}
                </div>
              </div>
              <div style={{ ...SYNE, fontSize: 28, fontWeight: 700, color: '#0c1a0e', lineHeight: 1, marginBottom: 4 }}>
                {metric.value}
              </div>
              <div style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#3f3f46', marginBottom: 2 }}>
                {metric.title}
              </div>
              <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>
                {metric.description}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Activity */}
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
          <div style={{
            padding: '18px 22px',
            borderBottom: '1px solid #f4f4f5',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={15} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <div style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>Recent Activity</div>
              <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>{recentActivity.length} events</div>
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
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    transition: 'background 0.12s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: actColor.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {activity.type === 'conversation' && <MessageSquare size={16} style={{ color: actColor.color }} />}
                    {activity.type === 'order' && <ShoppingBag size={16} style={{ color: actColor.color }} />}
                    {activity.type === 'customer' && <Users size={16} style={{ color: actColor.color }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activity.title}
                      </span>
                      <span style={{
                        ...DM, fontSize: 10, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 9999,
                        ...statusStyle,
                        textTransform: 'capitalize',
                        flexShrink: 0,
                      }}>
                        {activity.status}
                      </span>
                    </div>
                    <div style={{ ...DM, fontSize: 12, color: '#71717a', marginBottom: 2 }}>{activity.description}</div>
                    <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>{formatRelativeTime(activity.time)}</div>
                  </div>
                </motion.div>
              );
            })}

            {recentActivity.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <Search size={20} style={{ color: '#d4d4d8' }} />
                </div>
                <div style={{ ...DM, fontSize: 14, fontWeight: 500, color: '#3f3f46', marginBottom: 4 }}>No recent activity</div>
                <div style={{ ...DM, fontSize: 12, color: '#a1a1aa' }}>Your activity will appear here as you interact with customers</div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
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
          <div style={{
            padding: '18px 22px',
            borderBottom: '1px solid #f4f4f5',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={15} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <div style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>Quick Actions</div>
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
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(34,197,94,0.04)';
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(34,197,94,0.15)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'transparent';
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: action.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <action.Icon size={16} style={{ color: action.iconColor }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#0c1a0e' }}>{action.title}</div>
                  <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>{action.description}</div>
                </div>
                <ChevronRight size={14} style={{ color: '#d4d4d8', flexShrink: 0 }} />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Performance Overview */}
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
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid #f4f4f5',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={15} style={{ color: '#22c55e' }} />
          </div>
          <div>
            <div style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>Performance Overview</div>
            <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>Key delivery metrics</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3" style={{ padding: '24px 28px', gap: 0 }}>
          {[
            { value: typeof metrics[0]?.value === 'number' && metrics[0].value > 0 ? '98%' : 'N/A', label: 'Customer Satisfaction', color: '#22c55e' },
            { value: '2.3 min', label: 'Avg First Response', color: '#0891b2' },
            { value: typeof metrics[2]?.value === 'number' && metrics[2].value > 0 ? '99%' : 'N/A', label: 'Messages Delivered', color: '#7c3aed' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{
                textAlign: 'center',
                padding: '8px 24px',
                borderRight: i < 2 ? '1px solid #f4f4f5' : 'none',
              }}
            >
              <div style={{ ...SYNE, fontSize: 32, fontWeight: 800, color: stat.color, lineHeight: 1, marginBottom: 6 }}>
                {stat.value}
              </div>
              <div style={{ ...DM, fontSize: 13, color: '#71717a' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid #f4f4f5',
          background: '#fafafa',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
            <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>
              Your performance is excellent! Keep up the great work with your customers.
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AgentDashboard: React.FC = () => {
  return <DashboardContent />;
};

export default AgentDashboard;
