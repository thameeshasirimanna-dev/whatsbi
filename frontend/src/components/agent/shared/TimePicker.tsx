import React, { useState, useRef, useEffect, useId } from 'react';
import { Clock, X } from 'lucide-react';

export interface TimePickerProps {
  value?: string | null; // Format: "HH:mm" or "hh:mm AM/PM" (e.g. "14:30" or "02:30 PM")
  onChange: (time: string | null) => void;
  placeholder?: string;
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

const HOURS = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const QUICK_SLOTS = ['09:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '03:30 PM', '05:00 PM'];

// Parse incoming value into { hour, minute, period }
function parseTime(val: string | null | undefined): { hour: string; minute: string; period: 'AM' | 'PM' } {
  if (!val) return { hour: '09', minute: '00', period: 'AM' };

  // Check if standard 12-hr with AM/PM
  const match12 = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    const h = String(parseInt(match12[1], 10)).padStart(2, '0');
    return { hour: h === '00' ? '12' : h, minute: match12[2], period: match12[3].toUpperCase() as 'AM' | 'PM' };
  }

  // Check if 24-hr format (e.g. "14:30")
  const match24 = val.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2];
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return { hour: String(h).padStart(2, '0'), minute: m, period };
  }

  return { hour: '09', minute: '00', period: 'AM' };
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select time...',
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
  const timePickerId = id || generatedId;

  const parsed = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(parsed.period);

  useEffect(() => {
    if (value) {
      const p = parseTime(value);
      setSelectedHour(p.hour);
      setSelectedMinute(p.minute);
      setSelectedPeriod(p.period);
    }
  }, [value]);

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

  const commitTime = (h: string, m: string, p: 'AM' | 'PM') => {
    const formatted = `${h}:${m} ${p}`;
    onChange(formatted);
  };

  const handleQuickSlot = (slot: string) => {
    onChange(slot);
    const p = parseTime(slot);
    setSelectedHour(p.hour);
    setSelectedMinute(p.minute);
    setSelectedPeriod(p.period);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block font-sans ${className}`}>
      {/* Capsule Trigger */}
      <button
        id={timePickerId}
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
          <Clock
            size={size === 'sm' ? 13 : 15}
            className={isDark ? 'text-[#9FE870] shrink-0' : 'text-[#16281D] shrink-0'}
            strokeWidth={2.2}
          />
          <span className={`truncate ${!value ? (isDark ? 'text-[#8FA89B]' : 'text-[#71717A]') : 'font-bold'}`}>
            {value || placeholder}
          </span>
        </div>

        {value && !disabled && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="w-4 h-4 rounded-full flex items-center justify-center text-[#71717A] hover:text-[#16281D] hover:bg-black/5 ml-1 transition-colors"
            title="Clear time"
          >
            <X size={11} strokeWidth={2.4} />
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Time picker popover"
          className={`absolute top-[calc(100%+8px)] ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-50 w-[280px] p-4 rounded-3xl transition-all shadow-[0_16px_48px_rgba(20,40,24,0.16)] animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-[#16281D] border border-white/10 text-white'
              : 'bg-white border border-[#EAEAEA] text-[#16281D]'
          } ${popoverClassName}`}
        >
          {/* Quick Presets */}
          {showPresets && (
            <div className="mb-3 pb-2.5 border-b border-[#EAEAEA]/80">
              <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-[#8FA89B]' : 'text-[#A1A1AA]'}`}>
                Common Slots
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {QUICK_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleQuickSlot(slot)}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer border-0 ${
                      value === slot
                        ? 'bg-[#9FE870] text-[#16281D] shadow-xs'
                        : isDark
                        ? 'bg-[#203628] hover:bg-[#274232] text-white'
                        : 'bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D]'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time Picker Columns */}
          <div className="flex items-center justify-center gap-2 my-2">
            {/* Hour Selector */}
            <div className="flex flex-col items-center">
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#8FA89B]' : 'text-[#A1A1AA]'}`}>
                Hour
              </span>
              <div className={`h-36 overflow-y-auto w-12 rounded-xl border p-1 flex flex-col gap-1 text-center font-mono ${
                isDark ? 'border-white/10 bg-[#203628]/40' : 'border-[#EAEAEA] bg-[#FAFAF9]'
              }`}>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setSelectedHour(h);
                      commitTime(h, selectedMinute, selectedPeriod);
                    }}
                    className={`h-7 w-full rounded-full text-xs font-bold transition-all cursor-pointer border-0 flex items-center justify-center ${
                      selectedHour === h
                        ? 'bg-[#9FE870] text-[#16281D] shadow-xs'
                        : isDark
                        ? 'text-white hover:bg-[#203628]'
                        : 'text-[#16281D] hover:bg-[#EAEAEA]'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xl font-bold font-mono pt-4 text-[#71717A]">:</span>

            {/* Minute Selector */}
            <div className="flex flex-col items-center">
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#8FA89B]' : 'text-[#A1A1AA]'}`}>
                Min
              </span>
              <div className={`h-36 overflow-y-auto w-12 rounded-xl border p-1 flex flex-col gap-1 text-center font-mono ${
                isDark ? 'border-white/10 bg-[#203628]/40' : 'border-[#EAEAEA] bg-[#FAFAF9]'
              }`}>
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSelectedMinute(m);
                      commitTime(selectedHour, m, selectedPeriod);
                    }}
                    className={`h-7 w-full rounded-full text-xs font-bold transition-all cursor-pointer border-0 flex items-center justify-center ${
                      selectedMinute === m
                        ? 'bg-[#9FE870] text-[#16281D] shadow-xs'
                        : isDark
                        ? 'text-white hover:bg-[#203628]'
                        : 'text-[#16281D] hover:bg-[#EAEAEA]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* AM / PM Toggle Pills */}
            <div className="flex flex-col items-center ml-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#8FA89B]' : 'text-[#A1A1AA]'}`}>
                Period
              </span>
              <div className={`p-1 rounded-full border flex flex-col gap-1 ${
                isDark ? 'bg-[#203628]/60 border-white/10' : 'bg-[#FAFAF9] border-[#EAEAEA]'
              }`}>
                {(['AM', 'PM'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(period);
                      commitTime(selectedHour, selectedMinute, period);
                    }}
                    className={`w-10 py-1.5 rounded-full text-xs font-bold font-mono transition-all cursor-pointer border-0 ${
                      selectedPeriod === period
                        ? 'bg-[#16281D] text-white shadow-xs'
                        : isDark
                        ? 'text-[#8FA89B] hover:text-white'
                        : 'text-[#71717A] hover:text-[#16281D]'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
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
              onClick={() => {
                commitTime(selectedHour, selectedMinute, selectedPeriod);
                setIsOpen(false);
              }}
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

export default TimePicker;
