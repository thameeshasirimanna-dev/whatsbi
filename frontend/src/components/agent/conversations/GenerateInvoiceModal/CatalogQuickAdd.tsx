import React from "react";
import { ShoppingBag, Plus } from "lucide-react";
import { QuickItem } from "./types";
import { DM } from "./constants";

interface CatalogQuickAddProps {
  businessType: "product" | "service" | null;
  quickItems: QuickItem[];
  onQuickAdd: (item: QuickItem) => void;
}

export const CatalogQuickAdd: React.FC<CatalogQuickAddProps> = ({
  businessType,
  quickItems,
  onQuickAdd,
}) => {
  if (quickItems.length === 0) return null;

  return (
    <div
      style={{
        background: "rgba(8,145,178,0.04)",
        border: "1px solid rgba(8,145,178,0.15)",
        borderRadius: 12,
        padding: "10px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <ShoppingBag size={13} style={{ color: "#0891b2" }} />
        <span style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#0891b2" }}>
          Quick Add from {businessType === "product" ? "Inventory" : "Services"}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 90, overflowY: "auto" }}>
        {quickItems.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onQuickAdd(q)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 9px",
              background: "#fff",
              border: "1px solid rgba(8,145,178,0.25)",
              borderRadius: 7,
              ...DM,
              fontSize: 11,
              color: "#0f766e",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0891b2")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(8,145,178,0.25)")}
          >
            <Plus size={11} />
            <span>{q.name}</span>
            <span style={{ fontWeight: 600, color: "#059669" }}>(LKR {q.price.toFixed(0)})</span>
          </button>
        ))}
      </div>
    </div>
  );
};
