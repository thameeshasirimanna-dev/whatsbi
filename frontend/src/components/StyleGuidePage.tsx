import React, { useState, useEffect } from 'react';
import {
  Palette, Type, Tag, Layers, Search, LayoutGrid, BarChart3,
  MessageSquare, Users, ArrowRight, TrendingUp, ChevronRight,
  Settings, Check, Zap, Shield, Bot, MousePointer,
  Bell, Eye, Lock, Star, Phone, X, AlertCircle, Info,
  CheckCircle, Plus, RefreshCw, Download, Hash, Circle,
  Loader2, Trash2, Edit3, Activity, Ruler, Table2,
  MoreHorizontal, Send, TrendingDown, ArrowUpRight,
  SlidersHorizontal, Database, Globe, Inbox, Sparkles,
} from 'lucide-react';

const FONTS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');

  @keyframes gradient-shift {
    0% { background-position: 0% center; }
    100% { background-position: 200% center; }
  }
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(.85); } }
  @keyframes bounce3 { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }

  .text-gradient-animate {
    background: linear-gradient(90deg, #4ade80, #22c55e, #059669, #10b981, #4ade80);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; animation: gradient-shift 4s linear infinite;
  }
  .skeleton {
    background: linear-gradient(90deg, #e8f5e9 25%, #c8e6c9 50%, #e8f5e9 75%);
    background-size: 400px 100%; animation: shimmer 1.4s infinite linear;
    border-radius: 6px;
  }
  .sg-spin { animation: spin 0.9s linear infinite; }
  .sg-sidebar::-webkit-scrollbar { width: 3px; }
  .sg-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
  .swatch-card { transition: transform .15s ease, box-shadow .15s ease; }
  .swatch-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
  .sg-nav-btn { transition: background .15s ease; }
  .sg-nav-btn:hover { background: rgba(255,255,255,0.05) !important; }
`;

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

/* Forest-green dark palette matching reference image */
const F = {
  bg: '#0c1a0e',
  surface: '#0f2012',
  border: 'rgba(255,255,255,0.07)',
  hover: 'rgba(34,197,94,0.08)',
  active: 'rgba(34,197,94,0.12)',
  activeText: '#4ade80',
};

const ALL_SECTIONS = [
  { id: 'colors',     label: 'Colors',           Icon: Palette },
  { id: 'typography', label: 'Typography',        Icon: Type },
  { id: 'buttons',    label: 'Buttons',           Icon: MousePointer },
  { id: 'badges',     label: 'Badges & Pills',    Icon: Tag },
  { id: 'cards',      label: 'Cards',             Icon: Layers },
  { id: 'forms',      label: 'Form Elements',     Icon: Settings },
  { id: 'navigation', label: 'Navigation',        Icon: LayoutGrid },
  { id: 'data',       label: 'Data Display',      Icon: BarChart3 },
  { id: 'shadows',    label: 'Shadows',           Icon: Circle },
  { id: 'spacing',    label: 'Spacing',           Icon: Ruler },
  { id: 'radius',     label: 'Border Radius',     Icon: Hash },
  { id: 'icons',      label: 'Icons',             Icon: Sparkles },
  { id: 'avatars',    label: 'Avatars',           Icon: Users },
  { id: 'alerts',     label: 'Alerts',            Icon: AlertCircle },
  { id: 'progress',   label: 'Progress',          Icon: Activity },
  { id: 'loading',    label: 'Loading States',    Icon: Loader2 },
  { id: 'tables',     label: 'Tables',            Icon: Table2 },
];

function SH({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
        <div style={{ width: '3px', height: '26px', borderRadius: '2px', background: 'linear-gradient(180deg,#4ade80,#059669)', flexShrink: 0 }} />
        <h2 style={{ ...SYNE, fontSize: '1.25rem', fontWeight: 700, color: '#0c1a0e', margin: 0 }}>{title}</h2>
      </div>
      {sub && <p style={{ ...DM, color: '#71717a', fontSize: '0.8125rem', paddingLeft: '1.1875rem', borderLeft: '1px solid #e4e4e7', marginLeft: '0.9375rem' }}>{sub}</p>}
    </div>
  );
}

function Panel({ children, dark, style }: { children: React.ReactNode; dark?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{
      borderRadius: '12px', padding: '1.5rem',
      background: dark ? F.surface : '#ffffff',
      border: `1px solid ${dark ? F.border : '#ebebeb'}`,
      ...style,
    }}>{children}</div>
  );
}

function PanelLabel({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p style={{ ...DM, fontSize: '0.5625rem', fontWeight: 700, color: dark ? 'rgba(255,255,255,0.22)' : '#a1a1aa', letterSpacing: '0.11em', textTransform: 'uppercase', marginBottom: '1rem' }}>{children as string}</p>
  );
}

export default function StyleGuidePage() {
  const [active, setActive] = useState('colors');
  const [toggles, setToggles] = useState([true, false, true]);
  const [focused, setFocused] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const els = ALL_SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      entries => { const v = entries.filter(e => e.isIntersecting); if (v.length) setActive(v[0].target.id); },
      { rootMargin: '-10% 0px -62% 0px', threshold: 0 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const inp = (id: string): React.CSSProperties => ({
    ...DM, width: '100%', padding: '0.5625rem 0.875rem',
    borderRadius: '8px', fontSize: '0.875rem', color: '#18181b',
    background: '#fafafa', outline: 'none', boxSizing: 'border-box',
    border: `1.5px solid ${focused === id ? '#22c55e' : '#e4e4e7'}`,
    boxShadow: focused === id ? '0 0 0 3px rgba(34,197,94,0.1)' : 'none',
    transition: 'border-color .15s, box-shadow .15s',
  });

  return (
    <>
      <style>{FONTS_CSS}</style>
      <div style={{ ...DM, minHeight: '100vh', background: '#f5f8f5' }}>

        {/* Header */}
        <header style={{ position: 'sticky', top: 0, zIndex: 60, height: '58px', background: F.bg, borderBottom: `1px solid ${F.border}`, display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', width: '256px', flexShrink: 0 }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg,#22c55e,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(34,197,94,0.4)', flexShrink: 0 }}>
              <MessageSquare style={{ width: '13px', height: '13px', color: '#fff' }} />
            </div>
            <span style={{ ...SYNE, color: '#fff', fontSize: '0.9375rem', fontWeight: 700 }}>WhatsBi</span>
            <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ ...DM, color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>Design System</span>
          </div>
          <span style={{ fontSize: '0.5625rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', letterSpacing: '0.07em' }}>v1.0</span>
          <span style={{ fontSize: '0.5625rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${F.border}`, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em' }}>Tailwind · Syne · DM Sans</span>
        </header>

        <div style={{ display: 'flex' }}>

          {/* Sidebar */}
          <aside className="sg-sidebar" style={{ width: '256px', minWidth: '256px', background: F.bg, position: 'sticky', top: '58px', height: 'calc(100vh - 58px)', overflowY: 'auto', padding: '1.25rem 0.75rem 2rem', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${F.border}` }}>
            <p style={{ ...DM, fontSize: '0.5625rem', fontWeight: 700, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em', textTransform: 'uppercase', paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>ALL TOKENS & COMPONENTS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {ALL_SECTIONS.map(({ id, label, Icon }) => {
                const on = active === id;
                return (
                  <button key={id} onClick={() => scrollTo(id)} className="sg-nav-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', background: on ? F.active : 'transparent' }}>
                    {React.createElement(Icon, { style: { width: '13px', height: '13px', color: on ? F.activeText : 'rgba(255,255,255,0.25)', flexShrink: 0 } })}
                    <span style={{ ...DM, fontSize: '0.8125rem', fontWeight: on ? 600 : 400, color: on ? '#fff' : 'rgba(255,255,255,0.42)' }}>{label}</span>
                    {on && <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: F.activeText, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
              <div style={{ borderRadius: '10px', padding: '0.875rem 1rem', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.14)' }}>
                <p style={{ ...SYNE, color: F.activeText, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>BRAND</p>
                <p style={{ ...DM, color: 'rgba(255,255,255,0.4)', fontSize: '0.6875rem', marginBottom: '0.5rem' }}>emerald-600 · #059669</p>
                <div style={{ height: '3px', borderRadius: '2px', background: 'linear-gradient(90deg,#4ade80,#22c55e,#059669,#047857)' }} />
              </div>
            </div>
          </aside>

          {/* Main */}
          <main style={{ flex: 1, padding: '2.5rem 2.75rem', maxWidth: '920px' }}>

            {/* ── COLORS ── */}
            <section id="colors" style={{ marginBottom: '4rem' }}>
              <SH title="Colors" sub="Forest dark, green accent, emerald brand, and semantic tokens" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                {/* Forest Dark */}
                <div>
                  <p style={{ ...DM, fontSize: '0.5625rem', fontWeight: 700, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>Forest Dark — Sidebar & Surfaces</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                    {([
                      { label: 'forest-950', hex: '#060e07', text: '#fff' },
                      { label: 'forest-900', hex: '#0c1a0e', text: '#fff', note: 'Sidebar BG' },
                      { label: 'forest-800', hex: '#142918', text: '#fff', note: 'Dark Surface' },
                      { label: 'forest-700', hex: '#1a3620', text: '#fff' },
                      { label: 'forest-600', hex: '#234028', text: '#fff' },
                    ] as Array<{ label: string; hex: string; text: string; note?: string }>).map(({ label, hex, note }) => (
                      <div key={label} className="swatch-card" style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                        <div style={{ height: '64px', background: hex, display: 'flex', alignItems: 'flex-end', padding: '0.375rem' }}>
                          {note && <span style={{ ...DM, fontSize: '0.5rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>{note}</span>}
                        </div>
                        <div style={{ padding: '0.5rem 0.625rem', background: '#fff' }}>
                          <p style={{ ...DM, fontSize: '0.5625rem', fontWeight: 700, color: '#18181b' }}>{label.split('-')[1]}</p>
                          <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', color: '#71717a' }}>{hex}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Green Accent */}
                <div>
                  <p style={{ ...DM, fontSize: '0.5625rem', fontWeight: 700, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>Green — Accent Scale</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
                    {[
                      { label: '50', hex: '#f0fdf4' },
                      { label: '100', hex: '#dcfce7' },
                      { label: '200', hex: '#bbf7d0' },
                      { label: '300', hex: '#86efac' },
                      { label: '400', hex: '#4ade80', note: 'Accent' },
                      { label: '500', hex: '#22c55e', note: 'Bright' },
                    ].map(({ label, hex, note }) => (
                      <div key={label} className="swatch-card" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)', background: '#fff' }}>
                        <div style={{ height: '52px', background: hex }} />
                        <div style={{ padding: '0.375rem 0.5rem' }}>
                          <p style={{ ...DM, fontSize: '0.5625rem', fontWeight: 600, color: '#18181b' }}>{label}{note ? ` · ${note}` : ''}</p>
                          <p style={{ fontFamily: 'monospace', fontSize: '0.4375rem', color: '#71717a' }}>{hex}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emerald Brand */}
                <div>
                  <p style={{ ...DM, fontSize: '0.5625rem', fontWeight: 700, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>Emerald — Brand Palette</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                    {([
                      { label: '400', hex: '#34d399' },
                      { label: '500', hex: '#10b981' },
                      { label: '600', hex: '#059669', main: true },
                      { label: '700', hex: '#047857' },
                      { label: '800', hex: '#065f46' },
                    ] as Array<{ label: string; hex: string; main?: boolean }>).map(({ label, hex, main }) => (
                      <div key={label} className="swatch-card" style={{ borderRadius: '10px', overflow: 'hidden', border: main ? '2px solid rgba(5,150,105,0.4)' : '1px solid rgba(0,0,0,0.06)', background: '#fff' }}>
                        <div style={{ height: '64px', background: hex, display: 'flex', alignItems: 'flex-end', padding: '0.375rem' }}>
                          {main && <span style={{ ...DM, fontSize: '0.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>BRAND</span>}
                        </div>
                        <div style={{ padding: '0.5rem 0.625rem' }}>
                          <p style={{ ...DM, fontSize: '0.5625rem', fontWeight: 700, color: '#18181b' }}>{label}</p>
                          <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', color: '#71717a' }}>{hex}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Semantic */}
                <div>
                  <p style={{ ...DM, fontSize: '0.5625rem', fontWeight: 700, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>Semantic</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                    {[
                      { n: 'Success', hex: '#22c55e', light: '#f0fdf4', border: '#bbf7d0', token: 'green-500' },
                      { n: 'Warning', hex: '#f59e0b', light: '#fffbeb', border: '#fde68a', token: 'amber-500' },
                      { n: 'Danger',  hex: '#f43f5e', light: '#fff1f2', border: '#fecdd3', token: 'rose-500' },
                      { n: 'Info',    hex: '#3b82f6', light: '#eff6ff', border: '#bfdbfe', token: 'blue-500' },
                    ].map(({ n, hex, light, border, token }) => (
                      <div key={n} style={{ borderRadius: '10px', padding: '0.875rem 1rem', background: light, border: `1.5px solid ${border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: hex, flexShrink: 0 }} />
                          <span style={{ ...DM, fontSize: '0.875rem', fontWeight: 600, color: '#18181b' }}>{n}</span>
                        </div>
                        <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', color: '#52525b' }}>{token} · {hex}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── TYPOGRAPHY ── */}
            <section id="typography" style={{ marginBottom: '4rem' }}>
              <SH title="Typography" sub="Syne for display, DM Sans for body" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ borderRadius: '12px', padding: '1.25rem 1.5rem', background: F.bg, border: `1px solid ${F.border}` }}>
                    <p style={{ ...DM, fontSize: '0.5rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Display</p>
                    <p style={{ ...SYNE, fontSize: '1.5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>Syne</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.5625rem', color: F.activeText, marginTop: '0.375rem' }}>600 · 700 · 800</p>
                  </div>
                  <div style={{ borderRadius: '12px', padding: '1.25rem 1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <p style={{ ...DM, fontSize: '0.5rem', color: '#71717a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Body</p>
                    <p style={{ ...DM, fontSize: '1.5rem', fontWeight: 500, color: '#18181b', lineHeight: 1 }}>DM Sans</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.5625rem', color: '#16a34a', marginTop: '0.375rem' }}>300 · 400 · 500 · 600</p>
                  </div>
                </div>
                {[
                  { tag: 'H1', size: '2.75rem', w: 800, lh: '1.06', s: 'The CRM built for WhatsApp' },
                  { tag: 'H2', size: '1.875rem', w: 700, lh: '1.1',  s: 'Unified Inbox & Analytics' },
                  { tag: 'H3', size: '1.3125rem', w: 700, lh: '1.2', s: 'Agent Performance Overview' },
                  { tag: 'H4', size: '1.0625rem', w: 600, lh: '1.3', s: 'Configure your workspace' },
                ].map(({ tag, size, w, lh, s }) => (
                  <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '0.875rem 1.25rem', borderRadius: '10px', background: '#fff', border: '1px solid #ebebeb' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ ...DM, fontSize: '0.5625rem', fontWeight: 700, color: '#16a34a' }}>{tag}</span>
                    </div>
                    <p style={{ ...SYNE, fontSize: size, fontWeight: w, color: '#0c1a0e', lineHeight: lh, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</p>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.5625rem', color: '#71717a' }}>{size} / {w}</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.4375rem', color: '#a1a1aa', marginTop: '0.1rem' }}>lh {lh}</p>
                    </div>
                  </div>
                ))}
                <Panel style={{ marginTop: '0.25rem' }}>
                  <PanelLabel>DM Sans Body Scale</PanelLabel>
                  {[
                    { n: 'body-lg', size: '1.125rem', s: 'Manage every customer conversation across WhatsApp.' },
                    { n: 'body-md', size: '1rem',     s: 'Automate responses, track agent performance, grow your business.' },
                    { n: 'body-sm', size: '0.875rem', s: 'Role-based access control and live performance tracking for your team.' },
                    { n: 'body-xs', size: '0.75rem',  s: 'No credit card required · 14-day free trial · Cancel anytime' },
                  ].map(({ n, size, s }, i, arr) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'baseline', gap: '0.875rem', paddingBottom: i < arr.length - 1 ? '0.75rem' : 0, marginBottom: i < arr.length - 1 ? '0.75rem' : 0, borderBottom: i < arr.length - 1 ? '1px solid #f4f4f5' : 'none' }}>
                      <code style={{ fontSize: '0.5rem', color: '#16a34a', background: '#f0fdf4', padding: '0.15rem 0.375rem', borderRadius: '4px', flexShrink: 0, fontFamily: 'monospace' }}>{n}</code>
                      <p style={{ ...DM, fontSize: size, color: '#27272a', flex: 1, lineHeight: 1.55 }}>{s}</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.4375rem', color: '#a1a1aa', flexShrink: 0 }}>{size}</p>
                    </div>
                  ))}
                </Panel>
                <div style={{ padding: '1.5rem', borderRadius: '10px', background: F.bg, border: `1px solid ${F.border}`, textAlign: 'center' }}>
                  <p className="text-gradient-animate" style={{ ...SYNE, fontSize: '2rem', fontWeight: 800 }}>WhatsApp Business CRM</p>
                  <p style={{ ...DM, color: 'rgba(255,255,255,0.25)', fontSize: '0.625rem', marginTop: '0.5rem', fontFamily: 'monospace' }}>.text-gradient-animate — animated green→emerald gradient</p>
                </div>
              </div>
            </section>

            {/* ── BUTTONS ── */}
            <section id="buttons" style={{ marginBottom: '4rem' }}>
              <SH title="Buttons" sub="Variants, sizes, icon buttons, states" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Panel>
                  <PanelLabel>Variants</PanelLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                    <button style={{ ...DM, fontWeight: 600, fontSize: '0.875rem', padding: '0.5625rem 1.25rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#fff', boxShadow: '0 4px 14px rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      Primary <ArrowRight style={{ width: '13px', height: '13px' }} />
                    </button>
                    <button style={{ ...DM, fontWeight: 600, fontSize: '0.875rem', padding: '0.5rem 1.25rem', borderRadius: '9999px', cursor: 'pointer', background: 'transparent', color: '#16a34a', border: '1.5px solid #16a34a' }}>Secondary</button>
                    <button style={{ ...DM, fontWeight: 600, fontSize: '0.875rem', padding: '0.5rem 1.25rem', borderRadius: '9999px', cursor: 'pointer', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>Soft</button>
                    <button style={{ ...DM, fontWeight: 600, fontSize: '0.875rem', padding: '0.5rem 1.25rem', borderRadius: '9999px', cursor: 'pointer', background: 'rgba(0,0,0,0.04)', color: '#27272a', border: '1px solid transparent' }}>Ghost</button>
                    <button style={{ ...DM, fontWeight: 600, fontSize: '0.875rem', padding: '0.5rem 1.25rem', borderRadius: '9999px', cursor: 'pointer', background: '#fff1f2', color: '#f43f5e', border: '1.5px solid #fecdd3' }}>Danger</button>
                    <button disabled style={{ ...DM, fontWeight: 600, fontSize: '0.875rem', padding: '0.5rem 1.25rem', borderRadius: '9999px', background: '#f4f4f5', color: '#a1a1aa', border: '1px solid #e4e4e7', cursor: 'not-allowed', opacity: 0.6 }}>Disabled</button>
                  </div>
                </Panel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Panel>
                    <PanelLabel>Sizes</PanelLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                      {[{ l: 'XS', fs: '0.6875rem', px: '0.75rem', py: '0.3125rem' }, { l: 'SM', fs: '0.75rem', px: '0.875rem', py: '0.375rem' }, { l: 'MD', fs: '0.875rem', px: '1.25rem', py: '0.5625rem' }, { l: 'LG', fs: '1rem', px: '1.75rem', py: '0.8125rem' }].map(({ l, fs, px, py }) => (
                        <button key={l} style={{ ...DM, fontWeight: 600, fontSize: fs, padding: `${py} ${px}`, borderRadius: '9999px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#fff', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' }}>{l}</button>
                      ))}
                    </div>
                  </Panel>
                  <Panel>
                    <PanelLabel>Icon Buttons</PanelLabel>
                    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {[{ Icon: Plus, bg: 'linear-gradient(135deg,#22c55e,#059669)', shadow: 'rgba(34,197,94,0.3)' }, { Icon: Download, bg: '#f0fdf4', col: '#16a34a', brd: '#bbf7d0' }, { Icon: Bell, bg: 'rgba(0,0,0,0.04)', col: '#27272a' }, { Icon: Trash2, bg: '#fff1f2', col: '#f43f5e', brd: '#fecdd3' }].map(({ Icon, bg, shadow, col, brd }, i) => (
                        <button key={i} style={{ width: '36px', height: '36px', borderRadius: '9999px', border: brd ? `1.5px solid ${brd}` : 'none', cursor: 'pointer', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow ? `0 2px 10px ${shadow}` : 'none' }}>
                          {React.createElement(Icon, { style: { width: '15px', height: '15px', color: col ?? '#fff' } })}
                        </button>
                      ))}
                      <button style={{ ...DM, fontWeight: 600, fontSize: '0.8125rem', padding: '0.4375rem 0.875rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.375rem', boxShadow: '0 2px 10px rgba(34,197,94,0.3)' }}>
                        <Plus style={{ width: '13px', height: '13px' }} /> Add Chat
                      </button>
                    </div>
                  </Panel>
                </div>
                <Panel dark>
                  <PanelLabel dark>On Dark</PanelLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                    <button style={{ ...DM, fontWeight: 600, fontSize: '0.875rem', padding: '0.5625rem 1.25rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#fff', boxShadow: '0 4px 14px rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      Get started <ArrowRight style={{ width: '13px', height: '13px' }} />
                    </button>
                    <button style={{ ...DM, fontWeight: 600, fontSize: '0.875rem', padding: '0.5rem 1.25rem', borderRadius: '9999px', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>See features</button>
                    <button style={{ width: '36px', height: '36px', borderRadius: '9999px', border: `1px solid ${F.border}`, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bell style={{ width: '15px', height: '15px', color: 'rgba(255,255,255,0.5)' }} />
                    </button>
                  </div>
                </Panel>
              </div>
            </section>

            {/* ── BADGES ── */}
            <section id="badges" style={{ marginBottom: '4rem' }}>
              <SH title="Badges & Pills" sub="Status chips, counts, category tags" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Panel>
                  <PanelLabel>Status Chips</PanelLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                    {[{ l: 'Active', bg: '#f0fdf4', c: '#15803d', bd: '#bbf7d0', dot: '#22c55e' }, { l: 'Pending', bg: '#fffbeb', c: '#d97706', bd: '#fde68a', dot: '#f59e0b' }, { l: 'Closed', bg: '#f4f4f5', c: '#52525b', bd: '#e4e4e7', dot: '#a1a1aa' }, { l: 'Resolved', bg: '#eff6ff', c: '#2563eb', bd: '#bfdbfe', dot: '#3b82f6' }, { l: 'Error', bg: '#fff1f2', c: '#e11d48', bd: '#fecdd3', dot: '#f43f5e' }, { l: 'New', bg: '#fdf4ff', c: '#9333ea', bd: '#e9d5ff', dot: '#a855f7' }].map(({ l, bg, c, bd, dot }) => (
                      <span key={l} style={{ ...DM, fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px', background: bg, color: c, border: `1px solid ${bd}`, display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot, flexShrink: 0 }} />{l}
                      </span>
                    ))}
                  </div>
                </Panel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Panel>
                    <PanelLabel>Count & Number Badges</PanelLabel>
                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {[{ l: 'Messages', n: 12, bg: '#22c55e' }, { l: 'Tasks', n: 3, bg: '#f59e0b' }, { l: 'Alerts', n: 5, bg: '#f43f5e' }].map(({ l, n, bg }) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span style={{ ...DM, fontSize: '0.8125rem', color: '#52525b' }}>{l}</span>
                          <span style={{ ...DM, fontSize: '0.5625rem', fontWeight: 700, color: '#fff', width: '20px', height: '20px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel dark>
                    <PanelLabel dark>On Dark</PanelLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ ...DM, fontSize: '0.625rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '9999px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.22)', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80' }} /> Official Meta API
                      </span>
                      <span style={{ ...DM, fontSize: '0.625rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '9999px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>v23.0</span>
                      <span style={{ ...DM, fontSize: '0.625rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${F.border}`, color: 'rgba(255,255,255,0.45)' }}>Multi-tenant</span>
                    </div>
                  </Panel>
                </div>
              </div>
            </section>

            {/* ── CARDS ── */}
            <section id="cards" style={{ marginBottom: '4rem' }}>
              <SH title="Cards" sub="Dark feature, glass, stat, and outline variants" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {/* Dark feature */}
                <div>
                  <p style={{ ...DM, fontSize: '0.5rem', fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Dark Feature</p>
                  <div style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.18) 0%,rgba(5,150,105,0.04) 50%,rgba(34,197,94,0.1) 100%)', padding: '1.5px', borderRadius: '16px' }}>
                    <div style={{ background: F.surface, borderRadius: '14.5px', padding: '1.25rem', border: `1px solid ${F.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.875rem' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg,#22c55e,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
                          {React.createElement(MessageSquare, { style: { width: '17px', height: '17px', color: '#fff' } })}
                        </div>
                        <div>
                          <p style={{ ...SYNE, color: '#fff', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.15rem' }}>Unified Inbox</p>
                          <p style={{ ...DM, color: 'rgba(255,255,255,0.3)', fontSize: '0.6875rem' }}>Real-time messaging</p>
                        </div>
                      </div>
                      <p style={{ ...DM, color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.6 }}>All WhatsApp conversations in one place with smart queues and team assignment.</p>
                    </div>
                  </div>
                </div>

                {/* Glass */}
                <div>
                  <p style={{ ...DM, fontSize: '0.5rem', fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Glass</p>
                  <div style={{ borderRadius: '16px', padding: '1.25rem', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.55)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.875rem' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
                        {React.createElement(Bot, { style: { width: '17px', height: '17px', color: '#fff' } })}
                      </div>
                      <div>
                        <p style={{ ...SYNE, color: '#0c1a0e', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.15rem' }}>AI Chatbots</p>
                        <p style={{ ...DM, color: '#71717a', fontSize: '0.6875rem' }}>24/7 automation</p>
                      </div>
                    </div>
                    <p style={{ ...DM, color: '#52525b', fontSize: '0.8125rem', lineHeight: 1.6 }}>Intelligent automations handle FAQs and escalate to humans seamlessly.</p>
                  </div>
                </div>

                {/* Stat */}
                <div>
                  <p style={{ ...DM, fontSize: '0.5rem', fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Stat</p>
                  <div style={{ borderRadius: '16px', padding: '1.25rem', background: F.surface, border: `1px solid ${F.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ ...DM, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>Chats / day</span>
                      <span style={{ ...DM, fontSize: '0.5rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.18)' }}>Today</span>
                    </div>
                    <p style={{ ...SYNE, color: '#fff', fontSize: '2.125rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.5rem' }}>10K+</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {React.createElement(TrendingUp, { style: { width: '13px', height: '13px', color: '#4ade80' } })}
                      <span style={{ ...DM, fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>+12.4%</span>
                      <span style={{ ...DM, fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>vs last week</span>
                    </div>
                  </div>
                </div>

                {/* Outline */}
                <div>
                  <p style={{ ...DM, fontSize: '0.5rem', fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Outline</p>
                  <div style={{ borderRadius: '16px', padding: '1.25rem', background: '#fff', border: '1.5px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.875rem' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {React.createElement(Shield, { style: { width: '17px', height: '17px', color: '#16a34a' } })}
                      </div>
                      <div>
                        <p style={{ ...SYNE, color: '#0c1a0e', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.15rem' }}>Multi-Tenant Security</p>
                        <p style={{ ...DM, color: '#71717a', fontSize: '0.6875rem' }}>Complete isolation</p>
                      </div>
                    </div>
                    <p style={{ ...DM, color: '#52525b', fontSize: '0.8125rem', lineHeight: 1.6 }}>JWT authentication, encrypted storage, and compliance-ready architecture per tenant.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── FORMS ── */}
            <section id="forms" style={{ marginBottom: '4rem' }}>
              <SH title="Form Elements" sub="Inputs, selects, toggles, checkboxes, error states" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Panel>
                  <PanelLabel>Inputs & States</PanelLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div>
                      <label style={{ ...DM, fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Business Name <span style={{ color: '#f43f5e' }}>*</span></label>
                      <input type="text" placeholder="Acme Corp" style={inp('name')} onFocus={() => setFocused('name')} onBlur={() => setFocused('')} />
                    </div>
                    <div>
                      <label style={{ ...DM, fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Search</label>
                      <div style={{ position: 'relative' }}>
                        {React.createElement(Search, { style: { width: '14px', height: '14px', color: '#a1a1aa', position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' } })}
                        <input type="search" placeholder="Search conversations..." style={{ ...inp('search'), paddingLeft: '2.25rem' }} onFocus={() => setFocused('search')} onBlur={() => setFocused('')} />
                      </div>
                    </div>
                    <div>
                      <label style={{ ...DM, fontSize: '0.75rem', fontWeight: 600, color: '#f43f5e', display: 'block', marginBottom: '0.3rem' }}>Error State</label>
                      <input type="text" defaultValue="invalid@" style={{ ...DM, width: '100%', padding: '0.5625rem 0.875rem', borderRadius: '8px', fontSize: '0.875rem', color: '#18181b', background: '#fff1f2', border: '1.5px solid #f43f5e', outline: 'none', boxSizing: 'border-box', boxShadow: '0 0 0 3px rgba(244,63,94,0.1)' }} />
                      <p style={{ ...DM, fontSize: '0.6875rem', color: '#f43f5e', marginTop: '0.25rem' }}>Please enter a valid email address.</p>
                    </div>
                    <div>
                      <label style={{ ...DM, fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Assign Agent</label>
                      <select style={{ ...DM, width: '100%', padding: '0.5625rem 0.875rem', borderRadius: '8px', fontSize: '0.875rem', color: '#18181b', background: '#fafafa', border: '1.5px solid #e4e4e7', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                        <option>Sarah Johnson</option><option>Mike Chen</option><option>Priya Patel</option>
                      </select>
                    </div>
                  </div>
                </Panel>

                <Panel>
                  <PanelLabel>Toggles & Checkboxes</PanelLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {['Auto-assign conversations', 'WhatsApp notifications', 'AI auto-reply'].map((l, i) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ ...DM, fontSize: '0.875rem', color: '#374151' }}>{l}</span>
                        <button onClick={() => setToggles(p => p.map((v, idx) => idx === i ? !v : v))} style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: toggles[i] ? '#22c55e' : '#e4e4e7', position: 'relative', transition: 'background .2s', flexShrink: 0, padding: 0 }}>
                          <span style={{ position: 'absolute', top: '3px', left: toggles[i] ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </button>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #f0fdf4', paddingTop: '0.875rem' }}>
                      {[{ l: 'Send welcome message', c: true }, { l: 'Enable read receipts', c: false }, { l: 'File attachments', c: false }].map(({ l, c }) => (
                        <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                          <span style={{ width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, background: c ? '#22c55e' : '#fff', border: c ? '2px solid #22c55e' : '2px solid #d4d4d8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {c && React.createElement(Check, { style: { width: '11px', height: '11px', color: '#fff' } })}
                          </span>
                          <span style={{ ...DM, fontSize: '0.875rem', color: '#374151' }}>{l}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </Panel>
              </div>
            </section>

            {/* ── NAVIGATION ── */}
            <section id="navigation" style={{ marginBottom: '4rem' }}>
              <SH title="Navigation" sub="Sidebar, tabs, breadcrumbs, dropdown" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Panel dark>
                  <PanelLabel dark>Sidebar Items</PanelLabel>
                  {[{ l: 'Conversations', I: MessageSquare, a: false, b: null }, { l: 'Inbox', I: Inbox, a: true, b: 12 }, { l: 'Customers', I: Users, a: false, b: null }, { l: 'Analytics', I: BarChart3, a: false, b: null }, { l: 'Settings', I: Settings, a: false, b: null }].map(({ l, I, a, b }) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: a ? F.active : 'transparent', cursor: 'pointer', marginBottom: '1px' }}>
                      {React.createElement(I, { style: { width: '14px', height: '14px', color: a ? F.activeText : 'rgba(255,255,255,0.28)', flexShrink: 0 } })}
                      <span style={{ ...DM, fontSize: '0.8125rem', fontWeight: a ? 600 : 400, color: a ? '#fff' : 'rgba(255,255,255,0.4)', flex: 1 }}>{l}</span>
                      {b && <span style={{ ...DM, fontSize: '0.5rem', fontWeight: 700, color: '#fff', width: '18px', height: '18px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b}</span>}
                      {a && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: F.activeText }} />}
                    </div>
                  ))}
                </Panel>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Panel>
                    <PanelLabel>Tab Bar</PanelLabel>
                    <div style={{ display: 'flex', background: '#f0fdf4', borderRadius: '8px', padding: '3px', gap: 0 }}>
                      {['Overview', 'Messages', 'Orders', 'Reports'].map((t, i) => (
                        <button key={t} onClick={() => setActiveTab(i)} style={{ ...DM, flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.75rem', fontWeight: activeTab === i ? 600 : 400, border: 'none', cursor: 'pointer', borderRadius: '6px', background: activeTab === i ? '#fff' : 'transparent', color: activeTab === i ? '#0c1a0e' : '#71717a', boxShadow: activeTab === i ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all .15s' }}>{t}</button>
                      ))}
                    </div>
                  </Panel>
                  <Panel>
                    <PanelLabel>Breadcrumbs</PanelLabel>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {['Dashboard', 'Customers', 'Amara K.'].map((c, i, a) => (
                        <React.Fragment key={c}>
                          <span style={{ ...DM, fontSize: '0.8125rem', color: i === a.length - 1 ? '#0c1a0e' : '#71717a', fontWeight: i === a.length - 1 ? 600 : 400 }}>{c}</span>
                          {i < a.length - 1 && React.createElement(ChevronRight, { style: { width: '12px', height: '12px', color: '#d4d4d8' } })}
                        </React.Fragment>
                      ))}
                    </div>
                  </Panel>
                  <Panel>
                    <PanelLabel>Dropdown Menu</PanelLabel>
                    <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e4e4e7', width: '180px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                      {[{ I: Edit3, l: 'Edit' }, { I: Download, l: 'Export' }, { I: Eye, l: 'View' }, { I: Trash2, l: 'Delete', danger: true }].map(({ I, l, danger }) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5625rem 0.875rem', cursor: 'pointer', background: '#fff', borderBottom: l !== 'Delete' ? '1px solid #f4f4f5' : 'none' }}>
                          {React.createElement(I, { style: { width: '13px', height: '13px', color: danger ? '#f43f5e' : '#71717a', flexShrink: 0 } })}
                          <span style={{ ...DM, fontSize: '0.8125rem', color: danger ? '#f43f5e' : '#374151' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            </section>

            {/* ── DATA DISPLAY ── */}
            <section id="data" style={{ marginBottom: '4rem' }}>
              <SH title="Data Display" sub="Conversation list, agent rows, timeline" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ borderRadius: '12px', background: '#fff', border: '1px solid #ebebeb', overflow: 'hidden' }}>
                  <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ ...DM, fontSize: '0.5rem', fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Conversation Items</p>
                    <button style={{ ...DM, fontSize: '0.75rem', fontWeight: 600, padding: '0.3125rem 0.75rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Download style={{ width: '11px', height: '11px' }} /> Export
                    </button>
                  </div>
                  {[
                    { n: 'Amara K.', m: 'When will my order arrive?', t: '2m', u: 2, c: '#22c55e', st: 'Active', sb: '#f0fdf4', sc: '#15803d' },
                    { n: 'Ben Torres', m: 'Can I reschedule my appointment?', t: '15m', u: 0, c: '#3b82f6', st: 'Pending', sb: '#fffbeb', sc: '#d97706' },
                    { n: 'Cynthia W.', m: 'Thank you so much, very helpful!', t: '1h', u: 0, c: '#8b5cf6', st: 'Resolved', sb: '#f4f4f5', sc: '#71717a' },
                  ].map(({ n, m, t, u, c, st, sb, sc }, i, a) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.25rem', borderBottom: i < a.length - 1 ? '1px solid #f9fafb' : 'none', background: u > 0 ? '#fafffe' : '#fff' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{n[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.15rem' }}>
                          <span style={{ ...DM, fontSize: '0.875rem', fontWeight: u > 0 ? 600 : 500, color: '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
                          <span style={{ ...DM, fontSize: '0.6875rem', color: '#a1a1aa', flexShrink: 0 }}>{t}</span>
                        </div>
                        <p style={{ ...DM, fontSize: '0.8125rem', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                        {u > 0 && <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#22c55e', color: '#fff', fontSize: '0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{u}</span>}
                        <span style={{ ...DM, fontSize: '0.5rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: sb, color: sc }}>{st}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderRadius: '12px', background: '#fff', border: '1px solid #ebebeb', overflow: 'hidden' }}>
                  <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #f0fdf4' }}>
                    <p style={{ ...DM, fontSize: '0.5rem', fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Agent Rows</p>
                  </div>
                  {[{ n: 'Sarah Johnson', c: '#22c55e', online: true, chats: 8, res: 23 }, { n: 'Mike Chen', c: '#3b82f6', online: true, chats: 5, res: 17 }, { n: 'Priya Patel', c: '#f59e0b', online: false, chats: 0, res: 31 }].map(({ n, c, online, chats, res }, i, a) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: i < a.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1 }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, color: '#fff' }}>{n.split(' ').map(w => w[0]).join('')}</div>
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', borderRadius: '50%', background: online ? '#22c55e' : '#a1a1aa', border: '1.5px solid #fff' }} />
                        </div>
                        <span style={{ ...DM, fontSize: '0.8125rem', fontWeight: 500, color: '#18181b' }}>{n}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <span style={{ ...DM, fontSize: '0.625rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '9999px', background: online ? '#f0fdf4' : '#f4f4f5', color: online ? '#15803d' : '#a1a1aa' }}>{online ? 'Online' : 'Away'}</span>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ ...SYNE, fontSize: '0.875rem', fontWeight: 700, color: '#18181b' }}>{chats}</p>
                          <p style={{ ...DM, fontSize: '0.5rem', color: '#a1a1aa' }}>Active</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ ...SYNE, fontSize: '0.875rem', fontWeight: 700, color: '#22c55e' }}>{res}</p>
                          <p style={{ ...DM, fontSize: '0.5rem', color: '#a1a1aa' }}>Resolved</p>
                        </div>
                        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#a1a1aa' }}>
                          <MoreHorizontal style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── SHADOWS ── */}
            <section id="shadows" style={{ marginBottom: '4rem' }}>
              <SH title="Shadows & Elevation" sub="Six elevation levels + emerald glow variants" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                {[
                  { l: 'shadow-sm', s: '0 1px 3px rgba(0,0,0,0.06)', token: 'subtle' },
                  { l: 'shadow-md', s: '0 4px 16px rgba(0,0,0,0.08)', token: 'cards' },
                  { l: 'shadow-lg', s: '0 8px 32px rgba(0,0,0,0.12)', token: 'dropdowns' },
                  { l: 'shadow-xl', s: '0 16px 48px rgba(0,0,0,0.16)', token: 'modals' },
                  { l: 'glow-sm', s: '0 0 16px rgba(34,197,94,0.22)', token: 'accent element', green: true },
                  { l: 'glow-lg', s: '0 0 40px rgba(34,197,94,0.38)', token: 'CTA button', green: true },
                ].map(({ l, s, token, green }) => (
                  <div key={l} style={{ borderRadius: '12px', padding: '1.25rem', background: '#fff', boxShadow: s, display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: green ? 'linear-gradient(135deg,#22c55e,#059669)' : '#f0fdf4' }} />
                    <div>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.625rem', color: green ? '#16a34a' : '#374151', fontWeight: 700 }}>{l}</p>
                      <p style={{ ...DM, fontSize: '0.5625rem', color: '#a1a1aa', marginTop: '0.15rem' }}>{token}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── SPACING ── */}
            <section id="spacing" style={{ marginBottom: '4rem' }}>
              <SH title="Spacing Scale" sub="Tailwind spacing tokens used in WhatsBi" />
              <Panel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[{ t: '1', px: '4px' }, { t: '2', px: '8px' }, { t: '3', px: '12px' }, { t: '4', px: '16px' }, { t: '6', px: '24px' }, { t: '8', px: '32px' }, { t: '12', px: '48px' }, { t: '16', px: '64px' }].map(({ t, px }) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', flexShrink: 0 }}>
                        <code style={{ fontFamily: 'monospace', fontSize: '0.625rem', color: '#16a34a', background: '#f0fdf4', padding: '0.15rem 0.375rem', borderRadius: '4px' }}>{t}</code>
                      </div>
                      <div style={{ height: '8px', background: 'linear-gradient(90deg,#22c55e,#059669)', borderRadius: '4px', width: px, flexShrink: 0 }} />
                      <p style={{ fontFamily: 'monospace', fontSize: '0.5625rem', color: '#a1a1aa' }}>{px}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            {/* ── BORDER RADIUS ── */}
            <section id="radius" style={{ marginBottom: '4rem' }}>
              <SH title="Border Radius" sub="Rounding tokens from sharp to full pill" />
              <Panel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-end' }}>
                  {[{ l: 'none', r: '0px', tw: 'rounded-none' }, { l: 'sm', r: '4px', tw: 'rounded' }, { l: 'md', r: '8px', tw: 'rounded-lg' }, { l: 'lg', r: '12px', tw: 'rounded-xl' }, { l: 'xl', r: '16px', tw: 'rounded-2xl' }, { l: '2xl', r: '24px', tw: 'rounded-3xl' }, { l: 'full', r: '9999px', tw: 'rounded-full' }].map(({ l, r, tw }) => (
                    <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg,#22c55e,#059669)', borderRadius: r, boxShadow: '0 4px 12px rgba(34,197,94,0.25)' }} />
                      <code style={{ fontFamily: 'monospace', fontSize: '0.5625rem', color: '#374151' }}>{r}</code>
                      <p style={{ ...DM, fontSize: '0.5rem', color: '#a1a1aa' }}>{tw}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            {/* ── ICONS ── */}
            <section id="icons" style={{ marginBottom: '4rem' }}>
              <SH title="Icons" sub="Lucide icon set used throughout WhatsBi" />
              <Panel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.75rem' }}>
                  {[
                    { I: MessageSquare, l: 'Message' },
                    { I: Users, l: 'Users' },
                    { I: Bot, l: 'Bot' },
                    { I: BarChart3, l: 'Analytics' },
                    { I: Zap, l: 'Zap' },
                    { I: Shield, l: 'Shield' },
                    { I: Search, l: 'Search' },
                    { I: Settings, l: 'Settings' },
                    { I: Bell, l: 'Bell' },
                    { I: Send, l: 'Send' },
                    { I: Phone, l: 'Phone' },
                    { I: Download, l: 'Download' },
                    { I: Eye, l: 'Eye' },
                    { I: Lock, l: 'Lock' },
                    { I: Star, l: 'Star' },
                    { I: TrendingUp, l: 'Trend Up' },
                    { I: TrendingDown, l: 'Trend Down' },
                    { I: ArrowRight, l: 'Arrow' },
                    { I: ChevronRight, l: 'Chevron' },
                    { I: Check, l: 'Check' },
                    { I: X, l: 'Close' },
                    { I: Plus, l: 'Plus' },
                    { I: Edit3, l: 'Edit' },
                    { I: Trash2, l: 'Delete' },
                    { I: AlertCircle, l: 'Alert' },
                    { I: Info, l: 'Info' },
                    { I: CheckCircle, l: 'Success' },
                    { I: RefreshCw, l: 'Refresh' },
                    { I: Globe, l: 'Globe' },
                    { I: Database, l: 'Database' },
                    { I: Activity, l: 'Activity' },
                    { I: Inbox, l: 'Inbox' },
                  ].map(({ I, l }) => (
                    <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 0.5rem', borderRadius: '8px', background: '#fafafa', border: '1px solid #f0fdf4', cursor: 'pointer' }}>
                      {React.createElement(I, { style: { width: '18px', height: '18px', color: '#16a34a' } })}
                      <p style={{ ...DM, fontSize: '0.4375rem', color: '#71717a', textAlign: 'center' }}>{l}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            {/* ── AVATARS ── */}
            <section id="avatars" style={{ marginBottom: '4rem' }}>
              <SH title="Avatars & Indicators" sub="Sizes, status dots, groups, and initials" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Panel>
                  <PanelLabel>Sizes with Status</PanelLabel>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
                    {[{ s: 24, fs: '0.5rem', dot: 6 }, { s: 32, fs: '0.625rem', dot: 8 }, { s: 40, fs: '0.75rem', dot: 9 }, { s: 48, fs: '0.875rem', dot: 10 }, { s: 56, fs: '1rem', dot: 12 }].map(({ s, fs, dot }, i) => (
                      <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: s, height: s, borderRadius: '50%', background: ['#22c55e','#3b82f6','#f59e0b','#8b5cf6','#f43f5e'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: fs, fontWeight: 700 }}>
                            {['SK','MK','PP','AL','BT'][i]}
                          </div>
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: dot, height: dot, borderRadius: '50%', background: i % 2 === 0 ? '#22c55e' : '#a1a1aa', border: '2px solid #fff' }} />
                        </div>
                        <p style={{ fontFamily: 'monospace', fontSize: '0.4375rem', color: '#a1a1aa' }}>{s}px</p>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel>
                  <PanelLabel>Avatar Group & Fallbacks</PanelLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <p style={{ ...DM, fontSize: '0.6875rem', color: '#52525b', marginBottom: '0.5rem' }}>Stacked Group</p>
                      <div style={{ display: 'flex' }}>
                        {['#22c55e','#3b82f6','#f59e0b','#8b5cf6'].map((c, i) => (
                          <div key={i} style={{ width: '36px', height: '36px', borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: i > 0 ? '-10px' : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, color: '#fff' }}>
                            {['S','M','P','A'][i]}
                          </div>
                        ))}
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f4f4f5', border: '2px solid #fff', marginLeft: '-10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, color: '#52525b' }}>+5</div>
                      </div>
                    </div>
                    <div>
                      <p style={{ ...DM, fontSize: '0.6875rem', color: '#52525b', marginBottom: '0.5rem' }}>Image Fallback</p>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {React.createElement(Users, { style: { width: '18px', height: '18px', color: '#22c55e' } })}
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#0c1a0e,#142918)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MessageSquare style={{ width: '18px', height: '18px', color: '#4ade80' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
            </section>

            {/* ── ALERTS ── */}
            <section id="alerts" style={{ marginBottom: '4rem' }}>
              <SH title="Alerts & Notifications" sub="Semantic banners and toast notifications" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { I: CheckCircle, t: 'Success', msg: 'WhatsApp account connected successfully. You can now receive messages.', bg: '#f0fdf4', border: '#bbf7d0', ic: '#22c55e', tc: '#15803d' },
                  { I: AlertCircle, t: 'Warning', msg: 'Your WhatsApp message template is pending Meta review. Expected 24–48 hours.', bg: '#fffbeb', border: '#fde68a', ic: '#f59e0b', tc: '#d97706' },
                  { I: X, t: 'Error', msg: 'Failed to send message to Amara K. The recipient number may be invalid.', bg: '#fff1f2', border: '#fecdd3', ic: '#f43f5e', tc: '#e11d48' },
                  { I: Info, t: 'Info', msg: 'New API version v23.0 is available. Update your webhook configuration to continue.', bg: '#eff6ff', border: '#bfdbfe', ic: '#3b82f6', tc: '#2563eb' },
                ].map(({ I, t, msg, bg, border, ic, tc }) => (
                  <div key={t} style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem', borderRadius: '10px', background: bg, border: `1px solid ${border}` }}>
                    {React.createElement(I, { style: { width: '17px', height: '17px', color: ic, flexShrink: 0, marginTop: '0.1rem' } })}
                    <div style={{ flex: 1 }}>
                      <p style={{ ...DM, fontSize: '0.875rem', fontWeight: 600, color: tc, marginBottom: '0.15rem' }}>{t}</p>
                      <p style={{ ...DM, fontSize: '0.8125rem', color: tc, opacity: 0.75, lineHeight: 1.5 }}>{msg}</p>
                    </div>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: ic, flexShrink: 0, alignSelf: 'flex-start' }}>
                      <X style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem', borderRadius: '10px', background: F.surface, border: `1px solid ${F.border}`, backdropFilter: 'blur(12px)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#22c55e,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bell style={{ width: '15px', height: '15px', color: '#fff' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ ...DM, fontSize: '0.875rem', fontWeight: 600, color: '#fff', marginBottom: '0.1rem' }}>New message from Amara K.</p>
                    <p style={{ ...DM, fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>When will my order arrive? · 2m ago</p>
                  </div>
                  <button style={{ ...DM, fontSize: '0.6875rem', fontWeight: 600, padding: '0.3125rem 0.625rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(34,197,94,0.15)', color: '#4ade80', flexShrink: 0, alignSelf: 'center' }}>Reply</button>
                </div>
              </div>
            </section>

            {/* ── PROGRESS ── */}
            <section id="progress" style={{ marginBottom: '4rem' }}>
              <SH title="Progress & Stats" sub="Linear bars, KPI blocks, completion indicators" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Panel>
                  <PanelLabel>Progress Bars</PanelLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[{ l: 'Resolution Rate', pct: 98, c: '#22c55e', bg: '#f0fdf4' }, { l: 'Response Time SLA', pct: 72, c: '#3b82f6', bg: '#eff6ff' }, { l: 'Bot Automation', pct: 45, c: '#f59e0b', bg: '#fffbeb' }, { l: 'Queue Usage', pct: 84, c: '#f43f5e', bg: '#fff1f2' }].map(({ l, pct, c, bg }) => (
                      <div key={l}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                          <span style={{ ...DM, fontSize: '0.75rem', color: '#374151' }}>{l}</span>
                          <span style={{ ...DM, fontSize: '0.75rem', fontWeight: 600, color: c }}>{pct}%</span>
                        </div>
                        <div style={{ height: '7px', borderRadius: '9999px', background: bg }}>
                          <div style={{ height: '100%', borderRadius: '9999px', background: c, width: `${pct}%`, transition: 'width .6s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel>
                  <PanelLabel>KPI Stat Blocks</PanelLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { l: 'Conversations', v: '10K+', d: '+12.4%', up: true },
                      { l: 'Resolved', v: '98%', d: '+2.1%', up: true },
                      { l: 'Avg. Response', v: '< 2s', d: '-0.3s', up: true },
                      { l: 'Open Tickets', v: '127', d: '+8', up: false },
                    ].map(({ l, v, d, up }) => (
                      <div key={l} style={{ borderRadius: '10px', padding: '0.875rem', background: F.surface, border: `1px solid ${F.border}` }}>
                        <p style={{ ...DM, fontSize: '0.5625rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem' }}>{l}</p>
                        <p style={{ ...SYNE, fontSize: '1.375rem', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '0.375rem' }}>{v}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {React.createElement(up ? TrendingUp : TrendingDown, { style: { width: '11px', height: '11px', color: up ? '#4ade80' : '#f43f5e' } })}
                          <span style={{ ...DM, fontSize: '0.5625rem', fontWeight: 600, color: up ? '#4ade80' : '#f43f5e' }}>{d}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </section>

            {/* ── LOADING ── */}
            <section id="loading" style={{ marginBottom: '4rem' }}>
              <SH title="Loading States" sub="Skeletons, spinners, pulse indicators" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Panel>
                  <PanelLabel>Skeleton Loaders</PanelLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {[{ w: '60%', h: '12px' }, { w: '100%', h: '10px' }, { w: '80%', h: '10px' }].map((s, i) => (
                      <div key={i} className="skeleton" style={{ width: s.w, height: s.h }} />
                    ))}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div className="skeleton" style={{ width: '70%', height: '10px' }} />
                        <div className="skeleton" style={{ width: '50%', height: '8px' }} />
                      </div>
                    </div>
                    <div style={{ borderRadius: '10px', overflow: 'hidden' }}>
                      <div className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />
                    </div>
                  </div>
                </Panel>

                <Panel>
                  <PanelLabel>Spinners & Indicators</PanelLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                      {[{ s: 16, bw: 2 }, { s: 24, bw: 2.5 }, { s: 32, bw: 3 }].map(({ s, bw }) => (
                        <div key={s} className="sg-spin" style={{ width: s, height: s, borderRadius: '50%', border: `${bw}px solid #dcfce7`, borderTopColor: '#22c55e', flexShrink: 0 }} />
                      ))}
                      <div className="sg-spin" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.1)', borderTopColor: '#4ade80', background: F.surface, flexShrink: 0 }} />
                    </div>

                    <div>
                      <p style={{ ...DM, fontSize: '0.625rem', color: '#52525b', marginBottom: '0.625rem' }}>Pulse dots</p>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                          ))}
                        </div>
                        <span style={{ ...DM, fontSize: '0.75rem', color: '#71717a' }}>Agent typing...</span>
                      </div>
                    </div>

                    <div>
                      <p style={{ ...DM, fontSize: '0.625rem', color: '#52525b', marginBottom: '0.625rem' }}>Button loading state</p>
                      <button style={{ ...DM, fontWeight: 600, fontSize: '0.875rem', padding: '0.5625rem 1.25rem', borderRadius: '9999px', border: 'none', cursor: 'not-allowed', background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#fff', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="sg-spin" style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', flexShrink: 0 }} />
                        Connecting...
                      </button>
                    </div>
                  </div>
                </Panel>
              </div>
            </section>

            {/* ── TABLES ── */}
            <section id="tables" style={{ marginBottom: '4rem' }}>
              <SH title="Tables" sub="Data table with sort headers, row actions, and pagination" />
              <div style={{ borderRadius: '12px', background: '#fff', border: '1px solid #ebebeb', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ ...SYNE, fontSize: '0.9375rem', fontWeight: 700, color: '#0c1a0e' }}>Conversations</p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      {React.createElement(Search, { style: { width: '13px', height: '13px', color: '#a1a1aa', position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)' } })}
                      <input placeholder="Search..." style={{ ...DM, fontSize: '0.8125rem', padding: '0.375rem 0.75rem 0.375rem 2rem', borderRadius: '8px', border: '1px solid #e4e4e7', outline: 'none', background: '#fafafa', color: '#18181b', width: '180px' }} />
                    </div>
                    <button style={{ ...DM, fontSize: '0.8125rem', fontWeight: 600, padding: '0.375rem 0.875rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' }}>
                      <Plus style={{ width: '12px', height: '12px' }} /> New
                    </button>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8faf8' }}>
                      {['Customer', 'Status', 'Agent', 'Messages', 'Last Active', 'Actions'].map((h, i) => (
                        <th key={h} style={{ ...DM, fontSize: '0.625rem', fontWeight: 700, color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.75rem 1rem', textAlign: i === 0 ? 'left' : 'center', borderBottom: '1px solid #ebebeb', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n: 'Amara K.', c: '#22c55e', st: 'Active', stC: '#15803d', stBg: '#f0fdf4', ag: 'Sarah J.', msgs: 14, last: '2 min ago' },
                      { n: 'Ben Torres', c: '#3b82f6', st: 'Pending', stC: '#d97706', stBg: '#fffbeb', ag: 'Mike C.', msgs: 6, last: '15 min ago' },
                      { n: 'Cynthia W.', c: '#8b5cf6', st: 'Resolved', stC: '#71717a', stBg: '#f4f4f5', ag: 'Priya P.', msgs: 23, last: '2 hrs ago' },
                      { n: 'David Lee', c: '#f59e0b', st: 'Pending', stC: '#d97706', stBg: '#fffbeb', ag: 'Sarah J.', msgs: 3, last: '4 hrs ago' },
                    ].map(({ n, c, st, stC, stBg, ag, msgs, last }, i) => (
                      <tr key={n} style={{ borderBottom: '1px solid #f9fafb', transition: 'background .1s' }}>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{n[0]}</div>
                            <span style={{ ...DM, fontSize: '0.875rem', fontWeight: 500, color: '#18181b' }}>{n}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          <span style={{ ...DM, fontSize: '0.625rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '9999px', background: stBg, color: stC }}>{st}</span>
                        </td>
                        <td style={{ ...DM, padding: '0.875rem 1rem', fontSize: '0.8125rem', color: '#52525b', textAlign: 'center' }}>{ag}</td>
                        <td style={{ ...SYNE, padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#0c1a0e', textAlign: 'center' }}>{msgs}</td>
                        <td style={{ ...DM, padding: '0.875rem 1rem', fontSize: '0.75rem', color: '#a1a1aa', textAlign: 'center' }}>{last}</td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
                            <button style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #bbf7d0', background: '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {React.createElement(Eye, { style: { width: '12px', height: '12px', color: '#16a34a' } })}
                            </button>
                            <button style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e4e4e7', background: '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {React.createElement(Edit3, { style: { width: '12px', height: '12px', color: '#71717a' } })}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid #f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ ...DM, fontSize: '0.75rem', color: '#a1a1aa' }}>Showing 4 of 127 conversations</p>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {['←', '1', '2', '3', '→'].map((p, i) => (
                      <button key={p} style={{ ...DM, fontSize: '0.75rem', fontWeight: i === 1 ? 700 : 400, width: '28px', height: '28px', borderRadius: '6px', border: i === 1 ? 'none' : '1px solid #e4e4e7', cursor: 'pointer', background: i === 1 ? '#22c55e' : '#fff', color: i === 1 ? '#fff' : '#52525b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>
    </>
  );
}
