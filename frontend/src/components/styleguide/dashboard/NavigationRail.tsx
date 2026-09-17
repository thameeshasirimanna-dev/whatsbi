import React from 'react';
import {
  LayoutGrid,
  FileText,
  MessageSquare,
  User,
  Hexagon,
  Sun,
  Moon,
} from 'lucide-react';

interface NavigationRailProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDarkTheme?: boolean;
  onToggleTheme?: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeTab,
  onTabChange,
  isDarkTheme = true,
  onToggleTheme,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Hexagon },
  ];

  return (
    <aside className="w-[74px] md:w-[80px] self-stretch bg-[#16281D] rounded-[32px] py-7 px-3.5 flex flex-col items-center justify-between shrink-0 shadow-sm select-none">
      {/* Top Logo */}
      <div className="flex flex-col items-center gap-7 w-full">
        <div className="w-12 h-12 rounded-full bg-[#203628] border border-white/10 flex items-center justify-center shadow-sm cursor-pointer hover:border-[#9FE870]/40 transition-colors">
          {/* 4-dot diamond logo */}
          <div className="grid grid-cols-2 gap-1 w-4 h-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#9FE870]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9FE870]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9FE870]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9FE870]" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-4 w-full">
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={item.label}
                className={`w-12 h-12 flex items-center justify-center transition-all duration-200 cursor-pointer rounded-full ${
                  isActive
                    ? 'bg-[#9FE870] text-[#16281D] shadow-[0_4px_14px_rgba(159,232,112,0.35)]'
                    : 'text-[#8FA89B] hover:text-white hover:bg-white/5'
                }`}
              >
                <IconComp size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Theme Switcher Capsule */}
      <div className="flex flex-col items-center bg-[#0E1C13] p-1.5 rounded-full gap-1 border border-white/5">
        <button
          onClick={onToggleTheme}
          title="Light mode"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            !isDarkTheme
              ? 'bg-[#9FE870] text-[#16281D]'
              : 'text-[#8FA89B] hover:text-white'
          }`}
        >
          <Sun size={15} strokeWidth={2.2} />
        </button>

        <button
          onClick={onToggleTheme}
          title="Dark mode"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isDarkTheme
              ? 'bg-[#9FE870] text-[#16281D]'
              : 'text-[#8FA89B] hover:text-white'
          }`}
        >
          <Moon size={15} strokeWidth={2.2} />
        </button>
      </div>
    </aside>
  );
};
