// routes.ts - defines all navigation paths for the tabs app
// Authors: WU Shaowei & Li Mu - set up routing together
// WU Shaowei: initial route config for list/update tabs
// Li Mu: added add/privacy tab routes and lazy loading setup

import { Routes } from '@angular/router';
import { TabsPage } from '../tabs/tabs.page';
import { TabListPage } from '../tabs/tab-list/tab-list.page';
import { TabAddPage } from '../tabs/tab-add/tab-add.page';
import { TabUpdatePage } from '../tabs/tab-update/tab-update.page';
import { TabPrivacyPage } from '../tabs/tab-privacy/tab-privacy.page';

/** Route configuration using Angular standalone routing */
export const APP_ROUTES: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'list',
        component: TabListPage
      },
      {
        path: 'add',
        component: TabAddPage
      },
      {
        path: 'update',
        component: TabUpdatePage
      },
      {
        path: 'privacy',
        component: TabPrivacyPage
      },
      {
        path: '',
        redirectTo: '/tabs/list',
        pathMatch: 'full'
      }
    ]
  },
  // Default route redirects to tabs
  {
    path: '',
    redirectTo: '/tabs/list',
    pathMatch: 'full'
  },
  // Catch-all redirect
  {
    path: '**',
    redirectTo: '/tabs/list'
  }
];
