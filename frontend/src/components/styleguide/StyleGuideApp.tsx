import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Palette, ArrowLeft, ExternalLink } from 'lucide-react';
import { ShowcaseDashboard } from './dashboard/ShowcaseDashboard';
import { TokenSystemView } from './tokens/TokenSystemView';

export const StyleGuideApp: React.FC = () => {
  const [activeView, setActiveView] = useState<'showcase' | 'tokens'>('showcase');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F0F4F0] text-[#16281D] font-['DM_Sans'] flex flex-col">
      {/* Top Header Controls Bar */}
      <header className="sticky top-0 z-50 bg-[#16281D] text-white px-4 md:px-6 py-3 border-b border-white/5 shadow-md flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1 text-xs text-[#8FA89B] hover:text-white transition-colors cursor-pointer bg-transparent border-0"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#203628] border border-white/10 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5 w-2.5 h-2.5">
                <div className="w-1 h-1 rounded-full bg-[#9FE870]" />
                <div className="w-1 h-1 rounded-full bg-[#9FE870]" />
                <div className="w-1 h-1 rounded-full bg-[#9FE870]" />
                <div className="w-1 h-1 rounded-full bg-[#9FE870]" />
              </div>
            </div>
            <span className="font-sans font-bold text-sm text-white">
              Biz Agentz Design System
            </span>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="flex items-center bg-[#0E1C13] p-1 rounded-full border border-white/5">
          <button
            onClick={() => setActiveView('showcase')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 ${
              activeView === 'showcase'
                ? 'bg-[#9FE870] text-[#16281D] shadow-sm'
                : 'text-[#8FA89B] hover:text-white bg-transparent'
            }`}
          >
            <Layout size={13} strokeWidth={2.4} /> Live Dashboard Showcase
          </button>
          <button
            onClick={() => setActiveView('tokens')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 ${
              activeView === 'tokens'
                ? 'bg-[#9FE870] text-[#16281D] shadow-sm'
                : 'text-[#8FA89B] hover:text-white bg-transparent'
            }`}
          >
            <Palette size={13} strokeWidth={2.4} /> Design Tokens & Primitives
          </button>
        </div>

        {/* Right Documentation Indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[11px] text-[#8FA89B]">
            Spec: <code className="text-[#9FE870] font-mono text-[10px]">docs/style-guide.md</code>
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[95vw] md:max-w-[90vw] mx-auto py-4">
        {activeView === 'showcase' ? (
          <ShowcaseDashboard />
        ) : (
          <TokenSystemView />
        )}
      </main>
    </div>
  );
};
