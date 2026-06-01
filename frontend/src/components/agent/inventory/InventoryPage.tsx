import React, { useState, useEffect } from 'react';
import { Package, Tag, Plus, Pencil, Search, X, Image as ImageIcon } from 'lucide-react';
import { getToken } from "../../../lib/auth";
import { getCurrentAgent } from "../../../lib/agent";
import { useDialog } from '../shared/DialogProvider';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #ebebeb',
  borderRadius: 8, fontSize: 13, background: '#f9f9f9', color: '#0c1a0e',
  outline: 'none', ...DM,
};
const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)';
  e.currentTarget.style.background = '#fff';
};
const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
  e.currentTarget.style.background = '#f9f9f9';
};

const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
  color: '#fff', border: 'none', borderRadius: 9, padding: '9px 20px',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(34,197,94,0.3)', ...DM,
};
const btnSecondary: React.CSSProperties = {
  background: 'rgba(0,0,0,0.05)', color: '#3f3f46', border: 'none',
  borderRadius: 9, padding: '9px 20px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', ...DM,
};
const btnOutline: React.CSSProperties = {
  background: 'rgba(34,197,94,0.08)', color: '#059669', border: '1px solid rgba(34,197,94,0.2)',
  borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, ...DM,
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, border: '1px solid #ebebeb',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
};
const labelStyle: React.CSSProperties = { ...DM, fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 6, display: 'block' };
const thStyle: React.CSSProperties = { ...DM, fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '0.05em', padding: '12px 16px', textAlign: 'left' as const, background: '#fafafa', borderBottom: '1px solid #ebebeb' };
const tdStyle: React.CSSProperties = { ...DM, fontSize: 13, color: '#3f3f46', padding: '12px 16px', borderBottom: '1px solid #f4f4f5' };

interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  category_name?: string;
  sku?: string;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  color: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

const qtyStyle = (qty: number): React.CSSProperties => {
  if (qty > 10) return { background: 'rgba(34,197,94,0.1)', color: '#059669', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, ...DM };
  if (qty > 0)  return { background: 'rgba(217,119,6,0.1)',  color: '#d97706', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, ...DM };
  return { background: 'rgba(244,63,94,0.1)', color: '#f43f5e', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, ...DM };
};

