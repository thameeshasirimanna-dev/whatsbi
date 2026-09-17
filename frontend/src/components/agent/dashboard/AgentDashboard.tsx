import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../../../lib/auth';
import { SkeletonPage } from '../shared/Skeleton';
import { AlertTriangle } from 'lucide-react';
import {
  DashboardAgent,
  DashboardMetrics,
  DashboardTelemetry,
  RecentActivity,
} from './dashboard.types';
import { DashboardWelcomeBanner } from './DashboardWelcomeBanner';
import { DashboardMetricsGrid } from './DashboardMetricsGrid';
import { DashboardTelemetryGrid } from './DashboardTelemetryGrid';
import { DashboardRecentActivity } from './DashboardRecentActivity';
import { DashboardQuickActions } from './DashboardQuickActions';
import { DashboardPerformance } from './DashboardPerformance';

const AgentDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeConversations: 0,
    totalCustomers: 0,
    ordersToday: 0,
    avgResponseTime: '1.8 min',
    balance: 4.0,
  });
  const [telemetry, setTelemetry] = useState<DashboardTelemetry | null>(null);
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
        if (data.telemetry) {
          setTelemetry(data.telemetry);
        }
        setMetrics({
          activeConversations: data.metrics?.activeConversations ?? 0,
          totalCustomers: data.metrics?.totalCustomers ?? 0,
          ordersToday: data.metrics?.ordersToday ?? 0,
          avgResponseTime: data.metrics?.avgResponseTime || '1.8 min',
          balance: data.metrics?.ai_balance ?? data.metrics?.balance ?? data.agent?.ai_balance ?? 4.0,
          ai_balance: data.metrics?.ai_balance ?? data.agent?.ai_balance ?? 4.0,
          template_credits: data.metrics?.template_credits ?? data.agent?.credits ?? 0,
          telemetry: data.telemetry,
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
      <div className="min-h-[70vh] flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-3xl border border-[#EAEAEA] p-8 max-w-sm w-full text-center shadow-md">
          <div className="w-14 h-14 rounded-full bg-[#FFF1F2] border border-[#FECDD3] flex items-center justify-center mx-auto mb-4 text-[#E11D48]">
            <AlertTriangle size={24} strokeWidth={2.4} />
          </div>
          <h2 className="text-lg font-bold text-[#16281D] m-0 mb-1.5">
            Error Loading Dashboard
          </h2>
          <p className="text-xs text-[#71717A] leading-relaxed m-0 mb-6">
            {error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2.5 px-4 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all flex items-center justify-center"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const currentBalance = agent?.ai_balance ?? agent?.balance ?? metrics.ai_balance ?? metrics.balance ?? 4.0;

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      {/* 1. Welcome Banner with Live Balance Indicator & Organic Glow */}
      <DashboardWelcomeBanner agent={agent} currentTime={currentTime} />

      {/* 2. Top Level KPI Metrics Grid */}
      <DashboardMetricsGrid
        metrics={metrics}
        balance={currentBalance}
        templateCredits={agent?.template_credits ?? agent?.credits ?? metrics.template_credits}
      />

      {/* 3. Live Telemetry & Throughput (Signature 2x2 Grid from /style-guide) */}
      <DashboardTelemetryGrid metrics={metrics} telemetry={telemetry} />

      {/* 4. Activity Feed + Quick Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <DashboardRecentActivity recentActivity={recentActivity} />
        <DashboardQuickActions />
      </div>

      {/* 5. Delivery & AI Performance Overview */}
      <DashboardPerformance
        metrics={metrics}
        telemetryPerformance={telemetry?.performance}
      />
    </div>
  );
};

export default AgentDashboard;

