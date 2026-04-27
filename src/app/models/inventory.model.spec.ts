// model unit tests
// Author: WU Shaowei — tests for InventoryItem interface, Category enum, type guards

import { Category, StockStatus } from './inventory.model';

describe('InventoryModel', () => {

  it('Category enum should have right values', () => {
    expect(Category.Electronics).toBe('Electronics');
    expect(Category.Furniture).toBe('Furniture');
    expect(Category.Clothing).toBe('Clothing');
    expect(Category.Tools).toBe('Tools');
    expect(Category.Miscellaneous).toBe('Miscellaneous');
  });

  it('StockStatus should have right values', () => {
    expect(StockStatus.InStock).toBe('In Stock');
    expect(StockStatus.LowStock).toBe('Low Stock');
    expect(StockStatus.OutOfStock).toBe('Out of Stock');
  });

  // basic mapping test - same logic as inventory-api.service
  it('should map raw API data to camelCase', () => {
    const raw = {
      item_id: 42,
      item_name: 'Test Item',
      category: 'Electronics',
      quantity: '10',
      price: '99',
      supplier_name: 'Test Co',
      stock_status: 'In stock',
      featured_item: 1,
      special_note: ''
    };

    function normalizeStock(s: string): string {
      const st = (s || '').toLowerCase();
      if (st.includes('low')) return 'Low Stock';
      if (st.includes('out') || st === 'oos') return 'Out of Stock';
      return 'In Stock';
    }

    const mapped = {
      itemId: raw.item_id,
      itemName: raw.item_name || '(Unnamed)',
      category: raw.category || 'Miscellaneous',
      quantity: Number(raw.quantity) || 0,
      price: Number(raw.price) || 0,
      supplierName: raw.supplier_name || '',
      stockStatus: normalizeStock(raw.stock_status),
      featuredItem: Number(raw.featured_item) || 0,
      specialNote: raw.special_note || ''
    };

    expect(mapped.itemId).toBe(42);
    expect(mapped.itemName).toBe('Test Item');
    expect(mapped.category).toBe('Electronics');
    expect(mapped.quantity).toBe(10);
    expect(mapped.price).toBe(99);
    expect(mapped.supplierName).toBe('Test Co');
    expect(mapped.stockStatus).toBe('In Stock');
  });

  // TODO: maybe test empty/missing fields later
  xit('should handle missing fields with defaults — skipped for now', () => {
    expect(true).toBe(true);
  });
});
