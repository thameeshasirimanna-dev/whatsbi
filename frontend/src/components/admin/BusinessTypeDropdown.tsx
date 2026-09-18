import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { ChevronDown, Check, Briefcase, ShoppingBag } from 'lucide-react';
import Portal from '../agent/shared/Portal';

interface BusinessTypeCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  openAbove: boolean;
}

export type BusinessType = 'service' | 'product';

interface BusinessTypeOption {
  value: BusinessType;
  label: string;
  badge: string;
  description: string;
  Icon: React.ElementType;
}

export const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  {
    value: 'service',
    label: 'Service Business',
    badge: 'Appointments & Agency',
    description: 'Consulting, bookings, salon/agency, and automated support.',
    Icon: Briefcase,
  },
  {
    value: 'product',
    label: 'Product Business',
    badge: 'Retail & E-commerce',
    description: 'Physical catalog, retail, inventory management, and orders.',
    Icon: ShoppingBag,
  },
];

interface BusinessTypeDropdownProps {
  value: BusinessType;
  onChange: (val: BusinessType) => void;
  disabled?: boolean;
}

export const BusinessTypeDropdown: React.FC<BusinessTypeDropdownProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<BusinessTypeCoords | null>(null);

  const calculatePosition = useCallback((): BusinessTypeCoords | null => {
    if (!dropdownRef.current) return null;
    const rect = dropdownRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return null;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(rect.width, vw - 24);
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < 260 && spaceAbove > spaceBelow;

    const left = Math.max(12, Math.min(rect.left, vw - width - 12));

    if (openAbove) {
      return {
        bottom: vh - rect.top + 6,
        left,
        width,
        maxHeight: Math.max(160, Math.min(280, spaceAbove - 16)),
        openAbove: true,
      };
    } else {
      return {
        top: rect.bottom + 6,
        left,
        width,
        maxHeight: Math.max(160, Math.min(280, spaceBelow - 16)),
        openAbove: false,
      };
    }
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      const newCoords = calculatePosition();
      if (newCoords) setCoords(newCoords);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    const newCoords = calculatePosition();
    if (newCoords) setCoords(newCoords);
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleUpdate = () => {
      const newCoords = calculatePosition();
      if (newCoords) setCoords(newCoords);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption =
    BUSINESS_TYPE_OPTIONS.find((opt) => opt.value === value) || BUSINESS_TYPE_OPTIONS[0];
  const SelectedIcon = selectedOption.Icon;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full h-10 px-3.5 rounded-xl border text-xs sm:text-[13px] font-medium flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 ${
          isOpen
            ? 'bg-white border-[#9FE870] ring-3 ring-[#9FE870]/25 shadow-xs'
            : 'bg-[#F4F7F4] border-[#EAEAEA] hover:border-[#16281D]/30 text-[#16281D]'
        }`}
      >
        <div className="flex items-center gap-2">
          <SelectedIcon size={14} className="text-[#059669] shrink-0" />
          <span className="font-semibold text-[#16281D]">{selectedOption.label}</span>
        </div>
        <ChevronDown
          size={15}
          className={`text-[#71717A] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#16281D]' : ''
          }`}
        />
      </button>

      {isOpen && coords && (
        <Portal>
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
              transformOrigin: coords.openAbove ? 'bottom' : 'top',
            }}
            className={`overflow-y-auto bg-white rounded-2xl border border-[#EAEAEA] p-1.5 shadow-[0_16px_40px_rgba(20,40,24,0.18)] flex flex-col gap-1 ${
              coords.openAbove ? 'animate-dropdown-up' : 'animate-dropdown'
            }`}
          >
            {BUSINESS_TYPE_OPTIONS.map((opt) => {
              const isSelected = value === opt.value;
              const OptionIcon = opt.Icon;

              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected ? 'bg-[#F0FDF4] text-[#15803D]' : 'text-[#16281D] hover:bg-[#F4F7F4]'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-white text-[#059669] shadow-2xs' : 'bg-[#F4F7F4] text-[#71717A]'
                      }`}
                    >
                      <OptionIcon size={14} strokeWidth={2.4} />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold leading-tight truncate">{opt.label}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? 'bg-white text-[#059669] border-[#BBF7D0]'
                              : 'bg-white text-[#71717A] border-[#EAEAEA]'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#71717A] font-medium m-0 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Check size={12} strokeWidth={2.8} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Portal>
      )}
    </div>
  );
};
