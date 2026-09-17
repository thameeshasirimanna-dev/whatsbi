import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Coins,
  Sparkles,
  ChevronRight,
  Search,
} from 'lucide-react';
import HeaderCommandPalette from './HeaderCommandPalette';
import HeaderNotificationPopover, { NotificationItem } from './HeaderNotificationPopover';
import HeaderProfilePopover from './HeaderProfilePopover';

interface NavbarProps {
  agent: {
    name: string;
    email: string;
    agent_prefix: string;
    credits: number;
    ai_balance?: number;
  } & {
    unreadCount: number;
    recentNotifications: NotificationItem[];
    onNotificationClick: (notification: NotificationItem) => void;
  };
  onMenuClick: () => void;
  collapsed?: boolean;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ agent, onMenuClick, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Global keyboard shortcut for Command Palette (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    if (s === 'broadcasts') return 'Broadcasts';
    if (s === 'analytics') return 'Analytics';
    if (s === 'settings') return 'Settings';
    return 'Dashboard';
  };

  const pageTitle = getPageTitle();

  const aiBalance =
    typeof agent.ai_balance === 'number'
      ? agent.ai_balance
      : parseFloat(String(agent.ai_balance ?? '4.00')) || 0;

  const templateCredits =
    typeof agent.credits === 'number'
      ? agent.credits
      : parseFloat(String(agent.credits ?? '0.00')) || 0;

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#EAEAEA] shadow-[0_1px_4px_rgba(20,40,24,0.03)] px-2.5 sm:px-3.5 md:px-4 lg:px-5 flex items-center justify-between shrink-0 layout-header select-none">
        {/* Left: Mobile hamburger toggle & Micro Breadcrumbs */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#16281D] flex items-center justify-center transition-all border-0 cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu size={17} strokeWidth={2.4} />
          </button>

          <div className="min-w-0 flex flex-col justify-center">
            {/* Breadcrumb line with Live Routing Pill */}
            <div className="hidden sm:flex items-center gap-2 text-[10px] sm:text-[11px] font-semibold text-[#8FA89B] leading-none mb-1">
              <span>Workspace</span>
              <ChevronRight size={10} className="text-[#A1A1AA]" />
              <span className="text-[#059669] font-bold truncate max-w-[120px] sm:max-w-none">
                {pageTitle}
              </span>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[9px] font-bold text-[#15803D] ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span>Live</span>
              </div>
            </div>

            {/* Main Header Heading */}
            <h1 className="text-sm sm:text-[15px] md:text-base font-extrabold text-[#16281D] tracking-tight leading-none truncate m-0 font-sans">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Center: Quick Search Trigger Pill (Large Viewports: lg+) */}
        <div className="hidden lg:flex items-center justify-center flex-1 max-w-sm mx-4 xl:mx-6">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] border border-[#EAEAEA] hover:border-[#D4D4D8] text-[#71717A] hover:text-[#16281D] transition-all cursor-pointer text-xs group"
            title="Search workspace, customer chats, actions (⌘K / Ctrl+K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search size={13} className="text-[#8FA89B] group-hover:text-[#16281D] transition-colors shrink-0" strokeWidth={2.2} />
              <span className="text-[12px] font-medium truncate">Search workspace, chats, actions...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#EAEAEA] text-[10px] font-mono text-[#71717A] shadow-2xs shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Search trigger (mobile), Balances, Notifications & Agent Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobile & Tablet Compact Search Trigger Button */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#52525B] hover:text-[#16281D] flex items-center justify-center transition-all border-0 cursor-pointer"
            aria-label="Open quick search"
            title="Quick search (⌘K)"
          >
            <Search size={15} strokeWidth={2.2} />
          </button>

          {/* Interactive AI Query Liquidity Pill */}
          <button
            type="button"
            onClick={() => navigate('/agent/settings')}
            className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#F0FDF4] hover:bg-[#DCFCE7] active:scale-95 border border-[#BBF7D0] hover:border-[#86EFAC] flex items-center gap-1.5 shadow-xs cursor-pointer transition-all group"
            title="AI Assistant Liquidity — Click to manage in Settings"
          >
            <Sparkles size={13} className="text-[#15803D] shrink-0 group-hover:scale-110 transition-transform" strokeWidth={2.4} />
            <span className="text-xs sm:text-[13px] font-bold text-[#15803D] font-mono tracking-tight leading-none">
              ${aiBalance.toFixed(2)}
            </span>
            <span className="hidden sm:inline text-[9px] font-bold text-[#166534] tracking-wider uppercase">
              AI
            </span>
          </button>

          {/* Interactive WhatsApp Template Credits Pill */}
          <button
            type="button"
            onClick={() => navigate('/agent/templates')}
            className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 border border-[#EAEAEA] hover:border-[#D4D4D8] flex items-center gap-1.5 shadow-xs cursor-pointer transition-all group"
            title="WhatsApp Template Credits — Click to view Templates"
          >
            <Coins size={13} className="text-[#16281D] shrink-0 group-hover:scale-110 transition-transform" strokeWidth={2.2} />
            <span className="text-xs sm:text-[13px] font-bold text-[#16281D] font-mono tracking-tight leading-none">
              {templateCredits.toFixed(2)}
            </span>
            <span className="hidden sm:inline text-[9px] font-bold text-[#71717A] tracking-wider uppercase">
              Credits
            </span>
          </button>

          {/* Notification Bell Dropdown Component */}
          <HeaderNotificationPopover
            unreadCount={agent.unreadCount}
            recentNotifications={agent.recentNotifications}
            onNotificationClick={agent.onNotificationClick}
            isOpen={isNotificationOpen}
            onToggle={() => {
              setIsNotificationOpen(prev => !prev);
              setIsProfileOpen(false);
            }}
            onClose={() => setIsNotificationOpen(false)}
          />

          {/* Separator Divider */}
          <div className="w-px h-6 bg-[#EAEAEA] mx-0.5 hidden sm:block" />

          {/* Agent Profile Dropdown Component */}
          <HeaderProfilePopover
            agent={{
              name: agent.name,
              email: agent.email,
              agent_prefix: agent.agent_prefix,
            }}
            isOpen={isProfileOpen}
            onToggle={() => {
              setIsProfileOpen(prev => !prev);
              setIsNotificationOpen(false);
            }}
            onClose={() => setIsProfileOpen(false)}
            onLogout={onLogout}
          />
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <HeaderCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  );
};

export default Navbar;
