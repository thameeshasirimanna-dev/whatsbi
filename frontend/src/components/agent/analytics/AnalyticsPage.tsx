import React from 'react';
import { motion } from "framer-motion";
import { useAnalytics, AnalyticsData } from "../../../hooks/useAnalytics";
import Loader from "../shared/Loader";
import { Users, ShoppingBag, DollarSign, Clock, CheckCircle2, CalendarClock, CalendarDays } from 'lucide-react';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const SalesOverviewChart: React.FC<{ profit: number; expense: number }> = ({ profit, expense }) => {
  const total = profit + expense;
  const profitPercent = total > 0 ? (profit / total) * 100 : 0;
  const expensePercent = 100 - profitPercent;

  return (
    <div style={{ position: 'relative', width: 128, height: 128, margin: '0 auto' }}>
      <svg viewBox="0 0 36 36" style={{ width: 128, height: 128 }}>
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#ebebeb"
          strokeWidth="3"
        />
        <motion.path
          d={`M18 2.0845 a 15.9155 15.9155 0 0 1 ${profitPercent * 0.36} 31.831`}
          fill="none"
          stroke="url(#profitGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <motion.path
          d={`M18 2.0845 a 15.9155 15.9155 0 0 1 ${(profitPercent + expensePercent) * 0.36} 31.831 a 15.9155 15.9155 0 0 1 0 -31.831`}
          fill="none"
          stroke="url(#expenseGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
        />
        <defs>
          <linearGradient id="profitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#22c55e" }} />
            <stop offset="100%" style={{ stopColor: "#059669" }} />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#f43f5e" }} />
            <stop offset="100%" style={{ stopColor: "#e11d48" }} />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#059669' }}>
          {profitPercent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

const RevenueBarChart: React.FC<{ data: { month: string; revenue: number }[] }> = ({ data }) => {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div style={{ position: 'relative', height: 192, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 4, padding: '0 8px' }}>
      {data.map((item, index) => {
        const height = (item.revenue / maxRevenue) * 80;
        return (
          <motion.div
            key={item.month}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 32 }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
          >
            <div style={{ background: 'linear-gradient(to top, #059669, #22c55e)', borderRadius: 6, width: '100%', height: `${height}px`, position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', background: 'rgba(0,0,0,0.35)', padding: '2px 0', borderRadius: '0 0 6px 6px', ...DM, fontSize: 9, color: '#fff' }}>
                ${(item.revenue / 1000).toFixed(0)}k
              </div>
            </div>
            <span style={{ ...DM, fontSize: 10, color: '#71717a', textAlign: 'center', width: 32, display: 'block' }}>{item.month.slice(0, 3)}</span>
          </motion.div>
        );
      })}
    </div>
  );
};

const YearlySalesLineChart: React.FC<{ data: { month: string; count: number }[] }> = ({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const width = 100;
  const height = 80;
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - (item.count / maxCount) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ position: 'relative', height: 192, background: '#f9f9f9', borderRadius: 8, padding: 16 }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 128, display: 'block', margin: '0 auto' }}>
        <polyline
          points={points}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#22c55e" }} />
            <stop offset="100%" style={{ stopColor: "#059669" }} />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
        {data.map(item => <span key={item.month} style={{ ...DM, fontSize: 10, color: '#71717a' }}>{item.month.slice(0, 3)}</span>)}
      </div>
    </div>
  );
};

