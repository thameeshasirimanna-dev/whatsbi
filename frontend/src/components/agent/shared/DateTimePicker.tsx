import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { CalendarClock, X, Clock } from 'lucide-react';
import Portal from './Portal';
import { formatDisplayDate } from './DatePicker';
import {
  MONTH_NAMES,
  DAY_LABELS,
  QUICK_SLOTS,
  HOURS,
  MINUTES,
  parseDateTimeValue,
  to24Hour,
} from './dateTimeUtils';

export interface DateTimePickerProps {
  value?: string | null; // ISO string ("2026-09-18T10:30"), "YYYY-MM-DD HH:mm", or "YYYY-MM-DD hh:mm AM/PM"
  onChange: (dateTimeStr: string | null) => void;
  outputFormat?: 'datetime-local' | 'human'; // 'datetime-local' => "YYYY-MM-DDTHH:mm", 'human' => "YYYY-MM-DD hh:mm AM/PM"
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  variant?: 'mint' | 'white' | 'forest';
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  id?: string;
}

interface DateTimePickerCoords {
  top?: number;
  bottom?: number;
  left: number;
  maxWidth: number;
  maxHeight: number;
  openAbove: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  outputFormat,
  placeholder = 'Select date & time...',
  minDate,
  maxDate,
  disabled = false,
  className = '',
  triggerClassName = '',
  popoverClassName = '',
  variant = 'mint',
  size = 'md',
  align = 'left',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const pickerId = id || generatedId;

  const parsed = parseDateTimeValue(value);
  const initialWasIso = useRef(parsed.wasIso);

  const [activeDate, setActiveDate] = useState<string>(parsed.date);
  const [activeHour, setActiveHour] = useState<string>(parsed.hour);
  const [activeMinute, setActiveMinute] = useState<string>(parsed.minute);
  const [activePeriod, setActivePeriod] = useState<'AM' | 'PM'>(parsed.period);

  const initialYear = activeDate ? parseInt(activeDate.split('-')[0], 10) : new Date().getFullYear();
  const initialMonth = activeDate ? parseInt(activeDate.split('-')[1], 10) - 1 : new Date().getMonth();
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  const [coords, setCoords] = useState<DateTimePickerCoords | null>(null);

  useEffect(() => {
    if (value) {
      const p = parseDateTimeValue(value);
      initialWasIso.current = p.wasIso;
      setActiveDate(p.date);
      setActiveHour(p.hour);
      setActiveMinute(p.minute);
      setActivePeriod(p.period);
      if (p.date) {
        const parts = p.date.split('-');
        if (parts.length === 3) {
          setViewYear(parseInt(parts[0], 10));
          setViewMonth(parseInt(parts[1], 10) - 1);
        }
      }
    } else {
      setActiveDate('');
    }
  }, [value]);

