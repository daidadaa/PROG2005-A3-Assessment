// tab-add.page.ts - add new item to inventory
// Author: Li Mu - built this whole page (form UI, POST request, leading-zero validator, duplicate check)
// Native Plugin Integration: Camera (@capacitor/camera) — photo capture for inventory items
// TODO: might add image upload feature in future? → DONE: now using Capacitor Camera plugin!

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonicModule, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Category, StockStatus, InventoryItem, CreateItemRequest } from '../../models/inventory.model';
import { InventoryApiService } from '../../services/inventory-api.service';
import { HelpWidgetComponent } from '../../components/help-widget.component';

/** Rejects leading-zero numbers like "0111", "007". Accepts "0", "5", "123". */
export function noLeadingZeroValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value || value === '0') return null;
  if (/^0\d/.test(value)) return { leadingZero: true };
  return null;
}

@Component({
  selector: 'app-tab-add',
  standalone: true,
  templateUrl: './tab-add.page.html',
  styleUrls: ['./tab-add.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonicModule, HelpWidgetComponent]
})
export class TabAddPage implements OnInit, OnDestroy {

  addItemForm!: FormGroup;
  featuredItems: InventoryItem[] = [];
  existingItems: InventoryItem[] = [];
  suggestions: InventoryItem[] = [];
  showSuggestions: boolean = false;

  /** Captured item photo as base64 data URL (from Capacitor Camera) */
  itemImage: string | null = null;

  /** Whether camera is available on this device */
  cameraAvailable: boolean = false;

  categories: Category[] = ['Electronics', 'Furniture', 'Clothing', 'Tools', 'Miscellaneous'];
  stockStatuses: StockStatus[] = ['In Stock', 'Low Stock', 'Out of Stock'];
  isSubmitting: boolean = false;

  helpContent: string = `
    <div class="help-content-list">
      <h4>How to Add a New Item</h4>
      <ul>
        <li>Fill out all required fields marked with *.</li>
        <li><strong>Item Name</strong> must be unique.</li>
        <li><strong>Quantity</strong> and <strong>Price</strong>: valid integers without leading zeros.</li>
        <li><strong>Supplier Name</strong> is required.</li>
        <li><strong>Featured Item</strong>: Set toggle for featured display.</li>
      </ul>

      <h4>📷 Camera (Native Plugin)</h4>
      <ul>
        <li>Use <strong>Take Photo</strong> to capture item image via device camera.</li>
        <li>Use <strong>Gallery</strong> to pick an existing photo from device storage.</li>
        <li>Powered by @capacitor/camera — works on Android, iOS &amp; web.</li>
      </ul>
    </div>
  `;

  private loadSubscription?: Subscription;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: InventoryApiService,
    private readonly loadingCtrl: LoadingController,
    private readonly toastCtrl: ToastController,
    private readonly alertCtrl: AlertController
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadExistingItems();
    this.checkCameraAvailability();
  }

  /** Check if Camera plugin is available on native device or web */
  private async checkCameraAvailability(): Promise<void> {
    try {
      // On native platforms (Android/iOS), camera is always available
      // On web browser, we can still use Camera plugin for file input fallback
      this.cameraAvailable = true;
      console.log('[Camera] Camera plugin available');
    } catch (e) {
      console.warn('[Camera] Not available:', e);
      this.cameraAvailable = false;
    }
  }

  ngOnDestroy(): void {
    if (this.loadSubscription) this.loadSubscription.unsubscribe();
  }

  // ==================== Form Setup ====================

  private initForm(): void {
    this.addItemForm = this.formBuilder.group({
      itemName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      category: ['Electronics', [Validators.required]],
      quantity: [null, [Validators.required, Validators.min(0), Validators.pattern(/^[0-9]*$/), noLeadingZeroValidator]],
      price: [null, [Validators.required, Validators.min(0), Validators.pattern(/^[0-9]*$/), noLeadingZeroValidator]],
      supplierName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      stockStatus: ['In Stock', [Validators.required]],
      featuredItem: [0],
      specialNote: ['']
    });
  }

  // ==================== Auto-Complete ====================

  onItemNameInput(event: any): void {
    const value = event.detail?.value?.toString().trim() || '';
    if (!value || value.length < 1) { this.suggestions = []; this.showSuggestions = false; return; }
    this.suggestions = this.existingItems
      .filter((item) => item.itemName.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 8);
    this.showSuggestions = this.suggestions.length > 0;
  }

  selectSuggestion(item: InventoryItem): void {
    this.addItemForm.patchValue({ itemName: item.itemName + ' (Copy)', category: item.category, supplierName: item.supplierName });
    this.suggestions = []; this.showSuggestions = false;
    this.showToast('Fields pre-filled. Please review before submitting.', 'secondary');
  }

  hideSuggestions(): void {
    setTimeout(() => { this.suggestions = []; this.showSuggestions = false; }, 200);
  }

  // ==================== Camera Integration (Capacitor Native Plugin) ====================

  /**
   * Take a photo using the device camera (Native plugin: @capacitor/camera)
   * On native Android/iOS: opens system camera app
   * On web browser: uses file input / webcam fallback
   */
  async takePhoto(): Promise<void> {
    if (!this.cameraAvailable) {
      await this.showToast('Camera is not available on this device.', 'warning');
      return;
    }

    try {
      const photo: Photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,      // Use device camera
        correctOrientation: true,
        saveToGallery: false              // Don't save to device gallery
      });

      // Convert base64 to displayable data URL
      this.itemImage = `data:image/jpeg;base64,${photo.base64String}`;
      console.log(`[Camera] Photo captured. Size: ${photo.base64String?.length || 0} chars`);
      await this.showToast('Photo captured!', 'success', 1500);
    } catch (err: any) {
      // User cancelled — no error message needed
      if (err?.message?.includes('User cancelled') || err === 'User cancelled photos') {
        console.log('[Camera] Photo capture cancelled by user');
        return;
      }
      console.error('[Camera] Error taking photo:', err);
      await this.showToast('Failed to take photo. Check camera permissions.', 'danger', 3000);
    }
  }

  /**
   * Pick an image from the device gallery/photo library (Native plugin)
   */
  async pickFromGallery(): Promise<void> {
    if (!this.cameraAvailable) {
      await this.showToast('Gallery is not available on this device.', 'warning');
      return;
    }

    try {
      const photo: Photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,     // Use photo library
        correctOrientation: true
      });

      this.itemImage = `data:image/jpeg;base64,${photo.base64String}`;
      console.log(`[Camera] Image selected from gallery. Size: ${photo.base64String?.length || 0} chars`);
      await this.showToast('Image selected!', 'success', 1500);
    } catch (err: any) {
      if (err?.message?.includes('User cancelled') || err === 'User cancelled photos') {
        console.log('[Camera] Gallery selection cancelled by user');
        return;
      }
      console.error('[Camera] Error picking from gallery:', err);
      await this.showToast('Failed to select image.', 'danger', 3000);
    }
  }

  /** Remove the currently selected item image */
  removeImage(): void {
    this.itemImage = null;
    console.log('[Camera] Image removed');
  }

  // ==================== Form Submission ====================

  async onSubmit(): Promise<void> {
    this.markFormTouched();

    if (this.addItemForm.invalid) {
      const errors: string[] = [];
      const inC = this.addItemForm.get('itemName');
      const qC = this.addItemForm.get('quantity');
      const pC = this.addItemForm.get('price');
      const sC = this.addItemForm.get('supplierName');

      if (inC?.errors?.['required']) errors.push('Item Name required.');
      else if (inC?.invalid) errors.push('Item Name invalid.');
      if (qC?.errors?.['required']) errors.push('Quantity required.');
      else if (qC?.errors?.['leadingZero']) errors.push('Quantity cannot have leading zeros (e.g. 0111). Use normal numbers.');
      else if (qC?.invalid && qC?.touched) errors.push('Quantity must be >= 0, whole number.');
      if (pC?.errors?.['required']) errors.push('Price required.');
      else if (pC?.errors?.['leadingZero']) errors.push('Price cannot have leading zeros (e.g. 099). Use normal numbers.');
      else if (pC?.invalid && pC?.touched) errors.push('Price must be >= 0, whole number.');
      if (sC?.errors?.['required']) errors.push('Supplier Name required.');

      await this.showToast(errors.join('  '), 'danger', 5000);
      return;
    }

    const confirm = await this.alertCtrl.create({
      header: 'Confirm New Item',
      message: `Create "<strong>${this.addItemForm.value.itemName}</strong>"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Add', handler: () => this.doSubmit() }
      ]
    });
    await confirm.present();
  }

  // FIXME: the alert confirm + submit flow feels messy, should refactor
  private async doSubmit(): Promise<void> {
    this.isSubmitting = true;
    const loader = await this.loadingCtrl.create({ message: 'Creating item...', spinner: 'circles' });
    await loader.present();

    const fd = this.addItemForm.value;
    const request: CreateItemRequest = {
      itemName: fd.itemName.trim(),
      category: fd.category,
      quantity: parseInt(fd.quantity, 10),
      price: parseInt(fd.price, 10),
      supplierName: fd.supplierName.trim(),
      stockStatus: fd.stockStatus,
      featuredItem: parseInt(fd.featuredItem, 10) || 0,
      specialNote: fd.specialNote?.trim() || undefined,
      image: this.itemImage || undefined  // Include captured photo if available
    };

    this.apiService.createItem(request).subscribe({
      next: async () => {
        this.isSubmitting = false; loader.dismiss(); this.resetForm();
        await this.showToast(`"${request.itemName}" created successfully!`, 'success');
        this.loadExistingItems();
      },
      error: async (err: any) => {
        this.isSubmitting = false; loader.dismiss();
        await this.showToast(this.buildErrorMsg(err), 'danger', 5000);
      }
    });
  }

  /** Build user-friendly error with HTTP status and reason */
  private buildErrorMsg(err: any): string {
    const st = err?.status;
    const body = err?.error;
    const msg = typeof body === 'string' ? body : body?.message || '';

    switch (st) {
      case 400: return `Bad Request (400): ${msg || 'Invalid data.'}`;
      case 403: return `Forbidden (403): ${msg || 'Operation not allowed by server.'}`;
      case 409: return `Duplicate! "${this.addItemForm.value.itemName}" already exists.`;
      case 422: return `Invalid Data (422): ${msg || 'Data format rejected.'}`;
      case 500: return `Server Error (500): ${msg || 'Internal server error.'}`;
      case 0:   return `Network Error: Cannot connect to server.`;
      default: return msg ? `Error (${st}): ${msg}` : `Failed. Try again.`;
    }
  }

  // ==================== Data ====================

  loadExistingItems(): void {
    if (this.loadSubscription) this.loadSubscription.unsubscribe();
    this.loadSubscription = this.apiService.getAllItems().subscribe({
      next: (data: InventoryItem[]) => {
        this.existingItems = data || [];
        this.featuredItems = this.existingItems.filter((item) => item.featuredItem === 1);
      },
      error: (_e: any) => { this.existingItems = []; this.featuredItems = []; }
    });
  }

  // ==================== Helpers ====================

  resetForm(): void {
    this.addItemForm.reset({ itemName: '', category: 'Electronics', quantity: null, price: null, supplierName: '', stockStatus: 'In Stock', featuredItem: 0, specialNote: '' });
    Object.values(this.addItemForm.controls).forEach((c) => c.markAsUntouched({ onlySelf: true }));
    this.itemImage = null; // Also reset captured photo
  }

  onToggleFeatured(event: CustomEvent): void {
    this.addItemForm.patchValue({ featuredItem: event.detail.checked ? 1 : 0 });
  }

  trackByItemId(_index: number, item: InventoryItem): number { return item.itemId; }
  private markFormTouched(): void { Object.values(this.addItemForm.controls).forEach((c) => c.markAsTouched()); }

  // return css class for status badge
  getStatusClass(s: string): string {
    if (s === 'In Stock') return 'status-in';
    if (s === 'Low Stock') return 'status-low';
    if (s === 'Out of Stock') return 'status-out';
    return '';
  }

  // color for the category dot
  getCategoryColor(cat: Category): string {
    if (cat === 'Electronics') return '#0ea5e9';
    if (cat === 'Furniture') return '#8b5cf6';
    if (cat === 'Clothing') return '#ec4899';
    if (cat === 'Tools') return '#f97316';
    return '#64748b';
  }

  getCategoryClass(category: string): string {
    return 'cat-' + category.replace(/\s+/g, '-').toLowerCase();
  }

  getItemNameError(): string {
    const c = this.addItemForm.get('itemName'); if (!c?.touched || !c?.errors) return '';
    if (c.errors['required']) return 'Item name required';
    if (c.errors['minlength']) return 'At least 1 character'; if (c.errors['maxlength']) return 'Max 100 chars';
    return '';
  }

  getQuantityError(): string {
    const c = this.addItemForm.get('quantity'); if (!c?.touched || !c?.errors) return '';
    if (c.errors['leadingZero']) return 'No leading zeros (e.g. 0111)';
    if (c.errors['min']) return 'Must be >= 0'; if (c.errors['required']) return 'Required';
    if (c.errors['pattern']) return 'Whole numbers only'; return '';
  }

  getPriceError(): string {
    const c = this.addItemForm.get('price'); if (!c?.touched || !c?.errors) return '';
    if (c.errors['leadingZero']) return 'No leading zeros (e.g. 099)';
    if (c.errors['min']) return 'Must be >= 0'; if (c.errors['required']) return 'Required';
    if (c.errors['pattern']) return 'Whole numbers only'; return '';
  }

  getSupplierError(): string {
    const c = this.addItemForm.get('supplierName'); if (!c?.touched || !c?.errors) return '';
    if (c.errors['required']) return 'Supplier name required'; return '';
  }

  // helper to show toast messages
  async showToast(msg: string, col: string = 'primary', dur: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: msg,
      color: col,
      duration: dur,
      position: 'top',
      cssClass: 'message-toast',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }
}
