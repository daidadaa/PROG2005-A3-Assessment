// tabs.page.ts - container for all tab pages
// Authors: WU Shaowei & Li Mu - worked on this together
// Li Mu: did the tab bar HTML + CSS styling
// WU Shaowei: handled routing setup and tab switching
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tabs',
  standalone: true,
  templateUrl: './tabs.page.html',
  imports: [IonicModule, RouterModule]
})
export class TabsPage {}
