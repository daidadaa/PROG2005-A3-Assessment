// bootstrap entry point
// Author: WU Shaowei — bootstrapApplication() setup
// Bootstraps the Angular application with Ionic framework

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { appConfig } from './app/app.config';

/** Bootstrap the Ionic Angular application */
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error('Failed to bootstrap application:', err));