const ActiveUserMap: React.FC<{ totalUsers: number }> = ({ totalUsers }) => {
  return (
    <div style={{ position: 'relative', height: 192, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.04)', borderRadius: 8 }}>
      <svg viewBox="0 0 200 100" style={{ width: 192, height: 192 }}>
        <path d="M50 30 Q70 20 90 30 Q100 40 90 50 Q70 60 50 50 Z" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="0.5" />
        <path d="M110 40 Q130 30 150 40 Q160 50 150 60 Q130 70 110 60 Z" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="0.5" />
        {[...Array(8)].map((_, i) => (
          <motion.circle
            key={i}
            cx={30 + Math.random() * 160}
            cy={20 + Math.random() * 60}
            r="1.5"
            fill="url(#dotGradient)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}
        <defs>
          <radialGradient id="dotGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: "#22c55e" }} />
            <stop offset="100%" style={{ stopColor: "transparent" }} />
          </radialGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <p style={{ ...SYNE, fontSize: 24, fontWeight: 700, color: '#059669' }}>{totalUsers}</p>
        <p style={{ ...DM, fontSize: 12, color: '#71717a' }}>Active Users</p>
      </div>
    </div>
  );
};

const PaymentGatewaysList: React.FC = () => {
  const gateways = [
    { name: 'Visa', icon: 'M13 10V3L4 14h7v7l9-11h-7z', amount: 1200, gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)' },
    { name: 'Mastercard', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z', amount: 800, gradient: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)' },
    { name: 'PayPal', icon: 'M9 8.5h6v1h-6v-1zm0 3h6v1h-6v-1z', amount: 500, gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' },
    { name: 'Stripe', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-5.52 0-10-4.48-10-10S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z', amount: 300, gradient: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {gateways.map((gateway, index) => (
        <motion.div
          key={gateway.name}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#fff', border: '1px solid #ebebeb', borderRadius: 10 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 10, borderRadius: '50%', background: gateway.gradient, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 20, height: 20, color: '#fff' }} fill="currentColor" viewBox="0 0 20 20">
                <path d={gateway.icon} />
              </svg>
            </div>
            <span style={{ ...DM, fontWeight: 600, color: '#0c1a0e' }}>{gateway.name}</span>
          </div>
          <span style={{ ...SYNE, fontWeight: 700, fontSize: 16, color: '#0c1a0e' }}>${gateway.amount.toLocaleString()}+</span>
        </motion.div>
      ))}
    </div>
  );
};

const AnalyticsPage: React.FC = () => {
  const { analytics, loading, error } = useAnalytics();

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 12, padding: 16 }}>
          <p style={{ ...DM, color: '#f43f5e' }}>Error loading analytics: {error}</p>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  const statusColorMap: Record<string, { dot: string; bg: string; border: string; gradient: string }> = {
    pending: { dot: '#d97706', bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.2)', gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' },
    completed: { dot: '#22c55e', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)', gradient: 'linear-gradient(135deg, #22c55e, #059669)' },
    in_progress: { dot: '#0891b2', bg: 'rgba(8,145,178,0.06)', border: 'rgba(8,145,178,0.2)', gradient: 'linear-gradient(135deg, #22d3ee, #0891b2)' },
    unknown: { dot: '#71717a', bg: 'rgba(113,113,122,0.06)', border: 'rgba(113,113,122,0.2)', gradient: 'linear-gradient(135deg, #a1a1aa, #71717a)' },
  };

  return (
    <motion.div
      style={{ padding: 24 }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div>
        {/* Metric Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-7"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <MetricCard title="Total Customers" value={analytics.totalCustomers.toString()} percentage="+12%" icon={<Users size={20} />} iconBg="rgba(34,197,94,0.1)" iconColor="#059669" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard title="Total Orders" value={analytics.totalOrders.toString()} percentage="+8%" icon={<ShoppingBag size={20} />} iconBg="rgba(8,145,178,0.1)" iconColor="#0891b2" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard title="Total Revenue" value={`$${analytics.totalRevenue.toLocaleString()}`} percentage="+15%" icon={<DollarSign size={20} />} iconBg="rgba(34,197,94,0.1)" iconColor="#059669" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard title="Pending Orders" value={analytics.pendingOrders.toString()} percentage="-2%" icon={<Clock size={20} />} iconBg="rgba(217,119,6,0.1)" iconColor="#d97706" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard title="Completed Orders" value={analytics.completedOrders.toString()} percentage="+20%" icon={<CheckCircle2 size={20} />} iconBg="rgba(34,197,94,0.1)" iconColor="#059669" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard title="Upcoming Appointments" value={analytics.upcomingAppointments.toString()} percentage="+5%" icon={<CalendarClock size={20} />} iconBg="rgba(79,70,229,0.1)" iconColor="#4f46e5" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard title="Total Appointments" value={analytics.totalAppointments.toString()} percentage="+10%" icon={<CalendarDays size={20} />} iconBg="rgba(37,99,235,0.1)" iconColor="#2563eb" />
          </motion.div>
        </motion.div>

        {/* Charts Row */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Sales Overview */}
          <motion.div
            variants={itemVariants}
            style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 16 }}>Sales Overview</h3>
            {(() => {
              const profit = analytics.totalRevenue * 0.7;
              const expense = analytics.totalRevenue * 0.3;
              return (
                <>
                  <SalesOverviewChart profit={profit} expense={expense} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                    <div style={{ textAlign: 'center', padding: 10, background: 'rgba(34,197,94,0.06)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.15)' }}>
                      <p style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#059669' }}>${profit.toLocaleString()}+</p>
                      <p style={{ ...DM, fontSize: 11, color: '#22c55e' }}>Profit</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: 10, background: 'rgba(244,63,94,0.06)', borderRadius: 8, border: '1px solid rgba(244,63,94,0.15)' }}>
                      <p style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#f43f5e' }}>${expense.toLocaleString()}+</p>
                      <p style={{ ...DM, fontSize: 11, color: '#f43f5e' }}>Expense</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>

          {/* Revenue Updates */}
          <motion.div
            variants={itemVariants}
            style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 16 }}>Revenue Updates</h3>
            <RevenueBarChart data={analytics.monthlyRevenue.slice(-6)} />
          </motion.div>

          {/* Yearly Sales */}
          <motion.div
            variants={itemVariants}
            style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 16 }}>Yearly Sales</h3>
            <YearlySalesLineChart data={analytics.monthlyOrders.slice(-12)} />
          </motion.div>
        </motion.div>

        {/* Bottom Row */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={itemVariants}
            style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            className="order-2 lg:order-1"
          >
            <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 16 }}>Active Users</h3>
            <ActiveUserMap totalUsers={analytics.totalCustomers} />
          </motion.div>

          <motion.div
            variants={itemVariants}
            style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            className="order-1 lg:order-2"
          >
            <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 16 }}>Payment Gateways</h3>
            <PaymentGatewaysList />
          </motion.div>
        </motion.div>

        {/* Order Status Breakdown */}
        <motion.div
          style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 20 }}>Order Status Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div style={{ position: 'relative', width: 160, height: 160 }}>
              {analytics.orderStatuses.map((status, index) => {
                const total = analytics.orderStatuses.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? (status.count / total) * 360 : 0;
                const sc = statusColorMap[status.status] || statusColorMap.unknown;
                return (
                  <motion.div
                    key={status.status}
                    className="absolute inset-0 rounded-full"
                    style={{
                      clipPath: `polygon(0 0, ${percentage}deg 0, 50% 50%)`,
                      background: sc.gradient,
                      zIndex: index,
                    }}
                    initial={{ rotate: -180 }}
                    animate={{ rotate: percentage / 2 }}
                    transition={{ duration: 1.5, delay: index * 0.2 }}
                  />
                );
              })}
              <div style={{ width: 96, height: 96, background: '#fff', borderRadius: '50%', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #fff', margin: '32px auto 0' }}>
                <span style={{ ...SYNE, fontSize: 22, fontWeight: 700, color: '#0c1a0e' }}>{analytics.totalOrders}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {analytics.orderStatuses.map((status, index) => {
                const sc = statusColorMap[status.status] || statusColorMap.unknown;
                return (
                  <motion.div
                    key={status.status}
                    style={{ textAlign: 'center', padding: 12, background: sc.bg, borderRadius: 10, border: `1px solid ${sc.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: (index + 2) * 0.1 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                    <div>
                      <div style={{ ...SYNE, fontWeight: 700, color: '#0c1a0e' }}>{status.count}</div>
                      <div style={{ ...DM, fontSize: 11, color: '#71717a', textTransform: 'capitalize' }}>{status.status.replace('_', ' ')}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  percentage?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, percentage, icon, iconBg, iconColor }) => {
  return (
    <motion.div
      style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 20, position: 'relative', overflow: 'hidden' }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconColor }}>
            {icon}
          </div>
          <div>
            <p style={{ ...DM, fontSize: 13, color: '#71717a', marginBottom: 4 }}>{title}</p>
            <p style={{ ...SYNE, fontSize: 26, fontWeight: 700, color: '#0c1a0e', lineHeight: 1 }}>{value}</p>
          </div>
        </div>
        {percentage && (
          <span style={{
            ...DM,
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 20,
            whiteSpace: 'nowrap',
            background: percentage.startsWith('+') ? 'rgba(34,197,94,0.08)' : 'rgba(244,63,94,0.08)',
            color: percentage.startsWith('+') ? '#059669' : '#f43f5e',
            border: `1px solid ${percentage.startsWith('+') ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)'}`,
          }}>
            {percentage}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default AnalyticsPage;
