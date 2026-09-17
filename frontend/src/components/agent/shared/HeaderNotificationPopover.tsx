import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, CheckCheck } from 'lucide-react';

export interface NotificationItem {
  id: number;
  customerName: string;
  customerPhone: string;
  customerId: number;
  preview: string;
  timestamp: string;
}

interface HeaderNotificationPopoverProps {
  unreadCount: number;
  recentNotifications: NotificationItem[];
  onNotificationClick: (notification: NotificationItem) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const formatNotificationTime = (timeStr: string) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetMidnight.getTime() === todayMidnight.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};

const getInitials = (name?: string) => {
  if (!name || typeof name !== 'string') return 'WA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const HeaderNotificationPopover: React.FC<HeaderNotificationPopoverProps> = ({
  unreadCount,
  recentNotifications,
  onNotificationClick,
  isOpen,
  onToggle,
  onClose,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={onToggle}
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#52525B] hover:text-[#16281D] flex items-center justify-center transition-all border-0 cursor-pointer relative"
        aria-label="Toggle notifications"
      >
        <Bell size={16} strokeWidth={2.2} />
        {unreadCount > 0 && (
          <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-[#9FE870] text-[#16281D] text-[9px] font-extrabold border-2 border-white flex items-center justify-center absolute -top-0.5 -right-0.5 shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div className="w-80 max-w-[calc(100vw-24px)] bg-white rounded-2xl border border-[#EAEAEA] shadow-[0_12px_36px_rgba(20,40,24,0.14)] overflow-hidden z-50 absolute right-0 top-[calc(100%+8px)] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#EAEAEA] bg-[#F8FAF8] flex items-center justify-between">
            <span className="text-xs font-bold text-[#16281D] tracking-wider uppercase">
              Notifications
            </span>
            {unreadCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#9FE870] text-[#16281D]">
                {unreadCount} unread
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-[#8FA89B] flex items-center gap-1">
                <CheckCheck size={12} className="text-[#059669]" /> All caught up
              </span>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#F4F7F4]">
            {recentNotifications.length > 0 ? (
              recentNotifications.map(notification => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    onNotificationClick(notification);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 hover:bg-[#F4F7F4] transition-colors flex items-start gap-3 border-0 bg-transparent cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(notification.customerName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#16281D] truncate group-hover:text-[#059669] transition-colors">
                      {notification.customerName}
                    </div>
                    <div className="text-[11px] text-[#71717A] truncate mt-0.5">
                      {notification.preview}
                    </div>
                    <div className="text-[10px] text-[#A1A1AA] mt-1 font-mono">
                      {formatNotificationTime(notification.timestamp)}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[#F4F7F4] flex items-center justify-center mx-auto mb-2 text-[#A1A1AA]">
                  <MessageSquare size={18} />
                </div>
                <div className="text-xs font-bold text-[#16281D]">No new notifications</div>
                <div className="text-[11px] text-[#71717A] mt-0.5">
                  Incoming customer alerts will appear here
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-[#EAEAEA] bg-[#F8FAF8] text-center">
            <button
              type="button"
              onClick={() => {
                navigate('/agent/conversations');
                onClose();
              }}
              className="w-full py-1 text-xs font-bold text-[#059669] hover:text-[#16281D] bg-transparent border-0 cursor-pointer transition-colors"
            >
              View all conversations →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderNotificationPopover;