  const calculatePosition = useCallback((): DateTimePickerCoords | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return null;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popoverWidth = Math.min(340, vw - 24);
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < 420 && spaceAbove > spaceBelow;

    const idealLeft = align === 'right' ? rect.right - popoverWidth : rect.left;
    const left = Math.max(12, Math.min(idealLeft, vw - popoverWidth - 12));

    if (openAbove) {
      return {
        bottom: vh - rect.top + 6,
        left,
        maxWidth: popoverWidth,
        maxHeight: Math.max(200, Math.min(460, spaceAbove - 16)),
        openAbove: true,
      };
    } else {
      return {
        top: rect.bottom + 6,
        left,
        maxWidth: popoverWidth,
        maxHeight: Math.max(200, Math.min(460, spaceBelow - 16)),
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

  const isDark = variant === 'forest';

  const triggerVariantClasses = {
    mint: 'bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D] border border-black/5',
    white: 'bg-white hover:bg-[#F4F7F4] text-[#16281D] border border-[#EAEAEA]',
    forest: 'bg-[#203628] hover:bg-[#274232] text-white border border-white/10',
  }[variant];

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-xs font-semibold gap-2',
  }[size];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const handleApply = () => {
    if (!activeDate) return;
    const isIsoOutput = outputFormat === 'datetime-local' || (!outputFormat && initialWasIso.current);
    if (isIsoOutput) {
      const time24 = to24Hour(activeHour, activeMinute, activePeriod);
      onChange(`${activeDate}T${time24}`);
    } else {
      onChange(`${activeDate} ${activeHour}:${activeMinute} ${activePeriod}`);
    }
    setIsOpen(false);
  };

  const formattedDisplay = activeDate
    ? `${formatDisplayDate(activeDate)} at ${activeHour}:${activeMinute} ${activePeriod}`
    : '';

  return (
    <div ref={containerRef} className={`relative inline-block font-sans ${className}`}>
      {/* Capsule Trigger */}
      <button
        id={pickerId}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full rounded-full transition-all flex items-center justify-between cursor-pointer shadow-xs active:scale-[0.98] outline-none disabled:opacity-50 disabled:pointer-events-none ${sizeClasses} ${triggerVariantClasses} ${
          isOpen ? 'ring-2 ring-[#9FE870]/40 border-[#9FE870]' : ''
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarClock
            size={size === 'sm' ? 13 : 15}
            className={isDark ? 'text-[#9FE870] shrink-0' : 'text-[#16281D] shrink-0'}
            strokeWidth={2.2}
          />
          <span className={`truncate ${!activeDate ? (isDark ? 'text-[#8FA89B]' : 'text-[#71717A]') : 'font-bold'}`}>
            {activeDate ? formattedDisplay : placeholder}
          </span>
        </div>

        {activeDate && !disabled && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="w-4 h-4 rounded-full flex items-center justify-center text-[#71717A] hover:text-[#16281D] hover:bg-black/5 ml-1 transition-colors"
            title="Clear"
          >
            <X size={11} strokeWidth={2.4} />
          </span>
        )}
      </button>

      {/* Popover (Rendered via Portal on document.body for zero modal scroll) */}
      {isOpen && coords && (
        <Portal>
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Date and time picker popover"
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
            className={`p-4 rounded-3xl transition-all shadow-[0_16px_48px_rgba(20,40,24,0.18)] ${
              coords.openAbove ? 'animate-dropdown-up' : 'animate-dropdown'
            } overflow-y-auto ${
              isDark
                ? 'bg-[#16281D] border border-white/10 text-white shadow-[0_16px_48px_rgba(0,0,0,0.5)]'
                : 'bg-white border border-[#EAEAEA] text-[#16281D]'
            } ${popoverClassName}`}
          >
          {/* Month/Year Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-bold text-sm">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMonth(viewMonth === 0 ? 11 : viewMonth - 1)}
                className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-0 ${
                  isDark ? 'hover:bg-[#203628] text-white' : 'hover:bg-[#F4F7F4] text-[#16281D]'
                }`}
              >
                &larr;
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(viewMonth === 11 ? 0 : viewMonth + 1)}
                className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-0 ${
                  isDark ? 'hover:bg-[#203628] text-white' : 'hover:bg-[#F4F7F4] text-[#16281D]'
                }`}
              >
                &rarr;
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-3 text-center">
            {DAY_LABELS.map((d) => (
              <span key={d} className={`text-[10px] font-bold ${isDark ? 'text-[#8FA89B]' : 'text-[#A1A1AA]'}`}>
                {d}
              </span>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} className="w-8 h-8" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = activeDate === dateStr;
              const isPastMin = minDate ? dateStr < minDate : false;
              const isFutureMax = maxDate ? dateStr > maxDate : false;
              const isDisabled = isPastMin || isFutureMax;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setActiveDate(dateStr)}
                  className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border-0 font-mono disabled:opacity-30 disabled:pointer-events-none ${
                    isSelected
                      ? 'bg-[#9FE870] text-[#16281D] font-bold shadow-xs'
                      : isDark
                      ? 'text-white hover:bg-[#203628]'
                      : 'text-[#16281D] hover:bg-[#F4F7F4]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Presets Row */}
          <div className="pt-2.5 border-t border-[#EAEAEA]/80 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#8FA89B]' : 'text-[#A1A1AA]'}`}>
                Quick Time Slots
              </span>
              <span className="text-[10px] font-mono text-[#71717A] flex items-center gap-1">
                <Clock size={10} />
                {activeHour}:{activeMinute} {activePeriod}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_SLOTS.map((slot) => {
                const isCurrent =
                  activeHour === slot.h && activeMinute === slot.m && activePeriod === slot.p;
                return (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => {
                      setActiveHour(slot.h);
                      setActiveMinute(slot.m);
                      setActivePeriod(slot.p);
                    }}
                    className={`py-1 px-1 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer border-0 text-center ${
                      isCurrent
                        ? 'bg-[#16281D] text-white shadow-xs'
                        : isDark
                        ? 'bg-[#203628] hover:bg-[#274232] text-[#8FA89B]'
                        : 'bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D]'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Time Selector Row */}
          <div className="pt-2.5 mt-2.5 border-t border-[#EAEAEA]/80 flex items-center justify-between gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#8FA89B]' : 'text-[#A1A1AA]'}`}>
              Custom Time
            </span>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {/* Hour */}
              <select
                value={activeHour}
                onChange={(e) => setActiveHour(e.target.value)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer outline-none border ${
                  isDark
                    ? 'bg-[#203628] border-white/10 text-white'
                    : 'bg-[#F4F7F4] border-[#EAEAEA] text-[#16281D]'
                }`}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span>:</span>
              {/* Minute */}
              <select
                value={activeMinute}
                onChange={(e) => setActiveMinute(e.target.value)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer outline-none border ${
                  isDark
                    ? 'bg-[#203628] border-white/10 text-white'
                    : 'bg-[#F4F7F4] border-[#EAEAEA] text-[#16281D]'
                }`}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {/* AM / PM Toggle Pill */}
              <div className={`flex rounded-full p-0.5 border ${
                isDark ? 'bg-[#203628] border-white/10' : 'bg-[#F4F7F4] border-[#EAEAEA]'
              }`}>
                <button
                  type="button"
                  onClick={() => setActivePeriod('AM')}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border-0 transition-all ${
                    activePeriod === 'AM'
                      ? 'bg-[#16281D] text-white shadow-xs'
                      : 'text-[#71717A] hover:text-[#16281D]'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setActivePeriod('PM')}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border-0 transition-all ${
                    activePeriod === 'PM'
                      ? 'bg-[#16281D] text-white shadow-xs'
                      : 'text-[#71717A] hover:text-[#16281D]'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#EAEAEA]/80">
            <span className="text-xs font-mono font-medium text-[#71717A] truncate max-w-[170px]">
              {activeDate ? `${activeDate.slice(5)} at ${activeHour}:${activeMinute} ${activePeriod}` : 'Pick a date'}
            </span>
            <button
              type="button"
              disabled={!activeDate}
              onClick={handleApply}
              className="h-8 px-4 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold transition-all cursor-pointer border-0 shadow-[0_2px_8px_rgba(159,232,112,0.3)] disabled:opacity-40 shrink-0"
            >
              Confirm Schedule
            </button>
          </div>
        </div>
      </Portal>
    )}
  </div>
  );
};

export default DateTimePicker;
