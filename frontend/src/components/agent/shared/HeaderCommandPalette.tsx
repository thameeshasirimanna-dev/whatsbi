import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  MessageSquare,
  Users,
  ShoppingBag,
  FileText,
  Calendar,
  Briefcase,
  Layers,
  Package,
  Files,
  Send,
  BarChart3,
  Settings,
  Sparkles,
  ArrowRight,
  Plus,
  Smartphone,
} from 'lucide-react';
import Portal from './Portal';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  path: string;
  category: 'Pages' | 'Actions';
  keywords: string[];
}

const COMMAND_ITEMS: CommandItem[] = [
  // Pages
  { id: 'p-dash', title: 'Dashboard', subtitle: 'Overview & telemetry', icon: LayoutDashboard, path: '/agent/dashboard', category: 'Pages', keywords: ['home', 'overview', 'metrics'] },
  { id: 'p-conv', title: 'Live Conversations', subtitle: 'Customer WhatsApp chats', icon: MessageSquare, path: '/agent/conversations', category: 'Pages', keywords: ['chat', 'messages', 'whatsapp', 'inbox'] },
  { id: 'p-inv', title: 'Invoices', subtitle: 'Billing & PDF invoices', icon: FileText, path: '/agent/invoices', category: 'Pages', keywords: ['bills', 'receipts', 'finance', 'payment'] },
  { id: 'p-ord', title: 'Orders', subtitle: 'Product orders & status', icon: ShoppingBag, path: '/agent/orders', category: 'Pages', keywords: ['sales', 'purchases', 'products'] },
  { id: 'p-app', title: 'Appointments', subtitle: 'Bookings & schedules', icon: Calendar, path: '/agent/appointments', category: 'Pages', keywords: ['booking', 'calendar', 'sessions'] },
  { id: 'p-srv', title: 'Services', subtitle: 'Service catalog & pricing', icon: Briefcase, path: '/agent/services', category: 'Pages', keywords: ['offerings', 'pricing', 'menu'] },
  { id: 'p-inv2', title: 'Inventory', subtitle: 'Stock & product management', icon: Package, path: '/agent/inventory', category: 'Pages', keywords: ['stock', 'items', 'catalog'] },
  { id: 'p-cust', title: 'Customers', subtitle: 'Client profiles & history', icon: Users, path: '/agent/customers', category: 'Pages', keywords: ['clients', 'contacts', 'directory'] },
  { id: 'p-cgroups', title: 'Customer Groups', subtitle: 'Segments & audience management', icon: Layers, path: '/agent/customer-groups', category: 'Pages', keywords: ['groups', 'segments', 'tags', 'audience'] },
  { id: 'p-broad', title: 'Message Marketing', subtitle: 'WhatsApp & SMS campaign blasts', icon: Send, path: '/agent/broadcasts', category: 'Pages', keywords: ['campaigns', 'marketing', 'blast', 'sms', 'whatsapp', 'textlk', 'broadcast'] },
  { id: 'p-tmpl', title: 'WhatsApp Templates', subtitle: 'Approved message templates', icon: Files, path: '/agent/templates', category: 'Pages', keywords: ['templates', 'meta', 'messages'] },
  { id: 'p-ana', title: 'Analytics', subtitle: 'Performance & charts', icon: BarChart3, path: '/agent/analytics', category: 'Pages', keywords: ['reports', 'stats', 'telemetry'] },
  { id: 'p-set', title: 'Workspace Settings', subtitle: 'Profile, AI, & billing settings', icon: Settings, path: '/agent/settings', category: 'Pages', keywords: ['config', 'balance', 'topup', 'profile'] },

  // Actions
  { id: 'a-chat', title: 'Start New Conversation', subtitle: 'Open customer chat', icon: Plus, path: '/agent/conversations', category: 'Actions', keywords: ['new message', 'create chat'] },
  { id: 'a-inv', title: 'Create New Invoice', subtitle: 'Issue client invoice', icon: FileText, path: '/agent/invoices', category: 'Actions', keywords: ['new invoice', 'bill client'] },
  { id: 'a-broad', title: 'New Marketing Campaign', subtitle: 'Launch WhatsApp or SMS blast', icon: Send, path: '/agent/broadcasts', category: 'Actions', keywords: ['sms', 'textlk', 'blast', 'broadcast', 'whatsapp', 'marketing'] },
  { id: 'a-tmpl', title: 'Manage Templates', subtitle: 'Browse WhatsApp templates', icon: Files, path: '/agent/templates', category: 'Actions', keywords: ['create template', 'edit template'] },
  { id: 'a-top', title: 'Top-up AI Assistant Liquidity', subtitle: 'Settings balance top-up', icon: Sparkles, path: '/agent/settings', category: 'Actions', keywords: ['ai balance', 'deposit', 'liquidity'] },
];

