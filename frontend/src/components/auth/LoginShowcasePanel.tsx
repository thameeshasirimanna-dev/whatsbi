import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Zap,
  CheckCircle2,
  Users,
  CheckCheck,
  ShieldCheck,
} from 'lucide-react';

interface LoginShowcasePanelProps {
  className?: string;
}

export const LoginShowcasePanel: React.FC<LoginShowcasePanelProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'features'>('chat');

  return (
    <div
      className={`hidden lg:flex lg:w-5/12 bg-gradient-to-b from-[#16281D] via-[#132319] to-[#0E1A12] text-white p-8 lg:p-9 flex-col justify-between relative overflow-hidden ${className}`}
    >
      {/* Ambient Radial Accent */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none opacity-25"
        style={{
          background: 'radial-gradient(circle, #9FE870 0%, transparent 70%)',
        }}
      />

      {/* Header & Mode Switcher */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo/icon-logo-green.svg"
              alt="Biz Agentz"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div>
              <span className="text-xs font-extrabold text-white tracking-wider uppercase block leading-none">
                Biz Agentz
              </span>
              <span className="text-[10px] text-[#8FA89B] font-medium block mt-1">
                Workspace Preview
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#203628] border border-white/10 text-[10px] font-semibold text-[#9FE870]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span>Live Inbox</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#101D14] border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-[#223B2B] text-white shadow-xs'
                : 'bg-transparent text-[#8FA89B] hover:text-white'
            }`}
          >
            <MessageSquare size={13} className={activeTab === 'chat' ? 'text-[#9FE870]' : ''} />
            <span>Live Simulation</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
              activeTab === 'features'
                ? 'bg-[#223B2B] text-white shadow-xs'
                : 'bg-transparent text-[#8FA89B] hover:text-white'
            }`}
          >
            <Zap size={13} className={activeTab === 'features' ? 'text-[#9FE870]' : ''} />
            <span>Platform Power</span>
          </button>
        </div>
      </div>

      {/* Dynamic Centerpiece Content */}
      <div className="my-6 relative z-10">
        {activeTab === 'chat' ? (
          <div className="flex flex-col gap-3">
            {/* Incoming WhatsApp Customer Message */}
            <div className="bg-[#203628]/90 border border-white/10 rounded-2xl p-4 shadow-sm backdrop-blur-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#9FE870] uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Incoming Inquiry
                </span>
                <span className="text-[10px] text-[#8FA89B]">Just now</span>
              </div>
              <p className="text-xs text-[#E4E4E7] leading-relaxed m-0 font-normal">
                “Hi! Can you share your service catalog and let me know if there are slots available tomorrow afternoon?”
              </p>
            </div>

            {/* Smart Assistant Instant Response */}
            <div className="bg-[#264432] border border-[#9FE870]/30 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#9FE870] flex items-center gap-1.5">
                  <Sparkles size={12} /> Smart Assistant
                </span>
                <span className="text-[10px] font-semibold text-[#8FA89B] bg-black/20 px-2 py-0.5 rounded-md">
                  0.4s instant reply
                </span>
              </div>
              <p className="text-xs text-white leading-relaxed m-0">
                “Hello! Here is our current service menu. We have consultation slots open tomorrow at 11:00 AM and 3:30 PM. Would you like me to book one for you?”
              </p>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-[#A1BAAE]">
                <span>Tag: <strong className="text-white">Consultation Lead</strong></span>
                <span className="text-[#9FE870] font-semibold flex items-center gap-1">
                  <CheckCheck size={13} className="text-[#10B981]" /> Auto-Logged
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="bg-[#203628]/80 border border-white/10 rounded-xl p-3 flex items-start gap-3 hover:bg-[#203628] transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#264432] text-[#9FE870] flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={14} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">24/7 Automated Inquiries</span>
                <span className="text-[11px] text-[#A1BAAE] leading-snug block mt-0.5">
                  Deliver instant, accurate replies to customer questions any time of day.
                </span>
              </div>
            </div>

            <div className="bg-[#203628]/80 border border-white/10 rounded-xl p-3 flex items-start gap-3 hover:bg-[#203628] transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#264432] text-[#9FE870] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={14} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Automated Bookings & Orders</span>
                <span className="text-[11px] text-[#A1BAAE] leading-snug block mt-0.5">
                  Share product catalogs, confirm bookings, and manage orders seamlessly.
                </span>
              </div>
            </div>

            <div className="bg-[#203628]/80 border border-white/10 rounded-xl p-3 flex items-start gap-3 hover:bg-[#203628] transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#264432] text-[#9FE870] flex items-center justify-center shrink-0 mt-0.5">
                <Users size={14} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Organized Customer CRM</span>
                <span className="text-[11px] text-[#A1BAAE] leading-snug block mt-0.5">
                  Keep customer tags, chat histories, and notes organized in one workspace.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Proof Metric */}
      <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[11px] text-[#8FA89B] relative z-10">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-[#9FE870] shrink-0" />
          <span>Meta Cloud API Verified</span>
        </div>
        <div className="flex items-center gap-2">
          <img
            src="/logo/icon-logo-green.svg"
            alt="Biz Agentz"
            className="w-4 h-4 object-contain shrink-0"
          />
          <span className="text-[#9FE870] font-semibold">Biz Agentz Portal</span>
        </div>
      </div>
    </div>
  );
};

