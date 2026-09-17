import React from "react";
import { CheckCircle2, Download, Trash2, X } from "lucide-react";
import { SYNE, DM } from "./constants";

interface InvoiceBulkActionsBarProps {
  selectedCount: number;
  onBulkMarkPaid: () => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

export const InvoiceBulkActionsBar: React.FC<InvoiceBulkActionsBarProps> = ({
  selectedCount,
  onBulkMarkPaid,
  onBulkDownload,
  onBulkDelete,
  onClearSelection,
  isProcessing = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className="animate-dropdown"
      style={{
        background: "#0c1a0e",
        color: "#fff",
        borderRadius: 12,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        boxShadow: "0 8px 24px rgba(12,26,14,0.25)",
        border: "1px solid #1a3620",
      }}
    >
      {/* Left: Selected count */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            background: "#22c55e",
            color: "#060e07",
            padding: "2px 8px",
            borderRadius: 12,
            ...SYNE,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {selectedCount}
        </span>
        <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: "#fff" }}>
          {selectedCount === 1 ? "1 invoice selected" : `${selectedCount} invoices selected`}
        </span>
      </div>

      {/* Right: Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Bulk Mark as Paid */}
        <button
          onClick={onBulkMarkPaid}
          disabled={isProcessing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.15)",
            color: "#4ade80",
            ...DM,
            fontSize: 12,
            fontWeight: 600,
            cursor: isProcessing ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) e.currentTarget.style.background = "rgba(34,197,94,0.25)";
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) e.currentTarget.style.background = "rgba(34,197,94,0.15)";
          }}
        >
          <CheckCircle2 size={13} />
          Mark as Paid
        </button>

        {/* Bulk Download */}
        <button
          onClick={onBulkDownload}
          disabled={isProcessing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            ...DM,
            fontSize: 12,
            fontWeight: 600,
            cursor: isProcessing ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) e.currentTarget.style.background = "rgba(255,255,255,0.15)";
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          }}
        >
          <Download size={13} />
          Download PDFs
        </button>

        {/* Bulk Delete */}
        <button
          onClick={onBulkDelete}
          disabled={isProcessing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid rgba(244,63,94,0.3)",
            background: "rgba(244,63,94,0.15)",
            color: "#f43f5e",
            ...DM,
            fontSize: 12,
            fontWeight: 600,
            cursor: isProcessing ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) e.currentTarget.style.background = "rgba(244,63,94,0.25)";
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) e.currentTarget.style.background = "rgba(244,63,94,0.15)";
          }}
        >
          <Trash2 size={13} />
          Delete
        </button>

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          disabled={isProcessing}
          title="Clear selection"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "none",
            background: "rgba(255,255,255,0.1)",
            color: "#a1a1aa",
            cursor: isProcessing ? "not-allowed" : "pointer",
            marginLeft: 4,
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) e.currentTarget.style.color = "#a1a1aa";
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default InvoiceBulkActionsBar;
