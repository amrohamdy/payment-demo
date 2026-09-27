import { Provider } from '@angular/core';
import { DHAMEN_API } from './dhamen-api';
import { HttpDhamenApi } from './http-dhamen-api.service';
import { MockDhamenApi } from './mock-dhamen-api.service';
import { getRuntimeConfig } from '../config/runtime-config';

export function provideDhamenApi(): Provider[] {
  const mode = getRuntimeConfig().apiMode;
  if (mode === 'http') {
    return [HttpDhamenApi, { provide: DHAMEN_API, useExisting: HttpDhamenApi }];
  }
  return [MockDhamenApi, { provide: DHAMEN_API, useExisting: MockDhamenApi }];
}
