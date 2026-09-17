import React from "react";
import { Search, Plus } from "lucide-react";
import { Customer } from "./types";
import TimeRangeFilter, { TimeRange } from "../shared/TimeRangeFilter";
import CustomDropdown from "../shared/CustomDropdown";

interface InvoiceToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedCustomerFilter: number | null;
  onCustomerFilterChange: (id: number | null) => void;
  customers: Customer[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (rows: number) => void;
  onCreateInvoiceClick: () => void;
}

export const InvoiceToolbar: React.FC<InvoiceToolbarProps> = ({
  searchTerm,
  onSearchChange,
  selectedCustomerFilter,
  onCustomerFilterChange,
  customers,
  timeRange,
  onTimeRangeChange,
  rowsPerPage,
  onRowsPerPageChange,
  onCreateInvoiceClick,
}) => {
  return (
    <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-xs p-3.5 sm:p-4 flex items-center flex-wrap gap-2.5 font-sans">
      {/* Search Bar Capsule */}
      <div className="relative flex-1 min-w-[220px]">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search by invoice #, customer, name, or status…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-full bg-[#FAFAFA] border border-[#E4E4E7] focus:bg-white focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 text-xs font-medium text-[#16281D] placeholder-[#A1A1AA] outline-none transition-all box-border"
        />
      </div>

      {/* Customer Filter */}
      <CustomDropdown
        value={selectedCustomerFilter?.toString() || ""}
        onChange={(val) =>
          onCustomerFilterChange(val ? parseInt(val) : null)
        }
        options={[
          { value: "", label: "All Customers" },
          ...customers.map((c) => ({ value: c.id.toString(), label: c.name })),
        ]}
        placeholder="All Customers"
        minWidth={150}
      />

      {/* Time Range Filter */}
      <TimeRangeFilter value={timeRange} onChange={onTimeRangeChange} />

      {/* Rows Per Page */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-semibold text-[#71717A] whitespace-nowrap">
          Rows:
        </span>
        <CustomDropdown
          value={rowsPerPage}
          onChange={(val) => onRowsPerPageChange(Number(val))}
          options={[
            { value: 10, label: "10" },
            { value: 20, label: "20" },
            { value: 50, label: "50" },
            { value: 100, label: "100" },
          ]}
          minWidth={75}
        />
      </div>

      {/* Primary Lime Capsule Create Invoice Button */}
      <button
        type="button"
        onClick={onCreateInvoiceClick}
        className="inline-flex items-center gap-1.5 bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2.5 px-4 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all shrink-0"
      >
        <Plus size={14} strokeWidth={2.8} /> Create Invoice
      </button>
    </div>
  );
};

export default InvoiceToolbar;
