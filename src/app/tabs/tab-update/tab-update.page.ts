// tab-update.page.ts - update & delete existing items
// Author: WU Shaowei - did everything here (select item, edit form, PUT/DELETE requests)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonicModule, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Category, StockStatus, InventoryItem } from '../../models/inventory.model';
import { InventoryApiService } from '../../services/inventory-api.service';
import { HelpWidgetComponent } from '../../components/help-widget.component';

export function noLeadingZeroValidator(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '').trim();
  if (!v || v === '0') return null;
  if (/^0\d/.test(v)) return { leadingZero: true };
  return null;
}

@Component({
  selector: 'app-tab-update',
  standalone: true,
  templateUrl: './tab-update.page.html',
  styleUrls: ['./tab-update.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonicModule, HelpWidgetComponent]
})
export class TabUpdatePage implements OnInit, OnDestroy {

  updateForm!: FormGroup;
  allItems: InventoryItem[] = [];
  editingOriginalName = '';
  isEditing = false;
  categories: Category[] = ['Electronics', 'Furniture', 'Clothing', 'Tools', 'Miscellaneous'];
  stockStatuses: StockStatus[] = ['In Stock', 'Low Stock', 'Out of Stock'];
  isProcessing = false;

  helpContent = `
    <div class="help-content-list"><h4>How to Update</h4><ul><li>Select an item to load its data.</li><li>Modify fields and click Update.</li></ul>
    <h4>How to Delete</h4><ul><li>Select item then click Delete.</li><li>"Laptop" is protected by server.</li></ul></div>`;

  private loadSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: InventoryApiService,
    private readonly ldCtrl: LoadingController,
    private readonly tCtrl: ToastController,
    private readonly alrtCtrl: AlertController
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAll();
  }

  ngOnDestroy(): void {
    if (this.loadSub) this.loadSub.unsubscribe();
  }

  // ==================== Form ====================

  private initForm(): void {
    this.updateForm = this.fb.group({
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

  // ==================== Data ====================

  async loadAll(showLoader = true): Promise<void> {
    // TODO: should reuse the same method from tab-list instead of duplicating?
    let ldr: HTMLIonLoadingElement | null = null;
    if (showLoader) { ldr = await this.ldCtrl.create({ message: 'Loading...', spinner: 'circles' }); await ldr.present(); }
    this.loadSub = this.api.getAllItems().subscribe({
      next: (d: InventoryItem[]) => { this.allItems = d || []; ldr?.dismiss(); },
      error: async (_e: any) => { ldr?.dismiss(); await this.showToast('Failed to load.', 'danger'); }
    });
  }

  onItemSelect(e: CustomEvent): void {
    const id = e.detail.value as number; if (!id) return;
    const sel = this.allItems.find((i) => i.itemId === id); if (!sel) return;
    this.editingOriginalName = sel.itemName; this.isEditing = true;
    this.updateForm.patchValue({
      itemName: sel.itemName, category: sel.category, quantity: sel.quantity, price: sel.price,
      supplierName: sel.supplierName, stockStatus: sel.stockStatus, featuredItem: sel.featuredItem || 0,
      specialNote: sel.specialNote || ''
    });
  }

  clearForm(): void {
    this.editingOriginalName = ''; this.isEditing = false;
    this.updateForm.reset({ itemName: '', category: 'Electronics', quantity: null, price: null, supplierName: '', stockStatus: 'In Stock', featuredItem: 0, specialNote: '' });
    Object.values(this.updateForm.controls).forEach((c) => c.markAsUntouched({ onlySelf: true }));
  }

  onToggleFeatured(e: CustomEvent): void { this.updateForm.patchValue({ featuredItem: e.detail.checked ? 1 : 0 }); }

  // ==================== UPDATE ====================

  async onUpdate(): Promise<void> {
    Object.values(this.updateForm.controls).forEach((c) => c.markAsTouched());
    if (this.updateForm.invalid) {
      const errs: string[] = [];
      const qc = this.updateForm.get('quantity'); const pc = this.updateForm.get('price');
      if (qc?.errors?.['leadingZero']) errs.push('Quantity: no leading zeros');
      else if (qc?.invalid && qc?.touched) errs.push('Quantity invalid');
      if (pc?.errors?.['leadingZero']) errs.push('Price: no leading zeros');
      else if (pc?.invalid && pc?.touched) errs.push('Price invalid');
      if (errs.length > 0) await this.showToast(errs.join(', '), 'danger', 4000);
      else await this.showToast('Fix validation errors.', 'warning');
      return;
    }
    if (!this.editingOriginalName) { await this.showToast('Select an item first.', 'warning'); return; }
    const c = await this.alrtCtrl.create({ header: 'Confirm Update', message: `Update "${this.editingOriginalName}"?`, buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Update', handler: () => this.doUpdate() }] });
    await c.present();
  }

  private async doUpdate(): Promise<void> {
    this.isProcessing = true;
    const loader = await this.ldCtrl.create({ message: 'Updating...', spinner: 'circles' }); await loader.present();
    const fd = this.updateForm.value;
    this.api.updateItemByName(this.editingOriginalName, {
      itemName: fd.itemName.trim(), category: fd.category, quantity: parseInt(fd.quantity, 10),
      price: parseInt(fd.price, 10), supplierName: fd.supplierName.trim(), stockStatus: fd.stockStatus,
      featuredItem: parseInt(fd.featuredItem, 10) || 0, specialNote: fd.specialNote?.trim() || undefined
    }).subscribe({
      next: async (_r: any) => { this.isProcessing = false; loader.dismiss(); await this.showToast(`Updated successfully!`, 'success'); this.clearForm(); this.loadAll(false); },
      error: async (e: any) => { this.isProcessing = false; loader.dismiss(); await this.showToast(this.errDetail(e), 'danger', 5000); }
    });
  }

  // ==================== DELETE ====================

  async onDelete(): Promise<void> {
    const n = this.editingOriginalName || this.updateForm.get('itemName')?.value?.trim(); if (!n) { await this.showToast('Select/enter item name.', 'warning'); return; }
    const c = await this.alrtCtrl.create({
      header: 'Delete Confirmation', message: `Delete "<strong>${n}</strong>"?\n<em style="color:#dc2626;">Cannot be undone!</em>`,
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Delete', role: 'destructive', handler: () => this.doDel(n) }]
    }); await c.present();
  }

  private async doDel(name: string): Promise<void> {
    this.isProcessing = true; const loader = await this.ldCtrl.create({ message: 'Deleting...', spinner: 'circles' }); await loader.present();
    this.api.deleteItemByName(name).subscribe({
      next: async (_r: any) => { this.isProcessing = false; loader.dismiss(); await this.showToast(`"${name}" deleted.`, 'success'); this.clearForm(); this.loadAll(false); },
      error: async (e: any) => { this.isProcessing = false; loader.dismiss(); let m = this.errDetail(e); if (e?.status === 403 || e?.status === 400) m += '\nSome items like "Laptop" are protected.'; await this.showToast(m, 'danger', 5000); }
    });
  }

  // ==================== Helpers ====================

  private errDetail(e: any): string {
    const s = e?.status; const b = e?.error; const msg = typeof b === 'string' ? b : b?.message || '';
    switch (s) {
      case 400: return `Bad Request: ${msg || 'Invalid data.'}`;
      case 403: return `Forbidden: ${msg || 'Server protection rule.'}`;
      case 404: return `Not Found: ${msg || 'Item not found.'}`;
      case 500: return `Server Error: ${msg || 'Internal error.'}`;
      case 0:   return `Network Error: Cannot connect.`;
      default: return msg ? `Error (${s}): ${msg}` : 'Operation failed.';
    }
  }

  getStatusClass(s: string): string { if (s === 'In Stock') return 'status-in'; if (s === 'Low Stock') return 'status-low'; if (s === 'Out of Stock') return 'status-out'; return ''; }
  getCategoryClass(cat: string): string { return 'cat-' + cat.replace(/\s+/g, '-').toLowerCase(); }
  trackByItemId(_i: number, item: InventoryItem): number { return item.itemId; }
  getQuantityError(): string {
    const c = this.updateForm.get('quantity');
    if (!c?.touched || !c?.errors) return '';
    if (c.errors['leadingZero']) return 'No leading zeros like 011';
    if (c.errors['min']) return 'Must be 0 or more';
    if (c.errors['required']) return 'Required field';
    if (c.errors['pattern']) return 'Whole numbers only';
    return '';
  }

  getPriceError(): string {
    const c = this.updateForm.get('price');
    if (!c?.touched || !c?.errors) return '';
    if (c.errors['leadingZero']) return 'No leading zeros';
    if (c.errors['min']) return 'Must be >= 0';
    if (c.errors['required']) return 'Required';
    if (c.errors['pattern']) return 'Numbers only, no decimals';
    return '';
  }
  async showToast(m: string, color: string = 'primary', dur: number = 2500): Promise<void> { const t = await this.tCtrl.create({ message: m, color, duration: dur, position: 'top', cssClass: 'message-toast', buttons: [{ text: 'OK', role: 'cancel' }] }); await t.present(); }
}
