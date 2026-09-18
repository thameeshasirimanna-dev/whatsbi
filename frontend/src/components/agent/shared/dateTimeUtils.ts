export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const QUICK_SLOTS = [
  { label: '09:00 AM', h: '09', m: '00', p: 'AM' as const },
  { label: '10:30 AM', h: '10', m: '30', p: 'AM' as const },
  { label: '02:00 PM', h: '02', m: '00', p: 'PM' as const },
  { label: '04:30 PM', h: '04', m: '30', p: 'PM' as const },
];

export const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
export const MINUTES = ['00', '15', '30', '45'];

export interface ParsedDateTime {
  date: string;
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
  wasIso: boolean;
}

export function parseDateTimeValue(val: string | null | undefined): ParsedDateTime {
  if (!val) {
    return { date: '', hour: '09', minute: '00', period: 'AM', wasIso: true };
  }

  const wasIso = val.includes('T') || val.endsWith('Z');
  const cleaned = val.replace('T', ' ').replace(/Z$/, '').trim();
  const parts = cleaned.split(' ');
  const date = parts[0] || '';
  const rest = parts.slice(1).join(' ').trim();

  const match = rest.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    let p = (match[3] ? match[3].toUpperCase() : '') as 'AM' | 'PM';
    if (!p) {
      p = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
    } else {
      if (h === 0) h = 12;
    }
    return {
      date,
      hour: String(h).padStart(2, '0'),
      minute: m,
      period: p,
      wasIso,
    };
  }

  return { date, hour: '09', minute: '00', period: 'AM', wasIso };
}

export function to24Hour(hour12: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour12, 10);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}`;
}
