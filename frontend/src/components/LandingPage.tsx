import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  MessageSquare,
  Users,
  Bot,
  BarChart3,
  Zap,
  Shield,
  Menu,
  X,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

const FONT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  @keyframes gradient-shift {
    0% { background-position: 0% center; }
    100% { background-position: 200% center; }
  }
  .text-gradient-animate {
    background: linear-gradient(90deg, #4ade80, #22c55e, #059669, #10b981, #4ade80);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradient-shift 4s linear infinite;
  }

  /* Nav link states — dark context (hero) */
  .nav-dark .nav-link {
    color: rgba(255,255,255,0.65);
    border-radius: 9999px;
    transition: color 0.2s, background 0.2s;
  }
  .nav-dark .nav-link:hover {
    color: #ffffff;
    background: rgba(255,255,255,0.1);
  }
  .nav-dark .nav-signin {
    color: rgba(255,255,255,0.55);
    transition: color 0.2s;
  }
  .nav-dark .nav-signin:hover { color: #ffffff; }
  .nav-dark .nav-burger { color: rgba(255,255,255,0.65); }

  /* Nav link states — light context (scrolled) */
  .nav-light .nav-link {
    color: #64748b;
    border-radius: 9999px;
    transition: color 0.2s, background 0.2s;
  }
  .nav-light .nav-link:hover {
    color: #0f172a;
    background: rgba(15,23,42,0.06);
  }
  .nav-light .nav-signin {
    color: #64748b;
    transition: color 0.2s;
  }
  .nav-light .nav-signin:hover { color: #0f172a; }
  .nav-light .nav-burger { color: #64748b; }
`;

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();
  return (
    <motion.div ref={ref} variants={reduced ? {} : stagger} initial="hidden" animate={inView ? 'show' : 'hidden'} className={className}>
      {children}
    </motion.div>
  );
}

function FI({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div variants={reduced ? {} : fadeUp} className={className}>{children}</motion.div>;
}

function DashboardMockup() {
  const reduced = useReducedMotion();
  const contacts = [
    { name: 'Amara K.', msg: 'When will my order arrive?', time: '2m', unread: 2, active: true, color: 'bg-emerald-500' },
    { name: 'Ben Torres', msg: 'Can I reschedule?', time: '15m', unread: 0, active: false, color: 'bg-blue-500' },
    { name: 'Cynthia W.', msg: 'Thank you so much!', time: '1h', unread: 0, active: false, color: 'bg-purple-500' },
    { name: 'David Lee', msg: 'Invoice received ✓', time: '3h', unread: 0, active: false, color: 'bg-orange-500' },
  ];

  return (
    <div className="relative w-full max-w-[580px] mx-auto select-none">
      {/* Glow halo */}
      <div aria-hidden="true" className="absolute -inset-8 rounded-3xl pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(34,197,94,0.22) 0%, transparent 70%)',
      }} />

      {/* Gradient ring */}
      <div className="relative p-[1.5px] rounded-2xl" style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.5) 0%, rgba(5,150,105,0.15) 50%, rgba(34,197,94,0.3) 100%)',
      }}>
        {/* Browser chrome */}
        <div className="rounded-[14px] overflow-hidden shadow-2xl" style={{ background: '#0f2012', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ background: '#142918', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
            <div className="ml-3 flex-1 rounded px-3 py-1 text-[11px] border" style={{ background: '#1a3620', borderColor: 'rgba(255,255,255,0.08)', color: '#4ade80' }}>
              app.whatsbi.com/inbox
            </div>
          </div>

          <div className="flex h-[340px] sm:h-[375px]">
            {/* Sidebar */}
            <div className="w-[190px] sm:w-[210px] flex flex-col shrink-0 border-r" style={{ background: '#142918', borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="p-3">
                <div className="rounded-lg px-3 py-2 text-[11px] border flex items-center gap-1.5" style={{ background: '#1a3620', borderColor: 'rgba(34,197,94,0.15)', color: 'rgba(255,255,255,0.35)' }}>
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search conversations...
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {contacts.map((c, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2.5 ${c.active ? 'border-r-2' : ''}`} style={{
                    background: c.active ? 'rgba(34,197,94,0.12)' : 'transparent',
                    borderRightColor: c.active ? '#4ade80' : undefined,
                  }}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${c.color}`}>{c.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-1">
                        <span className="text-[11px] font-semibold truncate" style={{ color: c.active ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>{c.name}</span>
                        <span className="text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>{c.time}</span>
                      </div>
                      <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>{c.msg}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="w-4 h-4 rounded-full text-[9px] text-white flex items-center justify-center shrink-0 font-bold" style={{ background: '#22c55e' }}>{c.unread}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 flex flex-col min-w-0" style={{ background: '#0f2012' }}>
              <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ background: '#142918', borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: '#22c55e' }}>A</div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: '#fff' }}>Amara K.</p>
                  <p className="text-[10px]" style={{ color: '#4ade80' }}>Online</p>
                </div>
                <div className="ml-auto">
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.22)', color: '#4ade80' }}>Order #2843</span>
                </div>
              </div>

              <div className="flex-1 p-3 space-y-2 overflow-hidden">
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm px-3 py-2 text-[11px] max-w-[75%] border" style={{ background: '#1a3620', borderColor: 'rgba(34,197,94,0.12)', color: 'rgba(255,255,255,0.6)' }}>
                    Hi! When will my order #2843 arrive? It&apos;s been 3 days.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm px-3 py-2 text-[11px] text-white max-w-[75%]" style={{ background: '#059669' }}>
                    Hi Amara! Let me check that for you right away 👀
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm px-3 py-2 text-[11px] max-w-[75%] border" style={{ background: '#1a3620', borderColor: 'rgba(34,197,94,0.12)', color: 'rgba(255,255,255,0.6)' }}>
                    Great, thanks! I really appreciate it.
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pl-1">
                  <div className="flex gap-0.5 rounded-full px-2.5 py-1.5 border" style={{ background: '#1a3620', borderColor: 'rgba(34,197,94,0.12)' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#22c55e', animationDelay: `${i * 160}ms`, animationDuration: '0.8s' }} />
                    ))}
                  </div>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Agent typing...</span>
                </div>
              </div>

              <div className="p-3 border-t" style={{ borderColor: 'rgba(34,197,94,0.1)' }}>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 border" style={{ background: '#1a3620', borderColor: 'rgba(34,197,94,0.15)' }}>
                  <span className="flex-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Reply to Amara...</span>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#22c55e' }}>
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        className="absolute -top-4 -right-2 sm:-right-6 rounded-xl px-3 py-2 flex items-center gap-2 border shadow-xl"
        style={{ background: 'rgba(12,26,14,0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(34,197,94,0.2)' }}
        animate={reduced ? {} : { y: [0, -7, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
        <span className="text-xs font-semibold text-zinc-100">127 active chats</span>
      </motion.div>

      <motion.div
        className="absolute -bottom-4 -left-2 sm:-left-6 rounded-xl px-3 py-2 flex items-center gap-2 border shadow-xl"
        style={{ background: 'rgba(12,26,14,0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(34,197,94,0.2)' }}
        animate={reduced ? {} : { y: [0, 7, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#4ade80' }} />
        <span className="text-xs font-semibold text-zinc-100">98% resolved today</span>
      </motion.div>
    </div>
  );
}

const features: { Icon: React.ElementType; title: string; desc: string; iconColor: string }[] = [
  { Icon: MessageSquare, title: 'Unified Inbox', desc: 'All WhatsApp conversations in one place. Real-time notifications, smart queues, and team assignment at a glance.', iconColor: '#059669' },
  { Icon: Users, title: 'Agent Management', desc: 'Role-based access control, live performance tracking, and workload distribution across your entire support team.', iconColor: '#3b82f6' },
  { Icon: Bot, title: 'AI Chatbots', desc: 'Intelligent automations handle FAQs 24/7. Escalate to a human agent seamlessly when the conversation needs it.', iconColor: '#8b5cf6' },
  { Icon: BarChart3, title: 'Deep Analytics', desc: 'Track response times, resolution rates, agent performance, and customer satisfaction scores in real time.', iconColor: '#f59e0b' },
  { Icon: Zap, title: 'WhatsApp Cloud API', desc: 'Official Meta integration. Message templates, media support, webhooks, and delivery receipts — all built in.', iconColor: '#22c55e' },
  { Icon: Shield, title: 'Multi-Tenant Security', desc: 'Complete data isolation per business. JWT authentication, encrypted storage, and compliance-ready architecture.', iconColor: '#f43f5e' },
];

const stats = [
  { value: '10K+', label: 'Conversations per day' },
  { value: '500+', label: 'Businesses onboarded' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '< 2s', label: 'Message delivery' },
];

const steps = [
  { num: '01', title: 'Connect WhatsApp', desc: 'Link your WhatsApp Business account via the official Meta Cloud API in under 5 minutes.' },
  { num: '02', title: 'Set Up Your Team', desc: 'Invite agents, assign roles, configure inbox rules and automated response templates.' },
  { num: '03', title: 'Start Serving Customers', desc: 'Go live instantly. Monitor conversations, track performance, and scale as your business grows.' },
];

const LandingPage: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{FONT_CSS}</style>
      <div style={{ ...DM, minHeight: '100vh', background: '#0c1a0e' }}>

        {/* ── NAV ── */}
        <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '14px', paddingBottom: '10px' }}>
          <div
            className={`max-w-7xl mx-auto ${scrolled ? 'nav-light' : 'nav-dark'}`}
            style={{
              background: scrolled
                ? 'rgba(255,255,255,0.90)'
                : 'rgba(14,33,16,0.68)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: scrolled
                ? '1px solid rgba(148,163,184,0.22)'
                : '1px solid rgba(34,197,94,0.2)',
              borderRadius: '14px',
              boxShadow: scrolled
                ? '0 2px 20px rgba(0,0,0,0.07), 0 1px 0 rgba(255,255,255,0.8) inset'
                : '0 8px 32px rgba(0,0,0,0.36), 0 1px 0 rgba(34,197,94,0.12) inset',
              transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
            }}
          >
            <div className="flex items-center justify-between px-4 sm:px-5" style={{ height: '52px' }}>

              {/* Logo */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                  boxShadow: scrolled ? '0 0 14px rgba(34,197,94,0.3)' : '0 0 18px rgba(34,197,94,0.45)',
                }}>
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <span
                  className="text-[17px] font-bold tracking-tight"
                  style={{ ...SYNE, color: scrolled ? '#0f172a' : '#ffffff', transition: 'color 0.35s ease' }}
                >
                  WhatsBi
                </span>
              </div>

              {/* Desktop nav — center pill */}
              <nav className="hidden md:flex items-center" aria-label="Main navigation" style={{
                background: scrolled ? 'rgba(241,245,249,0.8)' : 'rgba(255,255,255,0.05)',
                border: scrolled ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '9999px',
                padding: '3px',
                gap: 0,
              }}>
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'How It Works', href: '#how-it-works' },
                  { label: 'Pricing', href: '#pricing' },
                ].map(({ label, href }) => (
                  <a key={label} href={href} className="nav-link px-4 py-1.5 text-sm font-medium" style={{ borderRadius: '9999px' }}>
                    {label}
                  </a>
                ))}
              </nav>

              {/* Desktop CTAs */}
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="nav-signin px-4 py-2 text-sm font-medium rounded-full">
                  Sign in
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                    boxShadow: '0 4px 14px rgba(34,197,94,0.4)',
                  }}
                >
                  Get started <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Mobile burger */}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="nav-burger md:hidden p-2 rounded-lg transition-colors"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
              <div
                className="md:hidden px-4 py-4 space-y-1 border-t"
                style={{
                  borderColor: scrolled ? 'rgba(148,163,184,0.15)' : 'rgba(34,197,94,0.12)',
                  borderBottomLeftRadius: '14px',
                  borderBottomRightRadius: '14px',
                }}
              >
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'How It Works', href: '#how-it-works' },
                  { label: 'Pricing', href: '#pricing' },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 px-3 rounded-xl text-sm font-medium transition-colors"
                    style={{ color: scrolled ? '#334155' : 'rgba(255,255,255,0.8)' }}
                  >
                    {label}
                  </a>
                ))}
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center text-white text-sm font-semibold px-4 py-2.5 rounded-full mt-2"
                  style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)' }}
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Dark shell: hero + stats */}
        <div style={{
          background: '#0c1a0e',
          backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 12%, rgba(34,197,94,0.16) 0%, rgba(34,197,94,0.04) 45%, transparent 70%)',
        }}>

        {/* ── HERO ── */}
        <section className="relative overflow-hidden pt-8 pb-36 lg:pt-14 lg:pb-48">
          {/* Radial glow */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(34,197,94,0.10) 0%, transparent 65%)',
          }} />
          {/* Floating orbs */}
          <div aria-hidden="true" className="absolute top-20 left-[8%] w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)', filter: 'blur(48px)' }} />
          <div aria-hidden="true" className="absolute top-36 right-[6%] w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.05) 0%, transparent 70%)', filter: 'blur(64px)' }} />
          {/* Grid */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

              {/* Copy */}
              <Section className="flex-1 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
                <FI>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-8 border" style={{
                    background: 'rgba(34,197,94,0.12)',
                    borderColor: 'rgba(34,197,94,0.22)',
                    color: '#4ade80',
                  }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
                    Official WhatsApp Cloud API Integration
                  </div>
                </FI>

                <FI>
                  <h1 className="text-5xl sm:text-6xl lg:text-[3.75rem] xl:text-[4.25rem] font-black leading-[1.06] tracking-tight text-white mb-6" style={SYNE}>
                    The CRM built for{' '}
                    <span className="text-gradient-animate">WhatsApp Business</span>
                  </h1>
                </FI>

                <FI>
                  <p className="text-lg text-zinc-400 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                    Manage every customer conversation, automate responses, track agent performance,
                    and grow your business — all from one unified platform.
                  </p>
                </FI>

                <FI>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                    <Link to="/login" className="inline-flex items-center justify-center gap-2 text-white font-semibold px-7 py-3.5 rounded-full transition-all hover:opacity-90 text-base" style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                      boxShadow: '0 8px 28px rgba(34,197,94,0.35)',
                    }}>
                      Start free trial <ArrowRight className="w-4 h-4" />
                    </Link>
                    <a href="#features" className="inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-full transition-all text-base border text-zinc-300 hover:text-white hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                      See features
                    </a>
                  </div>
                </FI>

                <FI>
                  <p className="mt-5 text-xs text-zinc-600">No credit card required &nbsp;·&nbsp; 14-day free trial</p>
                </FI>
              </Section>

              {/* Mockup */}
              <div className="flex-1 w-full lg:w-auto px-4 lg:px-0">
                <DashboardMockup />
              </div>
            </div>
          </div>

          {/* Bottom fade */}
          <div aria-hidden="true" className="absolute bottom-0 inset-x-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #0c1a0e)' }} />
        </section>

        {/* ── STATS BAR ── */}
        <section style={{ background: '#0c1a0e' }} aria-label="Key statistics">
          <div className="border-y" style={{ borderColor: 'rgba(34,197,94,0.08)' }}>
            <Section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
                {stats.map((s, i) => (
                  <FI key={i} className="text-center">
                    <p className="text-3xl sm:text-4xl font-black text-white mb-1.5 tracking-tight" style={SYNE}>{s.value}</p>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                  </FI>
                ))}
              </div>
            </Section>
          </div>
        </section>

        </div>{/* end dark shell */}

        {/* ── FEATURES ── */}
        <section id="features" className="py-20 lg:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Section className="text-center max-w-2xl mx-auto mb-16">
              <FI>
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#059669' }}>Features</p>
              </FI>
              <FI>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4" style={{ ...SYNE, color: '#0c1a0e' }}>
                  Everything your team needs
                </h2>
              </FI>
              <FI>
                <p className="text-lg leading-relaxed" style={{ color: '#52525b' }}>
                  Purpose-built tools for modern WhatsApp support teams. From first message to resolved ticket.
                </p>
              </FI>
            </Section>

            {/* Bento grid: [large 2col] [regular] / [regular] [regular] [large 2col] */}
            <Section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">

              {/* Feature 0 — large (2 col) */}
              <FI className="lg:col-span-2">
                <div className="group h-full p-7 rounded-2xl bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-default" style={{ border: '1.5px solid #bbf7d0' }}>
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-12 h-12 flex items-center justify-center shrink-0" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px' }}>
                      {React.createElement(features[0].Icon, { style: { width: 24, height: 24, color: features[0].iconColor } })}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1" style={{ ...SYNE, color: '#0c1a0e' }}>{features[0].title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#52525b' }}>{features[0].desc}</p>
                    </div>
                  </div>
                  <div className="rounded-xl p-3 flex gap-2.5" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="flex-1 space-y-1.5">
                      {['Amara K. — 2 new messages', 'Ben Torres — Awaiting reply', 'Cynthia W. — Resolved ✓'].map((t, i) => (
                        <div key={i} className="text-[10px] px-3 py-1.5 rounded-lg" style={i === 0 ? { background: '#fff', color: '#15803d', fontWeight: 600, border: '1px solid #bbf7d0' } : { background: '#fff', color: '#52525b', border: '1px solid #e4e4e7' }}>{t}</div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1.5 justify-center shrink-0">
                      <div className="text-[9px] text-center text-white rounded-md px-2 py-1 font-bold tracking-wide" style={{ background: '#22c55e' }}>LIVE</div>
                      <div className="text-[9px] text-center rounded-md px-2 py-1" style={{ background: '#fff', color: '#52525b', border: '1px solid #e4e4e7' }}>Queue: 3</div>
                    </div>
                  </div>
                </div>
              </FI>

              {/* Feature 1 */}
              <FI>
                <div className="group h-full p-6 rounded-2xl bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-default" style={{ border: '1.5px solid #bbf7d0' }}>
                  <div className="w-11 h-11 flex items-center justify-center mb-4" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px' }}>
                    {React.createElement(features[1].Icon, { style: { width: 20, height: 20, color: features[1].iconColor } })}
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ ...SYNE, color: '#0c1a0e' }}>{features[1].title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#52525b' }}>{features[1].desc}</p>
                </div>
              </FI>

              {/* Feature 2 */}
              <FI>
                <div className="group h-full p-6 rounded-2xl bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-default" style={{ border: '1.5px solid #bbf7d0' }}>
                  <div className="w-11 h-11 flex items-center justify-center mb-4" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px' }}>
                    {React.createElement(features[2].Icon, { style: { width: 20, height: 20, color: features[2].iconColor } })}
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ ...SYNE, color: '#0c1a0e' }}>{features[2].title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#52525b' }}>{features[2].desc}</p>
                </div>
              </FI>

              {/* Feature 3 */}
              <FI>
                <div className="group h-full p-6 rounded-2xl bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-default" style={{ border: '1.5px solid #bbf7d0' }}>
                  <div className="w-11 h-11 flex items-center justify-center mb-4" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px' }}>
                    {React.createElement(features[3].Icon, { style: { width: 20, height: 20, color: features[3].iconColor } })}
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ ...SYNE, color: '#0c1a0e' }}>{features[3].title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#52525b' }}>{features[3].desc}</p>
                </div>
              </FI>

              {/* Feature 4 — large (2 col) */}
              <FI className="lg:col-span-2">
                <div className="group h-full p-7 rounded-2xl bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-default flex flex-col sm:flex-row gap-5 items-start" style={{ border: '1.5px solid #bbf7d0' }}>
                  <div className="flex-1">
                    <div className="w-11 h-11 flex items-center justify-center mb-4" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px' }}>
                      {React.createElement(features[4].Icon, { style: { width: 20, height: 20, color: features[4].iconColor } })}
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ ...SYNE, color: '#0c1a0e' }}>{features[4].title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#52525b' }}>{features[4].desc}</p>
                  </div>
                  <div className="rounded-xl p-4 shrink-0 w-full sm:w-48" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#15803d' }}>API Status</p>
                    {['Webhook', 'Templates', 'Media', 'Delivery'].map((item, i) => (
                      <div key={i} className="flex items-center justify-between mb-2">
                        <span className="text-[11px]" style={{ color: '#52525b' }}>{item}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: '#15803d', background: '#fff', border: '1px solid #bbf7d0' }}>Live</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FI>

              {/* Feature 5 */}
              <FI>
                <div className="group h-full p-6 rounded-2xl bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-default" style={{ border: '1.5px solid #bbf7d0' }}>
                  <div className="w-11 h-11 flex items-center justify-center mb-4" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px' }}>
                    {React.createElement(features[5].Icon, { style: { width: 20, height: 20, color: features[5].iconColor } })}
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ ...SYNE, color: '#0c1a0e' }}>{features[5].title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#52525b' }}>{features[5].desc}</p>
                </div>
              </FI>
            </Section>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="py-20 lg:py-28" style={{ background: '#0c1a0e' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Section className="text-center max-w-2xl mx-auto mb-16">
              <FI>
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#4ade80' }}>How It Works</p>
              </FI>
              <FI>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight" style={SYNE}>
                  Up and running in minutes
                </h2>
              </FI>
            </Section>

            <Section className="grid md:grid-cols-3 gap-10 relative">
              {/* Connector line */}
              <div aria-hidden="true" className="hidden md:block absolute top-8 left-[calc(16.67%+3rem)] right-[calc(16.67%+3rem)] h-px" style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.35) 20%, rgba(34,197,94,0.35) 80%, transparent 100%)',
              }} />

              {steps.map((s, i) => (
                <FI key={i}>
                  <div className="text-center px-4">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 z-10" style={{
                      background: 'rgba(34,197,94,0.08)',
                      border: '2px solid rgba(34,197,94,0.35)',
                      boxShadow: '0 0 28px rgba(34,197,94,0.1)',
                    }}>
                      <span className="text-xl font-black" style={{ ...SYNE, color: '#4ade80' }}>{s.num}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3" style={SYNE}>{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>{s.desc}</p>
                  </div>
                </FI>
              ))}
            </Section>
          </div>
        </section>

        {/* ── CTA ── */}
        <section id="pricing" className="py-20 lg:py-28 bg-white">
          <Section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <FI>
              <div className="relative overflow-hidden rounded-3xl p-12 sm:p-20 text-center" style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 30%, #047857 70%, #059669 100%)',
                boxShadow: '0 40px 80px rgba(6,78,59,0.35)',
              }}>
                {/* Dot mesh */}
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1.5px, transparent 1.5px)',
                  backgroundSize: '28px 28px',
                }} />
                {/* Glow orbs */}
                <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'rgba(34,197,94,0.14)', filter: 'blur(48px)' }} />
                <div aria-hidden="true" className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'rgba(5,150,105,0.12)', filter: 'blur(48px)' }} />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border mb-6" style={{ background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.25)', color: '#4ade80' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
                    Start today
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-5 tracking-tight" style={SYNE}>
                    Ready to transform your<br className="hidden sm:block" />
                    customer communication?
                  </h2>
                  <p className="text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(187,247,208,0.75)' }}>
                    Join hundreds of businesses already using WhatsBi to deliver faster,
                    smarter WhatsApp support at scale.
                  </p>
                  <Link to="/login" className="inline-flex items-center gap-2 bg-white font-bold px-9 py-4 rounded-full transition-all hover:bg-green-50 text-base" style={{ color: '#065f46', boxShadow: '0 8px 28px rgba(0,0,0,0.22)' }}>
                    Start your free trial <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="mt-5 text-sm" style={{ color: 'rgba(187,247,208,0.5)' }}>
                    14-day free trial &nbsp;·&nbsp; No credit card required
                  </p>
                </div>
              </div>
            </FI>
          </Section>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-10" style={{ background: '#0c1a0e', borderTop: '1px solid rgba(34,197,94,0.08)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)' }}>
                <MessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold" style={{ ...SYNE, color: 'rgba(255,255,255,0.9)' }}>WhatsBi</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>— WhatsApp Business CRM</span>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>© {new Date().getFullYear()} WhatsBi. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>Privacy</a>
              <a href="#" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>Terms</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default LandingPage;
