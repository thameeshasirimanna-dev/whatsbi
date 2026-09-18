import React from "react";
import { Search, Plus, X } from "lucide-react";
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
    <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-xs p-3.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3 font-sans">
      {/* Row 1: Search & Primary Actions (Full width) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
        {/* Search Bar Capsule */}
        <div className="relative flex-1 min-w-0 flex items-center">
          <Search
            size={14}
            className="absolute left-3.5 text-[#a1a1aa] pointer-events-none shrink-0"
          />
          <input
            type="text"
            placeholder="Search by invoice #, customer, name, or status…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-9 pr-9 rounded-full bg-white border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all duration-150 focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/20"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 w-5 h-5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717a] hover:text-[#16281D] cursor-pointer border-0 transition-colors"
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Rows Per Page & Create Invoice Button */}
        <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end shrink-0">
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

          <button
            type="button"
            onClick={onCreateInvoiceClick}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2.5 px-4 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all shrink-0"
          >
            <Plus size={14} strokeWidth={2.8} /> Create Invoice
          </button>
        </div>
      </div>

      {/* Row 2: Filters Grid (Full fill 100% row width across all screen sizes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2 sm:gap-2.5 w-full">
        {/* Customer Filter */}
        <div className={`col-span-1 w-full min-w-0 ${timeRange.preset === "custom" ? "lg:w-64 lg:shrink-0" : "lg:flex-1"}`}>
          <CustomDropdown
            value={selectedCustomerFilter?.toString() || ""}
            onChange={(val) =>
              onCustomerFilterChange(val ? parseInt(val) : null)
            }
            options={[
              { value: "", label: "All Customers" },
              ...customers.map((c) => ({
                value: c.id.toString(),
                label: c.name,
                badge: c.phone || undefined,
              })),
            ]}
            placeholder="All Customers"
            searchable={true}
            searchPlaceholder="Search customer..."
            className="w-full"
          />
        </div>

        {/* Time Range Filter */}
        <div className="col-span-1 lg:flex-1 w-full min-w-0">
          <TimeRangeFilter
            value={timeRange}
            onChange={onTimeRangeChange}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceToolbar;
