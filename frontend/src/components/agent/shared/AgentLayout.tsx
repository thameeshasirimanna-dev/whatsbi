import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Agent } from '../../../types';
import { getCurrentAgent } from '../../../lib/agent';
import { logout, getToken } from '../../../lib/auth';
import { useDialog } from './DialogProvider';



interface AgentLayoutProps {
  children?: React.ReactNode;
}

const AgentLayout: React.FC<AgentLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { confirm: dlgConfirm } = useDialog();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const agentFetchedRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  const displayAgent = useMemo(() => {
    if (loading) {
      return {
        id: '',
        user_id: '',
        name: 'Loading...',
        email: '',
        agent_prefix: 'WA',
        role: 'agent' as const,
        credits: 300.0,
        sms_credits: 100.0,
        ai_balance: 4.0,
        created_at: new Date().toISOString(),
      };
    }
    return agent
      ? {
          ...agent,
          credits: Number(agent.credits ?? 300.0),
          sms_credits: Number(agent.sms_credits ?? 100.0),
          ai_balance: Number(agent.ai_balance ?? 4.0),
        }
      : {
          id: '',
          user_id: '',
          name: 'Not logged in',
          email: '',
          agent_prefix: 'WA',
          role: 'agent' as const,
          credits: 0,
          sms_credits: 0,
          ai_balance: 4.0,
          created_at: new Date().toISOString(),
        };
  }, [agent, loading]);

  const navigate = useNavigate();

  const handleNotificationClick = useCallback((notification: any) => {
    navigate(`/agent/conversations?customerId=${notification.customerId}`);
    setRecentNotifications(prev => prev.filter(n => n.id !== notification.id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    if (await dlgConfirm('Are you sure you want to logout?')) {
      logout();
      window.location.href = '/login';
    }
  }, [dlgConfirm]);

  const navbarProps = {
    ...displayAgent,
    unreadCount,
    recentNotifications,
    onNotificationClick: handleNotificationClick,
  };

  useEffect(() => {
    const fetchAgent = async () => {
      if (agentFetchedRef.current) return;
      setLoading(true);
      const currentAgent = await getCurrentAgent();
      setAgent(currentAgent);
      agentFetchedRef.current = true;
      setLoading(false);
      setUnreadCount(0);
      setRecentNotifications([]);
    };
    fetchAgent();
  }, []);

  useEffect(() => {
    const handleUnreadMarked = (event: CustomEvent) => {
      const { count } = event.detail;
      setUnreadCount(prev => Math.max(0, prev - count));
      setRecentNotifications(prev => prev.filter(n => n.customerId !== event.detail.customerId));
    };

    const handleUnreadReceived = (event: CustomEvent) => {
      const { count, messageData } = event.detail;
      setUnreadCount(prev => prev + count);
      if (messageData) {
        const notif = {
          id: messageData.id,
          customerName: messageData.customerName,
          customerPhone: messageData.customerPhone,
          customerId: messageData.customer_id,
          preview: messageData.message.length > 50 ? `${messageData.message.substring(0, 50)}...` : messageData.message,
          timestamp: messageData.timestamp,
        };
        setRecentNotifications(prev => {
          const updated = [notif, ...prev];
          return updated.length > 5 ? updated.slice(0, 5) : updated;
        });
      }
    };

    window.addEventListener('unread-messages-read', handleUnreadMarked as EventListener);
    window.addEventListener('unread-message-received', handleUnreadReceived as EventListener);

    return () => {
      window.removeEventListener('unread-messages-read', handleUnreadMarked as EventListener);
      window.removeEventListener('unread-message-received', handleUnreadReceived as EventListener);
    };
  }, []);

  // Live real-time socket listener for header balance synchronization
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
      } catch (e) {}
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

    const handleStatusUpdate = (statusData: any) => {
      if (statusData?.type === 'ai_balance_updated' && statusData?.ai_balance !== undefined) {
        const updatedBalance = parseFloat(statusData.ai_balance);
        setAgent((prev) => (prev ? { ...prev, ai_balance: updatedBalance } : prev));
      } else if (statusData?.type === 'credits_updated' && statusData?.credits !== undefined) {
        const updatedCredits = parseFloat(statusData.credits);
        setAgent((prev) => (prev ? { ...prev, credits: updatedCredits } : prev));
      } else if (statusData?.type === 'sms_credits_updated' && statusData?.sms_credits !== undefined) {
        const updatedSmsCredits = parseFloat(statusData.sms_credits);
        setAgent((prev) => (prev ? { ...prev, sms_credits: updatedSmsCredits } : prev));
      }

      // Forward to window for active pages/components (like BroadcastsPage)
      window.dispatchEvent(new CustomEvent('agent_status_update', { detail: statusData }));
    };

    const handleBroadcastUpdate = (data: any) => {
      window.dispatchEvent(new CustomEvent('broadcast_updated', { detail: data }));
    };

    s.on('agent_status_update', handleStatusUpdate);
    s.on('agent-status-update', handleStatusUpdate);
    s.on('broadcast_updated', handleBroadcastUpdate);
    s.on('broadcast-updated', handleBroadcastUpdate);

    return () => {
      s.disconnect();
    };
  }, [agent?.id]);

  if (loading) {
    return (
      <div style={{
          minHeight: '100dvh',
          background: '#16281D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#9FE870',
              animation: 'spin 0.9s linear infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
              Loading...
            </span>
          </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div style={{
          minHeight: '100dvh',
          background: '#16281D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Agent Not Found
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
              Please log in as an agent or contact administrator.
            </div>
            <button
              onClick={() => window.location.href = '/login'}
              style={{
                background: '#9FE870',
                color: '#16281D',
                border: 'none',
                borderRadius: 9999,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(159,232,112,0.3)',
              }}
            >
              Go to Login
            </button>
          </div>
      </div>
    );
  }

  return (
    <div style={{
        display: 'flex',
        height: '100dvh',
        overflow: 'hidden',
        background: '#F4F7F4',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <Sidebar
          agent={displayAgent}
          unreadCount={unreadCount}
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Navbar
            agent={navbarProps}
            collapsed={sidebarCollapsed}
            onMenuClick={() => setSidebarOpen(true)}
            onLogout={handleLogout}
          />
          <main
            key={location.pathname}
            className="animate-fade-in flex-1 flex flex-col min-h-0 bg-[#F4F7F4] no-scrollbar"
            style={{
              overflowY: location.pathname.includes('/conversations') ? 'hidden' : 'auto',
              overflowX: 'hidden',
            }}
          >
            <Outlet />
            {children}
          </main>
        </div>
    </div>
  );
};

export default AgentLayout;
