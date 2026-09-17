import React, { useState } from 'react';
import {
  Download,
  Plus,
  Trash2,
  Settings,
  ChevronRight,
  User,
  Briefcase,
  Star,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Zap,
  MessageSquare,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export const ButtonsBadgesPanel: React.FC = () => {
  const [loadingButton, setLoadingButton] = useState(false);
  const [activeSegment, setActiveSegment] = useState<'day' | 'week' | 'month'>('week');

  const triggerLoading = () => {
    setLoadingButton(true);
    setTimeout(() => setLoadingButton(false), 2000);
  };

  return (
    <div className="flex flex-col gap-10 font-sans">
      {/* 1. Button Variants */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
            Button Hierarchy & Variants
          </h2>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Standard high-contrast button tokens with calibrated hover and press states.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-sm flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Primary Lime */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[#16281D] uppercase tracking-wider">Primary Lime</span>
              <button className="w-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2.5 px-4 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all flex items-center justify-center gap-1.5">
                <Plus size={14} strokeWidth={2.6} /> Deploy Campaign
              </button>
              <span className="text-[10px] text-[#A1A1AA]">CTAs & primary actions</span>
            </div>

            {/* Secondary Forest */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[#16281D] uppercase tracking-wider">Secondary Forest</span>
              <button className="w-full bg-[#16281D] hover:bg-[#203628] active:scale-[0.98] text-white font-bold text-xs py-2.5 px-4 rounded-full shadow-xs cursor-pointer border-0 transition-all flex items-center justify-center gap-1.5">
                <Settings size={14} strokeWidth={2.2} /> Tenant Settings
              </button>
              <span className="text-[10px] text-[#A1A1AA]">Alternative workflows</span>
            </div>

            {/* Soft Mint */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[#16281D] uppercase tracking-wider">Soft Mint</span>
              <button className="w-full bg-[#F4F7F4] hover:bg-[#E8ECE8] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2.5 px-4 rounded-full border border-black/5 cursor-pointer transition-all flex items-center justify-center gap-1.5">
                <Download size={14} strokeWidth={2.2} /> Export CSV
              </button>
              <span className="text-[10px] text-[#A1A1AA]">Utility & export actions</span>
            </div>

            {/* Ghost / Outline */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[#16281D] uppercase tracking-wider">Ghost / Outline</span>
              <button className="w-full bg-transparent hover:bg-black/5 active:scale-[0.98] text-[#52525B] font-bold text-xs py-2.5 px-4 rounded-full border border-[#E4E4E7] cursor-pointer transition-all flex items-center justify-center gap-1.5">
                Cancel
              </button>
              <span className="text-[10px] text-[#A1A1AA]">Dismissals & modal backout</span>
            </div>

            {/* Destructive */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[#E11D48] uppercase tracking-wider">Destructive</span>
              <button className="w-full bg-[#FFF1F2] hover:bg-[#FFE4E6] active:scale-[0.98] text-[#E11D48] font-bold text-xs py-2.5 px-4 rounded-full border border-[#FECDD3] cursor-pointer transition-all flex items-center justify-center gap-1.5">
                <Trash2 size={14} strokeWidth={2.2} /> Delete Record
              </button>
              <span className="text-[10px] text-[#A1A1AA]">Irreversible mutations</span>
            </div>
          </div>

          {/* Sizing & States Matrix */}
          <div className="border-t border-[#F4F4F5] pt-5 flex flex-col gap-4">
            <span className="text-xs font-bold text-[#16281D]">Button Sizing & Interactive States</span>
            <div className="flex flex-wrap items-center gap-3">
              {/* Small */}
              <button className="bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-bold text-[11px] h-8 px-3 rounded-full border-0 cursor-pointer transition-all">
                Small (32px)
              </button>

              {/* Medium */}
              <button className="bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-bold text-xs h-10 px-4 rounded-full border-0 cursor-pointer transition-all">
                Medium (40px)
              </button>

              {/* Large */}
              <button className="bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-bold text-sm h-12 px-6 rounded-full border-0 cursor-pointer transition-all">
                Large (48px)
              </button>

              {/* Icon Only Buttons */}
              <button className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D] flex items-center justify-center border border-black/5 cursor-pointer transition-all">
                <Zap size={14} />
              </button>

              <button className="w-10 h-10 rounded-full bg-[#16281D] hover:bg-[#203628] text-white flex items-center justify-center border-0 cursor-pointer transition-all">
                <Calendar size={16} />
              </button>

              <button className="w-12 h-12 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] flex items-center justify-center border-0 cursor-pointer shadow-sm transition-all">
                <Plus size={20} strokeWidth={2.6} />
              </button>

              {/* Loading State Button */}
              <button
                onClick={triggerLoading}
                className="bg-[#16281D] text-white font-bold text-xs h-10 px-4 rounded-full border-0 cursor-pointer transition-all flex items-center gap-2"
              >
                {loadingButton ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-[#9FE870]" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <span>Click to Test Loading</span>
                )}
              </button>

              {/* Disabled State */}
              <button
                disabled
                className="bg-[#E4E4E7] text-[#A1A1AA] font-bold text-xs h-10 px-4 rounded-full border-0 cursor-not-allowed opacity-60"
              >
                Disabled Action
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Status Badges & Capsule Tags */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
            Status Badges & Capsule Tags
          </h2>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Operational status indicators, metric telemetry tags, and dark inspector badges.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-sm flex flex-col gap-6">
          {/* Operational Status Badges */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#16281D]">Operational State Badges</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" /> Active / Online
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Low Balance Warning
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Critical / Failed
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]">
                <span className="w-2 h-2 rounded-full bg-[#71717A]" /> Offline / Draft
              </span>
            </div>
          </div>

          {/* Telemetry Highlight Badges */}
          <div className="flex flex-col gap-2.5 border-t border-[#F4F4F5] pt-4">
            <span className="text-xs font-bold text-[#16281D]">High-Contrast Telemetry Tags</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-[#9FE870] text-[#16281D] font-bold text-xs px-3 py-1 rounded-full shadow-xs">
                90 msg/s
              </div>
              <div className="bg-[#9FE870] text-[#16281D] font-bold text-xs px-3 py-1 rounded-full shadow-xs">
                6M tokens
              </div>
              <div className="bg-[#9FE870] text-[#16281D] font-bold text-xs px-3 py-1 rounded-full shadow-xs">
                65% quota
              </div>
              <div className="bg-[#F87171] text-white font-bold text-xs px-3 py-1 rounded-full shadow-xs">
                4000 sessions
              </div>
            </div>
          </div>

          {/* Dark Inspector Profile Badges */}
          <div className="flex flex-col gap-2.5 border-t border-[#F4F4F5] pt-4">
            <span className="text-xs font-bold text-[#16281D]">Dark Panel Profile Badges</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 bg-[#203628] text-[#9FE870] px-3.5 py-1.5 rounded-full text-xs font-bold">
                <MessageSquare size={13} strokeWidth={2.4} /> +100k Messages
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#2E3C2B] text-[#D9F99D] px-3.5 py-1.5 rounded-full text-xs font-bold">
                <ShieldCheck size={13} strokeWidth={2.4} /> 99.9% Uptime
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#3A4E31] text-[#A3E635] px-3.5 py-1.5 rounded-full text-xs font-bold">
                <Star size={13} fill="#A3E635" /> 4.9 (40 Tenants)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Navigation & Breadcrumbs */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
            Navigation Controls & Breadcrumbs
          </h2>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Segmented capsule switches and hierarchical breadcrumb trails.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Segmented Switch */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#16281D]">Segmented Capsule Switch</span>
            <div className="flex items-center bg-[#E8ECE8] p-1 rounded-full border border-black/5">
              {(['day', 'week', 'month'] as const).map((seg) => (
                <button
                  key={seg}
                  onClick={() => setActiveSegment(seg)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 capitalize ${
                    activeSegment === seg
                      ? 'bg-[#16281D] text-white shadow-xs'
                      : 'text-[#52525B] hover:text-[#16281D] bg-transparent'
                  }`}
                >
                  {seg}
                </button>
              ))}
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#16281D]">Hierarchical Breadcrumbs</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#71717A] hover:text-[#16281D] cursor-pointer">Super Admin</span>
              <ChevronRight size={13} className="text-[#A1A1AA]" />
              <span className="text-[#71717A] hover:text-[#16281D] cursor-pointer">Tenants</span>
              <ChevronRight size={13} className="text-[#A1A1AA]" />
              <span className="font-bold text-[#16281D]">Apex Logistics</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
