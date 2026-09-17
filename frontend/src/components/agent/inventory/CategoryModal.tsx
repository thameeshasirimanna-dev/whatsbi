import React, { useState, useEffect } from 'react';
import { Tag, X } from 'lucide-react';
import { Category } from './types';
import { getToken } from '../../../lib/auth';
import Portal from '../shared/Portal';

interface CategoryModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  category,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!category;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#16281D');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
      setColor(category.color || '#16281D');
    } else {
      setName('');
      setDescription('');
      setColor('#16281D');
    }
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) {
        setError('User not authenticated');
        return;
      }

      if (isEditing && category) {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'category',
            id: category.id,
            name: name.trim() || null,
            description: description.trim() || null,
            color: color || null,
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      } else {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'category',
            name: name.trim(),
            description: description.trim() || null,
            color,
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16281D]/65 animate-modal-backdrop">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_20px_50px_rgba(22,40,29,0.15)] overflow-hidden flex flex-col animate-modal-card">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#16281D]/5 flex items-center justify-center text-[#16281D]">
                <Tag size={18} />
              </div>
              <h3 className="font-sans text-base font-bold text-[#16281D]">
                {isEditing ? 'Edit Category' : 'Add New Category'}
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] font-medium">
                {error}
              </div>
            )}

            <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electronics"
                  required
                  className="w-full h-10 px-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief summary of items in this category…"
                  className="w-full p-3 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Color Token
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 border border-[#EAEAEA] rounded-xl cursor-pointer p-1 bg-[#F4F7F4]"
                  />
                  <span className="font-mono text-xs text-[#71717A] font-semibold">{color}</span>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#EAEAEA] flex items-center justify-end gap-3 shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="category-form"
              disabled={loading || !name.trim()}
              className="px-6 py-2.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer border-0"
            >
              {loading ? 'Saving…' : isEditing ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default CategoryModal;
