import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Agent } from '../../../types';
import { getCurrentAgent } from '../../../lib/agent';
import { logout } from '../../../lib/auth';
import { useDialog } from './DialogProvider';

const FONT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
`;

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
        credits: 0,
        created_at: new Date().toISOString(),
      };
    }
    return agent || {
      id: '',
      user_id: '',
      name: 'Not logged in',
      email: '',
      agent_prefix: 'WA',
      role: 'agent' as const,
      credits: 0,
      created_at: new Date().toISOString(),
    };
  }, [agent, loading]);

  const navigate = useNavigate();

  const handleNotificationClick = useCallback((notification: any) => {
    navigate(`/agent/conversations?customerId=${notification.customerId}`);
    setRecentNotifications(prev => prev.filter(n => n.id !== notification.id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [navigate]);

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

  if (loading) {
    return (
      <>
        <style>{FONT_CSS}</style>
        <div style={{
          minHeight: '100vh',
          background: '#0c1a0e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#4ade80',
              animation: 'spin 0.9s linear infinite',
            }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
              Loading...
            </span>
          </div>
        </div>
      </>
    );
  }

  if (!agent) {
    return (
      <>
        <style>{FONT_CSS}</style>
        <div style={{
          minHeight: '100vh',
          background: '#0c1a0e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Agent Not Found
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 24 }}>
              Please log in as an agent or contact administrator.
            </div>
            <button
              onClick={() => window.location.href = '/login'}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 9999,
                padding: '10px 24px',
                fontFamily: "'Syne', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{FONT_CSS}</style>
      <div style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#f8faf8',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <Sidebar
          agent={displayAgent}
          unreadCount={unreadCount}
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onClose={() => setSidebarOpen(false)}
          onLogout={async () => {
            if (await dlgConfirm('Are you sure you want to logout?')) {
              logout();
              window.location.href = '/login';
            }
          }}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Navbar
            agent={navbarProps}
            collapsed={sidebarCollapsed}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main
            key={location.pathname}
            className="animate-fade-in"
            style={{
              flex: 1,
              overflowY: location.pathname.includes('/conversations') ? 'hidden' : 'auto',
              background: '#f8faf8',
            }}
          >
            <Outlet />
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default AgentLayout;
