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
      50: '#f7f4fb',
      100: '#eee8f6',
      200: '#ded0ec',
      300: '#c6addd',
      400: '#a77fc8',
      500: '#8254ae',
      600: '#63339b',
      700: '#512684',
      800: '#44216c',
      900: '#3a1e59',
      950: '#241038',
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
      overlayAppendTo: 'body',
    }),
    MessageService,
    ConfirmationService,
    ...provideDhamenApi(),
  ],
};
