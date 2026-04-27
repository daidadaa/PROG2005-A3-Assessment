// inventory-api.service.ts - handles all API calls to the server
// Author: WU Shaowei - implemented GET/PUT/DELETE methods and error handling
// server returns snake_case fields so we convert them to camelCase here

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { InventoryItem, CreateItemRequest, ApiResponse, Category } from '../models/inventory.model';
import { environment } from '../../environments/environment';
import { NetworkStatusService } from './network-status.service';

const API_BASE_URL = environment.apiUrl;

const HTTP_OPTIONS = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

// raw shape from server
interface RawInventoryItem {
  item_id: number;
  item_name: string;
  category: string;
  quantity: number;
  price: number;
  supplier_name: string;
  stock_status: 'In stock' | 'Out of stock' | 'Low stock';
  featured_item: number;
  special_note?: string;
}

function mapRawToInventoryItem(raw: RawInventoryItem): InventoryItem {
  return {
    itemId: raw.item_id,
    itemName: raw.item_name || '(Unnamed Item)',
    category: (raw.category || 'Miscellaneous') as Category,
    quantity: Number(raw.quantity) || 0,
    price: Number(raw.price) || 0,
    supplierName: raw.supplier_name || '',
    stockStatus: normalizeStockStatus(raw.stock_status),
    featuredItem: Number(raw.featured_item) || 0,
    specialNote: raw.special_note || ''
  };
}

function normalizeStockStatus(status: string): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  const s = (status || '').toLowerCase();
  if (s.includes('low')) return 'Low Stock';
  if (s.includes('out') || s === 'oos') return 'Out of Stock';
  return 'In Stock';
}

@Injectable({ providedIn: 'root' })
export class InventoryApiService {

  constructor(
    private http: HttpClient,
    private network: NetworkStatusService
  ) {}

  // GET all items — returns cached data if offline
  // FIXME: the cache logic here is pretty basic, might not handle all edge cases
  getAllItems(): Observable<InventoryItem[]> {
    if (!this.network.isOnline) {
      const cached = this.network.getCachedItems();
      if (cached && cached.length > 0) {
        return of(cached);
      }
    }

    return this.http.get<RawInventoryItem[]>(API_BASE_URL).pipe(
      map((rawArray) => (rawArray || [])
        .map(mapRawToInventoryItem)
        .filter(item => item.itemName && item.itemName !== '(Unnamed Item)')
      ),
      tap((items) => {
        // cache items so we can show something when offline
        this.network.cacheItems(items);
        // console.log('cached', items.length, 'items');
      }),
      catchError(this.handleError('getAllItems', []))
    );
  }

  // GET single item by name
  getItemByName(name: string): Observable<InventoryItem[]> {
    const url = `${API_BASE_URL}/${encodeURIComponent(name)}`;
    return this.http.get<RawInventoryItem[]>(url).pipe(
      map((rawArray) => (rawArray || []).map(mapRawToInventoryItem)),
      catchError(this.handleError('getItemByName', []))
    );
  }

  // POST new item
  createItem(item: CreateItemRequest): Observable<ApiResponse | InventoryItem> {
    const payload = {
      item_name: item.itemName,
      category: item.category,
      quantity: item.quantity,
      price: item.price,
      supplier_name: item.supplierName,
      stock_status: this.toApiStockStatus(item.stockStatus),
      featured_item: item.featuredItem,
      ...(item.specialNote ? { special_note: item.specialNote } : {})
    };
    return this.http.post<ApiResponse | InventoryItem>(API_BASE_URL, payload, HTTP_OPTIONS).pipe(
      catchError(this.handleError('createItem', { message: 'Create failed', success: false }))
    );
  }

  // PUT update existing item by name
  updateItemByName(originalName: string, updatedItem: Partial<InventoryItem>): Observable<ApiResponse> {
    const url = `${API_BASE_URL}/${encodeURIComponent(originalName)}`;
    const payload: Record<string, any> = {};
    if (updatedItem.itemName !== undefined) payload.item_name = updatedItem.itemName;
    if (updatedItem.category !== undefined) payload.category = updatedItem.category;
    if (updatedItem.quantity !== undefined) payload.quantity = updatedItem.quantity;
    if (updatedItem.price !== undefined) payload.price = updatedItem.price;
    if (updatedItem.supplierName !== undefined) payload.supplier_name = updatedItem.supplierName;
    if (updatedItem.stockStatus !== undefined) payload.stock_status = this.toApiStockStatus(updatedItem.stockStatus);
    if (updatedItem.featuredItem !== undefined) payload.featured_item = updatedItem.featuredItem;
    if (updatedItem.specialNote !== undefined) payload.special_note = updatedItem.specialNote;

    return this.http.put<ApiResponse>(url, payload, HTTP_OPTIONS).pipe(
      catchError(this.handleError('updateItemByName', { message: 'Update failed', success: false }))
    );
  }

  // DELETE item by name (note: deleting "Laptop" is forbidden on server)
  deleteItemByName(name: string): Observable<ApiResponse> {
    const url = `${API_BASE_URL}/${encodeURIComponent(name)}`;
    return this.http.delete<ApiResponse>(url, HTTP_OPTIONS).pipe(
      catchError(this.handleError('deleteItemByName', { message: 'Delete failed', success: false }))
    );
  }

  // helpers

  private toApiStockStatus(status: string): string {
    const map: Record<string, string> = {
      'In Stock': 'In stock',
      'Low Stock': 'Low stock',
      'Out of Stock': 'Out of stock'
    };
    return map[status] || status;
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`[API Error] ${operation} failed:`, error);
      return of(result as T);
    };
  }
}
