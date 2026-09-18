import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import Portal from './Portal';

interface DatePickerCoords {
  top?: number;
  bottom?: number;
  left: number;
  maxWidth: number;
  maxHeight: number;
  openAbove: boolean;
}

export interface DatePickerProps {
  value?: string | null; // ISO string 'YYYY-MM-DD' or null
  onChange: (date: string | null) => void;
  placeholder?: string;
  minDate?: string; // 'YYYY-MM-DD'
  maxDate?: string; // 'YYYY-MM-DD'
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  variant?: 'mint' | 'white' | 'forest';
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  showPresets?: boolean;
  id?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Format a Date object to 'YYYY-MM-DD' string safely in local time
function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse 'YYYY-MM-DD' string to local Date object
function parseDateString(str: string): Date | null {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

// Format 'YYYY-MM-DD' to human-friendly display: "Sep 18, 2026"
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = parseDateString(dateStr);
  if (!d) return dateStr;
  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();
  const monthShort = MONTH_NAMES[d.getMonth()].slice(0, 3);
  return isThisYear
    ? `${monthShort} ${d.getDate()}`
    : `${monthShort} ${d.getDate()}, ${d.getFullYear()}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date...',
  minDate,
  maxDate,
  disabled = false,
  className = '',
  triggerClassName = '',
  popoverClassName = '',
  variant = 'mint',
  size = 'md',
  align = 'left',
  showPresets = true,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const datePickerId = id || generatedId;

  // Selected date parsed
  const selectedDateObj = value ? parseDateString(value) : null;

  // View year and month currently shown in calendar grid
  const initialDate = selectedDateObj || new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Dynamic coordinates calculated synchronously before mount
  const [coords, setCoords] = useState<DatePickerCoords | null>(null);

  const calculatePosition = useCallback((): DatePickerCoords | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return null;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const calendarWidth = Math.min(300, viewportWidth - 24);
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedCalendarHeight = 350;
    const openAbove = spaceBelow < estimatedCalendarHeight && spaceAbove > spaceBelow;

    const idealLeft = align === 'right' ? rect.right - calendarWidth : rect.left;
    const left = Math.max(12, Math.min(idealLeft, viewportWidth - calendarWidth - 12));

    if (openAbove) {
      return {
        bottom: viewportHeight - rect.top + 6,
        left,
        maxWidth: calendarWidth,
        maxHeight: Math.max(200, Math.min(380, spaceAbove - 16)),
        openAbove: true,
      };
    } else {
      return {
        top: rect.bottom + 6,
        left,
        maxWidth: calendarWidth,
        maxHeight: Math.max(200, Math.min(380, spaceBelow - 16)),
        openAbove: false,
      };
    }
  }, [align]);

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

  // Update view when value changes from external prop
  useEffect(() => {
    if (value) {
      const d = parseDateString(value);
      if (d) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

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

  // Outside click and escape listeners
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Calendar matrix calculation
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = toDateString(new Date());

  const isDark = variant === 'forest';

  // Variant classes for trigger
  const triggerVariantClasses = {
    mint: 'bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA]',
    white: 'bg-white hover:bg-[#F4F7F4] text-[#16281D] border border-[#EAEAEA]',
    forest: 'bg-[#203628] hover:bg-[#274232] text-white border border-white/10',
  }[variant];

  const sizeClasses = {
    sm: 'h-8 px-3 text-[11px] font-bold gap-1.5',
    md: 'h-9 sm:h-10 px-3.5 sm:px-4 text-xs font-bold gap-2',
  }[size];

  const handleSelectDay = (day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    const dateStr = toDateString(selected);
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleQuickPreset = (offsetDays: number) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const dateStr = toDateString(target);
    onChange(dateStr);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block font-sans ${className}`}>
      {/* Capsule Trigger Button */}
      <button
        id={datePickerId}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full rounded-full transition-all flex items-center justify-between cursor-pointer shadow-xs active:scale-[0.98] outline-none disabled:opacity-50 disabled:pointer-events-none font-sans ${sizeClasses} ${triggerVariantClasses} ${
          isOpen ? 'ring-2 ring-[#9FE870]/40 border-[#9FE870]' : ''
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <CalendarIcon
            size={size === 'sm' ? 12 : 13}
            className={
              isDark
                ? 'text-[#9FE870] shrink-0'
                : value
                ? 'text-[#15803D] shrink-0'
                : 'text-[#71717A] shrink-0'
            }
            strokeWidth={2.2}
          />
          <span className={`truncate ${!value ? (isDark ? 'text-[#8FA89B]' : 'text-[#71717A]') : (isDark ? 'text-white font-bold' : 'text-[#16281D] font-bold')}`}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>

        {value && !disabled ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="w-5 h-5 rounded-full flex items-center justify-center bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] ml-1 transition-colors shrink-0"
            title="Clear date"
          >
            <X size={11} strokeWidth={2.4} />
          </span>
        ) : (
          <ChevronDown
            size={size === 'sm' ? 12 : 14}
            className={`shrink-0 ml-1 transition-transform duration-200 ${
              isOpen
                ? `rotate-180 ${variant === 'forest' ? 'text-[#9FE870]' : 'text-[#16281D]'}`
                : variant === 'forest'
                ? 'text-[#8FA89B]'
                : 'text-[#71717A]'
            }`}
          />
        )}
      </button>

