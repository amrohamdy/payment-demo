import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { routes } from './app.routes';
import { provideDhamenApi } from './core/api/dhamen-api.provider';
import { dhamenHttpInterceptor } from './core/config/http.interceptor';

const DhamenPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef7f3',
      100: '#d5ebe1',
      200: '#aed7c4',
      300: '#7dba9f',
      400: '#4f9b7b',
      500: '#16845B',
      600: '#137351',
      700: '#0f5d42',
      800: '#0c4a35',
      900: '#093c2c',
      950: '#052216',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([dhamenHttpInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: DhamenPreset,
        options: {
          darkModeSelector: false,
          cssLayer: false,
        },
      },
      ripple: true,
    }),
    MessageService,
    ConfirmationService,
    ...provideDhamenApi(),
  ],
};
