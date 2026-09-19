import React from 'react';
import { Smartphone, CheckCircle2, XCircle, Activity } from 'lucide-react';
import type { Broadcast } from '../../../lib/api';

interface SmsMarketingSummaryCardsProps {
  campaigns: Broadcast[];
}

const SmsMarketingSummaryCards: React.FC<SmsMarketingSummaryCardsProps> = ({ campaigns }) => {
  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((acc, curr) => acc + (curr.sent_count || 0), 0);
  const totalFailed = campaigns.reduce((acc, curr) => acc + (curr.failed_count || 0), 0);
  const totalProcessed = totalSent + totalFailed;
  const overallDeliveryRate =
    totalProcessed > 0 ? Math.round((totalSent / totalProcessed) * 100) : 100;

  const cards = [
    {
      label: 'SMS Campaigns',
      value: totalCampaigns,
      isPercentage: false,
      icon: Smartphone,
      iconColor: 'text-[#16281D]',
      bgColor: 'bg-[#9FE870]/25',
    },
    {
      label: 'Delivered SMS',
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
      label: 'Success Rate',
      value: `${overallDeliveryRate}%`,
      isPercentage: true,
      icon: Activity,
      iconColor: 'text-[#2563EB]',
      bgColor: 'bg-[#3B82F6]/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex items-center justify-between min-w-0"
          >
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-[11px] sm:text-xs font-medium text-[#71717A] truncate">
                {card.label}
              </p>
              <h3 className="font-mono text-xl sm:text-2xl font-extrabold text-[#16281D] mt-0.5 sm:mt-1 tracking-tight truncate">
                {card.value}
              </h3>
            </div>
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${card.bgColor} ${card.iconColor} flex items-center justify-center shrink-0`}
            >
              <Icon size={18} className="sm:w-5 sm:h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SmsMarketingSummaryCards;
