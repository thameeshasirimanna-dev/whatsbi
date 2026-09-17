import React from "react";
import { Calendar, X } from "lucide-react";
import { DatePicker } from "./DatePicker";

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

import CustomDropdown, { DropdownOption } from "./CustomDropdown";

const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({ value, onChange, placeholder }) => {
  const isActive = value.preset !== null;

  const dropdownOptions: DropdownOption<string>[] = [
    { value: "", label: placeholder || "Date Range..." },
    ...PRESETS.map((p) => ({ value: p.value, label: p.label })),
  ];

  const handlePresetSelect = (presetVal: string) => {
    const preset = (presetVal === "" ? null : presetVal) as TimeRange["preset"];
    if (!preset) {
      onChange(emptyTimeRange);
    } else if (preset === "custom") {
      onChange({ preset: "custom", from: value.from, to: value.to });
    } else {
      onChange({ preset, from: null, to: null });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <CustomDropdown
        value={value.preset ?? ""}
        onChange={handlePresetSelect}
        options={dropdownOptions}
        placeholder={placeholder || "Date Range..."}
        icon={
          <Calendar
            size={13}
            className={`transition-colors ${isActive ? "text-[#15803D]" : "text-[#71717A]"}`}
          />
        }
        variant="mint"
        triggerClassName={
          isActive
            ? "!bg-[#22C55E]/10 !border-[#22C55E]/30 !text-[#16281D] !font-bold"
            : ""
        }
        minWidth={150}
      />

      {value.preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <DatePicker
            value={value.from ?? null}
            onChange={(d) => onChange({ ...value, from: d || null })}
            placeholder="From..."
            size="sm"
            variant="mint"
            maxDate={value.to ?? undefined}
          />
          <span className="text-xs text-[#71717A]">to</span>
          <DatePicker
            value={value.to ?? null}
            onChange={(d) => onChange({ ...value, to: d || null })}
            placeholder="To..."
            size="sm"
            variant="mint"
            minDate={value.from ?? undefined}
          />
        </div>
      )}

      {isActive && (
        <button
          onClick={() => onChange(emptyTimeRange)}
          title="Clear date filter"
          className="w-7 h-7 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};

export default TimeRangeFilter;
