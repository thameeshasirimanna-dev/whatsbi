import React, { useState } from 'react';
import { Tag, Search, Pencil, Trash2 } from 'lucide-react';
import { Category } from './types';

interface CategoriesSectionProps {
  categories: Category[];
  loading: boolean;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
}

const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  categories,
  loading,
  onEditCategory,
  onDeleteCategory,
}) => {
  const [search, setSearch] = useState('');

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] overflow-hidden mb-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#EAEAEA] flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#16281D]/5 flex items-center justify-center text-[#16281D]">
            <Tag size={15} />
          </div>
          <span className="font-sans text-sm font-bold text-[#16281D]">Categories</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#16281D]/5 text-[#16281D]">
            {categories.length}
          </span>
        </div>

        <div className="relative w-full sm:w-60">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-[#F4F7F4] border border-[#EAEAEA] rounded-full text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#EAEAEA] border-t-[#16281D] rounded-full animate-spin" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="w-10 h-10 rounded-full bg-[#F4F7F4] flex items-center justify-center mx-auto mb-2 text-[#71717A]">
            <Tag size={18} />
          </div>
          <p className="text-xs font-bold text-[#16281D]">No categories found</p>
          <p className="text-[11px] text-[#71717A] mt-0.5">Start by adding your first category</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAEAEA] bg-[#F4F7F4]/60">
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Description</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Items</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Color</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Created</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#F4F7F4]/40 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="text-xs font-bold text-[#16281D]">{cat.name}</span>
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <span className="text-xs text-[#71717A] truncate block">{cat.description || '—'}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-[#16281D]">{cat.item_count}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-mono text-[11px] text-[#71717A]">{cat.color}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-[#71717A]">
                        {new Date(cat.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onEditCategory(cat)}
                          title="Edit category"
                          className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => onDeleteCategory(cat)}
                          title="Delete category"
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

          {/* Mobile Card List */}
          <div className="block lg:hidden divide-y divide-[#EAEAEA]">
            {filteredCategories.map((cat) => (
              <div key={cat.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs font-bold text-[#16281D]">{cat.name}</span>
                  </div>
                  <span className="font-mono text-xs text-[#71717A]">{cat.item_count} items</span>
                </div>
                {cat.description && (
                  <p className="text-xs text-[#71717A]">{cat.description}</p>
                )}
                <div className="flex items-center justify-end gap-1 pt-1">
                  <button
                    onClick={() => onEditCategory(cat)}
                    className="w-7 h-7 rounded-full bg-[#F4F7F4] text-[#71717A] flex items-center justify-center cursor-pointer"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => onDeleteCategory(cat)}
                    className="w-7 h-7 rounded-full bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoriesSection;
