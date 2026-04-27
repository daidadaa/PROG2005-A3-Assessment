// app config
// Author: WU Shaowei — set up Angular providers (HTTP client, interceptor registration)
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { APP_ROUTES } from './routes/routes';
import { apiLoggingInterceptor } from './interceptors/api-logging.interceptor';

/** Root application configuration with providers for routing, HTTP, Ionic, and interceptors */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(APP_ROUTES),
    provideHttpClient(
      withInterceptors([apiLoggingInterceptor])
    ),
    importProvidersFrom(IonicModule.forRoot({
      animated: true,
      mode: 'md' // Material Design mode for consistent look across platforms
    }))
  ]
};
