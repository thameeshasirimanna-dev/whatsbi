import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Radio,
  Activity,
  ChevronDown,
  Layers,
  Zap,
} from 'lucide-react';

export const MotionAnimationPanel: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isChevronFlipped, setIsChevronFlipped] = useState(false);
  const [isGlowTriggered, setIsGlowTriggered] = useState(false);
  const [entranceType, setEntranceType] = useState<'scale' | 'slide' | 'fade'>('scale');
  const [entranceKey, setEntranceKey] = useState(0);

  const runEasingTest = () => {
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 50);
  };

  const triggerGlow = () => {
    setIsGlowTriggered(true);
    setTimeout(() => setIsGlowTriggered(false), 1200);
  };

  const replayEntrance = (type: 'scale' | 'slide' | 'fade') => {
    setEntranceType(type);
    setEntranceKey((k) => k + 1);
  };

  const EASING_CURVES = [
    {
      name: 'Snappy Ease-Out (UI Default)',
      bezier: 'cubic-bezier(0.16, 1, 0.3, 1)',
      duration: '350ms',
      usage: 'Dropdowns, drawers, modal reveals, and cards',
      style: { transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)' },
    },
    {
      name: 'Tactile Spring (Micro-interactions)',
      bezier: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      duration: '400ms',
      usage: 'Toggle switches, active tags, and star ratings',
      style: { transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)' },
    },
    {
      name: 'Standard Smooth (Transitions)',
      bezier: 'cubic-bezier(0.4, 0, 0.2, 1)',
      duration: '250ms',
      usage: 'Color changes, border glows, and opacity shifts',
      style: { transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)' },
    },
    {
      name: 'Linear (Continuous Loops)',
      bezier: 'linear',
      duration: '900ms',
      usage: 'Vector spinners, continuous telemetry beacons',
      style: { transition: 'transform 900ms linear' },
    },
  ];

  return (
    <div className="flex flex-col gap-10 font-sans">
      {/* 1. Header & Overview */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
            Motion System, Timing Tokens & Animations
          </h2>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Snappy physical easings, tactile micro-interactions, and continuous operational telemetry pulses.
          </p>
        </div>

        <button
          onClick={runEasingTest}
          className="inline-flex items-center gap-1.5 bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-xs px-4 py-2 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all"
        >
          <Play size={13} fill="#16281D" /> Run Easing Comparison
        </button>
      </div>

      {/* 2. Easing Curve Playground */}
      <section className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-3">
          <span className="text-xs font-bold text-[#16281D]">
            Cubic-Bezier Easing Demonstrator
          </span>
          <span className="text-[11px] font-mono text-[#71717A]">
            Click "Run Easing Comparison" to simulate travel
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {EASING_CURVES.map((curve) => (
            <div key={curve.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#16281D]">{curve.name}</span>
                  <span className="font-mono text-[10px] bg-[#F4F7F4] text-[#16281D] px-2 py-0.5 rounded-md border border-black/5">
                    {curve.duration} • {curve.bezier}
                  </span>
                </div>
                <span className="text-[11px] text-[#71717A] hidden sm:inline">
                  {curve.usage}
                </span>
              </div>

              {/* Track */}
              <div className="w-full h-8 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] relative overflow-hidden flex items-center px-2">
                <div
                  className="w-5 h-5 rounded-full bg-[#16281D] border-2 border-[#9FE870] shadow-sm flex items-center justify-center absolute"
                  style={{
                    ...curve.style,
                    transform: isPlaying ? 'translateX(calc(100% + 280px))' : 'translateX(0px)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9FE870]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Tactile Micro-Interactions Grid */}
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-lg text-[#16281D] m-0 tracking-tight">
            Tactile Micro-Interactions
          </h3>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Physics-calibrated hover elevations, active press scales, and smooth element transformations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Hover Lift */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(20,40,24,0.1)] transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">Card Hover Lift</span>
              <Sparkles size={14} className="text-[#9FE870] group-hover:rotate-12 transition-transform" />
            </div>
            <p className="text-[11px] text-[#71717A] m-0 leading-relaxed">
              Elevates upward with <code className="text-[#16281D] font-mono text-[10px]">-translate-y-1.5</code> on hover.
            </p>
            <span className="text-[10px] font-mono text-[#059669] font-bold">
              Hover to test lift
            </span>
          </div>

          {/* Button Compression */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm flex flex-col justify-between gap-4">
            <span className="text-xs font-bold text-[#16281D]">Button Compression</span>
            <button className="w-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-95 text-[#16281D] font-bold text-xs py-2.5 rounded-full shadow-xs cursor-pointer border-0 transition-transform duration-100">
              Press & Hold (active:scale-95)
            </button>
            <span className="text-[10px] font-mono text-[#71717A]">
              Immediate tactile feedback
            </span>
          </div>

          {/* Neon Glow Pulse Trigger */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">Lime Glow Pulse</span>
              <Zap size={14} className="text-[#9FE870]" />
            </div>
            <button
              onClick={triggerGlow}
              className={`w-full bg-[#16281D] text-white font-bold text-xs py-2.5 rounded-full border-0 cursor-pointer transition-all duration-300 ${
                isGlowTriggered
                  ? 'ring-4 ring-[#9FE870] shadow-[0_0_24px_rgba(159,232,112,0.6)]'
                  : 'hover:bg-[#203628]'
              }`}
            >
              {isGlowTriggered ? 'Glow Activated!' : 'Click to Trigger Pulse'}
            </button>
            <span className="text-[10px] font-mono text-[#71717A]">
              Used for saved state confirmations
            </span>
          </div>

          {/* Chevron Flip */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">Chevron Rotation</span>
              <button
                onClick={() => setIsChevronFlipped(!isChevronFlipped)}
                className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#E8ECE8] flex items-center justify-center border border-black/5 cursor-pointer"
              >
                <ChevronDown
                  size={14}
                  className={`text-[#16281D] transition-transform duration-200 ${
                    isChevronFlipped ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-[#71717A] m-0">
              Smooth 180° rotation for accordions & select menus.
            </p>
            <span className="text-[10px] font-mono text-[#059669] font-bold">
              State: {isChevronFlipped ? 'Expanded (180°)' : 'Collapsed (0°)'}
            </span>
          </div>
        </div>
      </section>

      {/* 4. Telemetry & Continuous Status Loops */}
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-lg text-[#16281D] m-0 tracking-tight">
            Continuous Operational Telemetry Loops
          </h3>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Live agent status pings, message throughput pulses, and AI drafting indicators.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Radar Radar Ping Beacon */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12">
              <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-[#9FE870] opacity-60" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#16281D] border-2 border-[#9FE870]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#16281D] block">Radar Beacon Ping</span>
              <span className="text-[11px] text-[#71717A]">Active agent webhook live telemetry</span>
            </div>
          </div>

          {/* Throughput Traffic Pulse */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center animate-pulse">
              <Activity size={22} className="stroke-[#059669]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#16281D] block">Traffic Pulse</span>
              <span className="text-[11px] text-[#71717A]">90 msg/s live throughput stream</span>
            </div>
          </div>

          {/* AI 3-Dot Staggered Bounce */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#F4F7F4] px-4 py-3 rounded-full border border-black/5">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-bounce [animation-delay:0.18s]" />
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-bounce [animation-delay:0.36s]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#16281D] block">AI Drafting Stagger</span>
              <span className="text-[11px] text-[#71717A]">DeepSeek AI thinking & typing animation</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Entrance Choreography Simulator */}
      <section className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#F4F4F5] pb-3">
          <div>
            <span className="text-xs font-bold text-[#16281D] block">
              Entrance Choreography Preview
            </span>
            <span className="text-[11px] text-[#71717A]">
              Test entry transitions for modals, drawers, and notifications.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => replayEntrance('scale')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer transition-all ${
                entranceType === 'scale'
                  ? 'bg-[#16281D] text-white'
                  : 'bg-[#F4F7F4] text-[#52525B] hover:text-[#16281D]'
              }`}
            >
              Scale Zoom (Modal)
            </button>
            <button
              onClick={() => replayEntrance('slide')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer transition-all ${
                entranceType === 'slide'
                  ? 'bg-[#16281D] text-white'
                  : 'bg-[#F4F7F4] text-[#52525B] hover:text-[#16281D]'
              }`}
            >
              Slide from Right (Drawer)
            </button>
            <button
              onClick={() => replayEntrance('fade')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer transition-all ${
                entranceType === 'fade'
                  ? 'bg-[#16281D] text-white'
                  : 'bg-[#F4F7F4] text-[#52525B] hover:text-[#16281D]'
              }`}
            >
              Fade & Float (Toast)
            </button>
          </div>
        </div>

        {/* Animated Container Canvas */}
        <div className="w-full h-36 bg-[#FAFAFA] rounded-2xl border border-dashed border-[#D4D4D8] flex items-center justify-center p-4 overflow-hidden relative">
          <div
            key={entranceKey}
            className={`bg-[#16281D] text-white px-5 py-3.5 rounded-2xl shadow-lg flex items-center gap-3 ${
              entranceType === 'scale'
                ? 'animate-in fade-in zoom-in-90 duration-300'
                : entranceType === 'slide'
                ? 'animate-in slide-in-from-right duration-350'
                : 'animate-in fade-in slide-in-from-bottom-3 duration-250'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#9FE870] text-[#16281D] flex items-center justify-center font-bold">
              <Radio size={14} />
            </div>
            <div>
              <div className="text-xs font-bold">Entrance Choreography Triggered</div>
              <div className="text-[10px] text-[#8FA89B]">
                Type: {entranceType} • Easing: cubic-bezier(0.16, 1, 0.3, 1)
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
