import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Layers,
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

const baseNavigation: { name: string; href: string; icon: LucideIcon }[] = [
  { name: 'Dashboard', href: '/agent/dashboard', icon: LayoutDashboard },
  { name: 'Conversations', href: '/agent/conversations', icon: MessageSquare },
  { name: 'Invoices', href: '/agent/invoices', icon: FileText },
  { name: 'Orders', href: '/agent/orders', icon: ShoppingBag },
  { name: 'Appointments', href: '/agent/appointments', icon: Calendar },
  { name: 'Services', href: '/agent/services', icon: Briefcase },
  { name: 'Inventory', href: '/agent/inventory', icon: Package },
  { name: 'Customers', href: '/agent/customers', icon: Users },
  { name: 'Customer Groups', href: '/agent/customer-groups', icon: Layers },
  { name: 'Message Marketing', href: '/agent/broadcasts', icon: Send },
  { name: 'Templates', href: '/agent/templates', icon: Files },
  { name: 'Analytics', href: '/agent/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/agent/settings', icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({
  agent,
  unreadCount = 0,
  open = false,
  isOpen = false,
  collapsed = true,
  onCollapseToggle,
  onClose,
  onLogout,
}) => {
  const location = useLocation();
  const isVisible = open || isOpen;

  const navigation = baseNavigation.filter((item) => {
    if (agent?.business_type === 'service') {
      return item.name !== 'Inventory';
    }
    return item.name !== 'Services';
  });

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'WA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isVisible && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static md:inset-auto flex flex-col shrink-0 select-none font-sans layout-sidebar transition-all duration-200 ease-in-out border-r ${
          isVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'w-[260px] md:w-[72px]' : 'w-[260px]'}`}
        style={{
          background: '#16281D',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Header: Branding & Toggle Control */}
        <div className="p-3.5 border-b border-white/10 flex items-center h-16 justify-between gap-2 overflow-hidden">
          {/* Mobile Header */}
          <div className="flex md:hidden items-center gap-2.5 min-w-0 pl-1">
            <img
              src="/logo/icon-logo-green.svg"
              alt="Biz Agentz"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[16px] font-bold text-white tracking-tight leading-none truncate">
                Biz Agentz
              </span>
              <span className="text-[10px] font-semibold text-[#8FA89B] tracking-wider uppercase mt-1 truncate">
                Agent Workspace
              </span>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between w-full">
            {collapsed ? (
              <button
                type="button"
                onClick={onCollapseToggle}
                title="Expand sidebar"
                className="w-11 h-11 rounded-xl hover:bg-white/10 active:scale-95 flex items-center justify-center cursor-pointer transition-all border-0 mx-auto group"
              >
                <img
                  src="/logo/icon-logo-green.svg"
                  alt="Biz Agentz"
                  className="w-8 h-8 object-contain group-hover:scale-105 transition-transform"
                />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2.5 min-w-0 pl-1 animate-fade-in">
                  <img
                    src="/logo/icon-logo-green.svg"
                    alt="Biz Agentz"
                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[16px] font-bold text-white tracking-tight leading-none truncate">
                      Biz Agentz
                    </span>
                    <span className="text-[10px] font-semibold text-[#8FA89B] tracking-wider uppercase mt-1 truncate">
                      Agent Workspace
                    </span>
                  </div>
                </div>

                {onCollapseToggle && (
                  <button
                    type="button"
                    onClick={onCollapseToggle}
                    title="Collapse sidebar"
                    className="w-8 h-8 rounded-full bg-[#203628] hover:bg-[#274232] active:scale-95 border border-white/10 text-[#8FA89B] hover:text-[#9FE870] flex items-center justify-center cursor-pointer transition-all shrink-0"
                  >
                    <ChevronLeft size={16} strokeWidth={2.4} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="md:hidden w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#8FA89B] hover:text-white flex items-center justify-center border border-white/10 cursor-pointer transition-colors shrink-0 ml-auto"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Link List */}
        <nav className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isCurrent =
              item.name === 'Dashboard'
                ? location.pathname === '/agent' ||
                  location.pathname === '/agent/' ||
                  location.pathname === '/agent/dashboard' ||
                  location.pathname.startsWith('/agent/dashboard')
                : location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            const isConversations = item.name === 'Conversations';
            const showUnreadBadge = isConversations && unreadCount > 0;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleNavClick}
                title={collapsed ? item.name : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl md:rounded-full border-0 no-underline cursor-pointer transition-all group ${
                  collapsed ? 'md:justify-center md:px-0 justify-between' : 'justify-between'
                } ${
                  isCurrent
                    ? 'bg-[#203628] text-white shadow-xs border border-white/5'
                    : 'bg-transparent text-[#8FA89B] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Active Page Icon */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 relative ${
                      isCurrent
                        ? 'bg-[#9FE870] text-[#16281D] shadow-[0_2px_8px_rgba(159,232,112,0.35)] font-bold'
                        : 'bg-transparent text-[#8FA89B] group-hover:text-white group-hover:scale-105'
                    }`}
                  >
                    <Icon size={16} strokeWidth={isCurrent ? 2.6 : 2} />
                    {showUnreadBadge && (
                      <span
                        className={`absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold font-mono flex items-center justify-center leading-none z-10 shadow-xs pointer-events-none transition-all ${
                          isCurrent
                            ? 'bg-[#16281D] text-[#9FE870] ring-2 ring-[#203628]'
                            : 'bg-[#9FE870] text-[#16281D] ring-2 ring-[#16281D]'
                        }`}
                        title={`${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Navigation text label */}
                  <span
                    className={`text-xs tracking-wide truncate ${
                      collapsed ? 'block md:hidden' : 'block'
                    } ${
                      isCurrent
                        ? 'font-bold text-white'
                        : 'font-medium text-[#8FA89B] group-hover:text-white'
                    }`}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Trailing Active Glow Dot */}
                {isCurrent && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-[#9FE870] shadow-[0_0_8px_#9FE870] shrink-0 mr-1 ${
                      collapsed ? 'block md:hidden' : 'block'
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: User Profile & Logout */}
        <div className="p-3 border-t border-white/10 bg-[#122218] overflow-hidden">
          {agent && (
            <>
              {/* Full profile card on mobile or when expanded */}
              <div
                className={`p-2.5 rounded-2xl bg-[#203628] border border-white/5 items-center gap-2.5 mb-2.5 ${
                  collapsed ? 'flex md:hidden' : 'flex'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#16281D] border border-[#9FE870]/40 text-[#9FE870] flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials(agent.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {agent.name || 'Agent'}
                    </span>
                    {agent.agent_prefix && (
                      <span className="text-[9px] font-bold text-[#9FE870] bg-[#16281D] border border-[#9FE870]/30 px-1.5 py-0.5 rounded-full tracking-wide">
                        {agent.agent_prefix}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#8FA89B] truncate block">
                    {agent.role || 'Agent Workspace'}
                  </span>
                </div>
              </div>

              {/* Avatar-only button on desktop when collapsed */}
              {collapsed && (
                <div
                  className="hidden md:flex w-9 h-9 mx-auto rounded-full bg-[#203628] border border-white/10 text-[#9FE870] items-center justify-center text-xs font-bold mb-2.5 cursor-default shrink-0"
                  title={agent.name ? `${agent.name} (${agent.agent_prefix || 'Agent'})` : 'Agent Workspace'}
                >
                  {getInitials(agent.name)}
                </div>
              )}
            </>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-semibold text-[#F87171] hover:bg-[#F87171]/10 border border-transparent hover:border-[#F87171]/20 transition-all cursor-pointer ${
              collapsed ? 'px-3 md:px-0' : 'px-3'
            }`}
          >
            <LogOut size={15} strokeWidth={2.2} />
            <span className={collapsed ? 'block md:hidden' : 'block'}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

