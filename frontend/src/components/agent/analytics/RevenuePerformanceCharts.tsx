import React from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
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
  Filler,
} from 'chart.js';

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

interface RevenuePerformanceChartsProps {
  profit: number;
  expense: number;
  monthlyRevenue: { month: string; revenue: number }[];
  monthlyOrders: { month: string; count: number }[];
}

export const RevenuePerformanceCharts: React.FC<RevenuePerformanceChartsProps> = ({
  profit = 0,
  expense = 0,
  monthlyRevenue = [],
  monthlyOrders = [],
}) => {
  // Sales Overview Doughnut Data
  const total = profit + expense;
  const profitPercent = total > 0 ? (profit / total) * 100 : 0;

  const doughnutData = {
    labels: ['Profit', 'Expense'],
    datasets: [
      {
        data: [profit, expense],
        backgroundColor: ['#16281D', '#EF4444'],
        hoverBackgroundColor: ['#22422F', '#DC2626'],
        borderWidth: 3,
        borderColor: '#ffffff',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => ` Rs. ${(context.raw as number).toLocaleString()}`,
        },
      },
    },
    cutout: '76%',
  };

  // Monthly Revenue Bar Data
  const barData = {
    labels: monthlyRevenue.map((d) => d.month),
    datasets: [
      {
        label: 'Revenue',
        data: monthlyRevenue.map((d) => d.revenue),
        backgroundColor: '#16281D',
        hoverBackgroundColor: '#9FE870',
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => ` Rs. ${(context.raw as number).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          color: '#71717A',
        },
      },
      y: {
        grid: { color: '#F4F7F4' },
        ticks: {
          font: { size: 10 },
          color: '#71717A',
          callback: (value: any) => `Rs. ${value >= 1000 ? value / 1000 + 'k' : value}`,
        },
      },
    },
  };

  // Yearly Sales Line Data
  const lineData = {
    labels: monthlyOrders.map((d) => d.month),
    datasets: [
      {
        label: 'Orders',
        data: monthlyOrders.map((d) => d.count),
        borderColor: '#16281D',
        backgroundColor: 'rgba(159, 232, 112, 0.25)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#9FE870',
        pointBorderColor: '#16281D',
        pointBorderWidth: 2,
        pointRadius: 3.5,
        pointHoverRadius: 6,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => ` ${context.raw} orders`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          color: '#71717A',
        },
      },
      y: {
        grid: { color: '#F4F7F4' },
        ticks: {
          font: { size: 10 },
          color: '#71717A',
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
      {/* Sales Overview */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
            Margins & Cost
          </span>
          <h3 className="text-sm font-bold text-[#16281D] mt-0.5 mb-4">Sales Overview</h3>
        </div>

        <div className="relative w-36 h-36 mx-auto my-2">
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-xl font-extrabold text-[#16281D] leading-none">
              {profitPercent.toFixed(0)}%
            </span>
            <span className="text-[10px] font-semibold text-[#71717A] mt-0.5">Profit</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#F4F7F4]">
          <div className="p-3 bg-[#F4F7F4] rounded-xl text-center">
            <span className="font-mono text-xs font-bold text-[#16281D] block">
              Rs. {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] font-semibold text-[#15803D]">Profit</span>
          </div>
          <div className="p-3 bg-[#F4F7F4] rounded-xl text-center">
            <span className="font-mono text-xs font-bold text-[#EF4444] block">
              Rs. {expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] font-semibold text-[#EF4444]">Expense</span>
          </div>
        </div>
      </div>

      {/* Revenue Updates */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
            Revenue Trajectory
          </span>
          <h3 className="text-sm font-bold text-[#16281D] mt-0.5 mb-4">Revenue Updates</h3>
        </div>

        <div className="h-44 w-full">
          <Bar data={barData} options={barOptions as any} />
        </div>
      </div>

      {/* Yearly Sales */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
            Order Momentum
          </span>
          <h3 className="text-sm font-bold text-[#16281D] mt-0.5 mb-4">Order Volume</h3>
        </div>

        <div className="h-44 w-full">
          <Line data={lineData} options={lineOptions as any} />
        </div>
      </div>
    </div>
  );
};

export default RevenuePerformanceCharts;
