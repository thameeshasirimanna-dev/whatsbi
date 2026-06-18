import React, { useState, useEffect } from "react";
import { X, Search, Package } from "lucide-react";
import { getToken } from "../../../lib/auth";
import Portal from "../shared/Portal";
import { SkeletonBase } from "../shared/Skeleton";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

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
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <style>{`@keyframes ps-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '18px 20px 14px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={15} style={{ color: '#22c55e' }} />
            </div>
            <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Select Product</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} style={{ color: '#71717a' }} />
          </button>
        </div>

        {/* Search */}
        <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: '1px solid #ebebeb' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #ebebeb', borderRadius: 8, fontSize: 13, background: '#f9f9f9', color: '#0c1a0e', outline: 'none', ...DM, boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading && products.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid #ebebeb', borderRadius: 12 }}
                >
                  <SkeletonBase style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <SkeletonBase style={{ width: '60%', height: 13, borderRadius: 4, marginBottom: 6 }} />
                    <SkeletonBase style={{ width: '80%', height: 11, borderRadius: 4, marginBottom: 6 }} />
                    <SkeletonBase style={{ width: '30%', height: 12, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', ...DM, fontSize: 13, color: '#71717a' }}>
              {searchTerm ? "No products found." : "No products available."}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => { onSelectProduct(product); onClose(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid #ebebeb', borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.04)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#ebebeb'; }}
                >
                  {product.images && product.images.length > 0 ? (
                    <img src={product.images[0]} alt={product.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid #ebebeb' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={18} style={{ color: '#a1a1aa' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...SYNE, fontSize: 13, fontWeight: 600, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                    {product.description && (
                      <div style={{ ...DM, fontSize: 12, color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{product.description}</div>
                    )}
                    {product.price !== undefined && (
                      <div style={{ ...DM, fontSize: 12, fontWeight: 700, color: '#059669', marginTop: 2 }}>LKR {product.price.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid #ebebeb', background: '#fafafa' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '9px 0', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 9, cursor: 'pointer', ...DM, fontSize: 13, fontWeight: 600, color: '#3f3f46' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
};

export default ProductSelectorModal;
