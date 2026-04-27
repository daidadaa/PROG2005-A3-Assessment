// inventory.model.ts - data types and interfaces for the app
// Author: WU Shaowei - defined all TypeScript interfaces, enums, type guards

/** Category type */
export type Category = 'Electronics' | 'Furniture' | 'Clothing' | 'Tools' | 'Miscellaneous';

/** Stock status type */
export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

/**
 * Inventory item — matches the server database fields.
 * Server uses snake_case, we use camelCase in the app.
 */
export interface InventoryItem {
  itemId: number;
  itemName: string;
  category: Category;
  quantity: number;        // must be >= 0
  price: number;           // must be >= 0
  supplierName: string;
  stockStatus: StockStatus;
  featuredItem: number;    // 0 or 1
  specialNote?: string;    // optional
}

/**
 * Used when creating new items (POST request).
 * itemId is not included since the server generates it.
 * image is optional base64 data URL from Camera plugin (Native integration).
 */
export interface CreateItemRequest {
  itemName: string;
  category: Category;
  quantity: number;
  price: number;
  supplierName: string;
  stockStatus: StockStatus;
  featuredItem: number;
  specialNote?: string;
  /** Base64 image data captured via @capacitor/camera native plugin */
  image?: string;
}

/** Standard API response from server */
export interface ApiResponse {
  message: string;
  success: boolean;
}
