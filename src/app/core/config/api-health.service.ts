import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, timeout } from 'rxjs';
import { getRuntimeConfig } from './runtime-config';

export type ApiHealthStatus = 'unknown' | 'checking' | 'live' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class ApiHealthService {
  private readonly http = inject(HttpClient);

  readonly status = signal<ApiHealthStatus>('unknown');
  readonly lastCheckedAt = signal<string | null>(null);
  readonly detail = signal<string>('');

  check(): void {
    const config = getRuntimeConfig();
    this.status.set('checking');
    const healthUrl = `${config.baseUrl.replace(/\/$/, '')}/health`;
    this.http
      .get(healthUrl, { responseType: 'text' })
      .pipe(
        timeout(5000),
        map(() => true),
        catchError(() =>
          this.http
            .get(`${config.baseUrl.replace(/\/$/, '')}/api/dhamen/customers`, {
              params: { page: '1', pageSize: '1' },
            })
            .pipe(
              timeout(5000),
              map(() => true),
              catchError(() => of(false))
            )
        )
      )
      .subscribe((ok) => {
        this.lastCheckedAt.set(new Date().toISOString());
        if (ok) {
          this.status.set('live');
          this.detail.set(`Connected to ${config.baseUrl}`);
        } else {
          this.status.set('unavailable');
          this.detail.set(`Cannot reach ${config.baseUrl} — check CORS and that the backend is running`);
        }
      });
  }
}
