import React, { useState } from "react";
import { CheckCircle2, ChevronDown, Trash2, X, RefreshCw } from "lucide-react";
import { BulkProgressTracker, BulkProgress } from "../shared/BulkProgress";

interface OrderBulkActionsBarProps {
  selectedCount: number;
  onBulkMarkPaid: () => void;
  onBulkUpdateStatus: (status: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
  bulkProgress?: BulkProgress | null;
}

export const OrderBulkActionsBar: React.FC<OrderBulkActionsBarProps> = ({
  selectedCount,
  onBulkMarkPaid,
  onBulkUpdateStatus,
  onBulkDelete,
  onClearSelection,
  isProcessing = false,
  bulkProgress,
}) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  if (selectedCount === 0 && !bulkProgress) return null;

  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Processing", value: "processing" },
    { label: "Shipped", value: "shipped" },
    { label: "Delivered", value: "delivered" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

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
        position: "relative",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {bulkProgress ? (
        <BulkProgressTracker progress={bulkProgress} />
      ) : (
        <>
          {/* Left: Selected count */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                background: "#9FE870",
                color: "#16281D",
                padding: "3px 10px",
            borderRadius: 9999,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {selectedCount}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
          {selectedCount === 1 ? "1 order selected" : `${selectedCount} orders selected`}
        </span>
      </div>

      {/* Right: Action Buttons */}
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

        {/* Change Status Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowStatusDropdown((prev) => !prev)}
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
            <RefreshCw size={12} />
            Change Status
            <ChevronDown size={12} />
          </button>

          {showStatusDropdown && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: "#16281D",
                border: "1px solid rgba(159,232,112,0.2)",
                borderRadius: 14,
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                padding: 6,
                zIndex: 40,
                minWidth: 150,
              }}
            >
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setShowStatusDropdown(false);
                    onBulkUpdateStatus(opt.value);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    color: "#F4F7F4",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(159,232,112,0.15)";
                    e.currentTarget.style.color = "#9FE870";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#F4F7F4";
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

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
        </>
      )}
    </div>
  );
};

export default OrderBulkActionsBar;
