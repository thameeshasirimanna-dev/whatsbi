import React from 'react';
import { Send, CheckCircle2, XCircle, Activity } from 'lucide-react';
import type { Broadcast } from '../../../lib/api';

interface BroadcastSummaryCardsProps {
  broadcasts: Broadcast[];
}

const BroadcastSummaryCards: React.FC<BroadcastSummaryCardsProps> = ({ broadcasts }) => {
  const totalCampaigns = broadcasts.length;
  const totalSent = broadcasts.reduce((acc, curr) => acc + curr.sent_count, 0);
  const totalFailed = broadcasts.reduce((acc, curr) => acc + curr.failed_count, 0);
  const overallDeliveryRate =
    totalSent + totalFailed > 0
      ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
      : 100;

  const cards = [
    {
      label: 'Total Campaigns',
      value: totalCampaigns,
      isPercentage: false,
      icon: Send,
      iconColor: 'text-[#16281D]',
      bgColor: 'bg-[#9FE870]/25',
    },
    {
      label: 'Total Delivered',
      value: totalSent,
      isPercentage: false,
      icon: CheckCircle2,
      iconColor: 'text-[#15803D]',
      bgColor: 'bg-[#22C55E]/10',
    },
    {
      label: 'Failed Delivery',
      value: totalFailed,
      isPercentage: false,
      icon: XCircle,
      iconColor: 'text-[#EF4444]',
      bgColor: 'bg-[#EF4444]/10',
    },
    {
      label: 'Overall Success Rate',
      value: `${overallDeliveryRate}%`,
      isPercentage: true,
      icon: Activity,
      iconColor: 'text-[#2563EB]',
      bgColor: 'bg-[#3B82F6]/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-[20px] p-5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-[#71717A]">{card.label}</p>
              <h3 className="font-mono text-2xl font-extrabold text-[#16281D] mt-1 tracking-tight">
                {card.value}
              </h3>
            </div>
            <div className={`w-11 h-11 rounded-2xl ${card.bgColor} ${card.iconColor} flex items-center justify-center shrink-0`}>
              <Icon size={20} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BroadcastSummaryCards;