      {/* Calendar Popover (Rendered via Portal on document.body for zero modal scroll) */}
      {isOpen && coords && (
        <Portal>
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Calendar date picker"
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.maxWidth}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
              transformOrigin: coords.openAbove ? 'bottom' : 'top',
            }}
            className={`p-3 sm:p-4 rounded-3xl transition-all shadow-[0_16px_48px_rgba(20,40,24,0.18)] ${
              coords.openAbove ? 'animate-dropdown-up' : 'animate-dropdown'
            } overflow-y-auto ${
              isDark
                ? 'bg-[#16281D] border border-white/10 text-white shadow-[0_16px_48px_rgba(0,0,0,0.5)]'
                : 'bg-white border border-[#EAEAEA] text-[#16281D]'
            } ${popoverClassName}`}
          >
          {/* Month/Year Navigation Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-bold text-sm">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer border-0 ${
                  isDark ? 'hover:bg-[#203628] text-white' : 'hover:bg-[#F4F7F4] text-[#16281D]'
                }`}
              >
                <ChevronLeft size={15} strokeWidth={2.4} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer border-0 ${
                  isDark ? 'hover:bg-[#203628] text-white' : 'hover:bg-[#F4F7F4] text-[#16281D]'
                }`}
              >
                <ChevronRight size={15} strokeWidth={2.4} />
              </button>
            </div>
          </div>

          {/* Quick Presets Strip */}
          {showPresets && (
            <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-[#EAEAEA]/80 overflow-x-auto">
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: '+3 Days', days: 3 },
                { label: '+1 Week', days: 7 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleQuickPreset(preset.days)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border-0 shrink-0 ${
                    isDark
                      ? 'bg-[#203628] hover:bg-[#274232] text-white'
                      : 'bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
            {DAY_LABELS.map((day) => (
              <span
                key={day}
                className={`text-[11px] font-bold ${
                  isDark ? 'text-[#8FA89B]' : 'text-[#A1A1AA]'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Trailing days from previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => {
              const dayNum = daysInPrevMonth - firstDayOfMonth + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-xs opacity-25 select-none font-mono"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isToday = dateStr === todayStr;
              const isPast = minDate && dateStr < minDate;
              const isFutureBlocked = maxDate && dateStr > maxDate;
              const isDisabled = Boolean(isPast || isFutureBlocked);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border-0 font-mono ${
                    isSelected
                      ? 'bg-[#9FE870] text-[#16281D] font-bold shadow-xs scale-105'
                      : isToday
                      ? isDark
                        ? 'border border-[#9FE870] text-white font-bold hover:bg-[#203628]'
                        : 'border border-[#9FE870] text-[#16281D] font-bold hover:bg-[#F4F7F4]'
                      : isDark
                      ? 'text-white hover:bg-[#203628]'
                      : 'text-[#16281D] hover:bg-[#F4F7F4]'
                  } ${isDisabled ? 'opacity-30 pointer-events-none' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#EAEAEA]/80">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={`text-xs font-semibold hover:underline cursor-pointer border-0 bg-transparent ${
                isDark ? 'text-[#8FA89B]' : 'text-[#71717A]'
              }`}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-7 px-3 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold transition-all cursor-pointer border-0 shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </Portal>
    )}
  </div>
  );
};

export default DatePicker;
