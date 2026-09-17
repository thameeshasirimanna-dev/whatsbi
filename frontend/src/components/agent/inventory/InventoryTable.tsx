import React from 'react';
import { Package, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { InventoryItem } from './types';

interface InventoryTableProps {
  items: InventoryItem[];
  totalCount: number;
  searchTerm: string;
  hasCategories: boolean;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  onAddCategory: () => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(price);

const getStockBadge = (qty: number) => {
  if (qty > 10) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#22C55E]/10 text-[#15803D] border border-[#22C55E]/20">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
        <span className="font-mono">{qty}</span>
      </span>
    );
  }
  if (qty > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F59E0B]/10 text-[#B45309] border border-[#F59E0B]/20">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
        <span className="font-mono">{qty}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EF4444]/10 text-[#B91C1C] border border-[#EF4444]/20">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
      <span className="font-mono">Out of stock</span>
    </span>
  );
};

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  totalCount,
  searchTerm,
  hasCategories,
  onEditItem,
  onDeleteItem,
  onAddCategory,
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-12 h-12 rounded-full bg-[#F4F7F4] text-[#71717A] flex items-center justify-center mx-auto mb-3">
          <Package size={22} />
        </div>
        <h4 className="text-sm font-bold text-[#16281D] mb-1">
          {searchTerm ? 'No items found' : 'No inventory items yet'}
        </h4>
        <p className="text-xs text-[#71717A] max-w-sm mx-auto mb-4">
          {searchTerm
            ? `No items match "${searchTerm}".`
            : hasCategories
            ? 'Start adding products to your inventory catalogue.'
            : 'You need at least one category before adding products.'}
        </p>
        {!hasCategories && (
          <button
            onClick={onAddCategory}
            className="px-5 py-2.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.3)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.4)] transition-all inline-flex items-center gap-1.5 cursor-pointer border-0"
          >
            Add First Category
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#F4F7F4]/60">
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Product</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">SKU</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Category</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Stock</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Price</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-[#F4F7F4]/40 transition-colors">
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[#EAEAEA] bg-[#F4F7F4] flex items-center justify-center">
                      {item.image_urls && item.image_urls.length > 0 ? (
                        <img src={item.image_urls[0]} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={16} className="text-[#71717A]" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#16281D]">{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-[#71717A] max-w-xs truncate">{item.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className="font-mono text-xs text-[#71717A]">{item.sku || '—'}</span>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  {item.category_name ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#16281D]/5 text-[#16281D]">
                      {item.category_name}
                    </span>
                  ) : (
                    <span className="text-[#71717A] text-xs">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  {getStockBadge(item.quantity)}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className="font-mono text-xs font-bold text-[#16281D]">{formatPrice(item.price)}</span>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => onEditItem(item)}
                      title="Edit item"
                      className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item)}
                      title="Delete item"
                      className="w-7 h-7 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="block lg:hidden divide-y divide-[#EAEAEA]">
        {items.map((item) => (
          <div key={item.id} className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[#EAEAEA] bg-[#F4F7F4] flex items-center justify-center">
                {item.image_urls && item.image_urls.length > 0 ? (
                  <img src={item.image_urls[0]} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={16} className="text-[#71717A]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#16281D] truncate">{item.name}</div>
                {item.sku && <div className="font-mono text-[11px] text-[#71717A]">SKU: {item.sku}</div>}
              </div>
            </div>

            {item.description && (
              <p className="text-xs text-[#71717A] line-clamp-2">{item.description}</p>
            )}

            <div className="flex items-center justify-between text-xs bg-[#F4F7F4] p-2.5 rounded-xl">
              <div>
                <span className="text-[#71717A] block text-[10px]">Category</span>
                <span className="font-medium text-[#16281D]">{item.category_name || '—'}</span>
              </div>
              <div className="text-center">
                <span className="text-[#71717A] block text-[10px] mb-0.5">Stock</span>
                {getStockBadge(item.quantity)}
              </div>
              <div className="text-right">
                <span className="text-[#71717A] block text-[10px]">Price</span>
                <span className="font-mono font-bold text-[#16281D]">{formatPrice(item.price)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1 pt-1">
              <button
                onClick={() => onEditItem(item)}
                className="w-7 h-7 rounded-full bg-[#F4F7F4] text-[#71717A] flex items-center justify-center cursor-pointer"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDeleteItem(item)}
                className="w-7 h-7 rounded-full bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default InventoryTable;
