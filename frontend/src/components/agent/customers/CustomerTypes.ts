import { TimeRange } from '../shared/TimeRangeFilter';

export const PJS: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
export const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  color: '#16281D',
  background: '#F4F7F4',
  border: '1px solid #EAEAEA',
  borderRadius: 12,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  borderRadius: 9999,
  padding: '8px 16px',
  appearance: 'none',
  cursor: 'pointer',
};

export const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#9FE870';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(159,232,112,0.25)';
};

export const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#EAEAEA';
  e.currentTarget.style.boxShadow = 'none';
};

export const thCell: React.CSSProperties = {
  padding: '10px 16px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 11,
  fontWeight: 600,
  color: '#71717A',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textAlign: 'left',
  background: '#F4F7F4',
  borderBottom: '1px solid #EAEAEA',
};

export interface ProfileImage {
  phone: string;
  url?: string;
  loading: boolean;
  error: boolean;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  created_at: string;
  lead_stage?: string;
  interest_stage?: string;
  conversion_stage?: string;
  order_count: number;
  profile_image_url?: string;
}

export interface Metrics {
  totalCustomers: number;
  newThisMonth: number;
  totalOrders: number;
  activeCountries: number;
  trendPercentage: number;
  label: string;
  prevLabel: string;
}

export const leadStages = ["New Lead", "Contacted", "Not Responding", "Follow-up Needed"] as const;
export const interestStages = ["Interested", "Quotation Sent", "Asked for More Info"] as const;
export const conversionStages = ["Payment Pending", "Paid", "Order Confirmed"] as const;

export const countryCodes = [
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+91", label: "🇮🇳 +91" },
  { value: "+94", label: "🇱🇰 +94" },
  { value: "+971", label: "🇦🇪 +971" },
  { value: "+966", label: "🇸🇦 +966" },
  { value: "+92", label: "🇵🇰 +92" },
  { value: "+880", label: "🇧🇩 +880" },
  { value: "+98", label: "🇮🇷 +98" },
  { value: "+20", label: "🇪🇬 +20" },
];

export const getProgressDotColor = (customer: Customer): string => {
  if (customer.conversion_stage) return '#22C55E';
  if (customer.interest_stage) return '#F59E0B';
  return '#3B82F6';
};

export const getProgressStyle = (customer: Customer): React.CSSProperties => {
  if (customer.conversion_stage) return { background: '#DCFCE7', color: '#15803D' };
  if (customer.interest_stage) return { background: '#FEF3C7', color: '#B45309' };
  return { background: '#DBEAFE', color: '#1D4ED8' };
};

export const getProgressLabel = (customer: Customer): string => {
  if (customer.conversion_stage) return customer.conversion_stage;
  if (customer.interest_stage) return customer.interest_stage;
  return customer.lead_stage || 'New Lead';
};

export const detectCountryCode = (phone: string): string => {
  if (!phone) return "+1";
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.startsWith("1")) return "+1";
  if (cleanPhone.startsWith("44")) return "+44";
  if (cleanPhone.startsWith("91")) return "+91";
  if (cleanPhone.startsWith("94")) return "+94";
  if (cleanPhone.startsWith("971")) return "+971";
  if (cleanPhone.startsWith("966")) return "+966";
  if (cleanPhone.startsWith("92")) return "+92";
  if (cleanPhone.startsWith("880")) return "+880";
  if (cleanPhone.startsWith("98")) return "+98";
  if (cleanPhone.startsWith("20")) return "+20";
  return "+1";
};

export const getFlagEmoji = (countryCode: string): string => {
  const flags: Record<string, string> = {
    "+1": "🇺🇸", "+44": "🇬🇧", "+91": "🇮🇳", "+94": "🇱🇰",
    "+971": "🇦🇪", "+966": "🇸🇦", "+92": "🇵🇰", "+880": "🇧🇩",
    "+98": "🇮🇷", "+20": "🇪🇬",
  };
  return flags[countryCode] || "🌍";
};

export const extractLocalNumber = (phone: string, countryCode: string): string => {
  const cleanPhone = phone.replace(/\D/g, "");
  const codeDigits = countryCode.replace("+", "");
  if (cleanPhone.startsWith(codeDigits)) return cleanPhone.substring(codeDigits.length);
  return cleanPhone;
};

export const getTimeRangeDates = (range: TimeRange) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let start = new Date(0);
  let end = new Date(now.getTime() + 86400000 * 365);
  let label = "Total";
  let prevStart = new Date(0);
  let prevEnd = new Date(0);
  let prevLabel = "vs last month";

  if (range.preset === "today") {
    start = startOfToday;
    end = new Date(startOfToday.getTime() + 86400000);
    label = "Today";
    prevStart = new Date(startOfToday.getTime() - 86400000);
    prevEnd = startOfToday;
    prevLabel = "vs yesterday";
  } else if (range.preset === "yesterday") {
    start = new Date(startOfToday.getTime() - 86400000);
    end = startOfToday;
    label = "Yesterday";
    prevStart = new Date(startOfToday.getTime() - 86400000 * 2);
    prevEnd = start;
    prevLabel = "vs day before";
  } else if (range.preset === "week") {
    const dayOfWeek = startOfToday.getDay();
    start = new Date(startOfToday);
    start.setDate(start.getDate() - dayOfWeek);
    end = new Date(start.getTime() + 86400000 * 7);
    label = "This Week";
    prevStart = new Date(start.getTime() - 86400000 * 7);
    prevEnd = start;
    prevLabel = "vs last week";
  } else if (range.preset === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    label = "This Month";
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = start;
    prevLabel = "vs last month";
  } else if (range.preset === "last_month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 1);
    label = "Last Month";
    prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    prevEnd = start;
    prevLabel = "vs month before";
  } else if (range.preset === "last_3_months") {
    start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    end = new Date(now.getTime() + 86400000);
    label = "Last 3 Months";
    const diff = end.getTime() - start.getTime();
    prevStart = new Date(start.getTime() - diff);
    prevEnd = start;
    prevLabel = "vs prev 3 months";
  } else if (range.preset === "custom") {
    if (range.from) start = new Date(range.from);
    if (range.to) {
      end = new Date(range.to);
      end.setDate(end.getDate() + 1);
    }
    label = "Period";
    const diff = end.getTime() - start.getTime();
    if (diff > 0 && start.getTime() > 0) {
      prevStart = new Date(start.getTime() - diff);
      prevEnd = start;
      prevLabel = "vs prev period";
    }
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    label = "This Month";
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = start;
    prevLabel = "vs last month";
  }

  return { start, end, label, prevStart, prevEnd, prevLabel };
};

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.12, ease: "easeIn" } },
};
