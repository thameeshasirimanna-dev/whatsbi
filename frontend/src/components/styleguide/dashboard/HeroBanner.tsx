import React from 'react';

interface HeroBannerProps {
  userName?: string;
  greeting?: string;
  subtitle?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  userName = 'Liam Gallagher',
  greeting = 'Welcome back',
  subtitle = 'Multi-tenant WhatsApp Cloud API & AI routing are active and operating normally.',
}) => {
  return (
    <div className="w-full bg-[#16281D] text-white rounded-[24px] p-6 md:p-7 relative overflow-hidden shadow-sm">
      {/* Subtle organic radial glow in background */}
      <div
        className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, #9FE870 0%, rgba(22,40,29,0) 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col gap-1">
        <h1 className="font-sans text-2xl md:text-[26px] font-bold tracking-tight text-white m-0 flex items-center gap-2 leading-tight">
          <span>
            {greeting}, {userName}!!
          </span>
          <span className="inline-block hover:rotate-12 transition-transform cursor-default select-none" role="img" aria-label="wave">
            👋
          </span>
        </h1>
        <p className="font-sans text-xs md:text-[13px] text-[#A1BAAE] m-0 font-medium">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
