import { Provider } from '@angular/core';
import { environment } from '../../../environments/environment';
import { DHAMEN_API } from './dhamen-api';
import { HttpDhamenApi } from './http-dhamen-api.service';
import { MockDhamenApi } from './mock-dhamen-api.service';

export function provideDhamenApi(): Provider[] {
  if (environment.apiMode === 'http') {
    return [HttpDhamenApi, { provide: DHAMEN_API, useExisting: HttpDhamenApi }];
  }
  return [MockDhamenApi, { provide: DHAMEN_API, useExisting: MockDhamenApi }];
}
