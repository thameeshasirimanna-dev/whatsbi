import React from 'react';
import { Wallet, FileText } from 'lucide-react';
import { DashboardAgent } from './dashboard.types';

interface DashboardWelcomeBannerProps {
  agent: DashboardAgent | null;
  currentTime: string;
}

export const DashboardWelcomeBanner: React.FC<DashboardWelcomeBannerProps> = ({
  agent,
  currentTime,
}) => {
  const rawBalance = agent?.ai_balance ?? agent?.balance ?? 4.0;
  const formattedBalance =
    typeof rawBalance === 'number'
      ? rawBalance.toFixed(2)
      : parseFloat(String(rawBalance) || '0').toFixed(2);

  const rawCredits = agent?.template_credits ?? agent?.credits ?? 0;
  const formattedCredits =
    typeof rawCredits === 'number'
      ? Math.floor(rawCredits)
      : parseInt(String(rawCredits) || '0', 10);

  return (
    <div
      className="w-full bg-[#16281D] text-white rounded-[24px] p-4 sm:p-5 md:p-6 relative overflow-hidden shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-sans select-none"
    >
      {/* Organic radial ambient glow */}
      <div
        className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, #9FE870 0%, rgba(22,40,29,0) 70%)',
        }}
      />
      <div className="absolute -top-12 left-32 w-48 h-48 rounded-full bg-[#9FE870]/10 blur-2xl pointer-events-none" />

      {/* Left: Live status beacon, Greeting & Operational Summary */}
      <div className="relative z-10 max-w-xl flex flex-col gap-1">
        <div className="flex items-center justify-between sm:justify-start gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9FE870] shadow-[0_0_8px_#9FE870] animate-pulse shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-bold text-[#9FE870] tracking-wider uppercase">
              Live Telemetry Active
            </span>
          </div>
          {/* Mobile compact clock */}
          <div className="sm:hidden font-mono text-xs font-bold text-white/90 bg-[#203628] px-2.5 py-0.5 rounded-full border border-white/10">
            {currentTime}
          </div>
        </div>

        <h1 className="font-sans text-xl sm:text-2xl md:text-[25px] font-bold tracking-tight text-white m-0 flex items-center gap-2 leading-tight">
          <span>Welcome back, {agent?.name || 'Agent'}!</span>
          <span className="inline-block hover:rotate-12 transition-transform cursor-default select-none" role="img" aria-label="wave">
            👋
          </span>
        </h1>
        <p className="font-sans text-xs md:text-[13px] text-[#A1BAAE] m-0 mt-0.5 font-medium leading-relaxed">
          Multi-tenant WhatsApp Cloud API & AI routing are active and operating normally.
        </p>
      </div>

      {/* Right: AI Query Balance + Template Credits + Digital Clock */}
      <div className="relative z-10 w-full lg:w-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between lg:justify-end gap-2.5 sm:gap-3.5 pt-3 lg:pt-0 border-t border-white/10 lg:border-t-0">
        {/* 1. AI Balance Card */}
        <div className="col-span-1 sm:flex-initial bg-[#203628] border border-white/10 rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#9FE870] text-[#16281D] flex items-center justify-center font-bold shadow-[0_2px_8px_rgba(159,232,112,0.3)] shrink-0">
            <Wallet size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.4} />
          </div>

          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#A1BAAE] truncate">
              AI Balance
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-xl font-extrabold text-white tracking-tight leading-none font-mono">
                ${formattedBalance}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-[#9FE870]">
                USD
              </span>
            </div>
          </div>
        </div>

        {/* 2. Template Messages Credits Card */}
        <div className="col-span-1 sm:flex-initial bg-[#203628] border border-white/10 rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/30 flex items-center justify-center font-bold shrink-0">
            <FileText size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.4} />
          </div>

          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#A1BAAE] truncate">
              Credits
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-xl font-extrabold text-white tracking-tight leading-none font-mono">
                {formattedCredits}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-[#4ADE80]">
                Msg
              </span>
            </div>
          </div>
        </div>

        {/* 3. Live Digital Clock & Date (Desktop / Tablet) */}
        <div className="hidden sm:block text-right shrink-0 min-w-[80px] sm:min-w-[95px] pl-1">
          <div className="font-mono text-base sm:text-lg md:text-xl font-bold text-white tracking-tight leading-none">
            {currentTime}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#A1BAAE] font-medium mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