const InventoryPage: React.FC = () => {
  const { confirm: dlgConfirm } = useDialog();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoriesSection, setShowCategoriesSection] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", quantity: "", price: "", category_id: "", sku: "" });
  const [createImages, setCreateImages] = useState<File[]>([]);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", color: "#000000" });
  const [editForm, setEditForm] = useState({ name: "", description: "", quantity: "", price: "", category_id: "", sku: "" });
  const [editImages, setEditImages] = useState<File[]>([]);
  const [keptImages, setKeptImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items || []);
    } catch (err) {
      setError("Failed to load inventory items");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory?type=categories`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setCategories(data.categories || []);
    } catch (err) {
      setError("Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => { fetchItems(); fetchCategories(); }, []);
  useEffect(() => { if (showCreateModal || editingItem) fetchCategories(); }, [showCreateModal, editingItem]);

  const handleCreateItem = async () => {
    if (!createForm.name.trim()) return;
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const agent = await getCurrentAgent();
      if (!agent) { setError("Agent not found"); return; }
      if (createForm.category_id && !categories.find((c) => c.id.toString() === createForm.category_id)) {
        setError("Invalid category selected"); return;
      }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
          quantity: createForm.quantity ? parseInt(createForm.quantity) : 0,
          price: createForm.price ? parseFloat(createForm.price) : 0,
          category_id: createForm.category_id ? parseInt(createForm.category_id) : null,
          sku: createForm.sku.trim() || null,
          image_urls: null,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      const itemId = data.item_id;
      let imageUrls: string[] = [];
      if (createImages.length > 0) {
        try {
          imageUrls = await uploadImages(agent.id.toString(), itemId.toString(), createImages, token);
        } catch {
          setError("Item created but failed to upload images");
          setShowCreateModal(false);
          fetchItems();
          return;
        }
      }
      if (imageUrls.length > 0) {
        const updateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id: itemId, image_urls: imageUrls }),
        });
        if (!updateResponse.ok) setError("Item created and images uploaded but failed to link them");
      }
      setShowCreateModal(false);
      setCreateForm({ name: "", description: "", quantity: "", price: "", category_id: "", sku: "" });
      setCreateImages([]);
      setError(null);
      fetchItems();
    } catch {
      setError("Failed to create inventory item");
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) return;
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", name: categoryForm.name.trim(), description: categoryForm.description.trim() || null, color: categoryForm.color }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      setShowCategoryModal(false);
      setCategoryForm({ name: "", description: "", color: "#000000" });
      setError(null);
      fetchCategories();
    } catch {
      setError("Failed to create category");
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editForm.name.trim()) return;
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const agent = await getCurrentAgent();
      if (!agent) { setError("Agent not found"); return; }
      if (editForm.category_id && !categories.find((c) => c.id.toString() === editForm.category_id)) {
        setError("Invalid category selected"); return;
      }
      let newImageUrls: string[] = [];
      if (editImages.length > 0) {
        try {
          newImageUrls = await uploadImages(agent.id.toString(), editingItem.id.toString(), editImages, token);
        } catch {
          setError("Failed to upload images"); return;
        }
      }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          quantity: editForm.quantity ? parseInt(editForm.quantity) : 0,
          price: editForm.price ? parseFloat(editForm.price) : 0,
          category_id: editForm.category_id ? parseInt(editForm.category_id) : null,
          sku: editForm.sku.trim() || null,
          image_urls: [...keptImages, ...newImageUrls],
          removed_image_urls: removedImages,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      setEditingItem(null);
      setEditForm({ name: "", description: "", quantity: "", price: "", category_id: "", sku: "" });
      setEditImages([]); setKeptImages([]); setRemovedImages([]);
      setError(null);
      fetchItems();
    } catch {
      setError("Failed to update inventory item");
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryForm.name.trim()) return;
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", id: editingCategory.id, name: categoryForm.name.trim() || null, description: categoryForm.description.trim() || null, color: categoryForm.color || null }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      setShowEditCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "", color: "#000000" });
      setError(null);
      fetchCategories();
    } catch {
      setError("Failed to update category");
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!await dlgConfirm(`Are you sure you want to delete "${item.name}"?`, { danger: true })) return;
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory?id=${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      setError(null);
      fetchItems();
    } catch {
      setError("Failed to delete inventory item");
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!await dlgConfirm(`Are you sure you want to delete "${category.name}"? This cannot be undone if no items are assigned.`, { danger: true })) return;
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory?type=category&id=${category.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      setError(null);
      fetchCategories();
    } catch {
      setError("Failed to delete category");
    }
  };

  const startEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({ name: item.name, description: item.description || "", quantity: item.quantity.toString(), price: item.price.toString(), category_id: "", sku: item.sku || "" });
    setEditImages([]); setKeptImages(item.image_urls || []); setRemovedImages([]);
    const matchedCategory = categories.find((c) => c.name === item.category_name);
    if (matchedCategory) setEditForm((prev) => ({ ...prev, category_id: matchedCategory.id.toString() }));
  };

  const removeImage = (url: string) => {
    setRemovedImages((prev) => [...prev, url]);
    setKeptImages((prev) => prev.filter((img) => img !== url));
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, description: category.description || "", color: category.color || "#000000" });
    setShowEditCategoryModal(true);
  };

  const resizeImage = (file: File, maxWidth = 1920, maxHeight = 1920): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        let { width, height } = img;
        if (width > height) { if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; } }
        else { if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; } }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" }));
          else reject(new Error("Failed to resize image"));
        }, "image/jpeg", 0.9);
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

  const uploadImages = async (agentId: string, productId: string, images: File[], token: string): Promise<string[]> => {
    if (images.length === 0) return [];
    const resizedImages = await Promise.all(images.map(async (file) => {
      const resizedFile = await resizeImage(file, 1920, 1920);
      const base64 = await convertFileToBase64(resizedFile);
      return { fileName: resizedFile.name, fileBase64: base64, fileType: resizedFile.type };
    }));
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-inventory-images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: parseInt(agentId), productId: parseInt(productId), images: resizedImages }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Upload failed");
    return data.urls;
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(price);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const hasCategories = categories.length > 0;

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <style>{`@keyframes inv-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 36, height: 36, border: '3px solid #ebebeb', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'inv-spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
  const modalBox = (maxW = 560): React.CSSProperties => ({ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: maxW, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' });
  const modalHeader: React.CSSProperties = { flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
  const modalBody: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px 24px' };
  const closeBtn: React.CSSProperties = { width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const iconChip = (bg: string, color: string): React.CSSProperties => ({ width: 32, height: 32, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 });

  return (
    <div style={{ padding: 24 }}>
      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setShowCategoriesSection(!showCategoriesSection)} style={btnOutline}>
          <Tag size={14} />
          {showCategoriesSection ? 'Hide' : 'Show'} Categories
        </button>
        <button onClick={() => setShowCategoryModal(true)} style={{ ...btnOutline, background: 'rgba(79,70,229,0.08)', color: '#4f46e5', border: '1px solid rgba(79,70,229,0.2)' }}>
          <Plus size={14} />
          Add Category
        </button>
        <button onClick={() => setShowCreateModal(true)} disabled={!hasCategories} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6, opacity: hasCategories ? 1 : 0.5 }}>
          <Plus size={14} />
          Add Item
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', borderRadius: 10, padding: '10px 16px', marginBottom: 16, ...DM, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Categories Section */}
      {showCategoriesSection && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={iconChip('rgba(79,70,229,0.1)', '#4f46e5')}><Tag size={15} /></div>
              <span style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>Categories</span>
              <span style={{ background: 'rgba(79,70,229,0.1)', color: '#4f46e5', borderRadius: 20, padding: '1px 10px', fontSize: 12, fontWeight: 600, ...DM }}>{categories.length}</span>
            </div>
            <div style={{ position: 'relative', maxWidth: 260 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 32, width: 220 }}
                onFocus={onFocusG} onBlur={onBlurG}
              />
            </div>
          </div>

          {loadingCategories ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <style>{`@keyframes inv-spin2 { to { transform: rotate(360deg); } }`}</style>
              <div style={{ width: 28, height: 28, border: '2px solid #ebebeb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'inv-spin2 0.8s linear infinite' }} />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ width: 48, height: 48, background: '#f4f4f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Tag size={22} style={{ color: '#a1a1aa' }} />
              </div>
              <p style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e', margin: '0 0 4px' }}>No categories</p>
              <p style={{ ...DM, fontSize: 13, color: '#71717a', margin: 0 }}>Start by adding your first category</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Name', 'Description', 'Items', 'Color', 'Created', ''].map((h, i) => (
                      <th key={i} style={{ ...thStyle, textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <tr key={category.id} style={{ transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={tdStyle}>
                        <span style={{ ...SYNE, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{category.name}</span>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 200 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category.description || '—'}</span>
                      </td>
                      <td style={tdStyle}>{category.item_count}</td>
                      <td style={tdStyle}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: category.color, border: '1px solid rgba(0,0,0,0.1)' }} />
                      </td>
                      <td style={tdStyle}>{new Date(category.created_at).toLocaleDateString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button onClick={() => startEditCategory(category)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: 12, fontWeight: 600, marginRight: 12, ...DM }}>Edit</button>
                        <button onClick={() => handleDeleteCategory(category)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f43f5e', fontSize: 12, fontWeight: 600, ...DM }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Search + Items Table */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
        <input
          type="text"
          placeholder="Search inventory by name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 36, maxWidth: 400 }}
          onFocus={onFocusG} onBlur={onBlurG}
        />
      </div>

      <div style={cardStyle}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 24px' }}>
            <div style={{ width: 56, height: 56, background: '#f4f4f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Package size={24} style={{ color: '#a1a1aa' }} />
            </div>
            <p style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', margin: '0 0 6px' }}>
              {searchTerm ? 'No items found' : 'No inventory items yet'}
            </p>
            <p style={{ ...DM, fontSize: 13, color: '#71717a', margin: '0 0 16px' }}>
              {searchTerm ? `No items match "${searchTerm}"` : hasCategories ? 'Start adding items to your inventory' : 'No categories yet. Add one to organize your inventory.'}
            </p>
            {!hasCategories && (
              <button onClick={() => setShowCategoryModal(true)} style={btnPrimary}>Add First Category</button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Item', 'SKU', 'Category', 'Quantity', 'Price', ''].map((h, i) => (
                    <th key={i} style={{ ...thStyle, textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid #ebebeb' }}>
                          {item.image_urls && item.image_urls.length > 0 ? (
                            <img src={item.image_urls[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon size={16} style={{ color: '#a1a1aa' }} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ ...SYNE, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{item.name}</div>
                          {item.description && (
                            <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}><span style={{ ...DM, fontSize: 12, color: '#71717a' }}>{item.sku || '—'}</span></td>
                    <td style={tdStyle}>
                      {item.category_name ? (
                        <span style={{ background: 'rgba(34,197,94,0.08)', color: '#059669', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, ...DM }}>{item.category_name}</span>
                      ) : <span style={{ color: '#a1a1aa' }}>—</span>}
                    </td>
                    <td style={tdStyle}><span style={qtyStyle(item.quantity)}>{item.quantity}</span></td>
                    <td style={{ ...tdStyle, ...SYNE, fontWeight: 700, color: '#0c1a0e' }}>{formatPrice(item.price)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => startEditItem(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: 12, fontWeight: 600, marginRight: 12, ...DM }}>Edit</button>
                      <button onClick={() => handleDeleteItem(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f43f5e', fontSize: 12, fontWeight: 600, ...DM }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Item Modal */}
      {showCreateModal && (
        <div style={modalOverlay}>
          <div style={modalBox(600)}>
            <div style={modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={iconChip('rgba(34,197,94,0.1)', '#22c55e')}><Package size={15} /></div>
                <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Add New Item</span>
              </div>
              <button onClick={() => { setShowCreateModal(false); setCreateForm({ name: "", description: "", quantity: "", price: "", category_id: "", sku: "" }); setCreateImages([]); }} style={closeBtn}>
                <X size={14} style={{ color: '#71717a' }} />
              </button>
            </div>
            <div style={modalBody}>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateItem(); }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Item Name</label>
                    <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} style={inputStyle} placeholder="Enter item name" required onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} placeholder="Enter description (optional)" onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Quantity</label>
                      <input type="number" value={createForm.quantity} onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })} style={inputStyle} placeholder="0" min="0" onFocus={onFocusG} onBlur={onBlurG} />
                    </div>
                    <div>
                      <label style={labelStyle}>Price (LKR)</label>
                      <input type="number" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} style={inputStyle} placeholder="0.00" min="0" step="0.01" onFocus={onFocusG} onBlur={onBlurG} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select value={createForm.category_id} onChange={(e) => setCreateForm({ ...createForm, category_id: e.target.value })} style={inputStyle} onFocus={onFocusG} onBlur={onBlurG}>
                      <option value="">No Category</option>
                      {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>SKU (optional)</label>
                    <input type="text" value={createForm.sku} onChange={(e) => setCreateForm({ ...createForm, sku: e.target.value })} style={inputStyle} placeholder="Enter SKU" onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div>
                    <label style={labelStyle}>Images (optional)</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px dashed #d4d4d8', borderRadius: 8, cursor: 'pointer', background: '#fafafa', ...DM, fontSize: 13, color: '#71717a' }}>
                      <ImageIcon size={14} />
                      {createImages.length > 0 ? `${createImages.length} image(s) selected` : 'Choose images…'}
                      <input type="file" multiple accept="image/*" onChange={(e) => setCreateImages(Array.from(e.target.files || []))} style={{ display: 'none' }} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button type="submit" style={{ ...btnPrimary, flex: 1 }}>Create Item</button>
                    <button type="button" onClick={() => { setShowCreateModal(false); setCreateForm({ name: "", description: "", quantity: "", price: "", category_id: "", sku: "" }); setCreateImages([]); }} style={btnSecondary}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div style={modalOverlay}>
          <div style={modalBox(440)}>
            <div style={modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={iconChip('rgba(79,70,229,0.1)', '#4f46e5')}><Tag size={15} /></div>
                <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Add New Category</span>
              </div>
              <button onClick={() => { setShowCategoryModal(false); setCategoryForm({ name: "", description: "", color: "#000000" }); }} style={closeBtn}>
                <X size={14} style={{ color: '#71717a' }} />
              </button>
            </div>
            <div style={modalBody}>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateCategory(); }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Category Name</label>
                    <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} style={inputStyle} placeholder="Enter category name" required onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div>
                    <label style={labelStyle}>Description (optional)</label>
                    <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} placeholder="Enter description" onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div>
                    <label style={labelStyle}>Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })} style={{ width: 40, height: 36, border: '1px solid #ebebeb', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                      <span style={{ ...DM, fontSize: 13, color: '#71717a' }}>{categoryForm.color}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button type="submit" style={{ ...btnPrimary, flex: 1, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>Create Category</button>
                    <button type="button" onClick={() => { setShowCategoryModal(false); setCategoryForm({ name: "", description: "", color: "#000000" }); }} style={btnSecondary}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div style={modalOverlay}>
          <div style={modalBox(600)}>
            <div style={modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={iconChip('rgba(8,145,178,0.1)', '#0891b2')}><Pencil size={15} /></div>
                <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Edit Item</span>
              </div>
              <button onClick={() => { setEditingItem(null); setEditForm({ name: "", description: "", quantity: "", price: "", category_id: "", sku: "" }); setEditImages([]); setKeptImages([]); setRemovedImages([]); }} style={closeBtn}>
                <X size={14} style={{ color: '#71717a' }} />
              </button>
            </div>
            <div style={modalBody}>
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateItem(); }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Item Name</label>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} required onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Quantity</label>
                      <input type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} style={inputStyle} min="0" onFocus={onFocusG} onBlur={onBlurG} />
                    </div>
                    <div>
                      <label style={labelStyle}>Price (LKR)</label>
                      <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} style={inputStyle} min="0" step="0.01" onFocus={onFocusG} onBlur={onBlurG} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select value={editForm.category_id} onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })} style={inputStyle} onFocus={onFocusG} onBlur={onBlurG}>
                      <option value="">No Category</option>
                      {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>SKU</label>
                    <input type="text" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} style={inputStyle} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div>
                    <label style={labelStyle}>New Images (optional)</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px dashed #d4d4d8', borderRadius: 8, cursor: 'pointer', background: '#fafafa', ...DM, fontSize: 13, color: '#71717a' }}>
                      <ImageIcon size={14} />
                      {editImages.length > 0 ? `${editImages.length} new image(s) selected` : 'Choose images…'}
                      <input type="file" multiple accept="image/*" onChange={(e) => setEditImages(Array.from(e.target.files || []))} style={{ display: 'none' }} />
                    </label>
                  </div>
                  {keptImages.length > 0 && (
                    <div>
                      <label style={labelStyle}>Current Images</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {keptImages.map((url, index) => (
                          <div key={index} style={{ position: 'relative' }}>
                            <img src={url} alt="Current" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #ebebeb' }} />
                            <button onClick={() => removeImage(url)} type="button" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, background: '#f43f5e', border: 'none', borderRadius: '50%', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                          </div>
                        ))}
                      </div>
                      {removedImages.length > 0 && (
                        <p style={{ ...DM, fontSize: 12, color: '#f43f5e', marginTop: 6 }}>Removed {removedImages.length} image(s). They will be deleted on save.</p>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button type="submit" style={{ ...btnPrimary, flex: 1, background: 'linear-gradient(135deg, #0ea5e9 0%, #0891b2 100%)', boxShadow: '0 4px 14px rgba(8,145,178,0.3)' }}>Update Item</button>
                    <button type="button" onClick={() => { setEditingItem(null); setEditForm({ name: "", description: "", quantity: "", price: "", category_id: "", sku: "" }); setEditImages([]); setKeptImages([]); setRemovedImages([]); }} style={btnSecondary}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && editingCategory && (
        <div style={modalOverlay}>
          <div style={modalBox(440)}>
            <div style={modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={iconChip('rgba(79,70,229,0.1)', '#4f46e5')}><Tag size={15} /></div>
                <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Edit Category</span>
              </div>
              <button onClick={() => { setShowEditCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: "", description: "", color: "#000000" }); }} style={closeBtn}>
                <X size={14} style={{ color: '#71717a' }} />
              </button>
            </div>
            <div style={modalBody}>
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateCategory(); }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Category Name</label>
                    <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} style={inputStyle} required onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} onFocus={onFocusG} onBlur={onBlurG} />
                  </div>
                  <div>
                    <label style={labelStyle}>Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })} style={{ width: 40, height: 36, border: '1px solid #ebebeb', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                      <span style={{ ...DM, fontSize: 13, color: '#71717a' }}>{categoryForm.color}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button type="submit" style={{ ...btnPrimary, flex: 1, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>Update Category</button>
                    <button type="button" onClick={() => { setShowEditCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: "", description: "", color: "#000000" }); }} style={btnSecondary}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
