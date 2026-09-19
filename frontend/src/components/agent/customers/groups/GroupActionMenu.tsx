import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Copy,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import Portal from '../../shared/Portal';
import { CustomerGroup } from '../CustomerTypes';

interface GroupActionMenuProps {
  group: CustomerGroup;
  isCopied: boolean;
  onEdit: (group: CustomerGroup) => void;
  onDelete: (group: CustomerGroup) => void;
  onCopyPhones: (group: CustomerGroup) => void;
  onViewMembers: (group: CustomerGroup) => void;
  align?: 'right' | 'left';
}

interface MenuCoords {
  top: number;
  left: number;
  openAbove: boolean;
}

export const GroupActionMenu: React.FC<GroupActionMenuProps> = ({
  group,
  isCopied,
  onEdit,
  onDelete,
  onCopyPhones,
  onViewMembers,
  align = 'right',
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const calculatePosition = useCallback((): MenuCoords | null => {
    if (!buttonRef.current) return null;
    const rect = buttonRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    const menuWidth = 208; // 52 * 4 = 208px
    // Estimated height: ~165px for default groups (4 items), ~205px for custom groups (5 items + divider)
    const menuHeight = group.is_default ? 165 : 205;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Open above if bottom space is insufficient and there is more room above
    const openAbove = spaceBelow < menuHeight + 16 && spaceAbove > spaceBelow;

    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    left = Math.max(12, Math.min(left, viewportWidth - menuWidth - 12));

    let top: number;
    if (openAbove) {
      top = Math.max(12, rect.top - menuHeight - 6);
    } else {
      top = Math.min(viewportHeight - menuHeight - 12, rect.bottom + 6);
    }

    return { top, left, openAbove };
  }, [align, group.is_default]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      const newCoords = calculatePosition();
      if (newCoords) setCoords(newCoords);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close on scroll or resize so it never misaligns
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      setIsOpen(false);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleAction = (callback: () => void) => {
    setIsOpen(false);
    callback();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`w-8 h-8 rounded-full border transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer ${
          isOpen
            ? 'bg-[#16281D] text-[#9FE870] border-[#16281D] shadow-sm'
            : 'border-[#EAEAEA] bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D]'
        }`}
        title="Group Actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical size={14} />
      </button>

      {isOpen && coords && (
        <Portal>
          {/* Backdrop Click Dismissal */}
          <div
            className="fixed inset-0 z-[100] bg-transparent cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {/* Floating Dropdown Card (Smart Upward/Downward Portal) */}
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '208px',
            }}
            onClick={(e) => e.stopPropagation()}
            className="z-[101] bg-white border border-[#EAEAEA] rounded-2xl shadow-[0_16px_40px_rgba(22,40,29,0.18)] p-1.5 outline-none font-sans select-none animate-dropdown"
          >
            {/* 1. View Members */}
            <button
              type="button"
              onClick={() => handleAction(() => onViewMembers(group))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#71717A] hover:bg-[#F4F7F4] hover:text-[#16281D] transition-colors cursor-pointer text-left"
            >
              <Users size={14} className="shrink-0 text-[#16281D]" />
              <span className="flex-1">View Members</span>
              <span className="font-mono text-[11px] text-[#A1A1AA]">{group.member_count}</span>
            </button>

            {/* 2. Copy Contact Numbers */}
            <button
              type="button"
              onClick={() => handleAction(() => onCopyPhones(group))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#71717A] hover:bg-[#F4F7F4] hover:text-[#16281D] transition-colors cursor-pointer text-left"
            >
              {isCopied ? (
                <Check size={14} className="shrink-0 text-[#22C55E]" />
              ) : (
                <Copy size={14} className="shrink-0 text-[#71717A]" />
              )}
              <span className="flex-1">{isCopied ? 'Phones Copied!' : 'Copy Numbers'}</span>
            </button>

            {/* 3. Filter in CRM Table */}
            <button
              type="button"
              onClick={() => handleAction(() => navigate(`/agent/customers?groupId=${group.id}`))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#71717A] hover:bg-[#F4F7F4] hover:text-[#16281D] transition-colors cursor-pointer text-left"
            >
              <ExternalLink size={14} className="shrink-0 text-[#71717A]" />
              <span className="flex-1">Filter in CRM</span>
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-[#EAEAEA]" />

            {/* 4. Edit Group */}
            <button
              type="button"
              onClick={() => handleAction(() => onEdit(group))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#71717A] hover:bg-[#F4F7F4] hover:text-[#16281D] transition-colors cursor-pointer text-left"
            >
              <Pencil size={14} className="shrink-0 text-[#71717A]" />
              <span className="flex-1">{group.is_default ? 'Customize Appearance' : 'Edit Group'}</span>
            </button>

            {/* 5. Delete Group (Custom Only) */}
            {!group.is_default && (
              <button
                type="button"
                onClick={() => handleAction(() => onDelete(group))}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#DC2626] transition-colors cursor-pointer text-left"
              >
                <Trash2 size={14} className="shrink-0 text-[#EF4444]" />
                <span className="flex-1">Delete Group</span>
              </button>
            )}
          </div>
        </Portal>
      )}
    </>
  );
};

export default GroupActionMenu;
