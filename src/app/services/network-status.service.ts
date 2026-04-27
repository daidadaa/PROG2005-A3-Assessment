// network status + offline cache
// Authors: WU Shaowei & Li Mu — built together during pair session
// WU Shaowei: offline detection logic, cache TTL, Native plugin integration (Capacitor Network)
// Li Mu: offline-banner UI integration

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { InventoryItem } from '../models/inventory.model';

const CACHE_KEY = 'inv_cache_items';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in ms

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {

  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  isOnline$: Observable<boolean> = this.onlineSubject.asObservable();

  /** Whether native network plugin is available (true on real device / emulator) */
  private useNativePlugin: boolean = false;

  constructor() {
    this.initNetworkDetection();
  }

  /**
   * Initialize network status detection.
   * On native platforms (Android/iOS): uses @capacitor/network for real-time status
   * On web/browser: falls back to navigator.onLine + window events
   */
  private async initNetworkDetection(): Promise<void> {
    // Check if running on a native platform
    if (Capacitor.isNativePlatform()) {
      this.useNativePlugin = true;
      try {
        // Get initial network status from native plugin
        const status = await Network.getStatus();
        this.onlineSubject.next(status.connected);

        // Listen for native network changes in real-time
        await Network.addListener('networkStatusChange', (status) => {
          console.log(`[Network] Connection changed: ${status.connectionType} — connected=${status.connected}`);
          this.onlineSubject.next(status.connected);

          // Auto-cache when going offline
          if (!status.connected) {
            console.log('[Network] Device went offline — serving cached data');
          }
        });

        console.log(`[Network] Native plugin active. Initial: ${status.connectionType}, connected=${status.connected}`);
      } catch (err) {
        console.warn('[Network] Native plugin failed, falling back to web API:', err);
        this.useNativePlugin = false;
        this.initWebFallback();
      }
    } else {
      // Web fallback — use browser APIs (works in dev mode)
      console.log('[Network] Running in browser mode — using navigator.onLine fallback');
      this.initWebFallback();
    }
  }

  /**
   * Fallback for non-native environments (browser / ionic serve)
   * Uses standard Web API: navigator.onLine + online/offline events
   */
  private initWebFallback(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[Network] Browser: came online');
        this.onlineSubject.next(true);
      });
      window.addEventListener('offline', () => {
        console.log('[Network] Browser: went offline');
        this.onlineSubject.next(false);
      });
    }
  }

  get isOnline(): boolean {
    return this.onlineSubject.value;
  }

  /**
   * Get detailed connection info (native only)
   * Returns connection type like 'wifi', 'cellular', 'none', etc.
   */
  async getConnectionInfo(): Promise<{ connected: boolean; connectionType: string; isFallback: boolean }> {
    if (this.useNativePlugin) {
      try {
        const status = await Network.getStatus();
        return {
          connected: status.connected,
          connectionType: status.connectionType,
          isFallback: false
        };
      } catch (e) {
        return { connected: this.isOnline, connectionType: 'unknown', isFallback: true };
      }
    }
    return { connected: this.isOnline, connectionType: this.isOnline ? 'web' : 'none', isFallback: true };
  }

  // --- cache stuff for offline mode ---

  cacheItems(items: InventoryItem[]): void {
    try {
      const data = { items, savedAt: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      console.log(`[Cache] Saved ${items.length} items to local storage`);
    } catch (e) {
      console.warn('[Cache] save failed:', e);
    }
  }

  getCachedItems(): InventoryItem[] | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);
      // check if expired
      if (Date.now() - data.savedAt > CACHE_TTL) {
        this.clearCache();
        return null;
      }
      console.log(`[Cache] Loaded ${data.items.length} cached items`);
      return data.items;
    } catch (e) {
      return null;
    }
  }

  clearCache(): void {
    localStorage.removeItem(CACHE_KEY);
    console.log('[Cache] Cleared all cached data');
  }
}
