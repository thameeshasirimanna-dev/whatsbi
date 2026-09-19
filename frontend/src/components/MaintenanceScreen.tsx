import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Clock,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Server,
} from 'lucide-react';

interface MaintenanceScreenProps {
  title?: string;
  message?: string;
  estimatedEnd?: string | null;
  onRefresh?: () => void;
}

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  title = 'System Maintenance Underway',
  message = 'We are currently performing scheduled maintenance to upgrade server infrastructure and optimize system performance. All services will resume shortly.',
  estimatedEnd,
  onRefresh,
}) => {
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [lastChecked, setLastChecked] = useState<string>('Just now');

  const checkStatus = async () => {
    setChecking(true);
    try {
      if (onRefresh) {
        onRefresh();
      } else {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/maintenance-status`);
        if (res.ok) {
          const data = await res.json();
          if (!data.maintenance_mode) {
            window.location.reload();
            return;
          }
        }
      }
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCountdown(30);
    } catch {
      // Still offline
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  // Automatic periodic check every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          checkStatus();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.07) 0%, #f4f6f4 60%, #eef2ee 100%)',
        padding: '32px 16px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.92); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 0.3; }
          100% { transform: scale(0.92); opacity: 0.8; }
        }
        @keyframes spin-fast {
          to { transform: rotate(360deg); }
        }
        @keyframes beacon {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>

      {/* Decorative Grid Lines Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(12,26,14,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(12,26,14,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }}
      />

      {/* Main Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#fff',
              border: '1px solid #e4e7e4',
              borderRadius: 30,
              padding: '6px 14px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#d97706',
                boxShadow: '0 0 0 3px rgba(217,119,6,0.2)',
                animation: 'beacon 2s infinite ease-in-out',
              }}
            />
            <img src="/logo/icon-logo.svg" alt="Biz Agentz" style={{ width: 22, height: 22, objectFit: 'contain' }} />
            <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e', letterSpacing: '0.02em' }}>
              Biz Agentz
            </span>
            <span style={{ color: '#d4d4d8', fontSize: 12 }}>|</span>
            <span style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#71717a' }}>
              Platform Maintenance
            </span>
          </div>
        </div>

        {/* Hero Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid rgba(12,26,14,0.08)',
            boxShadow: '0 24px 64px -12px rgba(12,26,14,0.08), 0 2px 6px rgba(0,0,0,0.02)',
            padding: 'clamp(28px, 5vw, 44px) clamp(24px, 5vw, 36px)',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* Animated Hero Icon */}
          <div
            style={{
              position: 'relative',
              width: 76,
              height: 76,
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(217,119,6,0.12)',
                animation: 'pulse-ring 3s infinite ease-in-out',
              }}
            />
            <div
              style={{
                position: 'relative',
                width: 60,
                height: 60,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px -4px rgba(217,119,6,0.2)',
              }}
            >
              <Activity size={28} style={{ color: '#d97706' }} />
            </div>
          </div>

          {/* Title */}
          <h1
            style={{
              ...SYNE,
              fontSize: 'clamp(22px, 4vw, 26px)',
              fontWeight: 800,
              color: '#0c1a0e',
              margin: '0 0 12px',
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>

          {/* Description Message */}
          <p
            style={{
              ...DM,
              fontSize: 14,
              color: '#52525b',
              lineHeight: 1.65,
              margin: '0 auto 28px',
              maxWidth: 440,
            }}
          >
            {message}
          </p>

          {/* Telemetry Status Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
              background: '#fcfdfc',
              border: '1px solid #edf0ed',
              borderRadius: 16,
              padding: '16px',
              marginBottom: 28,
              textAlign: 'left',
            }}
          >
            {/* Cell 1: Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ ...DM, fontSize: 11, fontWeight: 500, color: '#71717a' }}>
                System State
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
                <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>
                  Upgrading
                </span>
              </div>
            </div>

            {/* Cell 2: Expected Resume */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ ...DM, fontSize: 11, fontWeight: 500, color: '#71717a' }}>
                Expected Resume
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={13} style={{ color: '#d97706', flexShrink: 0 }} />
                <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>
                  {estimatedEnd || 'Shortly'}
                </span>
              </div>
            </div>

            {/* Cell 3: WhatsApp Ingestion */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ ...DM, fontSize: 11, fontWeight: 500, color: '#71717a' }}>
                Customer Messages
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShieldCheck size={14} style={{ color: '#059669', flexShrink: 0 }} />
                <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#059669' }}>
                  Safe & Queued
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={checkStatus}
            disabled={checking}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '13px 24px',
              ...DM,
              fontSize: 14,
              fontWeight: 600,
              cursor: checking ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!checking) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              if (!checking) e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <RefreshCw
              size={15}
              style={{
                animation: checking ? 'spin-fast 0.7s linear infinite' : 'none',
              }}
            />
            {checking ? 'Connecting to Server...' : 'Check Server Status'}
          </button>

          {/* Auto-reconnect ticker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 18,
              ...DM,
              fontSize: 12,
              color: '#a1a1aa',
            }}
          >
            <Server size={12} />
            <span>Auto-checking in {countdown}s</span>
            <span>•</span>
            <span>Checked: {lastChecked}</span>
          </div>
        </div>

        {/* Subtle Brand Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            ...DM,
            fontSize: 12,
            color: '#a1a1aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={13} style={{ color: '#22c55e' }} />
          <span>Biz Agentz Cloud Reliability Engine • Zero Message Loss</span>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
