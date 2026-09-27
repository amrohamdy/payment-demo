import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { loadRuntimeConfigFromFile } from './app/core/config/runtime-config';

loadRuntimeConfigFromFile()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
