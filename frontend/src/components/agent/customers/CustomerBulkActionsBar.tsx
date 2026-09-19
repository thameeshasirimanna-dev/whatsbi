import React from "react";
import { Send, Trash2, X, Users } from "lucide-react";
import { BulkProgressTracker, BulkProgress } from "../shared/BulkProgress";

interface CustomerBulkActionsBarProps {
  selectedCount: number;
  onBulkBroadcast: () => void;
  onBulkAddToGroup?: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
  bulkProgress?: BulkProgress | null;
}

export const CustomerBulkActionsBar: React.FC<CustomerBulkActionsBarProps> = ({
  selectedCount,
  onBulkBroadcast,
  onBulkAddToGroup,
  onBulkDelete,
  onClearSelection,
  isProcessing = false,
  bulkProgress,
}) => {
  if (selectedCount === 0 && !bulkProgress) return null;

  return (
    <div
      className="animate-dropdown"
      style={{
        background: "#16281D",
        color: "#fff",
        borderRadius: 9999,
        padding: "8px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        boxShadow: "0 12px 32px rgba(22,40,29,0.35)",
        border: "1px solid rgba(159,232,112,0.25)",
        position: "relative",
        zIndex: 20,
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
            padding: "2px 10px",
            borderRadius: 9999,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {selectedCount}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
          {selectedCount === 1
            ? "1 customer selected"
            : `${selectedCount} customers selected`}
        </span>
      </div>

      {/* Right: Action Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Bulk Broadcast */}
        <button
          onClick={onBulkBroadcast}
          disabled={isProcessing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 16px",
            borderRadius: 9999,
            border: "1px solid #9FE870",
            background: "rgba(159,232,112,0.15)",
            color: "#9FE870",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            cursor: isProcessing ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = "#9FE870";
              e.currentTarget.style.color = "#16281D";
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = "rgba(159,232,112,0.15)";
              e.currentTarget.style.color = "#9FE870";
            }
          }}
        >
          <Send size={13} />
          Send Broadcast
        </button>

        {/* Bulk Add to Group */}
        {onBulkAddToGroup && (
          <button
            onClick={onBulkAddToGroup}
            disabled={isProcessing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 9999,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: isProcessing ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.background = "rgba(159,232,112,0.15)";
                e.currentTarget.style.color = "#9FE870";
                e.currentTarget.style.borderColor = "#9FE870";
              }
            }}
            onMouseLeave={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }
            }}
          >
            <Users size={13} />
            Add to Group
          </button>
        )}

        {/* Bulk Delete */}
        <button
          onClick={onBulkDelete}
          disabled={isProcessing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 16px",
            borderRadius: 9999,
            border: "1px solid rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.15)",
            color: "#FCA5A5",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            cursor: isProcessing ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = "#EF4444";
              e.currentTarget.style.color = "#FFFFFF";
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = "rgba(239,68,68,0.15)";
              e.currentTarget.style.color = "#FCA5A5";
            }
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
            width: 30,
            height: 30,
            borderRadius: 9999,
            border: "none",
            background: "rgba(255,255,255,0.12)",
            color: "#A1A1AA",
            cursor: isProcessing ? "not-allowed" : "pointer",
            marginLeft: 4,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.color = "#A1A1AA";
              e.currentTarget.style.background = "rgba(255,255,255,0.12)";
            }
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

export default CustomerBulkActionsBar;
