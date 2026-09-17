import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../../../lib/auth';
import { SkeletonPage } from '../shared/Skeleton';
import { AlertTriangle } from 'lucide-react';
import {
  DashboardAgent,
  DashboardMetrics,
  RecentActivity,
} from './dashboard.types';
import { DashboardWelcomeBanner } from './DashboardWelcomeBanner';
import { DashboardMetricsGrid } from './DashboardMetricsGrid';
import { DashboardRecentActivity } from './DashboardRecentActivity';
import { DashboardQuickActions } from './DashboardQuickActions';
import { DashboardPerformance } from './DashboardPerformance';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const AgentDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeConversations: 0,
    totalCustomers: 0,
    ordersToday: 0,
    avgResponseTime: '2.3 min',
    balance: 4.0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [agent, setAgent] = useState<DashboardAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const socketRef = useRef<Socket | null>(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) {
          setError('User not authenticated');
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-dashboard-data`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          setError('Failed to fetch dashboard data');
          return;
        }

        const dashboardResponse = await response.json();
        if (!dashboardResponse.success || !dashboardResponse.data) {
          setError('Failed to load dashboard data');
          return;
        }

        const data = dashboardResponse.data;
        setAgent(data.agent);
        setRecentActivity(data.recentActivity || []);
        setMetrics({
          activeConversations: data.metrics?.activeConversations ?? 0,
          totalCustomers: data.metrics?.totalCustomers ?? 0,
          ordersToday: data.metrics?.ordersToday ?? 0,
          avgResponseTime: data.metrics?.avgResponseTime || '2.3 min',
          balance: data.metrics?.ai_balance ?? data.metrics?.balance ?? data.agent?.ai_balance ?? 4.0,
          ai_balance: data.metrics?.ai_balance ?? data.agent?.ai_balance ?? 4.0,
          template_credits: data.metrics?.template_credits ?? data.agent?.credits ?? 0,
        });

        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Real-time socket listener for live balance updates
  useEffect(() => {
    if (!agent?.id) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    let socketUrl = window.location.origin;
    let socketPath = '/socket.io/';

    if (backendUrl && (backendUrl.startsWith('http://') || backendUrl.startsWith('https://'))) {
      try {
        const parsed = new URL(backendUrl);
        socketUrl = parsed.origin;
        if (parsed.pathname && parsed.pathname !== '/') {
          const clean = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
          socketPath = `${clean}socket.io/`;
        }
      } catch (e) {
        // Fallback to defaults
      }
    }

    const s = io(socketUrl, {
      transports: ['polling', 'websocket'],
      path: socketPath,
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    s.on('connect', () => {
      const token = getToken();
      s.emit('join-agent-room', { agentId: agent.id, token });
    });

    s.on('agent_status_update', (statusData: any) => {
      if (statusData?.type === 'ai_balance_updated' && statusData?.ai_balance !== undefined) {
        const updatedBalance = parseFloat(statusData.ai_balance);
        setAgent((prev) => (prev ? { ...prev, ai_balance: updatedBalance, balance: updatedBalance } : prev));
        setMetrics((prev) => ({ ...prev, balance: updatedBalance, ai_balance: updatedBalance }));
      } else if (statusData?.type === 'credits_updated' && statusData?.credits !== undefined) {
        const updatedCredits = parseFloat(statusData.credits);
        setAgent((prev) => (prev ? { ...prev, credits: updatedCredits, template_credits: updatedCredits } : prev));
        setMetrics((prev) => ({ ...prev, template_credits: updatedCredits }));
      }
    });

    socketRef.current = s;

    return () => {
      s.disconnect();
    };
  }, [agent?.id]);

  if (loading) {
    return <SkeletonPage type="dashboard" />;
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100%',
          background: '#f8faf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertTriangle size={24} style={{ color: '#f43f5e' }} />
          </div>
          <div style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e', marginBottom: 8 }}>
            Error Loading Dashboard
          </div>
          <div style={{ ...DM, fontSize: 14, color: '#71717a', marginBottom: 24 }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 9999,
              padding: '10px 24px',
              ...SYNE,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentBalance = agent?.ai_balance ?? agent?.balance ?? metrics.ai_balance ?? metrics.balance ?? 4.0;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Welcome Banner with Live Balance Indicator */}
      <DashboardWelcomeBanner agent={agent} currentTime={currentTime} />

      {/* 2. Metrics Grid featuring AI Balance Card */}
      <DashboardMetricsGrid metrics={metrics} balance={currentBalance} />

      {/* 3. Activity Feed + Quick Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DashboardRecentActivity recentActivity={recentActivity} />
        <DashboardQuickActions />
      </div>

      {/* 4. Delivery & AI Performance Overview */}
      <DashboardPerformance metrics={metrics} />
    </div>
  );
};

export default AgentDashboard;
