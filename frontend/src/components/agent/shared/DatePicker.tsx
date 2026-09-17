import React, { useState, useRef, useEffect, useId } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

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
  const generatedId = useId();
  const datePickerId = id || generatedId;

  // Selected date parsed
  const selectedDateObj = value ? parseDateString(value) : null;

  // View year and month currently shown in calendar grid
  const initialDate = selectedDateObj || new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

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

  // Outside click and escape listeners
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
    mint: 'bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D] border border-black/5',
    white: 'bg-white hover:bg-[#F4F7F4] text-[#16281D] border border-[#EAEAEA]',
    forest: 'bg-[#203628] hover:bg-[#274232] text-white border border-white/10',
  }[variant];

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-xs font-semibold gap-2',
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
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full rounded-full transition-all flex items-center justify-between cursor-pointer shadow-xs active:scale-[0.98] outline-none disabled:opacity-50 disabled:pointer-events-none ${sizeClasses} ${triggerVariantClasses} ${
          isOpen ? 'ring-2 ring-[#9FE870]/40 border-[#9FE870]' : ''
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon
            size={size === 'sm' ? 13 : 15}
            className={isDark ? 'text-[#9FE870] shrink-0' : 'text-[#16281D] shrink-0'}
            strokeWidth={2.2}
          />
          <span className={`truncate ${!value ? (isDark ? 'text-[#8FA89B]' : 'text-[#71717A]') : 'font-bold'}`}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>

        {value && !disabled && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="w-4 h-4 rounded-full flex items-center justify-center text-[#71717A] hover:text-[#16281D] hover:bg-black/5 ml-1 transition-colors"
            title="Clear date"
          >
            <X size={11} strokeWidth={2.4} />
          </span>
        )}
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Calendar date picker"
          className={`absolute top-[calc(100%+8px)] ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-50 w-[300px] p-4 rounded-3xl transition-all shadow-[0_16px_48px_rgba(20,40,24,0.16)] animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-[#16281D] border border-white/10 text-white'
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
      )}
    </div>
  );
};

export default DatePicker;
