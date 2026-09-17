import React from "react";
import { Search, Plus } from "lucide-react";
import { Customer } from "./types";
import TimeRangeFilter, { TimeRange } from "../shared/TimeRangeFilter";
import { DM, inputStyle, selectStyle, onFocusG, onBlurG } from "./constants";

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
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #ebebeb",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      {/* Search Bar */}
      <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
        <Search
          size={13}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#a1a1aa",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          placeholder="Search by invoice #, customer, name, or status…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 30 }}
          onFocus={onFocusG}
          onBlur={onBlurG}
        />
      </div>

      {/* Customer Filter */}
      <select
        value={selectedCustomerFilter?.toString() || ""}
        onChange={(e) =>
          onCustomerFilterChange(e.target.value ? parseInt(e.target.value) : null)
        }
        style={{ ...selectStyle, width: "auto", minWidth: 150 }}
        onFocus={onFocusG}
        onBlur={onBlurG}
      >
        <option value="">All Customers</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Time Range Filter */}
      <TimeRangeFilter value={timeRange} onChange={onTimeRangeChange} />

      {/* Rows Per Page */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            ...DM,
            fontSize: 12,
            color: "#71717a",
            whiteSpace: "nowrap",
            fontWeight: 500,
          }}
        >
          Rows:
        </span>
        <select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          style={{
            ...selectStyle,
            width: "auto",
            minWidth: 65,
            padding: "9px 10px",
            fontSize: 12,
          }}
          onFocus={onFocusG}
          onBlur={onBlurG}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Create Invoice Button */}
      <button
        onClick={onCreateInvoiceClick}
        style={{
          background: "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
          color: "#fff",
          border: "none",
          borderRadius: 9,
          padding: "9px 16px",
          ...DM,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(34,197,94,0.25)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <Plus size={14} /> Create Invoice
      </button>
    </div>
  );
};

export default InvoiceToolbar;
