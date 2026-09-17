import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Plus,
  Coins,
  MessageSquare,
  Activity,
  Settings,
  Search,
  RefreshCw,
  X,
} from 'lucide-react';
import { AdminPageBanner } from '../AdminPageBanner';

interface DashboardHeroProps {
  userName?: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isRefreshing: boolean;
  onRefreshClick: () => void;
  onAddAgent?: () => void;
  onNavigate?: (tab: string) => void;
  lowBalanceCount: number;
  isAnalyticsTab?: boolean;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  userName,
  searchQuery,
  setSearchQuery,
  isRefreshing,
  onRefreshClick,
  onAddAgent,
  onNavigate,
  lowBalanceCount,
  isAnalyticsTab = false,
}) => {
  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Top Global Search & Primary Action Bar */}
      <div className="w-full bg-white rounded-full p-1.5 pl-4 sm:pl-5 pr-2 border border-[#EAEAEA] shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Search size={17} className="text-[#8FA89B] shrink-0" />
          <input
            type="text"
            placeholder="Search agents by name, email, or prefix..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-0 outline-none text-xs sm:text-sm text-[#16281D] placeholder-[#8FA89B] w-full font-sans font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-[#8FA89B] hover:text-[#16281D] cursor-pointer border-0 bg-transparent"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefreshClick}
            disabled={isRefreshing}
            title="Refresh telemetry"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#52525B] hover:text-[#16281D] hover:bg-[#F4F7F4] active:scale-95 transition-all cursor-pointer border-0 bg-transparent disabled:opacity-50"
            aria-label="Refresh telemetry"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {onAddAgent && (
            <button
              onClick={onAddAgent}
              className="inline-flex items-center gap-1.5 bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2 px-4 sm:px-5 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all"
            >
              <Plus size={14} strokeWidth={2.6} />
              <span className="hidden sm:inline">Register</span> New Agent
            </button>
          )}
        </div>
      </div>

      {/* Unified Template Hero Banner */}
      <AdminPageBanner
        category={isAnalyticsTab ? "Telemetry & Analytics" : "Platform Control Center"}
        title={
          isAnalyticsTab
            ? "Fleet Conversation & API Telemetry"
            : userName
            ? `Welcome back, ${userName}!`
            : 'Operational Fleet Center'
        }
        subtitle={
          isAnalyticsTab
            ? "Real-time metrics on message throughput, DeepSeek AI usage, fleet connectivity, and platform uptime."
            : "Multi-tenant WhatsApp Cloud API fleet telemetry, DeepSeek V3 AI credit routing, and real-time infrastructure controls."
        }
        Icon={isAnalyticsTab ? Activity : ShieldCheck}
        statusBadge="All Systems Operational • 99.9% HA"
      />

      {/* Quick Navigation Capsule Toolbar */}
      {onNavigate && (
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap -mx-1 px-1">
          <button
            onClick={() => onNavigate('topups')}
            className="inline-flex items-center gap-2 bg-white hover:bg-[#F4F7F4] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full border border-[#EAEAEA] shadow-sm cursor-pointer transition-all whitespace-nowrap shrink-0"
          >
            <Coins size={14} strokeWidth={2.2} className="text-[#059669]" />
            <span>Balances & Top Ups</span>
            {lowBalanceCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
                {lowBalanceCount} low
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('whatsapp')}
            className="inline-flex items-center gap-2 bg-white hover:bg-[#F4F7F4] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full border border-[#EAEAEA] shadow-sm cursor-pointer transition-all whitespace-nowrap shrink-0"
          >
            <MessageSquare size={14} strokeWidth={2.2} className="text-[#0284C7]" />
            <span>WhatsApp Fleet Setup</span>
          </button>

          <button
            onClick={() => onNavigate('analytics')}
            className="inline-flex items-center gap-2 bg-white hover:bg-[#F4F7F4] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full border border-[#EAEAEA] shadow-sm cursor-pointer transition-all whitespace-nowrap shrink-0"
          >
            <Activity size={14} strokeWidth={2.2} className="text-[#7C3AED]" />
            <span>Telemetry Analytics</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="inline-flex items-center gap-2 bg-white hover:bg-[#F4F7F4] active:scale-[0.98] text-[#52525B] hover:text-[#16281D] font-bold text-xs py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full border border-[#EAEAEA] shadow-sm cursor-pointer transition-all whitespace-nowrap shrink-0"
          >
            <Settings size={14} strokeWidth={2.2} />
            <span>Maintenance Settings</span>
          </button>
        </div>
      )}
    </div>
  );
};
