import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { LineItem } from "./types";

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
      <div className="flex items-center justify-between mb-2">
        <label className="font-sans text-xs font-bold text-[#16281D]">
          Line Items
        </label>
        <button
          type="button"
          onClick={onAddItem}
          className="h-7 px-3 rounded-full bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] font-sans text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={12} strokeWidth={2.4} />
          <span>Add Item</span>
        </button>
      </div>

      <div className="space-y-2">
        {items.map((it, idx) => {
          const lineTotal = (Number(it.quantity) || 0) * (Number(it.price) || 0);
          return (
            <div
              key={idx}
              className="grid grid-cols-[1fr_75px_110px_90px_32px] gap-2 items-center bg-white p-2.5 rounded-xl border border-[#EAEAEA]"
            >
              <input
                type="text"
                placeholder="Item name or service..."
                value={it.name}
                onChange={(e) => onItemChange(idx, "name", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-sans text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-lg focus:border-[#16281D] focus:ring-1 focus:ring-[#9FE870]/30 outline-none transition-all placeholder:text-[#A1A1AA]"
              />
              <input
                type="number"
                min="1"
                placeholder="Qty"
                value={it.quantity}
                onChange={(e) =>
                  onItemChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-lg focus:border-[#16281D] focus:ring-1 focus:ring-[#9FE870]/30 outline-none transition-all"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={it.price}
                onChange={(e) => onItemChange(idx, "price", parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-xs font-mono text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-lg focus:border-[#16281D] focus:ring-1 focus:ring-[#9FE870]/30 outline-none transition-all"
              />
              <div className="font-mono text-xs font-bold text-[#16281D] text-right truncate">
                Rs. {lineTotal.toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => onRemoveItem(idx)}
                disabled={items.length <= 1}
                className="w-7 h-7 rounded-full bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FECDD3] flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Remove item"
              >
                <Trash2 size={13} strokeWidth={2.2} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
