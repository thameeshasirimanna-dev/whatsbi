import React, { useState, useEffect, useCallback } from 'react';
import { Package, Tag, Plus, Search, X, AlertTriangle, DollarSign } from 'lucide-react';
import { InventoryItem, Category } from './types';
import { getToken } from '../../../lib/auth';
import { useDialog } from '../shared/DialogProvider';
import { SkeletonPage } from '../shared/Skeleton';
import CreateItemModal from './CreateItemModal';
import EditItemModal from './EditItemModal';
import CategoryModal from './CategoryModal';
import CategoriesSection from './CategoriesSection';
import InventoryTable from './InventoryTable';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(price);

const InventoryPage: React.FC = () => {
  const { confirm: dlgConfirm, toast } = useDialog();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Panels
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showCategoriesSection, setShowCategoriesSection] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) {
        setError('User not authenticated');
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items || []);
    } catch {
      setError('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory?type=categories`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setCategories(data.categories || []);
    } catch {
      setError('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [fetchItems, fetchCategories]);

  const handleDeleteItem = async (item: InventoryItem) => {
    if (
      !(await dlgConfirm(`Are you sure you want to delete "${item.name}"?`, {
        danger: true,
      }))
    )
      return;

    try {
      const token = getToken();
      if (!token) {
        setError('User not authenticated');
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory?id=${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      toast('Item deleted successfully', 'success');
      fetchItems();
    } catch {
      toast('Failed to delete item', 'error');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (
      !(await dlgConfirm(
        `Are you sure you want to delete category "${category.name}"? This cannot be undone if no items are assigned.`,
        { danger: true }
      ))
    )
      return;

    try {
      const token = getToken();
      if (!token) {
        setError('User not authenticated');
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-inventory?type=category&id=${category.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      toast('Category deleted successfully', 'success');
      fetchCategories();
    } catch {
      toast('Failed to delete category', 'error');
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const lowStockCount = items.filter((item) => item.quantity <= 10).length;
  const hasCategories = categories.length > 0;

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      {/* Modals */}
      <CreateItemModal
        isOpen={showCreateModal}
        categories={categories}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchItems();
          fetchCategories();
          toast('Product added successfully', 'success');
        }}
      />

      <EditItemModal
        item={editingItem}
        categories={categories}
        onClose={() => setEditingItem(null)}
        onSuccess={() => {
          fetchItems();
          fetchCategories();
          toast('Product updated successfully', 'success');
        }}
      />

      <CategoryModal
        isOpen={showCategoryModal || !!editingCategory}
        category={editingCategory}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        onSuccess={() => {
          fetchCategories();
          fetchItems();
          toast(editingCategory ? 'Category updated' : 'Category created', 'success');
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {[
          {
            label: 'Total Products',
            value: items.length,
            isCurrency: false,
            icon: Package,
            iconColor: 'text-[#16281D]',
            bgColor: 'bg-[#F4F7F4]',
          },
          {
            label: 'Catalogue Value',
            value: formatPrice(totalValue),
            isCurrency: true,
            icon: DollarSign,
            iconColor: 'text-[#15803D]',
            bgColor: 'bg-[#22C55E]/10',
          },
          {
            label: 'Low / Out of Stock',
            value: lowStockCount,
            isCurrency: false,
            icon: AlertTriangle,
            iconColor: 'text-[#D97706]',
            bgColor: 'bg-[#F59E0B]/10',
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-[20px] p-5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-medium text-[#71717A]">{card.label}</p>
                <h3 className="font-mono text-2xl font-extrabold text-[#16281D] mt-1 tracking-tight">
                  {card.value}
                </h3>
              </div>
              <div className={`w-11 h-11 rounded-2xl ${card.bgColor} ${card.iconColor} flex items-center justify-center shrink-0`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] font-medium">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-[20px] p-3.5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search products by name, SKU, category…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-[#F4F7F4] border border-[#EAEAEA] rounded-full text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
            />
          </div>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              title="Clear search"
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoriesSection(!showCategoriesSection)}
            className="px-4 py-2 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Tag size={13} />
            <span>{showCategoriesSection ? 'Hide' : 'Manage'} Categories</span>
          </button>

          <button
            onClick={() => {
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
            className="px-4 py-2 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#16281D] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus size={13} />
            <span>New Category</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!hasCategories}
            className="px-4 py-2 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.3)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none shrink-0"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Collapsible Categories Section */}
      {showCategoriesSection && (
        <CategoriesSection
          categories={categories}
          loading={loadingCategories}
          onEditCategory={(cat) => {
            setEditingCategory(cat);
            setShowCategoryModal(true);
          }}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {/* Inventory Table Container */}
      <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] overflow-hidden">
        <InventoryTable
          items={filteredItems}
          totalCount={items.length}
          searchTerm={searchTerm}
          hasCategories={hasCategories}
          onEditItem={(item) => setEditingItem(item)}
          onDeleteItem={handleDeleteItem}
          onAddCategory={() => {
            setEditingCategory(null);
            setShowCategoryModal(true);
          }}
        />
      </div>
    </div>
  );
};

export default InventoryPage;
