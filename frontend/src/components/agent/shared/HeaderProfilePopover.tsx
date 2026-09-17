import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  MessageSquare,
  Files,
  ShoppingBag,
  FileText,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface HeaderProfilePopoverProps {
  agent: {
    name: string;
    email: string;
    agent_prefix: string;
  };
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout?: () => void;
}

const getInitials = (name?: string) => {
  if (!name || typeof name !== 'string') return 'WA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const HeaderProfilePopover: React.FC<HeaderProfilePopoverProps> = ({
  agent,
  isOpen,
  onToggle,
  onClose,
  onLogout,
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
      {/* Trigger Button */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 pl-0.5 p-1 rounded-full hover:bg-[#F4F7F4] active:scale-95 transition-all border-0 bg-transparent cursor-pointer group"
        aria-label="Agent account menu"
      >
        <div className="hidden lg:flex flex-col text-right min-w-0">
          <span className="text-xs font-bold text-[#16281D] leading-tight truncate max-w-[120px] group-hover:text-[#059669] transition-colors">
            {agent.name || 'Agent'}
          </span>
          <span className="text-[10px] text-[#71717A] leading-tight truncate max-w-[120px]">
            {agent.agent_prefix || 'Agent'}
          </span>
        </div>

        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#16281D] text-[#9FE870] font-bold text-xs flex items-center justify-center border border-[#9FE870]/30 shadow-xs shrink-0 group-hover:ring-2 group-hover:ring-[#9FE870]/40 transition-all"
          title={agent.name || 'Agent'}
        >
          {getInitials(agent.name)}
        </div>

        <ChevronDown
          size={13}
          className={`hidden lg:block text-[#A1A1AA] group-hover:text-[#16281D] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div className="w-68 bg-white rounded-2xl border border-[#EAEAEA] shadow-[0_12px_36px_rgba(20,40,24,0.14)] overflow-hidden z-50 absolute right-0 top-[calc(100%+8px)] animate-in fade-in zoom-in-95 duration-150">
          {/* Profile Card Header */}
          <div className="p-3.5 bg-[#F8FAF8] border-b border-[#EAEAEA] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#16281D] text-[#9FE870] font-bold text-xs flex items-center justify-center border border-[#9FE870]/30 shrink-0">
              {getInitials(agent.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#16281D] truncate">
                {agent.name || 'Agent'}
              </div>
              <div className="text-[11px] text-[#71717A] truncate">
                {agent.email || 'Workspace'}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {agent.agent_prefix && (
                  <span className="text-[9px] font-bold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 py-0.2 rounded-full font-mono">
                    {agent.agent_prefix}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#15803D]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  Online
                </span>
              </div>
            </div>
          </div>

          {/* Quick Navigation Items */}
          <div className="p-1.5 flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                navigate('/agent/settings');
                onClose();
              }}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#16281D] hover:bg-[#F4F7F4] transition-colors border-0 bg-transparent cursor-pointer group"
            >
              <Settings size={14} className="text-[#8FA89B] group-hover:text-[#059669] transition-colors" />
              <span>Workspace Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/agent/conversations');
                onClose();
              }}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#16281D] hover:bg-[#F4F7F4] transition-colors border-0 bg-transparent cursor-pointer group"
            >
              <MessageSquare size={14} className="text-[#8FA89B] group-hover:text-[#059669] transition-colors" />
              <span>Customer Chats</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/agent/templates');
                onClose();
              }}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#16281D] hover:bg-[#F4F7F4] transition-colors border-0 bg-transparent cursor-pointer group"
            >
              <Files size={14} className="text-[#8FA89B] group-hover:text-[#059669] transition-colors" />
              <span>WhatsApp Templates</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/agent/orders');
                onClose();
              }}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#16281D] hover:bg-[#F4F7F4] transition-colors border-0 bg-transparent cursor-pointer group"
            >
              <ShoppingBag size={14} className="text-[#8FA89B] group-hover:text-[#059669] transition-colors" />
              <span>Order Management</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/agent/invoices');
                onClose();
              }}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#16281D] hover:bg-[#F4F7F4] transition-colors border-0 bg-transparent cursor-pointer group"
            >
              <FileText size={14} className="text-[#8FA89B] group-hover:text-[#059669] transition-colors" />
              <span>Billing & Invoices</span>
            </button>
          </div>

          {/* Logout Option */}
          {onLogout && (
            <div className="p-1.5 border-t border-[#F4F7F4]">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#EF4444] hover:bg-[#FFF1F2] transition-colors border-0 bg-transparent cursor-pointer group"
              >
                <LogOut size={14} className="text-[#EF4444] group-hover:scale-110 transition-transform" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderProfilePopover;
