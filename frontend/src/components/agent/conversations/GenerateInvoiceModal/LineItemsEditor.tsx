import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { LineItem } from "./types";
import { DM, inputStyle, onFocusGreen, onBlurGreen } from "./constants";

interface LineItemsEditorProps {
  items: LineItem[];
  onItemChange: (index: number, field: keyof LineItem, val: any) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
}

export const LineItemsEditor: React.FC<LineItemsEditorProps> = ({
  items,
  onItemChange,
  onAddItem,
  onRemoveItem,
}) => {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46" }}>
          Line Items
        </label>
        <button
          type="button"
          onClick={onAddItem}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            background: "rgba(34,197,94,0.08)",
            color: "#059669",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 7,
            cursor: "pointer",
            ...DM,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <Plus size={12} />
          <span>Add Item</span>
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it, idx) => {
          const lineTotal = (Number(it.quantity) || 0) * (Number(it.price) || 0);
          return (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 110px 90px 32px",
                gap: 8,
                alignItems: "center",
                background: "#fafafa",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #ededed",
              }}
            >
              <input
                type="text"
                placeholder="Item name or service..."
                value={it.name}
                onChange={(e) => onItemChange(idx, "name", e.target.value)}
                style={{ ...inputStyle, background: "#fff", fontSize: 12 }}
                onFocus={onFocusGreen}
                onBlur={onBlurGreen}
              />
              <input
                type="number"
                min="1"
                placeholder="Qty"
                value={it.quantity}
                onChange={(e) =>
                  onItemChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                }
                style={{ ...inputStyle, background: "#fff", fontSize: 12 }}
                onFocus={onFocusGreen}
                onBlur={onBlurGreen}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={it.price}
                onChange={(e) => onItemChange(idx, "price", parseFloat(e.target.value) || 0)}
                style={{ ...inputStyle, background: "#fff", fontSize: 12 }}
                onFocus={onFocusGreen}
                onBlur={onBlurGreen}
              />
              <div style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#0c1a0e", textAlign: "right" }}>
                LKR {lineTotal.toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => onRemoveItem(idx)}
                disabled={items.length <= 1}
                style={{
                  width: 28,
                  height: 28,
                  background: items.length <= 1 ? "transparent" : "rgba(244,63,94,0.08)",
                  border: "none",
                  borderRadius: 6,
                  color: items.length <= 1 ? "#d4d4d8" : "#f43f5e",
                  cursor: items.length <= 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
