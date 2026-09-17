import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DM, getPageNumbers } from "./constants";

interface InvoicePaginationProps {
  startIndex: number;
  endIndex: number;
  totalInvoicesCount: number;
  effectiveCurrentPage: number;
  totalPages: number;
  onPageChange: (newPage: number, shouldScroll?: boolean) => void;
}

export const InvoicePagination: React.FC<InvoicePaginationProps> = ({
  startIndex,
  endIndex,
  totalInvoicesCount,
  effectiveCurrentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalInvoicesCount === 0) return null;

  return (
    <div
      style={{
        padding: "12px 18px",
        borderTop: "1px solid #ebebeb",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      {/* Entries Status */}
      <div style={{ ...DM, fontSize: 12, color: "#71717a" }}>
        Showing{" "}
        <strong style={{ color: "#0c1a0e" }}>
          {totalInvoicesCount === 0 ? 0 : startIndex + 1}
        </strong>{" "}
        to <strong style={{ color: "#0c1a0e" }}>{endIndex}</strong> of{" "}
        <strong style={{ color: "#0c1a0e" }}>{totalInvoicesCount}</strong>{" "}
        invoices
      </div>

      {/* Page Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(1, effectiveCurrentPage - 1), true)}
          disabled={effectiveCurrentPage <= 1}
          title="Previous page"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 7,
            border: "1px solid #ebebeb",
            background: effectiveCurrentPage <= 1 ? "#f9f9f9" : "#fff",
            color: effectiveCurrentPage <= 1 ? "#d4d4d8" : "#3f3f46",
            cursor: effectiveCurrentPage <= 1 ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (effectiveCurrentPage > 1)
              e.currentTarget.style.borderColor = "#22c55e";
          }}
          onMouseLeave={(e) => {
            if (effectiveCurrentPage > 1)
              e.currentTarget.style.borderColor = "#ebebeb";
          }}
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page Number Buttons */}
        {getPageNumbers(effectiveCurrentPage, totalPages).map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`dots-${idx}`}
                style={{
                  ...DM,
                  fontSize: 12,
                  color: "#a1a1aa",
                  padding: "0 4px",
                }}
              >
                …
              </span>
            );
          }
          const isCurrent = p === effectiveCurrentPage;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p as number, true)}
              style={{
                minWidth: 30,
                height: 30,
                padding: "0 6px",
                borderRadius: 7,
                border: isCurrent ? "none" : "1px solid #ebebeb",
                background: isCurrent
                  ? "linear-gradient(135deg, #22c55e 0%, #059669 100%)"
                  : "#fff",
                color: isCurrent ? "#fff" : "#3f3f46",
                ...DM,
                fontSize: 12,
                fontWeight: isCurrent ? 700 : 500,
                cursor: "pointer",
                boxShadow: isCurrent ? "0 2px 6px rgba(34,197,94,0.3)" : "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) e.currentTarget.style.borderColor = "#22c55e";
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) e.currentTarget.style.borderColor = "#ebebeb";
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={() =>
            onPageChange(Math.min(totalPages, effectiveCurrentPage + 1), true)
          }
          disabled={effectiveCurrentPage >= totalPages}
          title="Next page"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 7,
            border: "1px solid #ebebeb",
            background: effectiveCurrentPage >= totalPages ? "#f9f9f9" : "#fff",
            color: effectiveCurrentPage >= totalPages ? "#d4d4d8" : "#3f3f46",
            cursor: effectiveCurrentPage >= totalPages ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (effectiveCurrentPage < totalPages)
              e.currentTarget.style.borderColor = "#22c55e";
          }}
          onMouseLeave={(e) => {
            if (effectiveCurrentPage < totalPages)
              e.currentTarget.style.borderColor = "#ebebeb";
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default InvoicePagination;
