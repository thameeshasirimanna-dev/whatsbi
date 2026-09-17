import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  Zap,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Analytics, Agent } from './admin.types';
import { DashboardHero, DashboardRecentAgents, FilterStatus } from './dashboard';

export interface AnalyticsWidgetsProps {
  analytics: Analytics;
  activeWhatsAppCount: number;
  agents?: Agent[];
  userName?: string;
  isAnalyticsTab?: boolean;
  onNavigate?: (tab: string) => void;
  onAddAgent?: () => void;
  onTopUp?: (agent: Agent) => void;
  onConfigureWhatsApp?: (agent: Agent) => void;
  onEditAgent?: (agent: Agent) => void;
  onRefresh?: () => void;
}

export const AnalyticsWidgets: React.FC<AnalyticsWidgetsProps> = ({
  analytics,
  activeWhatsAppCount,
  agents = [],
  userName,
  isAnalyticsTab = false,
  onNavigate,
  onAddAgent,
  onTopUp,
  onConfigureWhatsApp,
  onEditAgent,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activePercent =
    analytics.total_agents > 0
      ? Math.round((activeWhatsAppCount / analytics.total_agents) * 100)
      : 0;

  const lowBalanceCount = agents.filter(
    (a) => (parseFloat(String(a.ai_balance ?? '0')) || 0) < 2.0
  ).length;

  const needsSetupCount = agents.filter(
    (a) => !a.whatsapp_config || !a.whatsapp_config.is_active
  ).length;

  const handleRefreshClick = () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      onRefresh();
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const statCards = [
    {
      id: 'agents',
      label: 'Total Agents',
      value: analytics.total_agents,
      subtitle: 'Registered tenant accounts',
      badge: `${agents.length} provisioned`,
      Icon: Users,
      targetTab: 'agents',
      actionLabel: 'Manage fleet',
    },
    {
      id: 'messages',
      label: 'Total Messages',
      value: analytics.total_messages.toLocaleString(),
      subtitle: 'Inbound & AI conversations',
      badge: 'Live fleet total',
      Icon: MessageSquare,
      targetTab: 'analytics',
      actionLabel: 'View telemetry',
    },
    {
      id: 'whatsapp',
      label: 'Active WhatsApp',
      value: `${activeWhatsAppCount} / ${analytics.total_agents || agents.length}`,
      subtitle: `${activePercent}% fleet connectivity`,
      badge: activeWhatsAppCount > 0 ? 'Routing live' : 'Offline',
      Icon: Zap,
      targetTab: 'whatsapp',
      actionLabel: 'Fleet setup',
    },
    {
      id: 'uptime',
      label: 'Core Engine Uptime',
      value: '99.9%',
      subtitle: 'High availability runtime',
      badge: 'Healthy',
      Icon: Activity,
      targetTab: 'settings',
      actionLabel: 'System settings',
    },
  ];

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Search Bar, Hero Banner & Quick Actions Toolbar */}
      <DashboardHero
        userName={userName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isRefreshing={isRefreshing}
        onRefreshClick={handleRefreshClick}
        onAddAgent={onAddAgent}
        onNavigate={onNavigate}
        lowBalanceCount={lowBalanceCount}
        isAnalyticsTab={isAnalyticsTab}
      />

      {/* 4-Card Interactive Telemetry Grid (2 Columns on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((c) => {
          const IconComp = c.Icon;
          return (
            <div
              key={c.id}
              onClick={() => onNavigate?.(c.targetTab)}
              className="bg-white rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-5 md:p-6 border border-[#EAEAEA] shadow-sm hover:border-[#9FE870] hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-4 group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider truncate">
                  {c.label}
                </span>
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
                  <IconComp size={15} strokeWidth={2.4} />
                </div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1">
                  {c.value}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mt-1.5 sm:mt-2">
                  <span className="text-[11px] sm:text-xs text-[#8FA89B] font-medium truncate">
                    {c.subtitle}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold bg-[#F4F7F4] text-[#16281D] px-1.5 sm:px-2 py-0.5 rounded-full border border-black/5 shrink-0 self-start sm:self-auto">
                    {c.badge}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F4F4F5] flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#059669] group-hover:text-[#047857]">
                <span className="truncate">{c.actionLabel}</span>
                <ArrowRight size={13} strokeWidth={2.4} className="group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Fleet Snapshot Table & Workflows */}
      <DashboardRecentAgents
        agents={agents}
        activeWhatsAppCount={activeWhatsAppCount}
        lowBalanceCount={lowBalanceCount}
        needsSetupCount={needsSetupCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onNavigate={onNavigate}
        onTopUp={onTopUp}
        onConfigureWhatsApp={onConfigureWhatsApp}
        onEditAgent={onEditAgent}
      />
    </div>
  );
};
