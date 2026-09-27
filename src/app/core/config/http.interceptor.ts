import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

/** Centralized API error toasts + auth header hook. */
export const dhamenHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const messages = inject(MessageService);
  // When backend auth is ready:
  // const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 0) {
        // Connection failures are surfaced by health check — avoid toast spam on probes.
        if (req.url.includes('/health')) {
          return throwError(() => error);
        }
      }
      const message =
        error instanceof HttpErrorResponse
          ? extractHttpMessage(error)
          : 'An unexpected error occurred while contacting the server.';
      messages.add({ severity: 'error', summary: httpSummary(error), detail: message, life: 6000 });
      return throwError(() => Object.assign(error instanceof Error ? error : new Error(message), {
        status: error instanceof HttpErrorResponse ? error.status : 0,
        message,
      }));
    })
  );
};

function httpSummary(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Error';
  }
  switch (error.status) {
    case 400:
      return 'Validation error';
    case 404:
      return 'Not found';
    case 409:
      return 'Conflict';
    case 0:
      return 'API unavailable';
    default:
      return 'Error';
  }
}

function extractHttpMessage(error: HttpErrorResponse): string {
  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error;
  }
  if (error.error && typeof error.error === 'object') {
    const body = error.error as Record<string, unknown>;
    if (typeof body['detail'] === 'string' && body['detail'].trim()) {
      return body['detail'];
    }
    if (typeof body['message'] === 'string' && body['message'].trim()) {
      return body['message'];
    }
    if (typeof body['title'] === 'string' && body['title'].trim()) {
      const title = body['title'];
      const errors = body['errors'];
      if (errors && typeof errors === 'object') {
        const parts: string[] = [];
        for (const [field, msgs] of Object.entries(errors as Record<string, unknown>)) {
          if (Array.isArray(msgs)) {
            parts.push(`${field}: ${msgs.join(', ')}`);
          }
        }
        if (parts.length) {
          return `${title} — ${parts.join('; ')}`;
        }
      }
      return title;
    }
  }
  if (error.status === 0) {
    return 'Cannot reach the API host. Check base URL, CORS, and that the backend is running.';
  }
  return error.message || 'Request failed.';
}