interface HeaderCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HeaderCommandPalette: React.FC<HeaderCommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMAND_ITEMS;
    return COMMAND_ITEMS.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.keywords.some(k => k.toLowerCase().includes(q))
    );
  }, [query]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        navigate(selected.path);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 bg-[#16281D]/65 flex items-start justify-center pt-16 sm:pt-24 px-4 p-4 animate-modal-backdrop"
        onClick={onClose}
      >
        <div
          className="w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-[0_24px_72px_rgba(20,40,24,0.22)] overflow-hidden flex flex-col max-h-[80vh] animate-modal-card"
          onClick={e => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Top Search Input Bar */}
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-[#EAEAEA] bg-[#F8FAF8]">
            <Search size={18} className="text-[#8FA89B] shrink-0" strokeWidth={2.4} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search pages, customer chats, actions..."
              className="flex-1 bg-transparent border-0 outline-none text-sm sm:text-[15px] font-sans font-medium text-[#16281D] placeholder-[#A1A1AA]"
            />
            <kbd className="px-2 py-0.5 rounded bg-white border border-[#EAEAEA] text-[10px] font-mono text-[#71717A] shadow-2xs">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div ref={listRef} className="overflow-y-auto p-2 sm:p-2.5 flex flex-col gap-1 max-h-[60vh]">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between gap-3 border-0 cursor-pointer ${
                      isSelected ? 'bg-[#16281D] text-white shadow-xs' : 'bg-transparent text-[#16281D] hover:bg-[#F4F7F4]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-[#203628] text-[#9FE870]' : 'bg-[#F4F7F4] text-[#71717A]'
                        }`}
                      >
                        <Icon size={16} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs sm:text-[13px] font-bold truncate ${isSelected ? 'text-white' : 'text-[#16281D]'}`}>
                          {item.title}
                        </div>
                        <div className={`text-[11px] truncate ${isSelected ? 'text-[#A1BAAE]' : 'text-[#71717A]'}`}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isSelected
                            ? 'bg-[#203628] text-[#9FE870] border border-white/10'
                            : 'bg-[#F4F7F4] text-[#71717A]'
                        }`}
                      >
                        {item.category}
                      </span>
                      <ArrowRight
                        size={14}
                        className={`transition-transform ${isSelected ? 'text-[#9FE870] translate-x-0.5' : 'text-transparent'}`}
                      />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[#F4F7F4] flex items-center justify-center mx-auto mb-2 text-[#A1A1AA]">
                  <Search size={18} />
                </div>
                <div className="text-xs font-bold text-[#16281D]">No results found</div>
                <div className="text-[11px] text-[#71717A] mt-0.5">
                  No matching workspace destinations found for "{query}"
                </div>
              </div>
            )}
          </div>

          {/* Footer Shortcuts Navigation */}
          <div className="px-4 py-2.5 bg-[#F8FAF8] border-t border-[#EAEAEA] flex items-center justify-between text-[11px] text-[#71717A] font-medium">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-[#EAEAEA] rounded text-[9px] font-mono">↑</kbd>
                <kbd className="px-1 py-0.5 bg-white border border-[#EAEAEA] rounded text-[9px] font-mono">↓</kbd>
                Navigate
              </span>
              <span className="text-[#EAEAEA]">|</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-[#EAEAEA] rounded text-[9px] font-mono">↵</kbd>
                Select
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <img src="/logo/icon-logo.svg" alt="" className="w-4 h-4 object-contain shrink-0" />
              <span className="text-[10px] text-[#71717A] font-semibold">
                Biz Agentz Quick Search
              </span>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default HeaderCommandPalette;
