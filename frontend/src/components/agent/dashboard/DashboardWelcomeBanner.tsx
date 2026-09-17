import React from 'react';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { DashboardAgent } from './dashboard.types';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface DashboardWelcomeBannerProps {
  agent: DashboardAgent | null;
  currentTime: string;
}

export const DashboardWelcomeBanner: React.FC<DashboardWelcomeBannerProps> = ({
  agent,
  currentTime,
}) => {
  const rawBalance = agent?.balance ?? agent?.credits ?? 4.0;
  const formattedBalance = typeof rawBalance === 'number' ? rawBalance.toFixed(2) : parseFloat(String(rawBalance) || '0').toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: '#0c1a0e',
        borderRadius: 16,
        padding: '24px 28px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: '0 4px 20px rgba(12, 26, 14, 0.15)',
      }}
    >
      {/* Decorative ambient gradients */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: 140,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -30,
          left: 120,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(5,150,105,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Left: Greeting & status */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 8px rgba(74,222,128,0.6)',
            }}
          />
          <span
            style={{
              ...DM,
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Live Agent Workspace
          </span>
        </div>
        <h1
          style={{
            ...SYNE,
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            marginBottom: 4,
            letterSpacing: '-0.01em',
          }}
        >
          Welcome back, {agent?.name || 'Agent'}!
        </h1>
        <p style={{ ...DM, fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
          Monitor your WhatsApp business performance, active queries, and AI balance
        </p>
      </div>

      {/* Right: Balance Widget & Time */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Balance Card in Banner */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(74, 222, 128, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4ade80',
            }}
          >
            <Wallet size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span
                style={{
                  ...DM,
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                AI Balance
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ ...SYNE, fontSize: 22, fontWeight: 700, color: '#4ade80', lineHeight: 1 }}>
                ${formattedBalance}
              </span>
              <span style={{ ...DM, fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500 }}>
                USD
              </span>
            </div>
          </div>
        </div>

        {/* Clock & Date */}
        <div style={{ textAlign: 'right', paddingLeft: 4, minWidth: 100 }}>
          <div style={{ ...SYNE, fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            {currentTime}
          </div>
          <div style={{ ...DM, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
