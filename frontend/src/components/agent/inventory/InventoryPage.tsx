import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

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

const InventoryPage: React.FC = () => {
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
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    quantity: "",
    price: "",
    category_id: "",
    sku: ""
  });
  const [createImages, setCreateImages] = useState<File[]>([]);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    color: "#000000"
  });
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    quantity: "",
    price: "",
    category_id: "",
    sku: ""
  });
  const [editImages, setEditImages] = useState<File[]>([]);
  const [keptImages, setKeptImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);


  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("User not authenticated");
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-inventory?type=categories`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setCategories(data.categories || []);
    } catch (err) {
      setError("Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (showCreateModal || editingItem) {
      fetchCategories(); // Refresh categories for dropdown
    }
  }, [showCreateModal, editingItem]);

  const handleCreateItem = async () => {
    if (!createForm.name.trim()) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("User not authenticated");
        return;
      }

      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (agentError || !agentData) {
        setError("Agent not found");
        return;
      }

      if (
        createForm.category_id &&
        !categories.find((c) => c.id.toString() === createForm.category_id)
      ) {
        setError("Invalid category selected");
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
          quantity: createForm.quantity ? parseInt(createForm.quantity) : 0,
          price: createForm.price ? parseFloat(createForm.price) : 0,
          category_id: createForm.category_id
            ? parseInt(createForm.category_id)
            : null,
          sku: createForm.sku.trim() || null,
          image_urls: null,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      const itemId = data.item_id;

      let imageUrls: string[] = [];
      if (createImages.length > 0) {
        try {
          imageUrls = await uploadImages(
            agentData.id.toString(),
            itemId.toString(),
            createImages,
            session.access_token
          );
        } catch (uploadError) {
          setError("Item created but failed to upload images");
          setShowCreateModal(false);
          fetchItems();
          return;
        }
      }

      if (imageUrls.length > 0) {
        const updateResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-inventory`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: itemId,
              image_urls: imageUrls,
            }),
          }
        );

        const updateData = await updateResponse.json();
        if (!updateResponse.ok) {
          setError("Item created and images uploaded but failed to link them");
        }
      }

      setShowCreateModal(false);
      setCreateForm({
        name: "",
        description: "",
        quantity: "",
        price: "",
        category_id: "",
        sku: "",
      });
      setCreateImages([]);
      setError(null);
      fetchItems();
    } catch (err) {
      setError("Failed to create inventory item");
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("User not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-inventory`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "category",
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim() || null,
            color: categoryForm.color,
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      setShowCategoryModal(false);
      setCategoryForm({
        name: "",
        description: "",
        color: "#000000",
      });
      setError(null);
      fetchCategories();
    } catch (err) {
      setError("Failed to create category");
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editForm.name.trim()) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("User not authenticated");
        return;
      }

      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (agentError || !agentData) {
        setError("Agent not found");
        return;
      }

      if (
        editForm.category_id &&
        !categories.find((c) => c.id.toString() === editForm.category_id)
      ) {
        setError("Invalid category selected");
        return;
      }

      let newImageUrls: string[] = [];
      if (editImages.length > 0) {
        try {
          newImageUrls = await uploadImages(
            agentData.id.toString(),
            editingItem.id.toString(),
            editImages,
            session.access_token
          );
        } catch (uploadError) {
          setError("Failed to upload images");
          return;
        }
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-inventory`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingItem.id,
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          quantity: editForm.quantity ? parseInt(editForm.quantity) : 0,
          price: editForm.price ? parseFloat(editForm.price) : 0,
          category_id: editForm.category_id
            ? parseInt(editForm.category_id)
            : null,
          sku: editForm.sku.trim() || null,
          image_urls: [...keptImages, ...newImageUrls],
          removed_image_urls: removedImages,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      setEditingItem(null);
      setEditForm({
        name: "",
        description: "",
        quantity: "",
        price: "",
        category_id: "",
        sku: "",
      });
      setEditImages([]);
      setKeptImages([]);
      setRemovedImages([]);
      setError(null);
      fetchItems();
    } catch (err) {
      setError("Failed to update inventory item");
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryForm.name.trim()) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("User not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-inventory`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "category",
            id: editingCategory.id,
            name: categoryForm.name.trim() || null,
            description: categoryForm.description.trim() || null,
            color: categoryForm.color || null,
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      setShowEditCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({
        name: "",
        description: "",
        color: "#000000",
      });
      setError(null);
      fetchCategories();
    } catch (err) {
      setError("Failed to update category");
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("User not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-inventory?id=${item.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      setError(null);
      fetchItems();
    } catch (err) {
      setError("Failed to delete inventory item");
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (
      !confirm(
        `Are you sure you want to delete "${category.name}"? This cannot be undone if no items are assigned.`
      )
    ) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("User not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-inventory?type=category&id=${category.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      setError(null);
      fetchCategories();
    } catch (err) {
      setError("Failed to delete category");
    }
  };

  const startEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      description: item.description || "",
      quantity: item.quantity.toString(),
      price: item.price.toString(),
      category_id: "",
      sku: item.sku || "",
    });
    setEditImages([]);
    setKeptImages(item.image_urls || []);
    setRemovedImages([]);

    const matchedCategory = categories.find(
      (c) => c.name === item.category_name
    );
    if (matchedCategory) {
      setEditForm((prev) => ({
        ...prev,
        category_id: matchedCategory.id.toString(),
      }));
    }
  };

  const removeImage = (url: string) => {
    setRemovedImages((prev) => [...prev, url]);
    setKeptImages((prev) => prev.filter((img) => img !== url));
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      color: category.color || "#000000",
    });
    setShowEditCategoryModal(true);
  };

  const resizeImage = (
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1920
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        let { width, height } = img;

        // Calculate new dimensions maintaining aspect ratio
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
              const resizedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, ".jpg"),
                { type: "image/jpeg" }
              );
              resolve(resizedFile);
            } else {
              reject(new Error("Failed to resize image"));
            }
          },
          "image/jpeg",
          0.9
        ); // 90% quality
      };

      img.onerror = reject;
    });
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

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
        return {
          fileName: resizedFile.name,
          fileBase64: base64,
          fileType: resizedFile.type,
        };
      })
    );

    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/upload-inventory-images`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: parseInt(agentId),
          productId: parseInt(productId),
          images: resizedImages,
        }),
      }
    );

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Upload failed");
    }

    return data.urls;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
    }).format(price);
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const hasCategories = categories.length > 0;
  const noCategoriesMessage = !hasCategories
    ? "No categories yet. Add one to organize your inventory."
    : null;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Inventory</h2>
          <p className="text-gray-600 mt-1">
            {filteredItems.length} items | {categories.length} categories
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCategoriesSection(!showCategoriesSection)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
            <span>{showCategoriesSection ? "Hide" : "Show"} Categories</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            disabled={!hasCategories}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add Item</span>
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            Add Category
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          Error: {error}
        </div>
      )}

      {/* Categories Section */}
      {showCategoriesSection && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Categories</h3>
            <input
              type="text"
              placeholder="Search categories..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 max-w-md"
            />
          </div>
          {loadingCategories ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No categories
              </h4>
              <p className="text-gray-500">
                Start by adding your first category
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Color
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCategories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {category.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                          {category.description || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {category.item_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          ></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(category.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => startEditCategory(category)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                            aria-label="Edit category"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            className="text-red-600 hover:text-red-900"
                            aria-label="Delete category"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inventory Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search inventory by name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "No items found" : "No inventory items yet"}
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? `No items match "${searchTerm}"`
                : hasCategories
                ? "Start adding items to your inventory"
                : noCategoriesMessage}
            </p>
            {!hasCategories && (
              <button
                onClick={() => setShowCategoryModal(true)}
                className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Add First Category
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {item.image_urls && item.image_urls.length > 0 ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={item.image_urls[0]}
                              alt={item.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <svg
                                className="h-5 w-5 text-gray-500"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M4 4h16v16H4z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.sku || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.category_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.quantity > 10
                            ? "bg-green-100 text-green-800"
                            : item.quantity > 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatPrice(item.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => startEditItem(item)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors mr-3"
                        aria-label="Edit item"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        aria-label="Delete item"
                      >
                        Delete
                      </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Item</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({
                    name: "",
                    description: "",
                    quantity: "",
                    price: "",
                    category_id: "",
                    sku: "",
                  });
                  setCreateImages([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateItem();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter item name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={createForm.quantity}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, quantity: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (LKR)
                  </label>
                  <input
                    type="number"
                    value={createForm.price}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, price: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={createForm.category_id}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      category_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">No Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU (optional)
                </label>
                <input
                  type="text"
                  value={createForm.sku}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, sku: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter SKU"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Images (optional)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) =>
                    setCreateImages(Array.from(e.target.files || []))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                />
                {createImages.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {createImages.length} image(s) selected
                  </p>
                )}
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors flex-1"
                >
                  Create Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      name: "",
                      description: "",
                      quantity: "",
                      price: "",
                      category_id: "",
                      sku: "",
                    });
                    setCreateImages([]);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Category</h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryForm({
                    name: "",
                    description: "",
                    color: "#000000",
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateCategory();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, color: e.target.value })
                  }
                  className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium transition-colors flex-1"
                >
                  Create Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setCategoryForm({
                      name: "",
                      description: "",
                      color: "#000000",
                    });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Item</h3>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setEditForm({
                    name: "",
                    description: "",
                    quantity: "",
                    price: "",
                    category_id: "",
                    sku: "",
                  });
                  setEditImages([]);
                  setKeptImages([]);
                  setRemovedImages([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateItem();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={editForm.quantity}
                    onChange={(e) =>
                      setEditForm({ ...editForm, quantity: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (LKR)
                  </label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={editForm.category_id}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={editForm.sku}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sku: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Images (optional)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) =>
                    setEditImages(Array.from(e.target.files || []))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                />
                {editImages.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {editImages.length} new image(s) selected
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Images
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keptImages.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt="Current"
                        className="w-20 h-20 object-cover rounded"
                      />
                      <button
                        onClick={() => removeImage(url)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs cursor-pointer border-none hover:bg-red-600"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {removedImages.length > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    Removed {removedImages.length} image(s). They will be
                    deleted on save.
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Click × to remove images
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors flex-1"
                >
                  Update Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setEditForm({
                      name: "",
                      description: "",
                      quantity: "",
                      price: "",
                      category_id: "",
                      sku: "",
                    });
                    setEditImages([]);
                    setKeptImages([]);
                    setRemovedImages([]);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Category</h3>
              <button
                onClick={() => {
                  setShowEditCategoryModal(false);
                  setEditingCategory(null);
                  setCategoryForm({
                    name: "",
                    description: "",
                    color: "#000000",
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateCategory();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, color: e.target.value })
                  }
                  className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium transition-colors flex-1"
                >
                  Update Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryForm({
                      name: "",
                      description: "",
                      color: "#000000",
                    });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;