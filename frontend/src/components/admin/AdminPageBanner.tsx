import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface AdminPageBannerProps {
  category: string;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  statusBadge?: string;
  actionSlot?: React.ReactNode;
}

export const AdminPageBanner: React.FC<AdminPageBannerProps> = ({
  category,
  title,
  subtitle,
  Icon,
  statusBadge,
  actionSlot,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-[#16281D] text-white rounded-[28px] p-6 sm:p-7 relative overflow-hidden shadow-sm flex flex-wrap items-center justify-between gap-5 font-sans"
    >
      {/* Subtle radial glow in background */}
      <div
        className="absolute -right-10 -bottom-10 w-80 h-80 rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, #9FE870 0%, rgba(22,40,29,0) 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col gap-2 max-w-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#203628] text-[#9FE870] border border-white/10 flex items-center justify-center shrink-0 shadow-sm">
            <Icon size={20} strokeWidth={2.4} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9FE870] block leading-none">
              {category}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0 tracking-tight leading-snug mt-0.5">
              {title}
            </h1>
          </div>
        </div>
        <p className="text-xs sm:text-[13px] text-[#A1BAAE] m-0 font-medium leading-relaxed">
          {subtitle}
        </p>
      </div>

      {(statusBadge || actionSlot) && (
        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          {statusBadge && (
            <div className="inline-flex items-center gap-2 bg-[#203628] border border-white/15 text-[#9FE870] px-4 py-2 rounded-full font-bold text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#9FE870] animate-pulse" />
              <span>{statusBadge}</span>
            </div>
          )}
          {actionSlot}
        </div>
      )}
    </motion.div>
  );
};
