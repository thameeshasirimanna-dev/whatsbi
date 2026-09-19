import React from 'react';
import { Layers, Users, Sparkles, UserCheck } from 'lucide-react';

interface GroupMetricCardsProps {
  totalGroups: number;
  totalGroupedCustomers: number;
  largestGroupCount: number;
  unassignedCount: number;
}

export const GroupMetricCards: React.FC<GroupMetricCardsProps> = ({
  totalGroups,
  totalGroupedCustomers,
  largestGroupCount,
  unassignedCount,
}) => {
  const cards = [
    {
      Icon: Layers,
      label: 'Total Groups',
      value: totalGroups.toLocaleString(),
      sub: 'Active segments',
      iconColor: '#16281D',
      iconBg: 'rgba(159,232,112,0.3)',
    },
    {
      Icon: Users,
      label: 'Grouped Contacts',
      value: totalGroupedCustomers.toLocaleString(),
      sub: 'Assigned to groups',
      iconColor: '#15803D',
      iconBg: '#DCFCE7',
    },
    {
      Icon: Sparkles,
      label: 'Largest Group',
      value: largestGroupCount.toLocaleString(),
      sub: 'Peak group size',
      iconColor: '#0369A1',
      iconBg: '#E0F2FE',
    },
    {
      Icon: UserCheck,
      label: 'Unassigned Contacts',
      value: unassignedCount.toLocaleString(),
      sub: 'Awaiting group',
      iconColor: '#B45309',
      iconBg: '#FEF3C7',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-[16px] sm:rounded-[20px] p-3 sm:p-5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] hover:shadow-md hover:border-[#16281D]/20 transition-all duration-200 min-w-0"
        >
          <div className="flex items-start justify-between mb-2 sm:mb-3.5 gap-1.5">
            <div
              className="w-8 h-8 sm:w-[42px] sm:h-[42px] rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: card.iconBg }}
            >
              <card.Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: card.iconColor }} />
            </div>
          </div>
          <div className="font-mono text-base sm:text-2xl font-bold text-[#16281D] leading-none mb-1 sm:mb-1.5 truncate">
            {card.value}
          </div>
          <div className="text-xs sm:text-[13px] font-semibold text-[#71717A] mb-0.5 sm:mb-1 truncate">
            {card.label}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#A1A1AA] truncate">
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupMetricCards;
