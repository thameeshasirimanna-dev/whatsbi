import React from "react";
import { ShoppingBag, Plus } from "lucide-react";
import { QuickItem } from "./types";

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
    <div className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <ShoppingBag size={13} className="text-[#16281D]" />
        <span className="font-sans text-xs font-bold text-[#16281D]">
          Quick Add from {businessType === "product" ? "Inventory" : "Services"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
        {quickItems.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onQuickAdd(q)}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-[#F0FDF4] border border-[#EAEAEA] hover:border-[#BBF7D0] rounded-full font-sans text-xs text-[#16281D] transition-all cursor-pointer active:scale-95"
          >
            <Plus size={11} strokeWidth={2.4} />
            <span className="truncate max-w-[140px]">{q.name}</span>
            <span className="font-mono text-[11px] font-bold text-[#15803D]">
              Rs. {q.price.toFixed(0)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
