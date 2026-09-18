import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const ModalDrawerPreview: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col gap-10 font-sans">
      <div>
        <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
          Modal Dialogs & Slide-Over Inspector Drawers
        </h2>
        <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
          Interactive previews for center modal dialogs and right slide-over contextual drawers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Modal Dialog Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F0FDF4] text-[#15803D] flex items-center justify-center border border-[#BBF7D0]">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#16281D] m-0">Centered Modal Dialog</h3>
              <p className="text-xs text-[#71717A] m-0 mt-1">
                Backdrop-filtered blurred scrim with rounded 24px container, header zone, and tactile lime primary CTA.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-xs py-3 px-4 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all flex items-center justify-center gap-1.5"
          >
            Launch Modal Dialog Preview
          </button>
        </div>

        {/* Slide-Over Drawer Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#16281D] text-[#9FE870] flex items-center justify-center">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#16281D] m-0">Slide-Over Contextual Drawer</h3>
              <p className="text-xs text-[#71717A] m-0 mt-1">
                Full-height deep forest panel (`#16281D`) sliding from the right edge for deep context inspection.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-full bg-[#16281D] hover:bg-[#203628] active:scale-[0.98] text-white font-bold text-xs py-3 px-4 rounded-full shadow-xs cursor-pointer border-0 transition-all flex items-center justify-center gap-1.5"
          >
            Launch Inspector Drawer Preview
          </button>
        </div>
      </div>

      {/* --- LIVE MODAL DIALOG PREVIEW --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Scrim */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          />

          {/* Modal Container */}
          <div className="relative bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#EAEAEA] shadow-[0_24px_72px_rgba(20,40,24,0.22)] z-10 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#16281D] text-[#9FE870] flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
                    Webhook Verification
                  </h4>
                  <p className="text-xs text-[#71717A] m-0 mt-0.5">
                    Meta Graph Cloud API v20.0
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#71717A] hover:text-[#16281D] flex items-center justify-center border-0 cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex flex-col gap-3 text-xs text-[#52525B]">
              <p className="m-0 leading-relaxed">
                Connect your WhatsApp Business Account endpoint to stream real-time operational telemetry and handle automated customer routing.
              </p>
              <div className="bg-[#F4F7F4] p-3.5 rounded-xl border border-black/5 flex flex-col gap-1 font-mono text-[11px] text-[#16281D]">
                <span className="text-[#8FA89B] font-sans font-medium text-[10px]">Callback URL:</span>
                <span className="truncate">https://api.bizagentz.io/webhooks/v1/meta</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#F4F4F5]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-full text-xs font-bold text-[#52525B] hover:text-[#16281D] hover:bg-[#F4F7F4] border border-[#E4E4E7] cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] shadow-[0_4px_14px_rgba(159,232,112,0.3)] cursor-pointer border-0 transition-all flex items-center gap-1.5"
              >
                Save & Verify <ArrowRight size={13} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIVE SLIDE-OVER DRAWER PREVIEW --- */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Scrim */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-Over Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#16281D] text-white p-7 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
              {/* Top Header */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9FE870] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9FE870]">
                      Telemetry Inspector
                    </span>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-8 h-8 rounded-full bg-[#203628] hover:bg-[#264432] text-[#8FA89B] hover:text-white flex items-center justify-center border-0 cursor-pointer transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white m-0 tracking-tight">
                    Apex Customer AI Agent Details
                  </h3>
                  <p className="text-xs text-[#8FA89B] m-0 mt-1">
                    DeepSeek V3 Autonomous Dispatcher • Production Instance
                  </p>
                </div>

                {/* Attributes List */}
                <div className="flex flex-col gap-3">
                  <div className="bg-[#203628] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-[#8FA89B]">Operating Status</span>
                    <span className="text-xs font-bold text-[#9FE870] flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Active & Available
                    </span>
                  </div>

                  <div className="bg-[#203628] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-[#8FA89B]">Connected Instance</span>
                    <span className="text-xs font-mono text-white">node-us-east-01</span>
                  </div>

                  <div className="bg-[#203628] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-[#8FA89B]">Pending Queue</span>
                    <span className="text-xs font-bold text-[#FBBF24]">3 Inbound queued chats</span>
                  </div>
                </div>
              </div>

              {/* Bottom Pinned Footer */}
              <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-bold text-sm py-3.5 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all flex items-center justify-center gap-2"
                >
                  <Zap size={15} /> Deploy Agent Instance
                </button>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full bg-transparent text-[#8FA89B] hover:text-white font-semibold text-xs py-2 border-0 cursor-pointer transition-colors"
                >
                  Dismiss Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
