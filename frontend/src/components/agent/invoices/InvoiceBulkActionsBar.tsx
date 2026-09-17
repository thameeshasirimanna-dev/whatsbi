import React from "react";
import { CheckCircle2, Download, Trash2, X } from "lucide-react";

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
        background: "#16281D",
        color: "#fff",
        borderRadius: 9999,
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        boxShadow: "0 8px 24px rgba(22,40,29,0.25)",
        border: "1px solid rgba(159,232,112,0.2)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Left: Selected count */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            background: "#9FE870",
            color: "#16281D",
            padding: "3px 10px",
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {selectedCount}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
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
            padding: "6px 14px",
            borderRadius: 9999,
            border: "none",
            background: "#9FE870",
            color: "#16281D",
            fontSize: 12,
            fontWeight: 700,
            cursor: isProcessing ? "not-allowed" : "pointer",
            boxShadow: "0 2px 8px rgba(159,232,112,0.3)",
            transition: "all 0.15s",
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
            padding: "6px 14px",
            borderRadius: 9999,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: isProcessing ? "not-allowed" : "pointer",
            transition: "all 0.15s",
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
            padding: "6px 14px",
            borderRadius: 9999,
            border: "1px solid rgba(244,63,94,0.3)",
            background: "rgba(244,63,94,0.15)",
            color: "#f87171",
            fontSize: 12,
            fontWeight: 600,
            cursor: isProcessing ? "not-allowed" : "pointer",
            transition: "all 0.15s",
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
            borderRadius: 9999,
            border: "none",
            background: "rgba(255,255,255,0.12)",
            color: "#d4d4d8",
            cursor: isProcessing ? "not-allowed" : "pointer",
            marginLeft: 4,
            transition: "all 0.15s",
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default InvoiceBulkActionsBar;
