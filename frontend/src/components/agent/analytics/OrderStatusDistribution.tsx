import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { CalendarClock, CheckCircle2, Clock, CreditCard } from 'lucide-react';

interface OrderStatusDistributionProps {
  orderStatuses: { status: string; count: number }[];
  gateways: { name: string; amount: number }[];
  upcomingAppointments: number;
  completedOrders: number;
  pendingOrders: number;
}

const statusColorMap: Record<string, { dot: string; bg: string; text: string }> = {
  pending: { dot: 'bg-[#F59E0B]', bg: 'bg-[#F59E0B]/10', text: 'text-[#D97706]' },
  completed: { dot: 'bg-[#22C55E]', bg: 'bg-[#22C55E]/10', text: 'text-[#15803D]' },
  processing: { dot: 'bg-[#3B82F6]', bg: 'bg-[#3B82F6]/10', text: 'text-[#2563EB]' },
  shipped: { dot: 'bg-[#16281D]', bg: 'bg-[#16281D]/10', text: 'text-[#16281D]' },
  cancelled: { dot: 'bg-[#EF4444]', bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]' },
  unknown: { dot: 'bg-[#71717A]', bg: 'bg-[#71717A]/10', text: 'text-[#71717A]' },
};

export const OrderStatusDistribution: React.FC<OrderStatusDistributionProps> = ({
  orderStatuses,
  gateways,
  upcomingAppointments,
  completedOrders,
  pendingOrders,
}) => {
  const labels = orderStatuses.map((d) =>
    d.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
  const colors = orderStatuses.map((d) => {
    if (d.status === 'completed') return '#22C55E';
    if (d.status === 'pending') return '#F59E0B';
    if (d.status === 'processing') return '#3B82F6';
    if (d.status === 'shipped') return '#16281D';
    if (d.status === 'cancelled') return '#EF4444';
    return '#71717A';
  });

  const totalOrders = orderStatuses.reduce((sum, item) => sum + item.count, 0);

  const doughnutData = {
    labels,
    datasets: [
      {
        data: orderStatuses.map((d) => d.count),
        backgroundColor: colors,
        hoverOffset: 4,
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: { size: 11 },
          color: '#71717A',
          boxWidth: 8,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const count = context.raw as number;
            const percentage = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
            return ` ${context.label}: ${count} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '72%',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
      {/* Order Status Breakdown */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
            Fulfillment Health
          </span>
          <h3 className="text-sm font-bold text-[#16281D] mt-0.5 mb-4">
            Order Status Distribution
          </h3>
        </div>

        <div className="relative h-44 w-full">
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div className="absolute left-[32%] top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-xl font-extrabold text-[#16281D] leading-none">
              {totalOrders}
            </span>
            <span className="text-[10px] font-semibold text-[#71717A] mt-0.5">Orders</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#F4F7F4]">
          {orderStatuses.slice(0, 3).map((st) => {
            const conf = statusColorMap[st.status] || statusColorMap.unknown;
            return (
              <div
                key={st.status}
                className={`p-2 rounded-xl text-center ${conf.bg}`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                  <span className="font-mono text-xs font-bold text-[#16281D]">
                    {st.count}
                  </span>
                </div>
                <span className="text-[10px] capitalize text-[#71717A] block truncate">
                  {st.status.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Gateways */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
            Financial Rails
          </span>
          <h3 className="text-sm font-bold text-[#16281D] mt-0.5 mb-4">Payment Gateways</h3>
        </div>

        <div className="space-y-2.5">
          {gateways.map((gw) => (
            <div
              key={gw.name}
              className="flex items-center justify-between p-3 bg-[#F4F7F4] rounded-xl border border-[#EAEAEA]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center text-[#16281D]">
                  <CreditCard size={14} />
                </div>
                <span className="text-xs font-bold text-[#16281D]">{gw.name}</span>
              </div>
              <span className="font-mono text-xs font-extrabold text-[#16281D]">
                ${gw.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
            Operations & Bookings
          </span>
          <h3 className="text-sm font-bold text-[#16281D] mt-0.5 mb-4">Fulfillment Status</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA]">
            <div className="flex items-center gap-2.5">
              <CalendarClock size={16} className="text-[#3B82F6]" />
              <span className="text-xs font-semibold text-[#16281D]">
                Upcoming Appointments
              </span>
            </div>
            <span className="font-mono text-base font-extrabold text-[#3B82F6]">
              {upcomingAppointments}
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA]">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-[#15803D]" />
              <span className="text-xs font-semibold text-[#16281D]">Completed Orders</span>
            </div>
            <span className="font-mono text-base font-extrabold text-[#15803D]">
              {completedOrders}
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA]">
            <div className="flex items-center gap-2.5">
              <Clock size={16} className="text-[#D97706]" />
              <span className="text-xs font-semibold text-[#16281D]">Pending Orders</span>
            </div>
            <span className="font-mono text-base font-extrabold text-[#D97706]">
              {pendingOrders}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusDistribution;
