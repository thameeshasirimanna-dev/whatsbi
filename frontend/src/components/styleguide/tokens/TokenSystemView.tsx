import React, { useState } from 'react';
import {
  Copy,
  Check,
  Layers,
  MousePointerClick,
  Sliders,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { ButtonsBadgesPanel } from './ButtonsBadgesPanel';
import { FormsFeedbackPanel } from './FormsFeedbackPanel';
import { ModalDrawerPreview } from './ModalDrawerPreview';
import { MotionAnimationPanel } from './MotionAnimationPanel';

export const TokenSystemView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'foundations' | 'buttons' | 'forms' | 'modals' | 'motion'>('foundations');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const COLOR_PALETTES = [
    {
      name: 'Forest Dark (Shell & Raised Panels)',
      tokens: [
        { name: 'forest-950', hex: '#0B160E', label: 'Base floor' },
        { name: 'forest-900', hex: '#16281D', label: 'Dock & Inspector panel' },
        { name: 'forest-850', hex: '#1E3527', label: 'Dark inputs & cards' },
        { name: 'forest-800', hex: '#264432', label: 'Dark element hover' },
        { name: 'forest-700', hex: '#335841', label: 'Dividers & borders' },
      ],
    },
    {
      name: 'Vibrant Chartreuse / Lime Accent (High Contrast Energy)',
      tokens: [
        { name: 'lime-300', hex: '#BEF264', label: 'Glow highlight' },
        { name: 'lime-400', hex: '#A3E635', label: 'Secondary lime' },
        { name: 'lime-500', hex: '#9FE870', label: 'Primary Brand Lime (CTAs, Badges)' },
        { name: 'lime-600', hex: '#84CC16', label: 'Active pressed' },
      ],
    },
    {
      name: 'Workspace Mint & Sage (Light Canvas & Inactive States)',
      tokens: [
        { name: 'mint-50', hex: '#F4F7F4', label: 'Page canvas' },
        { name: 'mint-100', hex: '#ECFDF5', label: 'Light card tint' },
        { name: 'sage-300', hex: '#A1BAAE', label: 'Muted dark text' },
        { name: 'sage-400', hex: '#8FA89B', label: 'Dock icons' },
      ],
    },
    {
      name: 'Telemetry & Semantic Accents',
      tokens: [
        { name: 'coral-500', hex: '#F87171', label: 'Failed webhook alert' },
        { name: 'amber-400', hex: '#FBBF24', label: 'Rating stars' },
        { name: 'sky-500', hex: '#38BDF8', label: 'System status' },
      ],
    },
  ];

  const SPACING_TOKENS = [
    { name: 'Frame Radius', value: '40px / 44px', usage: 'Outer dashboard shell container' },
    { name: 'Panel Radius', value: '32px', usage: 'Left rail dock & right inspector drawer' },
    { name: 'Card Radius', value: '20px / 24px', usage: 'Hero banner, telemetry metric cards' },
    { name: 'Capsule Radius', value: '9999px (full)', usage: 'Search inputs, action buttons, filter tags' },
    { name: 'Panel Padding', value: '24px - 28px', usage: 'Interior padding of rail & inspector' },
    { name: 'Card Padding', value: '20px - 24px', usage: 'Telemetry and metric container padding' },
    { name: 'Column Gaps', value: '20px (gap-5)', usage: 'Separation between dock, canvas, and inspector' },
  ];

  return (
    <div className="w-full max-w-[1360px] mx-auto py-6 px-4 flex flex-col gap-8 font-sans select-none">
      {/* Sub-Navigation Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="font-bold text-2xl text-[#16281D] m-0 tracking-tight">
            Design Tokens & Components Catalog
          </h1>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Exhaustive design tokens, primitives, form controls, and feedback states.
          </p>
        </div>

        <div className="flex items-center bg-[#E8ECE8] p-1 rounded-full border border-black/5 flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab('foundations')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 ${
              activeSubTab === 'foundations'
                ? 'bg-[#16281D] text-white shadow-xs'
                : 'text-[#52525B] hover:text-[#16281D] bg-transparent'
            }`}
          >
            <Layers size={13} strokeWidth={2.4} /> Foundations
          </button>
          <button
            onClick={() => setActiveSubTab('buttons')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 ${
              activeSubTab === 'buttons'
                ? 'bg-[#16281D] text-white shadow-xs'
                : 'text-[#52525B] hover:text-[#16281D] bg-transparent'
            }`}
          >
            <MousePointerClick size={13} strokeWidth={2.4} /> Buttons & Badges
          </button>
          <button
            onClick={() => setActiveSubTab('forms')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 ${
              activeSubTab === 'forms'
                ? 'bg-[#16281D] text-white shadow-xs'
                : 'text-[#52525B] hover:text-[#16281D] bg-transparent'
            }`}
          >
            <Sliders size={13} strokeWidth={2.4} /> Forms & Tables
          </button>
          <button
            onClick={() => setActiveSubTab('modals')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 ${
              activeSubTab === 'modals'
                ? 'bg-[#16281D] text-white shadow-xs'
                : 'text-[#52525B] hover:text-[#16281D] bg-transparent'
            }`}
          >
            <Maximize2 size={13} strokeWidth={2.4} /> Modals & Drawers
          </button>
          <button
            onClick={() => setActiveSubTab('motion')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 ${
              activeSubTab === 'motion'
                ? 'bg-[#16281D] text-white shadow-xs'
                : 'text-[#52525B] hover:text-[#16281D] bg-transparent'
            }`}
          >
            <Sparkles size={13} strokeWidth={2.4} /> Motions & Animations
          </button>
        </div>
      </div>

      {activeSubTab === 'buttons' ? (
        <ButtonsBadgesPanel />
      ) : activeSubTab === 'forms' ? (
        <FormsFeedbackPanel />
      ) : activeSubTab === 'modals' ? (
        <ModalDrawerPreview />
      ) : activeSubTab === 'motion' ? (
        <MotionAnimationPanel />
      ) : (
        <div className="flex flex-col gap-10">
          {/* 1. Colors & Swatches */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
                Color Palette & Tokens
              </h2>
              <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
                Signature palette featuring Deep Forest Dark (`#16281D`) paired with Vibrant Lime (`#9FE870`).
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {COLOR_PALETTES.map((palette) => (
                <div key={palette.name} className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#16281D] uppercase tracking-wider">
                    {palette.name}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {palette.tokens.map((token) => (
                      <div
                        key={token.name}
                        onClick={() => copyToClipboard(token.hex)}
                        className="bg-white rounded-2xl p-3 border border-[#EAEAEA] shadow-sm hover:border-[#9FE870] transition-all cursor-pointer flex flex-col gap-2.5 group"
                      >
                        <div
                          className="w-full h-14 rounded-xl border border-black/5 flex items-end justify-end p-1.5"
                          style={{ backgroundColor: token.hex }}
                        >
                          <span className="text-[10px] font-mono bg-black/50 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            {copiedHex === token.hex ? <Check size={10} /> : <Copy size={10} />}
                            {copiedHex === token.hex ? 'Copied' : 'Copy'}
                          </span>
                        </div>
                        <div>
                          <div className="font-mono text-xs font-bold text-[#16281D]">
                            {token.hex}
                          </div>
                          <div className="text-[11px] text-[#71717A] truncate font-semibold">
                            {token.name}
                          </div>
                          <div className="text-[10px] text-[#A1A1AA] truncate">
                            {token.label}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Typography Specification */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
                Typography Specification (`Plus Jakarta Sans`)
              </h2>
              <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
                Modern, geometric, high-clarity sans-serif calibrated for headers, numerics, and controls.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-sm flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-baseline justify-between border-b border-[#F4F4F5] pb-4">
                <span className="text-xs font-mono text-[#A1A1AA] w-44">Display Hero (26px Bold)</span>
                <div className="text-2xl md:text-[26px] font-bold text-[#16281D] tracking-tight flex-1">
                  Hello, Liam Gallagher!! 👋
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-baseline justify-between border-b border-[#F4F4F5] pb-4">
                <span className="text-xs font-mono text-[#A1A1AA] w-44">Section Title (18px Bold)</span>
                <div className="text-lg font-bold text-[#16281D] tracking-tight flex-1">
                  Automated Workflows & Broadcasts
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-baseline justify-between border-b border-[#F4F4F5] pb-4">
                <span className="text-xs font-mono text-[#A1A1AA] w-44">Big Numeric (30px ExtraBold)</span>
                <div className="text-3xl font-extrabold text-[#16281D] tracking-tight flex-1">
                  90 <span className="text-xs font-semibold text-[#8FA89B]">msg/s</span> &nbsp;&nbsp; 4000 <span className="text-xs font-semibold text-[#8FA89B]">sessions</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-baseline justify-between">
                <span className="text-xs font-mono text-[#A1A1AA] w-44">Body & Labels (13px Medium)</span>
                <div className="text-[13px] text-[#71717A] font-medium flex-1">
                  Real-time multi-tenant telemetry, agent routing, and WhatsApp Cloud API integration.
                </div>
              </div>
            </div>
          </section>

          {/* 3. Padding & Spacing Configuration */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
                Padding & Spacing Tokens
              </h2>
              <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
                Configured geometry scale providing visual equilibrium across the tri-panel layout.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-sm overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#EAEAEA] text-left">
                    <th className="pb-3 text-xs font-bold text-[#16281D] uppercase">Token</th>
                    <th className="pb-3 text-xs font-bold text-[#16281D] uppercase">Configured Value</th>
                    <th className="pb-3 text-xs font-bold text-[#71717A] uppercase">Applied Element</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5]">
                  {SPACING_TOKENS.map((s) => (
                    <tr key={s.name} className="hover:bg-[#F9FAF9]">
                      <td className="py-3 text-xs font-bold text-[#16281D]">{s.name}</td>
                      <td className="py-3 text-xs font-mono font-semibold text-[#059669]">{s.value}</td>
                      <td className="py-3 text-xs text-[#71717A] font-medium">{s.usage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
