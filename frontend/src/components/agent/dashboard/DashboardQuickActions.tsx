import React from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  MessageSquare,
  Users,
  ShoppingBag,
  BarChart3,
  Settings,
  ChevronRight,
} from 'lucide-react';

export const DashboardQuickActions: React.FC = () => {
  const quickActions = [
    {
      Icon: MessageSquare,
      title: 'Start New Conversation',
      description: 'Open customer chat',
      href: '/agent/conversations',
      iconColor: 'text-[#059669]',
      iconBg: 'bg-[#ECFDF5] border border-[#A7F3D0]',
    },
    {
      Icon: Users,
      title: 'Customer Directory',
      description: 'Access contact records',
      href: '/agent/customers',
      iconColor: 'text-[#16A34A]',
      iconBg: 'bg-[#F0FDF4] border border-[#BBF7D0]',
    },
    {
      Icon: ShoppingBag,
      title: 'Create Order',
      description: 'Process catalog order',
      href: '/agent/orders',
      iconColor: 'text-[#0284C7]',
      iconBg: 'bg-[#F0F9FF] border border-[#BAE6FD]',
    },
    {
      Icon: BarChart3,
      title: 'Telemetry & Analytics',
      description: 'View delivery telemetry',
      href: '/agent/analytics',
      iconColor: 'text-[#16281D]',
      iconBg: 'bg-[#F4F7F4] border border-[#EAEAEA]',
    },
    {
      Icon: Settings,
      title: 'Workspace Settings',
      description: 'Configure preferences',
      href: '/agent/settings',
      iconColor: 'text-[#52525B]',
      iconBg: 'bg-[#F4F7F4] border border-[#EAEAEA]',
    },
  ];

  return (
    <div
      className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-sm overflow-hidden flex flex-col font-sans select-none"
    >
      {/* Card Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#EAEAEA] bg-[#F8FAF8] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#9FE870] text-[#16281D] flex items-center justify-center shrink-0 shadow-xs">
            <Plus size={16} strokeWidth={2.8} />
          </div>
          <div>
            <div className="text-sm font-bold text-[#16281D] leading-tight">
              Quick Actions
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#71717A] leading-tight mt-0.5 font-medium">
              Instant operational shortcuts
            </div>
          </div>
        </div>

        <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F4F7F4] text-[#52525B] border border-black/5">
          {quickActions.length} actions
        </span>
      </div>

      {/* Action Items List */}
      <div className="p-3 sm:p-3.5 flex flex-col gap-1.5 flex-1 justify-center">
        {quickActions.map((action) => (
          <div
            key={action.title}
          >
            <Link
              to={action.href}
              className="flex items-center gap-3 p-2.5 sm:p-3 rounded-[20px] border border-[#EAEAEA] hover:border-[#9FE870] hover:bg-[#F4F7F4] transition-all group no-underline shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            >
              <div
                className="w-9 h-9 rounded-full bg-[#E8F8EE] text-[#059669] group-hover:bg-[#9FE870] group-hover:text-[#16281D] flex items-center justify-center shrink-0 transition-colors shadow-2xs"
              >
                <action.Icon size={16} strokeWidth={2.4} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-[13px] font-bold text-[#16281D] group-hover:text-[#059669] transition-colors leading-tight truncate">
                  {action.title}
                </div>
                <div className="text-[10px] sm:text-[11px] text-[#71717A] leading-tight truncate mt-0.5 font-medium">
                  {action.description}
                </div>
              </div>

              <ChevronRight
                size={14}
                className="text-[#A1A1AA] group-hover:text-[#16281D] group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

