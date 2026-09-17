import React from 'react';
import { Clock, MessageSquare, ShoppingBag, Users, Search } from 'lucide-react';
import { RecentActivity } from './dashboard.types';

const formatRelativeTime = (timeStr: string) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((todayMidnight.getTime() - targetMidnight.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }
};

const getStatusBadge = (status: RecentActivity['status']) => {
  switch (status) {
    case 'completed':
    case 'active':
      return {
        className: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
        dotColor: 'bg-[#22C55E]',
      };
    case 'new':
      return {
        className: 'bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD]',
        dotColor: 'bg-[#38BDF8]',
      };
    case 'pending':
      return {
        className: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]',
        dotColor: 'bg-[#F59E0B]',
      };
    default:
      return {
        className: 'bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]',
        dotColor: 'bg-[#71717A]',
      };
  }
};

const getActivityVisuals = (type: RecentActivity['type']): { bg: string; color: string; Icon: typeof MessageSquare } => {
  switch (type) {
    case 'conversation':
      return { bg: 'bg-[#ECFDF5] border border-[#A7F3D0]', color: 'text-[#059669]', Icon: MessageSquare };
    case 'order':
      return { bg: 'bg-[#F0F9FF] border border-[#BAE6FD]', color: 'text-[#0284C7]', Icon: ShoppingBag };
    case 'customer':
      return { bg: 'bg-[#F0FDF4] border border-[#BBF7D0]', color: 'text-[#16A34A]', Icon: Users };
    default:
      return { bg: 'bg-[#F4F7F4] border border-[#EAEAEA]', color: 'text-[#52525B]', Icon: MessageSquare };
  }
};

interface DashboardRecentActivityProps {
  recentActivity: RecentActivity[];
}

export const DashboardRecentActivity: React.FC<DashboardRecentActivityProps> = ({
  recentActivity,
}) => {
  return (
    <div
      className="lg:col-span-2 bg-white rounded-[24px] border border-[#EAEAEA] shadow-sm overflow-hidden flex flex-col font-sans select-none"
    >
      {/* Card Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#EAEAEA] bg-[#F8FAF8] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
            <Clock size={16} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-sm font-bold text-[#16281D] leading-tight">
              Recent Activity
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#71717A] leading-tight mt-0.5 font-medium">
              Live customer events & interaction history
            </div>
          </div>
        </div>

        <span className="text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full bg-[#F4F4F5] text-[#52525B] border border-black/5">
          {recentActivity.length} events
        </span>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-[#F4F4F5]">
        {recentActivity.map((activity, index) => {
          const { bg, color, Icon } = getActivityVisuals(activity.type);
          const badge = getStatusBadge(activity.status);

          return (
            <div
              key={activity.id}
              className="p-3.5 sm:p-4 sm:px-5 hover:bg-[#F4F7F4]/60 transition-colors flex items-start gap-3.5 group cursor-default"
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl ${bg} ${color} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
              >
                <Icon size={16} strokeWidth={2.2} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[13px] font-bold text-[#16281D] truncate group-hover:text-[#059669] transition-colors">
                    {activity.title}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${badge.className}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                    {activity.status}
                  </span>
                </div>

                <div className="text-xs text-[#52525B] truncate mt-0.5">
                  {activity.description}
                </div>

                <div className="text-[10px] text-[#A1A1AA] mt-1 font-medium">
                  {formatRelativeTime(activity.time)}
                </div>
              </div>
            </div>
          );
        })}

        {recentActivity.length === 0 && (
          <div className="py-12 px-4 text-center">
            <div className="w-11 h-11 rounded-full bg-[#F4F7F4] flex items-center justify-center mx-auto mb-2 text-[#A1A1AA]">
              <Search size={20} strokeWidth={2} />
            </div>
            <div className="text-sm font-bold text-[#16281D]">No recent activity</div>
            <div className="text-xs text-[#71717A] mt-1 max-w-xs mx-auto">
              Real-time events will automatically log here as customers message and interact
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

