import React from 'react';
import { motion } from "framer-motion";
import { useAnalytics, AnalyticsData } from "../../../hooks/useAnalytics";
import Loader from "../shared/Loader";
import {
  Users,
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle2,
  CalendarClock,
  CalendarDays,
  Download,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const SalesOverviewChart: React.FC<{ profit: number; expense: number }> = ({ profit, expense }) => {
  const data = {
    labels: ['Profit', 'Expense'],
    datasets: [
      {
        data: [profit, expense],
        backgroundColor: ['#22c55e', '#f43f5e'],
        hoverBackgroundColor: ['#15803d', '#be123c'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.raw as number;
            return ` $${val.toLocaleString()}`;
          }
        }
      }
    },
    cutout: '75%',
  };

  const total = profit + expense;
  const profitPercent = total > 0 ? (profit / total) * 100 : 0;

  return (
    <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto' }}>
      <Doughnut data={data} options={options} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...SYNE, fontSize: 18, fontWeight: 800, color: '#059669', lineHeight: 1 }}>
          {profitPercent.toFixed(0)}%
        </span>
        <span style={{ ...DM, fontSize: 9, color: '#71717a', marginTop: 2 }}>Profit</span>
      </div>
    </div>
  );
};

const RevenueBarChart: React.FC<{ data: { month: string; revenue: number }[] }> = ({ data: rawData }) => {
  const data = {
    labels: rawData.map(d => d.month),
    datasets: [
      {
        label: 'Revenue',
        data: rawData.map(d => d.revenue),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return ` $${context.raw.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'DM Sans', sans-serif",
            size: 9,
          },
          color: '#71717a',
        }
      },
      y: {
        grid: {
          color: '#f4f4f5',
        },
        ticks: {
          font: {
            family: "'DM Sans', sans-serif",
            size: 9,
          },
          color: '#71717a',
          callback: (value: any) => `$${value >= 1000 ? (value / 1000) + 'k' : value}`
        }
      }
    }
  };

  return (
    <div style={{ height: 180 }}>
      <Bar data={data} options={options as any} />
    </div>
  );
};

const YearlySalesLineChart: React.FC<{ data: { month: string; count: number }[] }> = ({ data: rawData }) => {
  const data = {
    labels: rawData.map(d => d.month),
    datasets: [
      {
        label: 'Orders',
        data: rawData.map(d => d.count),
        borderColor: '#059669',
        backgroundColor: 'rgba(34, 197, 94, 0.06)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#059669',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return ` ${context.raw} orders`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'DM Sans', sans-serif",
            size: 9,
          },
          color: '#71717a',
        }
      },
      y: {
        grid: {
          color: '#f4f4f5',
        },
        ticks: {
          font: {
            family: "'DM Sans', sans-serif",
            size: 9,
          },
          color: '#71717a',
          precision: 0,
        }
      }
    }
  };

  return (
    <div style={{ height: 180 }}>
      <Line data={data} options={options as any} />
    </div>
  );
};

const CRMFunnelChart: React.FC<{ data: { stage: string; count: number }[] }> = ({ data: rawData }) => {
  const stageOrder = ["New Lead", "Contacted", "Follow-up Needed", "Not Responding"];
  const sortedData = [...rawData].sort((a, b) => {
    return stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
  });

  const colors = ['#9333ea', '#3b82f6', '#f59e0b', '#f43f5e'];

  const data = {
    labels: sortedData.map(d => d.stage),
    datasets: [
      {
        data: sortedData.map(d => d.count),
        backgroundColor: colors,
        hoverBackgroundColor: colors.map(c => c + 'dd'),
        borderRadius: 6,
        barThickness: 16,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: '#f4f4f5',
        },
        ticks: {
          font: {
            family: "'DM Sans', sans-serif",
            size: 9,
          },
          color: '#71717a',
          precision: 0,
        }
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'DM Sans', sans-serif",
            size: 10,
            weight: 'bold',
          },
          color: '#0c1a0e',
        }
      }
    }
  };

  return (
    <div style={{ height: 180 }}>
      <Bar data={data} options={options as any} />
    </div>
  );
};

const MessageActivityChart: React.FC<{ data: { month: string; inbound: number; outbound: number }[] }> = ({ data: rawData }) => {
  const data = {
    labels: rawData.map(d => d.month),
    datasets: [
      {
        label: 'Inbound',
        data: rawData.map(d => d.inbound),
        borderColor: '#22c55e',
        backgroundColor: 'transparent',
        tension: 0.35,
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 3,
      },
      {
        label: 'Outbound',
        data: rawData.map(d => d.outbound),
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        tension: 0.35,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 3,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: "'DM Sans', sans-serif",
            size: 10,
          },
          color: '#52525b',
          boxWidth: 8,
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'DM Sans', sans-serif",
            size: 9,
          },
          color: '#71717a',
        }
      },
      y: {
        grid: {
          color: '#f4f4f5',
        },
        ticks: {
          font: {
            family: "'DM Sans', sans-serif",
            size: 9,
          },
          color: '#71717a',
          precision: 0,
        }
      }
    }
  };

  return (
    <div style={{ height: 180 }}>
      <Line data={data} options={options as any} />
    </div>
  );
};

const ActiveUserMap: React.FC<{ totalUsers: number }> = ({ totalUsers }) => {
  return (
    <div style={{ position: 'relative', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.03)', borderRadius: 12 }}>
      <svg viewBox="0 0 200 100" style={{ width: 160, height: 100 }}>
        <path d="M50 30 Q70 20 90 30 Q100 40 90 50 Q70 60 50 50 Z" fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth="0.5" />
        <path d="M110 40 Q130 30 150 40 Q160 50 150 60 Q130 70 110 60 Z" fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth="0.5" />
        {[...Array(8)].map((_, i) => (
          <motion.circle
            key={i}
            cx={30 + Math.random() * 140}
            cy={20 + Math.random() * 50}
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
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <p style={{ ...SYNE, fontSize: 24, fontWeight: 700, color: '#059669' }}>{totalUsers}</p>
        <p style={{ ...DM, fontSize: 11, color: '#71717a' }}>Active CRM Contacts</p>
      </div>
    </div>
  );
};

const PaymentGatewaysList: React.FC<{ gateways: { name: string; amount: number }[] }> = ({ gateways }) => {
  const icons: Record<string, string> = {
    Visa: 'M13 10V3L4 14h7v7l9-11h-7z',
    Mastercard: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    PayPal: 'M9 8.5h6v1h-6v-1zm0 3h6v1h-6v-1z',
    Stripe: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-5.52 0-10-4.48-10-10S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z',
  };
  const gradients: Record<string, string> = {
    Visa: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    Mastercard: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
    PayPal: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    Stripe: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {gateways.map((gateway, index) => (
        <motion.div
          key={gateway.name}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fff', border: '1px solid #ebebeb', borderRadius: 10 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: 8, borderRadius: '50%', background: gradients[gateway.name] || 'grey', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 16, height: 16, color: '#fff' }} fill="currentColor" viewBox="0 0 20 20">
                <path d={icons[gateway.name] || 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z'} />
              </svg>
            </div>
            <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{gateway.name}</span>
          </div>
          <span style={{ ...SYNE, fontWeight: 700, fontSize: 14, color: '#0c1a0e' }}>
            ${gateway.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

const OrderStatusChart: React.FC<{ data: { status: string; count: number }[] }> = ({ data: rawData }) => {
  const statusColorMap: Record<string, string> = {
    pending: '#d97706',
    completed: '#22c55e',
    processing: '#0891b2',
    shipped: '#3b82f6',
    cancelled: '#f43f5e',
    unknown: '#71717a',
  };

  const labels = rawData.map(d => d.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));
  const colors = rawData.map(d => statusColorMap[d.status] || statusColorMap.unknown);

  const data = {
    labels,
    datasets: [
      {
        data: rawData.map(d => d.count),
        backgroundColor: colors,
        hoverOffset: 4,
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            family: "'DM Sans', sans-serif",
            size: 11,
          },
          color: '#52525b',
          boxWidth: 12,
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const count = context.raw as number;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
            return ` ${context.label}: ${count} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%',
  };

  const totalOrders = rawData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div style={{ position: 'relative', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', height: '100%' }}>
        <Doughnut data={data} options={options} />
      </div>
      <div style={{ position: 'absolute', left: '30%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ ...SYNE, fontSize: 22, fontWeight: 700, color: '#0c1a0e', lineHeight: 1 }}>{totalOrders}</span>
        <span style={{ ...DM, fontSize: 10, color: '#71717a', marginTop: 2 }}>Orders</span>
      </div>
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
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 120,
      },
    },
  };

  const statusColorMap: Record<string, { dot: string; bg: string; border: string; gradient: string }> = {
    pending: { dot: '#d97706', bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.15)', gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' },
    completed: { dot: '#22c55e', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.15)', gradient: 'linear-gradient(135deg, #22c55e, #059669)' },
    processing: { dot: '#0891b2', bg: 'rgba(8,145,178,0.06)', border: 'rgba(8,145,178,0.15)', gradient: 'linear-gradient(135deg, #22d3ee, #0891b2)' },
    shipped: { dot: '#3b82f6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)', gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)' },
    cancelled: { dot: '#f43f5e', bg: 'rgba(244,63,94,0.06)', border: 'rgba(244,63,94,0.15)', gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)' },
    unknown: { dot: '#71717a', bg: 'rgba(113,113,122,0.06)', border: 'rgba(113,113,122,0.15)', gradient: 'linear-gradient(135deg, #a1a1aa, #71717a)' },
  };

  return (
    <motion.div
      style={{ padding: 24 }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top Controls (Title is handled by Top Navbar) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.25)',
            border: 'none',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => window.print()}
        >
          <Download size={14} />
          Export Report
        </button>
      </div>

      {/* Metric Cards Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <MetricCard title="Total Customers" value={analytics.totalCustomers.toString()} percentage={analytics.customerGrowth} icon={<Users size={18} />} iconBg="rgba(34,197,94,0.08)" iconColor="#059669" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <MetricCard title="Total Orders" value={analytics.totalOrders.toString()} percentage={analytics.orderGrowth} icon={<ShoppingBag size={18} />} iconBg="rgba(8,145,178,0.08)" iconColor="#0891b2" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <MetricCard title="Total Revenue" value={`$${analytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} percentage={analytics.revenueGrowth} icon={<DollarSign size={18} />} iconBg="rgba(34,197,94,0.08)" iconColor="#059669" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <MetricCard title="Total Appointments" value={analytics.totalAppointments.toString()} percentage={analytics.appointmentGrowth} icon={<CalendarDays size={18} />} iconBg="rgba(37,99,235,0.08)" iconColor="#2563eb" />
        </motion.div>
      </motion.div>

      {/* Primary Row Charts */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
        variants={containerVariants}
      >
        {/* Sales Overview (Doughnut) */}
        <motion.div
          variants={itemVariants}
          style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
        >
          <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 12 }}>Sales Overview</h3>
          <SalesOverviewChart profit={analytics.profit} expense={analytics.expense} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <div style={{ textAlign: 'center', padding: 8, background: 'rgba(34,197,94,0.04)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.1)' }}>
              <p style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#059669' }}>${analytics.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p style={{ ...DM, fontSize: 10, color: '#22c55e', marginTop: 2 }}>Profit (70%)</p>
            </div>
            <div style={{ textAlign: 'center', padding: 8, background: 'rgba(244,63,94,0.04)', borderRadius: 8, border: '1px solid rgba(244,63,94,0.1)' }}>
              <p style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#f43f5e' }}>${analytics.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p style={{ ...DM, fontSize: 10, color: '#f43f5e', marginTop: 2 }}>Expense (30%)</p>
            </div>
          </div>
        </motion.div>

        {/* Revenue Updates (Bar) */}
        <motion.div
          variants={itemVariants}
          style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
        >
          <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 12 }}>Revenue Updates</h3>
          <RevenueBarChart data={analytics.monthlyRevenue.slice(-6)} />
        </motion.div>

        {/* Yearly Sales (Line) */}
        <motion.div
          variants={itemVariants}
          style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
        >
          <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 12 }}>Yearly Sales</h3>
          <YearlySalesLineChart data={analytics.monthlyOrders.slice(-12)} />
        </motion.div>
      </motion.div>

      {/* CRM Funnel and Message volume Row */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
        variants={containerVariants}
      >
        {/* CRM Pipeline Funnel */}
        <motion.div
          variants={itemVariants}
          style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
        >
          <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 12 }}>CRM Pipeline Funnel (Lead Stage)</h3>
          <CRMFunnelChart data={analytics.leadStages} />
        </motion.div>

        {/* Message volume trend */}
        <motion.div
          variants={itemVariants}
          style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
        >
          <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 12 }}>WhatsApp Message Volume (Inbound vs Outbound)</h3>
          <MessageActivityChart data={analytics.monthlyMessages.slice(-12)} />
        </motion.div>
      </motion.div>

      {/* Bottom Grid: Map, Payments and Status Breakdown */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
        variants={containerVariants}
      >
        {/* Active Users Map */}
        <motion.div
          variants={itemVariants}
          style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
        >
          <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 12 }}>Contact Distribution Map</h3>
          <ActiveUserMap totalUsers={analytics.totalCustomers} />
        </motion.div>

        {/* Payment Gateways */}
        <motion.div
          variants={itemVariants}
          style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
        >
          <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 12 }}>Payment Gateways</h3>
          <PaymentGatewaysList gateways={analytics.paymentGateways} />
        </motion.div>

        {/* Appointments stats */}
        <motion.div
          variants={itemVariants}
          style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
          className="flex flex-col justify-between"
        >
          <div>
            <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 12 }}>Appointments Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CalendarClock size={16} color="#2563eb" />
                  <span style={{ ...DM, fontWeight: 600, color: '#0c1a0e', fontSize: 13 }}>Upcoming Appointments</span>
                </div>
                <span style={{ ...SYNE, fontWeight: 700, color: '#2563eb', fontSize: 16 }}>{analytics.upcomingAppointments}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.1)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={16} color="#22c55e" />
                  <span style={{ ...DM, fontWeight: 600, color: '#0c1a0e', fontSize: 13 }}>Completed Orders</span>
                </div>
                <span style={{ ...SYNE, fontWeight: 700, color: '#22c55e', fontSize: 16 }}>{analytics.completedOrders}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(217,119,6,0.03)', border: '1px solid rgba(217,119,6,0.1)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Clock size={16} color="#d97706" />
                  <span style={{ ...DM, fontWeight: 600, color: '#0c1a0e', fontSize: 13 }}>Pending Orders</span>
                </div>
                <span style={{ ...SYNE, fontWeight: 700, color: '#d97706', fontSize: 16 }}>{analytics.pendingOrders}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Order Status Breakdown */}
      <motion.div
        style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h3 style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginBottom: 16 }}>Order Status Distribution</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <OrderStatusChart data={analytics.orderStatuses} />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {analytics.orderStatuses.map((status, index) => {
              const sc = statusColorMap[status.status] || statusColorMap.unknown;
              return (
                <motion.div
                  key={status.status}
                  style={{ textAlign: 'center', padding: '10px 8px', background: sc.bg, borderRadius: 10, border: `1px solid ${sc.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -1 }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                  <div>
                    <div style={{ ...SYNE, fontWeight: 700, color: '#0c1a0e', fontSize: 13, lineHeight: 1.1 }}>{status.count}</div>
                    <div style={{ ...DM, fontSize: 10, color: '#71717a', textTransform: 'capitalize', marginTop: 2 }}>{status.status.replace('_', ' ')}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
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
      style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)', padding: 18, position: 'relative', overflow: 'hidden' }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconColor }}>
            {icon}
          </div>
          <div>
            <p style={{ ...DM, fontSize: 12, color: '#71717a', marginBottom: 2 }}>{title}</p>
            <p style={{ ...SYNE, fontSize: 24, fontWeight: 700, color: '#0c1a0e', lineHeight: 1 }}>{value}</p>
          </div>
        </div>
        {percentage && (
          <span style={{
            ...DM,
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 20,
            whiteSpace: 'nowrap',
            background: percentage.startsWith('+') ? 'rgba(34,197,94,0.06)' : 'rgba(244,63,94,0.06)',
            color: percentage.startsWith('+') ? '#059669' : '#f43f5e',
            border: `1px solid ${percentage.startsWith('+') ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.12)'}`,
          }}>
            {percentage}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default AnalyticsPage;
