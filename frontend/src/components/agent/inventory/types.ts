export interface InventoryItem {
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

export interface Category {
  id: number;
  name: string;
  description?: string;
  color: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}
