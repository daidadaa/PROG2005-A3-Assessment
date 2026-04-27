/* tab-privacy.page.ts - privacy & security info page
 * Author: Li Mu - wrote all 5 accordion sections (data collection, storage, validation, access control, mobile risks) */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HelpWidgetComponent } from '../../components/help-widget.component';

@Component({
  selector: 'app-tab-privacy',
  standalone: true,
  templateUrl: './tab-privacy.page.html',
  styleUrls: ['./tab-privacy.page.scss'],
  imports: [
    CommonModule,
    IonicModule,
    HelpWidgetComponent
  ]
})
export class TabPrivacyPage {

  helpContent: string = `
    <div class="help-content-list">
      <h4>About This Page</h4>
      <ul>
        <li>This page explains the privacy and security requirements for this mobile inventory app.</li>
        <li>Addresses ULO4: Security Requirements for Mobile Applications.</li>
      </ul>
    </div>
  `;

  expandedSection: string | null = 'section1';

  toggleSection(sectionId: string): void {
    this.expandedSection = this.expandedSection === sectionId ? null : sectionId;
  }

  isExpanded(sectionId: string): boolean {
    return this.expandedSection === sectionId;
  }
}
