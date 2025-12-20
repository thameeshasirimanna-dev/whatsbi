import React from 'react';
import { motion } from "framer-motion";
import { useAnalytics, AnalyticsData } from "../../../hooks/useAnalytics";
import Loader from "../shared/Loader";

const SalesOverviewChart: React.FC<{ profit: number; expense: number }> = ({ profit, expense }) => {
  const total = profit + expense;
  const profitPercent = total > 0 ? (profit / total) * 100 : 0;
  const expensePercent = 100 - profitPercent;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 36 36" className="w-32 h-32">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#e5e7eb"
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
            <stop offset="0%" style={{ stopColor: "#10b981" }} />
            <stop offset="100%" style={{ stopColor: "#059669" }} />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#ef4444" }} />
            <stop offset="100%" style={{ stopColor: "#dc2626" }} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
          {profitPercent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

const RevenueBarChart: React.FC<{ data: { month: string; revenue: number }[] }> = ({ data }) => {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div className="relative h-48 flex items-end justify-around space-x-1 px-2">
      {data.map((item, index) => {
        const height = (item.revenue / maxRevenue) * 80;
        return (
          <motion.div
            key={item.month}
            className="flex flex-col items-center space-y-1 w-8"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
          >
            <div
              className="bg-gradient-to-t from-blue-400 via-purple-500 to-indigo-600 rounded-lg w-full relative"
              style={{ height: `${height}px` }}
            >
              <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-white bg-black bg-opacity-50 py-0.5 rounded-b-lg">
                ${(item.revenue / 1000).toFixed(0)}k
              </div>
            </div>
            <span className="text-xs text-gray-500 text-center w-8 block">{item.month.slice(0,3)}</span>
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
    <div className="relative h-48 bg-gradient-to-b from-gray-50 to-white rounded-lg p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 mx-auto">
        <polyline
          points={points}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          className="animate-draw"
        />
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#3b82f6" }} />
            <stop offset="100%" style={{ stopColor: "#8b5cf6" }} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-gray-500 mt-2">
        {data.map(item => <span key={item.month}>{item.month.slice(0,3)}</span>)}
      </div>
    </div>
  );
};

const ActiveUserMap: React.FC<{ totalUsers: number }> = ({ totalUsers }) => {
  // Simple SVG world map placeholder with dots
  return (
    <div className="relative h-48 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
      <svg viewBox="0 0 200 100" className="w-48 h-48">
        {/* Simple continent outlines */}
        <path d="M50 30 Q70 20 90 30 Q100 40 90 50 Q70 60 50 50 Z" fill="#dbeafe" stroke="#3b82f6" strokeWidth="0.5" />
        <path d="M110 40 Q130 30 150 40 Q160 50 150 60 Q130 70 110 60 Z" fill="#dbeafe" stroke="#3b82f6" strokeWidth="0.5" />
        {/* Activity dots */}
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
            className="animate-pulse"
          />
        ))}
        <defs>
          <radialGradient id="dotGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: "#3b82f6" }} />
            <stop offset="100%" style={{ stopColor: "transparent" }} />
          </radialGradient>
        </defs>
      </svg>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{totalUsers}</p>
        <p className="text-sm text-gray-500">Active Users</p>
      </div>
    </div>
  );
};

const PaymentGatewaysList: React.FC = () => {
  const gateways = [
    { name: 'Visa', icon: 'M13 10V3L4 14h7v7l9-11h-7z', amount: 1200, color: 'from-blue-400 to-blue-600' },
    { name: 'Mastercard', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z', amount: 800, color: 'from-red-400 to-red-600' },
    { name: 'PayPal', icon: 'M9 8.5h6v1h-6v-1zm0 3h6v1h-6v-1z', amount: 500, color: 'from-yellow-400 to-yellow-600' },
    { name: 'Stripe', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-5.52 0-10-4.48-10-10S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z', amount: 300, color: 'from-purple-400 to-purple-600' },
  ];

  return (
    <div className="space-y-3">
      {gateways.map((gateway, index) => (
        <motion.div
          key={gateway.name}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-300"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-full bg-gradient-to-br ${gateway.color} shadow-lg flex-shrink-0`}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d={gateway.icon} />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">{gateway.name}</span>
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">${gateway.amount.toLocaleString()}+</span>
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
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error loading analytics: {error}</p>
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

  const barVariants = {
    hidden: { width: 0 },
    visible: {
      width: "100%",
      transition: {
        duration: 1,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto">
        {/* Top Section - Summary Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <MetricCard
              title="Total Customers"
              value={analytics.totalCustomers.toString()}
              percentage={"+12%"}
              icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              color="from-emerald-400 to-green-600"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              title="Total Orders"
              value={analytics.totalOrders.toString()}
              percentage={"+8%"}
              icon="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              color="from-blue-400 to-blue-600"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              title="Total Revenue"
              value={`$${analytics.totalRevenue.toLocaleString()}`}
              percentage={"+15%"}
              icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              color="from-purple-400 to-purple-600"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              title="Pending Orders"
              value={analytics.pendingOrders.toString()}
              percentage="-2%"
              icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              color="from-amber-400 to-yellow-600"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              title="Completed Orders"
              value={analytics.completedOrders.toString()}
              percentage={"+20%"}
              icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              color="from-emerald-400 to-green-600"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              title="Upcoming Appointments"
              value={analytics.upcomingAppointments.toString()}
              percentage={"+5%"}
              icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              color="from-indigo-400 to-indigo-600"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              title="Total Appointments"
              value={analytics.totalAppointments.toString()}
              percentage={"+10%"}
              icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              color="from-blue-400 to-blue-600"
            />
          </motion.div>
        </motion.div>

        {/* Middle Section - Charts and Graphs */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Sales Overview Card - Circular Chart */}
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-4">Sales Overview</h3>
            {(() => {
              const profit = analytics.totalRevenue * 0.7; // Adjusted for more profit
              const expense = analytics.totalRevenue * 0.3;
              return (
                <>
                  <SalesOverviewChart profit={profit} expense={expense} />
                  <div className="grid grid-cols-2 gap-4 mt-4 w-full">
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-xl font-bold text-green-600">${profit.toLocaleString()}+</p>
                      <p className="text-xs text-green-500">Profit</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <p className="text-xl font-bold text-red-600">${expense.toLocaleString()}+</p>
                      <p className="text-xs text-red-500">Expense</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>

          {/* Revenue Updates Card - Vertical Bar Chart */}
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">Revenue Updates</h3>
            <RevenueBarChart data={analytics.monthlyRevenue.slice(-6)} /> {/* Last 6 months */}
          </motion.div>

          {/* Yearly Sales Card - Line Chart */}
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent mb-4">Yearly Sales</h3>
            <YearlySalesLineChart data={analytics.monthlyOrders.slice(-12)} /> {/* Last 12 months */}
          </motion.div>
        </motion.div>

        {/* Bottom Section - Details and Maps */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Active User Card - World Map */}
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300 order-2 lg:order-1">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent mb-4">Active Users</h3>
            <ActiveUserMap totalUsers={analytics.totalCustomers} />
          </motion.div>

          {/* Payment Gateways Card - List */}
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300 order-1 lg:order-2">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent mb-4">Payment Gateways</h3>
            <PaymentGatewaysList />
          </motion.div>
        </motion.div>

        {/* Order Status Breakdown - Kept as additional card */}
        <motion.div
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent mb-4">Order Status Breakdown</h3>
          <div className="flex flex-col items-center space-y-6">
            <div className="relative w-40 h-40">
              {analytics.orderStatuses.map((status, index) => {
                const total = analytics.orderStatuses.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? (status.count / total) * 360 : 0;
                const statusColors = {
                  pending: "from-yellow-400 to-yellow-600",
                  completed: "from-green-400 to-green-600",
                  in_progress: "from-blue-400 to-blue-600",
                  unknown: "from-gray-400 to-gray-600",
                };
                const color = statusColors[status.status as keyof typeof statusColors] || "from-gray-400 to-gray-600";
                return (
                  <motion.div
                    key={status.status}
                    className="absolute inset-0 rounded-full"
                    style={{
                      clipPath: `polygon(0 0, ${percentage}deg 0, 50% 50%)`,
                      background: `linear-gradient(to right, ${color})`,
                      zIndex: index,
                    }}
                    initial={{ rotate: -180 }}
                    animate={{ rotate: percentage / 2 }}
                    transition={{ duration: 1.5, delay: index * 0.2 }}
                  />
                );
              })}
              <div className="w-24 h-24 bg-white rounded-full shadow-lg relative z-10 flex items-center justify-center border-4 border-white">
                <span className="text-xl font-bold text-gray-600">
                  {analytics.totalOrders}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {analytics.orderStatuses.map((status, index) => (
                <motion.div
                  key={status.status}
                  className="text-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg cursor-pointer hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-100 transition-all duration-300 flex items-center justify-center space-x-2"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: (index + 2) * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      status.status === "pending"
                        ? "bg-yellow-500"
                        : status.status === "completed"
                        ? "bg-green-500"
                        : status.status === "in_progress"
                        ? "bg-blue-500"
                        : "bg-gray-500"
                    }`}
                  ></div>
                  <div>
                    <div className="font-bold text-gray-900">{status.count}</div>
                    <div className="text-xs text-gray-500 capitalize">{status.status}</div>
                  </div>
                </motion.div>
              ))}
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
  icon: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  percentage,
  icon,
  color,
}) => {
  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-transparent transition-all duration-300 relative overflow-hidden"
      whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className={`absolute inset-0 bg-gradient-to-br opacity-5 ${color}`} 
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full bg-gradient-to-br ${color} shadow-lg flex-shrink-0 border border-white/20 backdrop-blur-sm`}>
            <svg
              className="w-6 h-6 text-white drop-shadow-md"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={icon}
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{value}</p>
          </div>
        </div>
        {percentage && (
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm ${
            percentage.startsWith('+') 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          } whitespace-nowrap`}>
            {percentage}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default AnalyticsPage;