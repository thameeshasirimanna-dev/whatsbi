import React from 'react';
import {
  LayoutDashboard,
  Users,
  Coins,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { User } from './admin.types';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  customUser: User | null;
  onLogout: () => void;
}

export const navLinks = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'agents', label: 'Agents', Icon: Users },
  { id: 'topups', label: 'Top Ups', Icon: Coins },
  { id: 'whatsapp', label: 'WhatsApp Config', Icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  collapsed = true,
  onCollapseToggle,
  customUser,
  onLogout,
}) => {
  return (
    <>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar aside panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static md:inset-auto flex flex-col shrink-0 select-none font-sans transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'w-[280px] md:w-[72px]' : 'w-[280px]'}`}
        style={{
          background: '#16281D',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Top Header: Toggle Button & Branding */}
        <div className="p-3.5 border-b border-white/10 flex items-center h-16 justify-between gap-2 overflow-hidden">
          {/* Mobile Header: Always visible on mobile drawer */}
          <div className="flex md:hidden items-center gap-2.5 min-w-0 pl-1">
            <div className="w-8 h-8 rounded-full bg-[#203628] border border-white/10 flex items-center justify-center text-[#9FE870] font-bold text-xs shrink-0">
              W
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-bold text-white tracking-tight leading-none truncate">
                WhatsBi
              </span>
              <span className="text-[10px] font-semibold text-[#8FA89B] tracking-wider uppercase mt-1 truncate">
                Super Admin
              </span>
            </div>
          </div>

          {/* Desktop Header: Respects desktop collapsed toggle */}
          <div className="hidden md:flex items-center justify-between w-full">
            {collapsed ? (
              <button
                type="button"
                onClick={onCollapseToggle}
                title="Expand sidebar"
                className="w-10 h-10 rounded-full bg-[#203628] hover:bg-[#274232] active:scale-95 border border-white/10 flex items-center justify-center text-[#9FE870] hover:text-white cursor-pointer transition-all shadow-xs border-0 mx-auto"
              >
                <ChevronRight size={18} strokeWidth={2.6} />
              </button>
            ) : (
              <>
                <div className="flex flex-col min-w-0 animate-in fade-in duration-200 pl-1">
                  <span className="text-[15px] font-bold text-white tracking-tight leading-none truncate">
                    WhatsBi
                  </span>
                  <span className="text-[10px] font-semibold text-[#8FA89B] tracking-wider uppercase mt-1 truncate">
                    Super Admin
                  </span>
                </div>

                {onCollapseToggle && (
                  <button
                    type="button"
                    onClick={onCollapseToggle}
                    title="Collapse sidebar"
                    className="w-8 h-8 rounded-full bg-[#203628] hover:bg-[#274232] active:scale-95 border border-white/10 text-[#8FA89B] hover:text-[#9FE870] items-center justify-center cursor-pointer transition-all shrink-0 border-0"
                  >
                    <ChevronLeft size={16} strokeWidth={2.4} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#8FA89B] hover:text-white flex items-center justify-center border-0 cursor-pointer transition-colors shrink-0 ml-auto"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">
          {navLinks.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setSidebarOpen(false);
                }}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl md:rounded-full border-0 cursor-pointer transition-all group ${
                  collapsed ? 'md:justify-center md:px-0 justify-between' : 'justify-between'
                } ${
                  isActive
                    ? 'bg-[#203628] text-white shadow-xs border border-white/5'
                    : 'bg-transparent text-[#8FA89B] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Active Page Icon: Fully Rounded with Vibrant Lime */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isActive
                        ? 'bg-[#9FE870] text-[#16281D] shadow-[0_2px_8px_rgba(159,232,112,0.35)] font-bold'
                        : 'bg-transparent text-[#8FA89B] group-hover:text-white group-hover:scale-105'
                    }`}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.6 : 2} />
                  </div>

                  {/* Navigation Text Label: Always visible on mobile, conditional on desktop */}
                  <span
                    className={`text-xs truncate tracking-wide ${
                      collapsed ? 'block md:hidden' : 'block'
                    } ${
                      isActive
                        ? 'font-bold text-white'
                        : 'font-medium text-[#8FA89B] group-hover:text-white'
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {/* Trailing Active Glow Dot (Always on mobile if active, on desktop when expanded) */}
                {isActive && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-[#9FE870] shadow-[0_0_8px_#9FE870] shrink-0 mr-1 ${
                      collapsed ? 'block md:hidden' : 'block'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="p-3 border-t border-white/10 bg-[#122218] overflow-hidden">
          {customUser && (
            <>
              {/* Full profile card on mobile or when expanded on desktop */}
              <div
                className={`p-2.5 rounded-2xl bg-[#203628] border border-white/5 items-center gap-2.5 mb-2.5 ${
                  collapsed ? 'flex md:hidden' : 'flex'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#16281D] border border-[#9FE870]/40 text-[#9FE870] flex items-center justify-center text-xs font-bold shrink-0">
                  {customUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {customUser.name}
                    </span>
                    <span className="text-[9px] font-bold text-[#9FE870] bg-[#16281D] border border-[#9FE870]/30 px-1.5 py-0.5 rounded-full tracking-wide">
                      ADMIN
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8FA89B] truncate block">
                    {customUser.email}
                  </span>
                </div>
              </div>

              {/* Avatar-only button on desktop when collapsed */}
              {collapsed && (
                <div
                  className="hidden md:flex w-9 h-9 mx-auto rounded-full bg-[#203628] border border-white/10 text-[#9FE870] items-center justify-center text-xs font-bold mb-2.5 cursor-default shrink-0"
                  title={`${customUser.name} (${customUser.email})`}
                >
                  {customUser.name.charAt(0).toUpperCase()}
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-semibold text-[#F87171] hover:bg-[#F87171]/10 border border-transparent hover:border-[#F87171]/20 transition-all cursor-pointer ${
              collapsed ? 'px-3 md:px-0' : 'px-3'
            }`}
          >
            <LogOut size={14} strokeWidth={2.2} />
            <span className={collapsed ? 'block md:hidden' : 'block'}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
