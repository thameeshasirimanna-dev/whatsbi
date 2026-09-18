import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, useId } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import Portal from './Portal';

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
  searchable?: boolean;
  searchPlaceholder?: string;
}

interface DropdownCoords {
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
  maxWidth: number | string;
  maxHeight: number;
  openAbove: boolean;
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
  searchable,
  searchPlaceholder = 'Search customer...',
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const dropdownId = id || generatedId;

  // Search feature auto-enabled for customer dropdowns or when explicitly set
  const isSearchable =
    searchable !== undefined
      ? searchable
      : (typeof placeholder === 'string' && placeholder.toLowerCase().includes('customer'));

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when opened and reset search on open/close
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      if (isSearchable) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen, isSearchable]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!isSearchable || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      if (opt.label.toLowerCase().includes(q)) return true;
      if (typeof opt.badge === 'string' && opt.badge.toLowerCase().includes(q)) return true;
      if (opt.group && opt.group.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [options, searchQuery, isSearchable]);

  // Selected option lookup
  const selectedOption = options.find((opt) => opt.value === value);

  // Dynamic coordinates calculated synchronously before mount
  const [coords, setCoords] = useState<DropdownCoords | null>(null);

  const calculatePosition = useCallback((): DropdownCoords | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    // If trigger scrolled out of viewport, close dropdown cleanly
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return null;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedMenuHeight = isSearchable ? 290 : 220;
    const openAbove = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;

    const numericMinWidth =
      typeof minWidth === 'number'
        ? minWidth
        : minWidth
        ? parseFloat(String(minWidth))
        : 0;
    const calculatedMinWidth = Math.max(rect.width, numericMinWidth || (isSearchable ? 220 : 140));
    const calculatedMaxWidth = maxWidth || Math.min(380, viewportWidth - 24);
    const maxAllowedHeight = isSearchable ? 320 : 256;

    const idealLeft = align === 'right' ? rect.right - calculatedMinWidth : rect.left;
    const left = Math.max(12, Math.min(idealLeft, viewportWidth - calculatedMinWidth - 12));

    if (openAbove) {
      return {
        bottom: viewportHeight - rect.top + 6,
        left,
        minWidth: calculatedMinWidth,
        maxWidth: calculatedMaxWidth,
        maxHeight: Math.max(140, Math.min(maxAllowedHeight, spaceAbove - 16)),
        openAbove: true,
      };
    } else {
      return {
        top: rect.bottom + 6,
        left,
        minWidth: calculatedMinWidth,
        maxWidth: calculatedMaxWidth,
        maxHeight: Math.max(140, Math.min(maxAllowedHeight, spaceBelow - 16)),
        openAbove: false,
      };
    }
  }, [align, minWidth, maxWidth, isSearchable]);

  // Synchronous calculation upon trigger toggle so coords are ready on the very first frame
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

  // Position tracking on scroll (with capture for modal scroll containers) and resize
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

  // Outside click listener (checks both container and portaled menu)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
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

  // Group options if applicable (computed from filteredOptions so empty groups don't show)
  const hasGroups = filteredOptions.some((opt) => Boolean(opt.group));
  const groups = hasGroups
    ? Array.from(new Set(filteredOptions.map((opt) => opt.group || 'Other')))
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
        onClick={handleToggle}
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

      {/* Floating Popover Dropdown List (Rendered via Portal on document.body for zero modal scroll) */}
      {isOpen && coords && (
        <Portal>
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              minWidth: `${coords.minWidth}px`,
              maxWidth: typeof coords.maxWidth === 'number' ? `${coords.maxWidth}px` : coords.maxWidth,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
              transformOrigin: coords.openAbove ? 'bottom' : 'top',
            }}
            className={`rounded-2xl flex flex-col shadow-[0_16px_40px_rgba(20,40,24,0.18)] overflow-hidden ${
              coords.openAbove ? 'animate-dropdown-up' : 'animate-dropdown'
            } font-sans ${
              variant === 'forest'
                ? 'bg-[#16281D] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
                : 'bg-white border border-[#EAEAEA]'
            } ${menuClassName}`}
          >
            {/* Sticky Search Header */}
            {isSearchable && (
              <div
                className={`p-2 border-b shrink-0 ${
                  variant === 'forest' ? 'border-white/10' : 'border-[#EAEAEA]'
                }`}
              >
                <div className="relative flex items-center w-full">
                  <Search
                    size={13}
                    className={`absolute left-2.5 pointer-events-none ${
                      variant === 'forest' ? 'text-[#8FA89B]' : 'text-[#71717A]'
                    }`}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsOpen(false);
                      }
                    }}
                    placeholder={searchPlaceholder || 'Search customer...'}
                    className={`w-full h-8 pl-8 pr-7 text-xs font-medium rounded-full outline-none transition-all ${
                      variant === 'forest'
                        ? 'bg-[#203628] border border-white/10 text-white placeholder:text-[#8FA89B] focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20'
                        : 'bg-[#F4F7F4] border border-[#EAEAEA] text-[#16281D] placeholder:text-[#A1A1AA] focus:bg-white focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className={`absolute right-2 p-0.5 rounded-full hover:bg-black/10 cursor-pointer border-0 flex items-center justify-center ${
                        variant === 'forest' ? 'text-[#8FA89B] hover:text-white' : 'text-[#71717A] hover:text-[#16281D]'
                      }`}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Options List */}
            <div className="overflow-y-auto flex-1 p-1.5 flex flex-col gap-1">
              {filteredOptions.length === 0 ? (
                <div className="py-6 px-3 text-center text-xs text-[#71717A] font-medium">
                  No matching results
                </div>
              ) : hasGroups ? (
                groups.map((groupName) => {
                  const groupOptions = filteredOptions.filter(
                    (opt) => (opt.group || 'Other') === groupName
                  );
                  if (groupOptions.length === 0) return null;
                  return (
                    <div key={groupName} className="flex flex-col gap-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-3 pt-2 pb-0.5 ${
                          variant === 'forest' ? 'text-[#8FA89B]' : 'text-[#71717A]'
                        }`}
                      >
                        {groupName}
                      </span>
                      {groupOptions.map((opt) => renderOptionItem(opt))}
                    </div>
                  );
                })
              ) : (
                filteredOptions.map((opt) => renderOptionItem(opt))
              )}
            </div>
          </div>
        </Portal>
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
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          {opt.icon && <span className="shrink-0">{opt.icon}</span>}
          <span className="truncate">{opt.label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {opt.badge && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                isSelected
                  ? 'bg-black/15 text-[#16281D]'
                  : variant === 'forest'
                  ? 'bg-white/10 text-[#8FA89B]'
                  : 'bg-[#EAEAEA] text-[#71717A]'
              }`}
            >
              {opt.badge}
            </span>
          )}
          {isSelected && (
            <Check
              size={13}
              strokeWidth={2.8}
              className="shrink-0 text-[#16281D]"
            />
          )}
        </div>
      </button>
    );
  }
}

export default CustomDropdown;
