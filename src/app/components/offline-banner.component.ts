/* offline-banner.component.ts - shows a banner when offline
 * Authors: WU Shaowei & Li Mu - built this together during pair programming
 * Li Mu: did the banner UI and CSS animations
 * WU Shaowei: handled show/hide logic tied to network status service */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NetworkStatusService } from '../services/network-status.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-banner" *ngIf="!isOnline">
      <span>Offline — showing cached data</span>
    </div>
  `,
  styles: [`
    .offline-banner {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #dc2626;
      color: white;
      text-align: center;
      padding: 6px;
      font-size: 0.85rem;
      font-weight: bold;
      z-index: 9999;
    }
  `]
})
export class OfflineBannerComponent implements OnInit, OnDestroy {

  isOnline = true;
  private destroy$ = new Subject<void>();

  constructor(private network: NetworkStatusService) {}

  ngOnInit(): void {
    this.network.isOnline$
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => this.isOnline = v);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
