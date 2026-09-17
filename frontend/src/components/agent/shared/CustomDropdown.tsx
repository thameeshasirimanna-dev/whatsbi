import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption<T = string | number> {
  value: T;
  label: string;
  badge?: string | React.ReactNode;
  icon?: React.ReactNode;
  group?: string;
  disabled?: boolean;
}

export interface CustomDropdownProps<T = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  variant?: 'mint' | 'white' | 'forest' | 'lime';
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  minWidth?: number | string;
  maxWidth?: number | string;
  icon?: React.ReactNode;
  id?: string;
}

export function CustomDropdown<T = string | number>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  variant = 'mint',
  size = 'md',
  align = 'left',
  minWidth,
  maxWidth,
  icon,
  id,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const dropdownId = id || generatedId;

  // Selected option lookup
  const selectedOption = options.find((opt) => opt.value === value);

  // Outside click listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Trigger Sizing Classes
  const sizeClasses =
    size === 'sm'
      ? 'h-8 px-3 text-[11px] font-bold'
      : 'h-9 sm:h-10 px-3.5 sm:px-4 text-xs font-bold';

  // Trigger Variant Classes
  const getVariantClasses = () => {
    if (disabled) {
      return 'bg-[#E4E4E7] text-[#A1A1AA] cursor-not-allowed opacity-60 border-0';
    }
    switch (variant) {
      case 'white':
        return isOpen
          ? 'bg-white border-2 border-[#9FE870] ring-3 ring-[#9FE870]/25 text-[#16281D] shadow-sm'
          : 'bg-white hover:bg-[#F4F7F4] text-[#16281D] border border-[#EAEAEA] hover:border-[#16281D]/30 shadow-xs';
      case 'forest':
        return isOpen
          ? 'bg-[#203628] border-2 border-[#9FE870] ring-3 ring-[#9FE870]/25 text-white shadow-sm'
          : 'bg-[#203628] hover:bg-[#274232] text-white border border-white/10 hover:border-white/25 shadow-xs';
      case 'lime':
        return isOpen
          ? 'bg-[#9FE870] text-[#16281D] ring-3 ring-[#16281D]/20 shadow-md'
          : 'bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] border-0 shadow-[0_4px_14px_rgba(159,232,112,0.35)]';
      case 'mint':
      default:
        return isOpen
          ? 'bg-white border-2 border-[#9FE870] ring-3 ring-[#9FE870]/25 text-[#16281D] shadow-sm'
          : 'bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D] border border-black/5 hover:border-black/10 shadow-xs';
    }
  };

  // Group options if applicable
  const hasGroups = options.some((opt) => Boolean(opt.group));
  const groups = hasGroups
    ? Array.from(new Set(options.map((opt) => opt.group || 'Other')))
    : [];

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{
        minWidth: minWidth,
        maxWidth: maxWidth,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        id={dropdownId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full rounded-full flex items-center justify-between gap-2 transition-all cursor-pointer select-none active:scale-[0.98] outline-none font-sans ${sizeClasses} ${getVariantClasses()} ${triggerClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon && <span className="shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0">{selectedOption.badge}</span>
          )}
        </div>

        <ChevronDown
          size={size === 'sm' ? 12 : 14}
          className={`shrink-0 transition-transform duration-200 ${
            isOpen
              ? `rotate-180 ${variant === 'forest' ? 'text-[#9FE870]' : 'text-[#16281D]'}`
              : variant === 'forest'
              ? 'text-[#8FA89B]'
              : 'text-[#71717A]'
          }`}
        />
      </button>

      {/* Floating Popover Dropdown List */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute top-full mt-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          } min-w-full w-max max-w-xs max-h-64 overflow-y-auto rounded-2xl p-1.5 z-50 flex flex-col gap-1 shadow-[0_12px_36px_rgba(20,40,24,0.16)] animate-in fade-in zoom-in-95 duration-150 font-sans ${
            variant === 'forest'
              ? 'bg-[#16281D] border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.35)]'
              : 'bg-white border border-[#EAEAEA]'
          } ${menuClassName}`}
          style={{ minWidth: minWidth || '140px' }}
        >
          {hasGroups ? (
            groups.map((groupName) => (
              <div key={groupName} className="flex flex-col gap-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-3 pt-2 pb-0.5 ${
                    variant === 'forest' ? 'text-[#8FA89B]' : 'text-[#71717A]'
                  }`}
                >
                  {groupName}
                </span>
                {options
                  .filter((opt) => (opt.group || 'Other') === groupName)
                  .map((opt) => renderOptionItem(opt))}
              </div>
            ))
          ) : (
            options.map((opt) => renderOptionItem(opt))
          )}
        </div>
      )}
    </div>
  );

  function renderOptionItem(opt: DropdownOption<T>) {
    const isSelected = opt.value === value;
    const isOptionDisabled = Boolean(opt.disabled);

    const getOptionClasses = () => {
      if (isOptionDisabled) {
        return 'opacity-40 cursor-not-allowed pointer-events-none text-[#71717A]';
      }
      if (variant === 'forest') {
        return isSelected
          ? 'bg-[#9FE870] text-[#16281D] shadow-xs'
          : 'text-[#E4E4E7] hover:bg-[#203628] hover:text-white bg-transparent';
      }
      return isSelected
        ? 'bg-[#9FE870] text-[#16281D] shadow-xs'
        : 'text-[#16281D] hover:bg-[#F4F7F4] bg-transparent';
    };

    return (
      <button
        type="button"
        key={String(opt.value)}
        role="option"
        aria-selected={isSelected}
        disabled={isOptionDisabled}
        onClick={() => {
          onChange(opt.value);
          setIsOpen(false);
        }}
        className={`w-full px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all flex items-center justify-between gap-2 border-0 text-left shrink-0 active:scale-[0.98] ${getOptionClasses()}`}
      >
        <div className="flex items-center gap-2 truncate">
          {opt.icon && <span className="shrink-0">{opt.icon}</span>}
          <span className="truncate">{opt.label}</span>
          {opt.badge && <span className="shrink-0">{opt.badge}</span>}
        </div>
        {isSelected && (
          <Check
            size={13}
            strokeWidth={2.8}
            className="shrink-0 text-[#16281D]"
          />
        )}
      </button>
    );
  }
}

export default CustomDropdown;
