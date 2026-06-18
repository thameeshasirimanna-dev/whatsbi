import React from "react";
import { Calendar, X, ChevronDown } from "lucide-react";

const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export interface TimeRange {
  preset: "today" | "yesterday" | "week" | "month" | "last_month" | "last_3_months" | "custom" | null;
  from: string | null;
  to: string | null;
}

export const emptyTimeRange: TimeRange = { preset: null, from: null, to: null };

export function matchesTimeRange(
  dateStr: string | null | undefined,
  range: TimeRange
): boolean {
  if (!range.preset) return true;
  if (!dateStr) return false;

  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range.preset === "today") {
    return date >= startOfToday;
  }
  if (range.preset === "yesterday") {
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    return date >= startOfYesterday && date < startOfToday;
  }
  if (range.preset === "week") {
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return date >= startOfWeek;
  }
  if (range.preset === "month") {
    return date >= new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (range.preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= start && date < end;
  }
  if (range.preset === "last_3_months") {
    const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    return date >= start;
  }
  if (range.preset === "custom") {
    let pass = true;
    if (range.from) pass = pass && date >= new Date(range.from);
    if (range.to) {
      const toEnd = new Date(range.to);
      toEnd.setDate(toEnd.getDate() + 1);
      pass = pass && date < toEnd;
    }
    return pass;
  }
  return true;
}

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  placeholder?: string;
}

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "custom", label: "Custom Range" },
];

const base: React.CSSProperties = {
  ...DM,
  fontSize: 13,
  color: "#3f3f46",
  background: "#f9f9f9",
  border: "1px solid #ebebeb",
  borderRadius: 9,
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "#22c55e";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.1)";
};

const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({ value, onChange, placeholder }) => {
  const isActive = value.preset !== null;

  const handlePreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as TimeRange["preset"];
    if (!preset) {
      onChange(emptyTimeRange);
    } else if (preset === "custom") {
      onChange({ preset: "custom", from: value.from, to: value.to });
    } else {
      onChange({ preset, from: null, to: null });
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = isActive ? "rgba(34,197,94,0.35)" : "#ebebeb";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <div style={{ position: "relative" }}>
        <Calendar
          size={13}
          style={{
            position: "absolute",
            left: 9,
            top: "50%",
            transform: "translateY(-50%)",
            color: isActive ? "#059669" : "#a1a1aa",
            pointerEvents: "none",
          }}
        />
        <select
          value={value.preset ?? ""}
          onChange={handlePreset}
          onFocus={onFocus}
          onBlur={onBlur}
          style={{
            ...base,
            padding: "9px 30px 9px 28px",
            appearance: "none",
            cursor: "pointer",
            minWidth: 148,
            background: isActive ? "rgba(34,197,94,0.06)" : "#f9f9f9",
            border: isActive ? "1px solid rgba(34,197,94,0.35)" : "1px solid #ebebeb",
            color: isActive ? "#0c1a0e" : "#a1a1aa",
          }}
        >
          <option value="">{placeholder || "Date Range..."}</option>
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={11}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#a1a1aa",
            pointerEvents: "none",
          }}
        />
      </div>

      {value.preset === "custom" && (
        <>
          <input
            type="date"
            value={value.from ?? ""}
            onChange={(e) => onChange({ ...value, from: e.target.value || null })}
            onFocus={onFocus}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#ebebeb"; e.currentTarget.style.boxShadow = "none"; }}
            style={{ ...base, padding: "9px 10px", minWidth: 136, cursor: "pointer" }}
          />
          <span style={{ ...DM, fontSize: 12, color: "#a1a1aa", flexShrink: 0 }}>to</span>
          <input
            type="date"
            value={value.to ?? ""}
            min={value.from ?? undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value || null })}
            onFocus={onFocus}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#ebebeb"; e.currentTarget.style.boxShadow = "none"; }}
            style={{ ...base, padding: "9px 10px", minWidth: 136, cursor: "pointer" }}
          />
        </>
      )}

      {isActive && (
        <button
          onClick={() => onChange(emptyTimeRange)}
          title="Clear date filter"
          style={{
            width: 32,
            height: 32,
            border: "none",
            background: "rgba(244,63,94,0.08)",
            borderRadius: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.14)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.08)")}
        >
          <X size={12} style={{ color: "#f43f5e" }} />
        </button>
      )}
    </div>
  );
};

export default TimeRangeFilter;
