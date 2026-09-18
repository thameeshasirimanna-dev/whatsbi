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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="col-span-1 last:col-span-2 sm:last:col-span-1 bg-white rounded-[16px] sm:rounded-[20px] p-3 sm:p-5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex items-center justify-between gap-2 min-w-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-[#71717A] truncate">{card.label}</p>
              <h3 className="font-mono text-base sm:text-2xl font-extrabold text-[#16281D] mt-0.5 sm:mt-1 tracking-tight truncate">
                {card.value}
              </h3>
            </div>
            <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${card.bgColor} ${card.iconColor} flex items-center justify-center shrink-0`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AppointmentSummaryCards;
