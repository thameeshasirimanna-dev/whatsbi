import React, { useState } from 'react';
import { Package, X, Image as ImageIcon } from 'lucide-react';
import { Category } from './types';
import { getToken } from '../../../lib/auth';
import { getCurrentAgent } from '../../../lib/agent';
import Portal from '../shared/Portal';
import CustomDropdown from '../shared/CustomDropdown';

interface CreateItemModalProps {
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

const resizeImage = (file: File, maxWidth = 1920, maxHeight = 1920): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      let { width, height } = img;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        'image/jpeg',
        0.9
      );
    };
    img.onerror = reject;
  });
};

const convertFileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const uploadImages = async (
  agentId: string,
  productId: string,
  images: File[],
  token: string
): Promise<string[]> => {
  if (images.length === 0) return [];
  const resizedImages = await Promise.all(
    images.map(async (file) => {
      const resizedFile = await resizeImage(file, 1920, 1920);
      const base64 = await convertFileToBase64(resizedFile);
      return { fileName: resizedFile.name, fileBase64: base64, fileType: resizedFile.type };
    })
  );
  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-inventory-images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: parseInt(agentId), productId: parseInt(productId), images: resizedImages }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Upload failed');
  return data.urls;
};

const CreateItemModal: React.FC<CreateItemModalProps> = ({
  isOpen,
  categories,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    quantity: '',
    price: '',
    category_id: '',
    sku: '',
  });
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('User not authenticated');
        return;
      }
      const agent = await getCurrentAgent();
      if (!agent) {
        setError('Agent not found');
        return;
      }
      if (form.category_id && !categories.find((c) => c.id.toString() === form.category_id)) {
        setError('Invalid category selected');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          quantity: form.quantity ? parseInt(form.quantity) : 0,
          price: form.price ? parseFloat(form.price) : 0,
          category_id: form.category_id ? parseInt(form.category_id) : null,
          sku: form.sku.trim() || null,
          image_urls: null,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);

      const itemId = data.item_id;
      let imageUrls: string[] = [];
      if (images.length > 0) {
        try {
          imageUrls = await uploadImages(agent.id.toString(), itemId.toString(), images, token);
        } catch {
          setError('Item created but failed to upload images');
          onSuccess();
          onClose();
          return;
        }
      }

      if (imageUrls.length > 0) {
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: itemId, image_urls: imageUrls }),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create inventory item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16281D]/65 animate-modal-backdrop">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_20px_50px_rgba(22,40,29,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-modal-card">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#16281D]/5 flex items-center justify-center text-[#16281D]">
                <Package size={18} />
              </div>
              <h3 className="font-sans text-base font-bold text-[#16281D]">Add New Item</h3>
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
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] font-medium">
                {error}
              </div>
            )}

            <form id="create-item-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Wireless Mouse"
                  required
                  className="w-full h-10 px-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Optional product details or specifications…"
                  className="w-full p-3 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="0"
                    className="w-full h-10 px-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    Price (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full h-10 px-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    Category
                  </label>
                  <CustomDropdown
                    value={form.category_id}
                    onChange={(val) => setForm({ ...form, category_id: val })}
                    options={[
                      { value: '', label: 'No Category' },
                      ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
                    ]}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    SKU (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="e.g. WM-001"
                    className="w-full h-10 px-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Images (Optional)
                </label>
                <label className="flex items-center gap-2 px-3.5 py-2.5 border border-dashed border-[#EAEAEA] hover:border-[#16281D]/30 rounded-xl cursor-pointer bg-[#F4F7F4] text-xs text-[#71717A] hover:text-[#16281D] transition-colors">
                  <ImageIcon size={16} />
                  <span>
                    {images.length > 0 ? `${images.length} image(s) selected` : 'Click to select product images…'}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setImages(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                </label>
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
              form="create-item-form"
              disabled={loading || !form.name.trim()}
              className="px-6 py-2.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer border-0"
            >
              {loading ? 'Creating…' : 'Create Item'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default CreateItemModal;
