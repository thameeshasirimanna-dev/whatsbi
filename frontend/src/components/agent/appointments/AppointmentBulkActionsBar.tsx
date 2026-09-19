import React from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDown, Trash2, X, RefreshCw } from "lucide-react";
import { BulkProgressTracker, BulkProgress } from "../shared/BulkProgress";

export interface AppointmentBulkActionsBarProps {
  selectedCount: number;
  onBulkUpdateStatus: (status: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
  bulkProgress?: BulkProgress | null;
}

export const AppointmentBulkActionsBar: React.FC<AppointmentBulkActionsBarProps> = ({
  selectedCount,
  onBulkUpdateStatus,
  onBulkDelete,
  onClearSelection,
  isProcessing = false,
  bulkProgress,
}) => {
  if (selectedCount === 0 && !bulkProgress) return null;

  const statusOptions = [
    { label: "Pending", value: "pending", dotColor: "#F59E0B" },
    { label: "Confirmed", value: "confirmed", dotColor: "#3B82F6" },
    { label: "Completed", value: "completed", dotColor: "#22C55E" },
    { label: "Cancelled", value: "cancelled", dotColor: "#EF4444" },
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
              {selectedCount === 1 ? "1 appointment selected" : `${selectedCount} appointments selected`}
            </span>
          </div>

          {/* Right: Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Change Status Dropdown */}
            <Menu as="div" style={{ position: "relative", display: "inline-block" }}>
              {({ open }) => (
                <>
                  <Menu.Button
                    disabled={isProcessing}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 9999,
                      border: open
                        ? "1px solid rgba(159,232,112,0.5)"
                        : "1px solid rgba(255,255,255,0.2)",
                      background: open
                        ? "rgba(159,232,112,0.15)"
                        : "rgba(255,255,255,0.1)",
                      color: open ? "#9FE870" : "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isProcessing ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <RefreshCw size={12} />
                    <span>Change Status</span>
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
                    />
                  </Menu.Button>

                  <Transition
                    as={React.Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        background: "#16281D",
                        border: "1px solid rgba(159,232,112,0.25)",
                        borderRadius: 16,
                        boxShadow: "0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(159,232,112,0.1)",
                        padding: 6,
                        zIndex: 50,
                        minWidth: 168,
                        outline: "none",
                      }}
                    >
                      {statusOptions.map((opt) => (
                        <Menu.Item key={opt.value}>
                          {({ active }) => (
                            <button
                              type="button"
                              onClick={() => onBulkUpdateStatus(opt.value)}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "none",
                                background: active
                                  ? "rgba(159,232,112,0.15)"
                                  : "transparent",
                                color: active ? "#9FE870" : "#F4F7F4",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "all 0.12s",
                              }}
                            >
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  backgroundColor: opt.dotColor,
                                  flexShrink: 0,
                                }}
                              />
                              <span>{opt.label}</span>
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </Menu.Items>
                  </Transition>
                </>
              )}
            </Menu>

            {/* Bulk Delete */}
            <button
              type="button"
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
              type="button"
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

export default AppointmentBulkActionsBar;
