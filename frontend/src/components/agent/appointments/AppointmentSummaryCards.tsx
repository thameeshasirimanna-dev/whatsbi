import React from 'react';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

interface AppointmentSummaryCardsProps {
  total: number;
  pending: number;
  upcoming: number;
}

const AppointmentSummaryCards: React.FC<AppointmentSummaryCardsProps> = ({
  total,
  pending,
  upcoming,
}) => {
  const cards = [
    {
      label: 'Total Appointments',
      value: total,
      icon: Calendar,
      iconColor: 'text-[#16281D]',
      bgColor: 'bg-[#F4F7F4]',
    },
    {
      label: 'Pending Confirmation',
      value: pending,
      icon: Clock,
      iconColor: 'text-[#D97706]',
      bgColor: 'bg-[#F59E0B]/10',
    },
    {
      label: 'Upcoming Scheduled',
      value: upcoming,
      icon: CheckCircle,
      iconColor: 'text-[#15803D]',
      bgColor: 'bg-[#22C55E]/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
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

export default AppointmentSummaryCards;
