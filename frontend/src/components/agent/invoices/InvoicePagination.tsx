import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPageNumbers } from "./constants";

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
        padding: "14px 20px",
        borderTop: "1px solid #EAEAEA",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Entries Status */}
      <div style={{ fontSize: 12, color: "#71717a" }}>
        Showing{" "}
        <strong style={{ color: "#16281D" }}>
          {totalInvoicesCount === 0 ? 0 : startIndex + 1}
        </strong>{" "}
        to <strong style={{ color: "#16281D" }}>{endIndex}</strong> of{" "}
        <strong style={{ color: "#16281D" }}>{totalInvoicesCount}</strong>{" "}
        invoices
      </div>

      {/* Page Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(1, effectiveCurrentPage - 1), true)}
          disabled={effectiveCurrentPage <= 1}
          title="Previous page"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 9999,
            border: "1px solid #EAEAEA",
            background: effectiveCurrentPage <= 1 ? "#F4F7F4" : "#fff",
            color: effectiveCurrentPage <= 1 ? "#d4d4d8" : "#16281D",
            cursor: effectiveCurrentPage <= 1 ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (effectiveCurrentPage > 1) {
              e.currentTarget.style.borderColor = "#9FE870";
              e.currentTarget.style.background = "#F4F7F4";
            }
          }}
          onMouseLeave={(e) => {
            if (effectiveCurrentPage > 1) {
              e.currentTarget.style.borderColor = "#EAEAEA";
              e.currentTarget.style.background = "#fff";
            }
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
                minWidth: 32,
                height: 32,
                padding: "0 10px",
                borderRadius: 9999,
                border: isCurrent ? "1px solid #9FE870" : "1px solid #EAEAEA",
                background: isCurrent ? "#9FE870" : "#fff",
                color: "#16281D",
                fontSize: 12,
                fontWeight: isCurrent ? 700 : 500,
                cursor: "pointer",
                boxShadow: isCurrent ? "0 2px 8px rgba(159,232,112,0.3)" : "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.borderColor = "#9FE870";
                  e.currentTarget.style.background = "#F4F7F4";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.borderColor = "#EAEAEA";
                  e.currentTarget.style.background = "#fff";
                }
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
            width: 32,
            height: 32,
            borderRadius: 9999,
            border: "1px solid #EAEAEA",
            background: effectiveCurrentPage >= totalPages ? "#F4F7F4" : "#fff",
            color: effectiveCurrentPage >= totalPages ? "#d4d4d8" : "#16281D",
            cursor: effectiveCurrentPage >= totalPages ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (effectiveCurrentPage < totalPages) {
              e.currentTarget.style.borderColor = "#9FE870";
              e.currentTarget.style.background = "#F4F7F4";
            }
          }}
          onMouseLeave={(e) => {
            if (effectiveCurrentPage < totalPages) {
              e.currentTarget.style.borderColor = "#EAEAEA";
              e.currentTarget.style.background = "#fff";
            }
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default InvoicePagination;
