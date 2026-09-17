import React from 'react';
import { Bar, Line } from 'react-chartjs-2';

interface CRMActivitySectionProps {
  leadStages: { stage: string; count: number }[];
  monthlyMessages: { month: string; inbound: number; outbound: number }[];
  totalCustomers: number;
}

export const CRMActivitySection: React.FC<CRMActivitySectionProps> = ({
  leadStages,
  monthlyMessages,
  totalCustomers,
}) => {
  // Funnel Chart
  const stageOrder = ['New Lead', 'Contacted', 'Follow-up Needed', 'Not Responding'];
  const sortedStages = [...leadStages].sort(
    (a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)
  );
  const funnelColors = ['#16281D', '#3B82F6', '#F59E0B', '#EF4444'];

  const funnelData = {
    labels: sortedStages.map((d) => d.stage),
    datasets: [
      {
        data: sortedStages.map((d) => d.count),
        backgroundColor: funnelColors,
        borderRadius: 8,
        barThickness: 16,
      },
    ],
  };

  const funnelOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { color: '#F4F7F4' },
        ticks: { font: { size: 10 }, color: '#71717A', precision: 0 },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11, weight: 'bold' as const }, color: '#16281D' },
      },
    },
  };

  // WhatsApp Inbound/Outbound Messages Chart
  const recentMessages = monthlyMessages.slice(-12);
  const messageData = {
    labels: recentMessages.map((d) => d.month),
    datasets: [
      {
        label: 'Inbound',
        data: recentMessages.map((d) => d.inbound),
        borderColor: '#16281D',
        backgroundColor: 'transparent',
        tension: 0.35,
        pointBackgroundColor: '#9FE870',
        pointBorderColor: '#16281D',
        pointBorderWidth: 1.5,
        pointRadius: 3,
      },
      {
        label: 'Outbound',
        data: recentMessages.map((d) => d.outbound),
        borderColor: '#3B82F6',
        backgroundColor: 'transparent',
        tension: 0.35,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 3,
      },
    ],
  };

  const messageOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 11 },
          color: '#71717A',
          boxWidth: 8,
          usePointStyle: true,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: '#71717A' },
      },
      y: {
        grid: { color: '#F4F7F4' },
        ticks: { font: { size: 10 }, color: '#71717A', precision: 0 },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
      {/* CRM Funnel */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
            Lead Qualification
          </span>
          <h3 className="text-sm font-bold text-[#16281D] mt-0.5 mb-4">CRM Pipeline Funnel</h3>
        </div>
        <div className="h-44 w-full">
          <Bar data={funnelData} options={funnelOptions as any} />
        </div>
      </div>

      {/* Message Activity */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
            Conversational Traffic
          </span>
          <h3 className="text-sm font-bold text-[#16281D] mt-0.5 mb-4">
            WhatsApp Message Volume
          </h3>
        </div>
        <div className="h-44 w-full">
          <Line data={messageData} options={messageOptions as any} />
        </div>
      </div>

      {/* Contact Distribution Map */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
            Reach & Geography
          </span>
          <h3 className="text-sm font-bold text-[#16281D] mt-0.5 mb-4">
            Contact Distribution
          </h3>
        </div>

        <div className="relative h-44 flex items-center justify-center bg-[#F4F7F4] rounded-2xl overflow-hidden">
          <svg viewBox="0 0 200 100" className="w-44 h-28 opacity-60">
            <path
              d="M50 30 Q70 20 90 30 Q100 40 90 50 Q70 60 50 50 Z"
              fill="rgba(159,232,112,0.25)"
              stroke="#16281D"
              strokeWidth="0.75"
            />
            <path
              d="M110 40 Q130 30 150 40 Q160 50 150 60 Q130 70 110 60 Z"
              fill="rgba(159,232,112,0.25)"
              stroke="#16281D"
              strokeWidth="0.75"
            />
            {[...Array(6)].map((_, i) => (
              <circle
                key={i}
                cx={40 + i * 22}
                cy={25 + (i % 3) * 18}
                r="2"
                fill="#16281D"
              />
            ))}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-2xl font-extrabold text-[#16281D] leading-none">
              {totalCustomers.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-[#71717A] mt-1">
              Active CRM Contacts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMActivitySection;
