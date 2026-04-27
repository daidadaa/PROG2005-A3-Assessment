// tests for offline cache service
// Author: Li Mu — tests for online/offline detection, cache TTL, cacheItems/clearCache

import { TestBed } from '@angular/core/testing';
import { NetworkStatusService } from './network-status.service';
import { InventoryItem, Category } from '../models/inventory.model';

describe('NetworkStatusService', () => {
  let svc: NetworkStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(NetworkStatusService);
    svc.clearCache();
  });

  it('should be created', () => {
    expect(svc).toBeTruthy();
  });

  it('should match navigator.onLine', () => {
    expect(svc.isOnline).toBe(navigator.onLine);
  });

  // cache tests

  const testItems: InventoryItem[] = [
    { itemId: 1, itemName: 'Thing', category: Category.Electronics, quantity: 5, price: 10,
      supplierName: '', stockStatus: 'In Stock', featuredItem: 0 }
  ];

  it('save and load items from cache', () => {
    svc.cacheItems(testItems);
    const cached = svc.getCachedItems();
    expect(cached).not.toBeNull();
    expect(cached!.length).toBe(1);
    expect(cached![0].itemName).toBe('Thing');
  });

  it('return null when no cache', () => {
    expect(svc.getCachedItems()).toBeNull();
  });

  it('clear should work', () => {
    svc.cacheItems(testItems);
    svc.clearCache();
    expect(svc.getCachedItems()).toBeNull();
  });
});
