import React, { useState } from 'react';
import {
  SlidersHorizontal,
  MessageSquare,
  Zap,
  Star,
  Check,
} from 'lucide-react';
import { AgentProfile } from '../types';

export interface CampaignInspectorProps {
  agent?: AgentProfile;
  onDeployCampaign?: (date: number, time: string) => void;
}

const DEFAULT_AGENT: AgentProfile = {
  name: 'Apex Customer AI',
  specialty: 'DeepSeek V3 • WhatsApp Bot',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  experience: '99.9% Uptime',
  totalMessages: '+100k Msgs',
  rating: '4.9',
  reviewsCount: 40,
};

const CALENDAR_DAYS = [
  { day: 29, current: false, status: 'unavailable' },
  { day: 30, current: false, status: 'unavailable' },
  { day: 31, current: false, status: 'unavailable' },
  { day: 1, current: true, status: 'available' },
  { day: 2, current: true, status: 'available' },
  { day: 3, current: true, status: 'available' },
  { day: 4, current: true, status: 'available' },
  { day: 5, current: true, status: 'available' },
  { day: 6, current: true, status: 'available' },
  { day: 7, current: true, status: 'available' },
  { day: 8, current: true, status: 'available' },
  { day: 9, current: true, status: 'available' },
  { day: 10, current: true, status: 'available' },
  { day: 11, current: true, status: 'available' },
  { day: 12, current: true, status: 'available' },
  { day: 13, current: true, status: 'available' },
  { day: 14, current: true, status: 'available' },
  { day: 15, current: true, status: 'available' },
  { day: 16, current: true, status: 'available' },
  { day: 17, current: true, status: 'available' }, // Default selected
  { day: 18, current: true, status: 'available' },
  { day: 19, current: true, status: 'available' },
  { day: 20, current: true, status: 'available' },
  { day: 21, current: true, status: 'available' },
  { day: 22, current: true, status: 'available' },
  { day: 23, current: true, status: 'available' },
  { day: 24, current: true, status: 'booked' },
  { day: 25, current: true, status: 'available' },
  { day: 26, current: true, status: 'available' },
  { day: 27, current: true, status: 'available' },
  { day: 28, current: true, status: 'available' },
  { day: 29, current: true, status: 'available' },
  { day: 30, current: true, status: 'available' },
  { day: 1, current: false, status: 'unavailable' },
  { day: 2, current: false, status: 'unavailable' },
];

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '01:00 PM',
  '02:00 PM',
];

export const CampaignInspector: React.FC<CampaignInspectorProps> = ({
  agent = DEFAULT_AGENT,
  onDeployCampaign,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(17);
  const [selectedTime, setSelectedTime] = useState<string>('11:00 AM');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBooked, setIsBooked] = useState(false);

  const handleDeploy = () => {
    setIsBooked(true);
    onDeployCampaign?.(selectedDay, selectedTime);
    setTimeout(() => setIsBooked(false), 2400);
  };

  return (
    <aside className="w-full xl:w-[330px] self-stretch bg-[#16281D] rounded-[32px] p-6 md:p-7 text-white flex flex-col justify-between gap-6 shadow-sm font-sans shrink-0 select-none">
      <div className="flex flex-col gap-5">
        {/* Header Title */}
        <h2 className="font-bold text-xl text-white m-0 tracking-tight">
          Campaign broadcast
        </h2>

        {/* Search Bar */}
        <div className="relative flex items-center bg-[#203628] rounded-full px-3.5 py-1.5 border border-white/5">
          <input
            type="text"
            placeholder="Search agents or campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-0 outline-none text-xs text-white placeholder-[#8FA89B] w-full pl-1.5 pr-8 font-sans font-medium"
          />
          <button
            title="Filter"
            className="w-7.5 h-7.5 rounded-full bg-[#9FE870] text-[#16281D] flex items-center justify-center shrink-0 hover:scale-105 transition-transform cursor-pointer border-0"
          >
            <SlidersHorizontal size={13} strokeWidth={2.4} />
          </button>
        </div>

        {/* Agent Profile Card */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={agent.avatar}
                alt={agent.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#9FE870]"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[15px] text-white leading-tight">
                {agent.name}
              </span>
              <span className="text-xs text-[#A1BAAE] font-medium mt-0.5">
                {agent.specialty}
              </span>
            </div>
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Messages badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#203628] text-[#9FE870] px-3 py-1 rounded-full text-[11px] font-bold">
              <MessageSquare size={11} strokeWidth={2.4} /> {agent.totalMessages}
            </div>

            {/* Uptime badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#2E3C2B] text-[#D9F99D] px-3 py-1 rounded-full text-[11px] font-bold">
              <Zap size={11} strokeWidth={2.4} /> {agent.experience}
            </div>

            {/* Rating badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#3A4E31] text-[#A3E635] px-3 py-1 rounded-full text-[11px] font-bold">
              <Star size={11} fill="#A3E635" /> {agent.rating} ({agent.reviewsCount})
            </div>
          </div>
        </div>

        {/* Schedule Date Section */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-[#E2E8F0] tracking-wide">
            Schedule broadcast date
          </span>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#8FA89B]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-y-2 gap-x-1.5 text-center text-xs font-medium">
            {CALENDAR_DAYS.map((c, i) => {
              const isSelected = selectedDay === c.day && c.current;

              return (
                <button
                  key={i}
                  disabled={!c.current || c.status === 'unavailable'}
                  onClick={() => setSelectedDay(c.day)}
                  className={`w-7.5 h-7.5 rounded-full mx-auto flex items-center justify-center transition-all cursor-pointer border-0 ${
                    isSelected
                      ? 'bg-[#9FE870] text-[#16281D] font-extrabold shadow-[0_2px_8px_rgba(159,232,112,0.4)]'
                      : c.current
                      ? c.status === 'booked'
                        ? 'text-white/40 bg-white/5 hover:bg-white/10'
                        : 'text-white/90 hover:bg-[#203628]'
                      : 'text-white/20 cursor-not-allowed'
                  }`}
                >
                  {c.day}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-[9px] font-medium text-[#8FA89B] pt-2.5 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9FE870]" /> Scheduled
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" /> Broadcasting
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/10" /> Inactive
            </div>
          </div>
        </div>

        {/* Time Window Section */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-[#E2E8F0] tracking-wide">
            Broadcast time window
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {TIME_SLOTS.map((t) => {
              const isSelected = selectedTime === t;
              return (
                <button
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 ${
                    isSelected
                      ? 'bg-[#9FE870] text-[#16281D] shadow-[0_2px_8px_rgba(159,232,112,0.4)]'
                      : 'bg-[#203628] text-white/80 hover:bg-[#2A4433]'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary Deploy Campaign CTA Button */}
      <button
        onClick={handleDeploy}
        className="w-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-sm py-3.5 rounded-full shadow-[0_4px_16px_rgba(159,232,112,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 border-0 mt-3"
      >
        {isBooked ? (
          <>
            <Check size={16} strokeWidth={3} /> Campaign Scheduled
          </>
        ) : (
          'Deploy Campaign'
        )}
      </button>
    </aside>
  );
};
