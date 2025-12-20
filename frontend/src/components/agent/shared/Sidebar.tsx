import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  CogIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  agent?: any;
  unreadCount?: number;
  isOpen?: boolean;
  open?: boolean;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
agent,
unreadCount = 0,
isOpen = true,
open = true,
collapsed = true,
onCollapseToggle,
onClose
}) => {
const sidebarOpen = open || isOpen || true;
const [isMobileOpen, setIsMobileOpen] = useState(false);
const location = useLocation();

  const baseNavigation = [
    { name: 'Dashboard', href: '/agent', icon: HomeIcon },
    { name: 'Conversations', href: '/agent/conversations', icon: ChatBubbleLeftRightIcon },
    { name: 'Customers', href: '/agent/customers', icon: UserGroupIcon },
    { name: 'Orders', href: '/agent/orders', icon: ShoppingBagIcon },
    { name: 'Invoices', href: '/agent/invoices', icon: DocumentTextIcon },
    { name: 'Inventory', href: '/agent/inventory', icon: ArchiveBoxIcon },
    { name: 'Services', href: '/agent/services', icon: BriefcaseIcon },
    { name: 'Appointments', href: '/agent/appointments', icon: CalendarIcon },
    { name: 'Templates', href: '/agent/templates', icon: DocumentDuplicateIcon },
    { name: 'Analytics', href: '/agent/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/agent/settings', icon: CogIcon },
  ];

  const navigation = baseNavigation.filter(item => {
    if (agent?.business_type === 'service') {
      return item.name !== 'Inventory';
    } else {
      return item.name !== 'Services';
    }
  });

  // Tooltips for icon-only mode
  const getTooltip = (name: string) => {
    const tooltips = {
      'Dashboard': 'Dashboard Overview',
      'Conversations': 'Manage Conversations',
      'Customers': 'Customer Directory',
      'Orders': 'Order Management',
      'Appointments': 'Manage Appointments',
      'Templates': 'WhatsApp Templates',
      'Analytics': 'Performance Analytics',
      'Settings': 'Account Settings',
      'Inventory': 'Manage Products',
      'Services': 'Manage Services'
    };
    return tooltips[name as keyof typeof tooltips] || name;
  };

  const handleNavClick = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-4 text-gray-300 hover:text-white fixed top-4 left-4 z-50 bg-gray-900/80 backdrop-blur-sm rounded-lg"
        >
          {isMobileOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transform
          bg-gradient-to-b from-gray-900/95 to-gray-800/95 shadow-2xl backdrop-blur-sm
          transition-all duration-300 ease-in-out border-r border-gray-700/30 overflow-hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:inset-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'w-16 md:w-16' : 'w-64 md:w-64'}
        `}
      >
        {/* Sidebar content */}
        <div className="flex h-full flex-col bg-gray-900/95 backdrop-blur-sm overflow-hidden">
          {/* Sidebar header */}
          <div className="flex h-16 shrink-0 items-center justify-between px-3 md:px-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-900 to-gray-800 backdrop-blur-sm">
            <div className="flex-1" />
            <div className="flex items-center space-x-2">
              <button
                onClick={onCollapseToggle}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors duration-200 md:block hidden"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <ChevronRightIcon className="h-5 w-5" />
                ) : (
                  <ChevronLeftIcon className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 md:hidden transition-colors duration-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1" />
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col overflow-y-auto py-6 overflow-x-hidden">
            <ul role="list" className="space-y-2 px-1 md:px-2">
              {navigation.map((item) => {
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
                      className={`
                        group relative flex items-center rounded-lg py-3 text-sm font-medium transition-all duration-200
                        ${collapsed ? 'justify-center px-3.5 w-16' : 'justify-start px-4 flex-1 min-w-0'}
                        ${isCurrent
                          ? 'bg-gradient-to-r from-green-500/10 to-teal-500/10 text-green-400 border border-green-500/30 shadow-lg'
                          : 'text-gray-400 hover:bg-white/10 hover:text-gray-200 hover:border-gray-600/30 border border-transparent/50'
                        }
                        ${isMobileOpen ? 'justify-start w-full px-4' : ''}
                        hover:shadow-md
                        no-underline
                        max-w-full
                      `}
                      title={getTooltip(item.name)}
                      onClick={handleNavClick}
                    >
                      <Icon
                        className={`
                          h-5 w-5 flex-shrink-0 transition-transform duration-200
                          ${collapsed ? 'mx-0.5' : 'mr-3 ml-0'}
                          ${isCurrent ? 'text-green-400 scale-110' : 'text-gray-400 group-hover:text-gray-200 group-hover:scale-110'}
                          ${isCurrent ? 'drop-shadow-sm' : ''}
                        `}
                        aria-hidden="true"
                      />
                      {/* Unread badge for Conversations */}
                      {showUnreadBadge && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold min-w-[20px]">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                      {/* Active indicator for mobile */}
                      {isCurrent && isMobileOpen && (
                        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-green-500 rounded-r-full" />
                      )}
                      {/* Collapsed state text - only visible when expanded */}
                      {!collapsed && !isMobileOpen && (
                        <span className="ml-2.5 whitespace-nowrap font-medium text-gray-200 opacity-90 min-w-0 truncate max-w-full">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/60 md:hidden backdrop-blur-md"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;