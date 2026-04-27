// tab-list.page.ts - list & search functionality
// Author: WU Shaowei - did all the work here (load data from server, search, filter, stats)
// TODO: maybe add pagination later if there are too many items?

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { InventoryItem } from '../../models/inventory.model';
import { InventoryApiService } from '../../services/inventory-api.service';
import { HelpWidgetComponent } from '../../components/help-widget.component';
import { OfflineBannerComponent } from '../../components/offline-banner.component';

@Component({
  selector: 'app-tab-list',
  standalone: true,
  templateUrl: './tab-list.page.html',
  styleUrls: ['./tab-list.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HelpWidgetComponent,
    OfflineBannerComponent
  ]
})
export class TabListPage implements OnInit, OnDestroy, ViewWillEnter {

  /** All items fetched from server */
  items: InventoryItem[] = [];

  /** Filtered result after applying search */
  filteredItems: InventoryItem[] = [];

  /** Search input value */
  searchName: string = '';

  /** Active category filter ('all' means no filter) */
  activeCategoryFilter: string = 'all';

  /** Whether data is currently loading */
  isLoading: boolean = true;

  /** Whether initial load has completed at least once */
  hasLoadedOnce: boolean = false;

  /** All available categories derived from loaded items */
  availableCategories: string[] = ['Electronics', 'Furniture', 'Clothing', 'Tools', 'Miscellaneous'];

  /** Computed count of out-of-stock items */
  get outOfStockCount(): number {
    return this.items.filter((i) => i.stockStatus === 'Out of Stock').length;
  }

  /** Computed count of low-stock items */
  get lowStockCount(): number {
    return this.items.filter((i) => i.stockStatus === 'Low Stock').length;
  }

  /** Total inventory value */
  get totalValue(): number {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  helpContent: string = `
    <div class="help-content-list">
      <h4>How to Use List &amp; Search</h4>
      <ul>
        <li>All inventory items are <strong>automatically loaded</strong> when you open this tab.</li>
        <li>Type in the <strong>search bar</strong> to filter by item name — results update instantly.</li>
        <li>Use <strong>category chips</strong> to quickly filter by product type.</li>
        <li><strong>Pull down</strong> to refresh data from the server.</li>
        <li>Stock status badges show: In Stock | Low Stock | Out of Stock</li>
      </ul>
      <h4>Tips</h4>
      <ul>
        <li>Swipe left on an item to see quick details.</li>
        <li>Stats cards show real-time inventory overview.</li>
        <li>Total Value = Σ(Price × Quantity) across all items.</li>
      </ul>
    </div>
  `;

  private loadSubscription?: Subscription;

  constructor(
    private readonly apiService: InventoryApiService,
    private readonly loadingCtrl: LoadingController,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    // don't load here, let ionViewWillEnter handle it
    // this.loadAllItems();
  }

  // Ionic lifecycle: fires every time user navigates to this tab
  ionViewWillEnter(): void {
    this.loadAllItems();
  }

  ngOnDestroy(): void {
    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }
  }

  // ==================== Data Loading ====================

  async loadAllItems(showLoading = true): Promise<void> {
    let loader: HTMLIonLoadingElement | null = null;
    if (showLoading) {
      loader = await this.loadingCtrl.create({
        message: 'Loading inventory...',
        spinner: 'crescent'
      });
      await loader.present();
    }

    this.isLoading = true;
    this.loadSubscription = this.apiService.getAllItems().subscribe({
      next: (data: InventoryItem[]) => {
        this.items = data || [];
        this.hasLoadedOnce = true;
        this.applyFilters(); // Apply both search + category
        this.isLoading = false;
        loader?.dismiss();
      },
      error: async (err: any) => {
        console.error('Failed to load items:', err);
        this.isLoading = false;
        this.hasLoadedOnce = true;
        loader?.dismiss();
        await this.showToast('Failed to load data. Check your network connection.', 'danger');
      }
    });
  }

  // search / filter stuff
  onSearchInput(): void {
    this.applyFilters();
  }

  /** Clears search and resets category filter */
  clearSearch(): void {
    this.searchName = '';
    this.activeCategoryFilter = 'all';
    this.filteredItems = [...this.items];
  }

  /** Toggles a category chip filter */
  setCategoryFilter(category: string): void {
    if (this.activeCategoryFilter === category) {
      this.activeCategoryFilter = 'all'; // Toggle off
    } else {
      this.activeCategoryFilter = category;
    }
    this.applyFilters();
  }

  // applies text search + category filter together
  // TODO: could debounce this for better perf if list gets big
  private applyFilters(): void {
    let result = [...this.items];

    // first apply category filter
    if (this.activeCategoryFilter && this.activeCategoryFilter !== 'all') {
      // using filter here - might need to change to loop later for sorting?
      result = result.filter((item) => item.category === this.activeCategoryFilter);
    }

    // then apply text search on name, category, supplier
    const keyword = this.searchName.trim().toLowerCase();
    if (keyword) {
      // was going to write a loop but filter is cleaner
      result = result.filter((item) =>
        item.itemName.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        item.supplierName.toLowerCase().includes(keyword)
      );
    }

    this.filteredItems = result;

    // debug: uncomment to see filtered count
    // console.log('filter applied. results:', this.filteredItems.length);
  }

  /** Timestamp of last successful data refresh */
  lastRefreshed: string = '';

  // pull to refresh

  async handleRefresh($event: any): Promise<void> {
    await this.loadAllItems(false);
    ($event.target as HTMLIonRefresherElement).complete();

    // show feedback toast + timestamp
    const now = new Date();
    this.lastRefreshed = now.toLocaleTimeString();
    await this.showToast(
      `Refreshed (${this.filteredItems.length} items)`,
      'success',
      1800
    );
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'In Stock': return 'status-in';
      case 'Low Stock': return 'status-low';
      case 'Out of Stock': return 'status-out';
      default: return '';
    }
  }

  isFeatured(item: InventoryItem): boolean {
    return item.featuredItem === 1;
  }

  /** Get color for category dot indicator (replaces icon) */
  getCategoryColor(category: string): string {
    const colorMap: Record<string, string> = {
      Electronics: '#0ea5e9',
      Furniture: '#8b5cf6',
      Clothing: '#ec4899',
      Tools: '#f97316',
      Miscellaneous: '#64748b'
    };
    return colorMap[category] || '#94a3b8';
  }

  /** Get CSS class name for category-based left border accent */
  getCategoryClass(category: string): string {
    const safeName = category.replace(/\s+/g, '-').toLowerCase();
    return `cat-${safeName}`;
  }

  trackByItemId(index: number, item: InventoryItem): number {
    return item.itemId;
  }

  async viewItemDetail(item: InventoryItem): Promise<void> {
    await this.showToast(
      `${item.itemName} | ${item.category} | $${item.price} × ${item.quantity} = $${item.price * item.quantity}`,
      'secondary', 4000
    );
  }

  /** Format large numbers with commas */
  formatNumber(n: number): string {
    return n.toLocaleString('en-US');
  }

  async showToast(message: string, color: string = 'primary', duration: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration,
      position: 'top',
      cssClass: 'message-toast',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }
}
