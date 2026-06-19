import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  ShoppingBag,
  BarChart3,
  Settings,
  FileText,
  Files,
  Package,
  Calendar,
  X,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  LogOut,
  Send,
  type LucideIcon,
} from 'lucide-react';

interface SidebarProps {
  agent?: any;
  unreadCount?: number;
  isOpen?: boolean;
  open?: boolean;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  onClose?: () => void;
  onLogout?: () => void;
}

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const Sidebar: React.FC<SidebarProps> = ({
  agent,
  unreadCount = 0,
  open = false,
  collapsed = true,
  onCollapseToggle,
  onClose,
  onLogout,
}) => {
  const location = useLocation();

  const baseNavigation: { name: string; href: string; icon: LucideIcon }[] = [
    { name: 'Dashboard', href: '/agent', icon: LayoutDashboard },
    { name: 'Conversations', href: '/agent/conversations', icon: MessageSquare },
    { name: 'Customers', href: '/agent/customers', icon: Users },
    { name: 'Orders', href: '/agent/orders', icon: ShoppingBag },
    { name: 'Invoices', href: '/agent/invoices', icon: FileText },
    { name: 'Inventory', href: '/agent/inventory', icon: Package },
    { name: 'Services', href: '/agent/services', icon: Briefcase },
    { name: 'Appointments', href: '/agent/appointments', icon: Calendar },
    { name: 'Templates', href: '/agent/templates', icon: Files },
    { name: 'Broadcasts', href: '/agent/broadcasts', icon: Send },
    { name: 'Analytics', href: '/agent/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/agent/settings', icon: Settings },
  ];

  const navigation = baseNavigation.filter(item => {
    if (agent?.business_type === 'service') {
      return item.name !== 'Inventory';
    } else {
      return item.name !== 'Services';
    }
  });

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const isVisible = open;

  const getInitials = (name: string) => {
    if (!name) return 'WA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-50 md:static md:inset-auto flex flex-col layout-sidebar ${isVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${collapsed ? 'w-[220px] md:w-[64px]' : 'w-[220px]'}`}
        style={{
          background: '#0c1a0e',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          transition: 'width 0.3s cubic-bezier(0.25, 1, 0.5, 1), transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), filter 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          gap: 10,
          overflow: 'hidden',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            flexShrink: 0,
            background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
            </svg>
          </div>

          <span
            style={{ ...SYNE, fontWeight: 700, fontSize: 16, color: '#fff', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}
            className={collapsed ? 'block md:hidden' : 'block'}
          >
            WhatsBi
          </span>

          {!collapsed && (
            <button
              onClick={onCollapseToggle}
              className="hidden md:flex"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 6,
                flexShrink: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >
              <ChevronLeft size={15} />
            </button>
          )}

          <button
            onClick={onClose}
            className="md:hidden"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 6,
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 8px' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navigation.map(item => {
              const Icon = item.icon;
              const isCurrent = item.name === 'Dashboard'
                ? location.pathname === item.href
                : location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              const isConversations = item.name === 'Conversations';
              const showUnreadBadge = isConversations && unreadCount > 0;

              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={handleNavClick}
                    title={collapsed ? item.name : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 10,
                      textDecoration: 'none',
                      position: 'relative',
                      background: isCurrent ? 'rgba(34,197,94,0.12)' : 'transparent',
                      transition: 'background 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                    }}
                    className={`${collapsed ? 'justify-start md:justify-center gap-[10px] md:gap-0 p-[9px_12px] md:p-[10px_0]' : 'justify-start gap-[10px] p-[9px_12px]'} ${!isCurrent ? 'hover:bg-white/[0.05]' : ''}`}
                  >
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: isCurrent ? 18 : 0,
                      opacity: isCurrent ? 1 : 0,
                      background: '#4ade80',
                      borderRadius: '0 3px 3px 0',
                      transition: 'height 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                    }} />

                    <Icon
                      size={17}
                      style={{ color: isCurrent ? '#4ade80' : 'rgba(255,255,255,0.28)', flexShrink: 0 }}
                    />

                    <span
                      style={{
                        ...DM,
                        fontSize: 13.5,
                        fontWeight: isCurrent ? 600 : 400,
                        color: isCurrent ? '#fff' : 'rgba(255,255,255,0.42)',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                      className={collapsed ? 'block md:hidden' : 'block'}
                    >
                      {item.name}
                    </span>

                    {showUnreadBadge && (
                      <span
                        className={collapsed ? 'flex md:hidden' : 'flex'}
                        style={{
                          background: '#22c55e',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 9999,
                          minWidth: 18,
                          height: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 5px',
                          flexShrink: 0,
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}

                    {collapsed && showUnreadBadge && (
                      <span
                        className="hidden md:block"
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#22c55e',
                        }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {agent?.name && (
            <>
              {collapsed && (
                <div
                  title={agent.name}
                  className="hidden md:flex"
                  style={{
                    justifyContent: 'center',
                    padding: '4px 0',
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ ...SYNE, fontSize: 10, fontWeight: 700, color: '#4ade80' }}>
                      {getInitials(agent.name)}
                    </span>
                  </div>
                </div>
              )}

              <div
                className={collapsed ? "flex md:hidden" : "flex"}
                style={{
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ ...SYNE, fontSize: 10, fontWeight: 700, color: '#4ade80' }}>
                    {getInitials(agent.name)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...DM, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {agent.name}
                  </div>
                  <div style={{ ...DM, fontSize: 10, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {agent.role || 'Agent'}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              width: '100%',
              color: 'rgba(244, 63, 94, 0.7)',
              transition: 'background 0.15s, color 0.15s',
            }}
            className={collapsed ? "justify-start md:justify-center p-[9px_12px] md:p-[10px_0] gap-[10px] md:gap-0" : "justify-start p-[9px_12px] gap-[10px]"}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.12)';
              e.currentTarget.style.color = '#f43f5e';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(244, 63, 94, 0.7)';
            }}
          >
            <LogOut size={17} style={{ flexShrink: 0 }} />
            <span
              style={{
                ...DM,
                fontSize: 13.5,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
              className={collapsed ? "block md:hidden" : "block"}
            >
              Logout
            </span>
          </button>

          {collapsed && (
            <button
              onClick={onCollapseToggle}
              className="hidden md:flex w-full items-center justify-center"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 0',
                color: 'rgba(255,255,255,0.3)',
                borderRadius: 8,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {isVisible && (
        <div
          className="fixed inset-0 z-40 md:hidden animate-backdrop"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
