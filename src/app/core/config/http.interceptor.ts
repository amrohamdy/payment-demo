import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

/** Placeholder for auth headers + centralized API error toasts. */
export const dhamenHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const messages = inject(MessageService);
  // When backend auth is ready, attach token here:
  // const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(req).pipe(
    catchError((error: unknown) => {
      const message =
        error instanceof HttpErrorResponse
          ? extractHttpMessage(error)
          : 'حدث خطأ غير متوقع أثناء الاتصال بالخادم';
      messages.add({ severity: 'error', summary: 'خطأ', detail: message, life: 5000 });
      return throwError(() => error);
    })
  );
};

function extractHttpMessage(error: HttpErrorResponse): string {
  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error;
  }
  if (error.error && typeof error.error === 'object') {
    const body = error.error as Record<string, unknown>;
    if (typeof body['message'] === 'string') {
      return body['message'];
    }
    if (typeof body['title'] === 'string') {
      return body['title'];
    }
  }
  return error.message || 'فشل الطلب';
}
