import React, { useState, useEffect } from "react";
import { X, Search, Package } from "lucide-react";
import { getToken } from "../../../lib/auth";
import Portal from "../shared/Portal";
import { SkeletonBase } from "../shared/Skeleton";

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  images?: string[];
  category_id?: string;
}

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  agentPrefix?: string | null;
  agentId?: number | null;
}

let productsCache: Product[] | null = null;

const ProductSelectorModal: React.FC<ProductSelectorModalProps> = ({
  isOpen, onClose, onSelectProduct, agentPrefix, agentId,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => { if (isOpen) fetchProducts(); }, [isOpen]);

  useEffect(() => {
    setFilteredProducts(products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    if (!agentPrefix || !agentId) { setLoading(false); return; }
    if (productsCache) {
      setProducts(productsCache);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const token = getToken();
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        const fetchedProducts = (data.items || []).map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description,
          price: item.price,
          images: item.image_urls || [],
          category_id: item.category_id || undefined,
        }));
        productsCache = fetchedProducts;
        setProducts(fetchedProducts);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-[#16281D]/65 flex items-center justify-center p-2.5 sm:p-4 animate-modal-backdrop">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-2xl w-full max-w-[min(28rem,95vw)] sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-modal-card">
          {/* Header */}
          <div className="shrink-0 px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 mr-2">
              <div className="w-8 h-8 rounded-xl bg-[#16281D] text-[#9FE870] flex items-center justify-center shrink-0">
                <Package size={16} />
              </div>
              <h3 className="font-sans text-sm sm:text-base font-bold text-[#16281D] truncate">
                Select Product
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717A] hover:text-[#16281D] transition-colors border-0 cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X size={15} />
            </button>
          </div>

          {/* Search Input */}
          <div className="shrink-0 p-3 sm:p-4 border-b border-[#EAEAEA] bg-[#F4F7F4]/50">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                placeholder="Search products by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-xs font-medium font-sans text-[#16281D] bg-white border border-[#EAEAEA] rounded-full focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 outline-none transition-all placeholder:text-[#A1A1AA]"
              />
            </div>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading && products.length === 0 ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 border border-[#EAEAEA] rounded-2xl"
                  >
                    <SkeletonBase className="w-12 h-12 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <SkeletonBase className="w-3/5 h-3.5 rounded" />
                      <SkeletonBase className="w-4/5 h-3 rounded" />
                      <SkeletonBase className="w-1/4 h-3.5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-10 font-sans text-xs text-[#71717A]">
                {searchTerm ? "No products matching your search." : "No products available."}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => { onSelectProduct(product); onClose(); }}
                  className="flex items-center gap-3 p-3 border border-[#EAEAEA] rounded-2xl bg-white hover:bg-[#F0FDF4] hover:border-[#BBF7D0] cursor-pointer transition-all group"
                >
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-xl shrink-0 border border-[#EAEAEA]"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#F4F7F4] group-hover:bg-white flex items-center justify-center shrink-0 text-[#71717A] transition-colors">
                      <Package size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-sm font-bold text-[#16281D] truncate group-hover:text-[#16281D]">
                      {product.name}
                    </div>
                    {product.description && (
                      <div className="font-sans text-xs text-[#71717A] truncate mt-0.5">
                        {product.description}
                      </div>
                    )}
                    {product.price !== undefined && (
                      <div className="font-mono text-xs font-bold text-[#16281D] mt-1">
                        Rs. {product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 p-4 border-t border-[#EAEAEA] bg-[#F4F7F4]/40 flex justify-end">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-full bg-white border border-[#E4E4E7] hover:bg-[#F4F7F4] active:scale-[0.98] font-sans text-xs font-bold text-[#52525B] transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ProductSelectorModal;

