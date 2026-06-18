import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Coins } from 'lucide-react';

interface Notification {
  id: number;
  customerName: string;
  customerPhone: string;
  customerId: number;
  preview: string;
  timestamp: string;
}

interface NavbarProps {
  agent: {
    name: string;
    email: string;
    agent_prefix: string;
    credits: number;
  } & {
    unreadCount: number;
    recentNotifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
  };
  onMenuClick: () => void;
  collapsed?: boolean;
}

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const formatNotificationTime = (timeStr: string) => {
  if (!timeStr) return "";
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetMidnight.getTime() === todayMidnight.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};

const Navbar: React.FC<NavbarProps> = ({ agent, onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const toggleNotifications = () => setIsNotificationOpen(v => !v);
  const closeNotifications = () => setIsNotificationOpen(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    if (segments.length < 2) return 'Dashboard';
    const s = segments[1];
    if (s === 'dashboard') return 'Dashboard';
    if (s === 'conversations') return 'Conversations';
    if (s === 'customers') return 'Customers';
    if (s === 'orders') return segments.length > 2 ? 'Order Details' : 'Orders';
    if (s === 'appointments') return 'Appointments';
    if (s === 'services') return 'Services';
    if (s === 'inventory') return 'Inventory';
    if (s === 'invoices') return 'Invoices';
    if (s === 'templates') return 'Templates';
    if (s === 'analytics') return 'Analytics';
    if (s === 'settings') return 'Settings';
    return 'Dashboard';
  };

  const getPageSubtitle = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    if (segments.length < 2) return 'Overview of your business';
    const s = segments[1];
    if (s === 'dashboard') return 'Overview of your business';
    if (s === 'conversations') return 'Manage your conversations';
    if (s === 'customers') return 'Manage your customer base and insights';
    if (s === 'orders') return segments.length > 2 ? 'Order details' : 'Manage your orders';
    if (s === 'appointments') return 'Schedule and manage appointments';
    if (s === 'services') return 'Manage your services';
    if (s === 'inventory') return 'Manage your inventory';
    if (s === 'invoices') return 'Create and send invoices';
    if (s === 'templates') return 'Manage message templates';
    if (s === 'analytics') return 'View your analytics';
    if (s === 'settings') return 'Configure your settings';
    return 'Overview of your business';
  };

  const pageTitle = getPageTitle();
  const pageSubtitle = getPageSubtitle();

  return (
    <nav
      className="px-4 md:px-6 layout-header"
      style={{
        background: '#fff',
        borderBottom: '1px solid #ebebeb',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 30,
        position: 'relative',
        transition: 'filter 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onMenuClick}
          className="md:hidden flex items-center"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            color: '#71717a',
            borderRadius: 8,
          }}
        >
          <Menu size={20} />
        </button>

        <div>
          <div style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e', lineHeight: 1.2 }}>
            {pageTitle}
          </div>
          <div className="hidden md:block" style={{ ...DM, fontSize: 12, color: '#71717a', lineHeight: 1.2, marginTop: 1 }}>
            {pageSubtitle}
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Credits */}
        <div
          className="px-2.5 py-1 md:px-3 md:py-1.5"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 9999,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
          }}
        >
          <Coins size={13} style={{ color: '#059669' }} />
          <span style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#15803d' }}>
            {agent.credits}
          </span>
        </div>

        {/* Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={toggleNotifications}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              color: '#71717a',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 8,
              position: 'relative',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Bell size={18} />
            {agent.unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                background: '#22c55e',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                borderRadius: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                border: '1.5px solid #fff',
              }}>
                {agent.unreadCount > 99 ? '99+' : agent.unreadCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <>
              <div
                className="animate-dropdown"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: 320,
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #ebebeb',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  zIndex: 50,
                  maxHeight: 380,
                  overflowY: 'auto',
                  transformOrigin: 'top right',
                }}
              >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #ebebeb' }}>
                  <div style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>Notifications</div>
                  <div style={{ ...DM, fontSize: 12, color: '#71717a', marginTop: 2 }}>
                    {agent.unreadCount} unread
                  </div>
                </div>

                {agent.recentNotifications.length > 0 ? (
                  agent.recentNotifications.map(notification => (
                    <button
                      key={notification.id}
                      onClick={() => { agent.onNotificationClick(notification); closeNotifications(); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #f4f4f5',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#f0fdf4',
                        border: '1.5px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span style={{ ...SYNE, fontSize: 11, fontWeight: 700, color: '#059669' }}>
                          {notification.customerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {notification.customerName}
                        </div>
                        <div style={{ ...DM, fontSize: 12, color: '#71717a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {notification.preview}
                        </div>
                        <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>
                          {formatNotificationTime(notification.timestamp)}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                    <Bell size={24} style={{ color: '#d4d4d8', margin: '0 auto 8px', display: 'block' }} />
                    <div style={{ ...DM, fontSize: 13, color: '#a1a1aa' }}>No new notifications</div>
                  </div>
                )}

                <div style={{ padding: '10px 16px', borderTop: '1px solid #ebebeb' }}>
                  <button
                    onClick={() => { navigate('/agent/conversations'); closeNotifications(); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      ...DM,
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#059669',
                      padding: 0,
                    }}
                  >
                    View all conversations →
                  </button>
                </div>
              </div>
              <div className="fixed inset-0 z-40" onClick={closeNotifications} />
            </>
          )}
        </div>

        {/* Avatar + name */}
        <div className="flex items-center" style={{ gap: 10 }}>
          <div className="hidden md:block" style={{ textAlign: 'right' }}>
            <div style={{ ...DM, fontSize: 13, fontWeight: 500, color: '#0c1a0e', lineHeight: 1.2 }}>
              {agent.name}
            </div>
            <div style={{ ...DM, fontSize: 11, color: '#71717a', lineHeight: 1.2 }}>
              {agent.email}
            </div>
          </div>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ ...SYNE, fontSize: 12, fontWeight: 700, color: '#059669' }}>
              {getInitials(agent.name)}
            </span>
          </div>
        </div>


      </div>
    </nav>
  );
};

export default Navbar;
