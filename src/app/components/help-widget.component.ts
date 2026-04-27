// help-widget.component.ts - reusable help button component
// Author: Li Mu - built this component, used on all 4 tabs
// (WU Shaowei wrote the help content text for each tab page)
// A reusable help button with popover - no icons, just text + CSS

import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-help-widget',
  standalone: true,
  template: `
    <div class="help-fab-container">
      <button class="help-text-btn" (click)="openHelp()" aria-label="Help">?</button>
    </div>
  `,
  styles: [`
    .help-fab-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999;
    }
    .help-text-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #0d9488, #0891b2);
      color: white;
      font-size: 1.4rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .help-text-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 16px rgba(13, 148, 136, 0.45);
    }
    .help-text-btn:active {
      transform: scale(0.95);
    }
  `],
  imports: [IonicModule]
})
export class HelpWidgetComponent {
  @Input() helpContent: string = '';

  constructor(private readonly modalController: ModalController) {}

  async openHelp(): Promise<void> {
    const modal = await this.modalController.create({
      component: HelpModalComponent,
      componentProps: { content: this.helpContent },
      cssClass: 'help-modal-class'
    });
    return await modal.present();
  }
}

/** Internal modal component for displaying help content — NO ICONS */
@Component({
  selector: 'app-help-modal',
  standalone: true,
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Help &amp; Guide</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="modalController.dismiss()">
            Close
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div [innerHTML]="content"></div>
    </ion-content>
  `,
  imports: [IonicModule]
})
export class HelpModalComponent {
  /** HTML content string passed from parent */
  content: string = '<p>No help content available.</p>';

  constructor(public readonly modalController: ModalController) {}
}
