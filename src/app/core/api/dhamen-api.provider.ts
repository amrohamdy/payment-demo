import { Provider } from '@angular/core';
import { DHAMEN_API } from './dhamen-api';
import { HttpDhamenApi } from './http-dhamen-api.service';

export function provideDhamenApi(): Provider[] {
  return [HttpDhamenApi, { provide: DHAMEN_API, useExisting: HttpDhamenApi }];
}
