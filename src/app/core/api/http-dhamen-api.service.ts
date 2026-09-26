import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DhamenApi } from './dhamen-api';
import {
  BalanceResponse,
  CreateCustomerRequest,
  CreateCustomerResponse,
  CreateSupplierRequest,
  CreateSupplierResponse,
  Customer,
  DashboardStats,
  DepositMoneyRequest,
  DepositMoneyResponse,
  PaymentRecord,
  PaymentStatusResponse,
  Supplier,
  SupplierPaymentRequest,
  SupplierPaymentResponse,
  UpdateCustomerRequest,
  UpdateCustomerResponse,
  UpdateSupplierRequest,
  UpdateSupplierResponse,
} from '../models/dhamen.models';

type LooseRecord = Record<string, unknown>;

function readString(source: LooseRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return '';
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' ? (value as LooseRecord) : {};
}

/**
 * HTTP implementation of the nine backend contracts.
 * List/dashboard helpers stay unavailable until backend provides them —
 * callers should keep `apiMode: 'mock'` for full demo UX, or extend mapping here.
 */
@Injectable()
export class HttpDhamenApi implements DhamenApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl.replace(/\/$/, '');

  createCustomer(body: CreateCustomerRequest): Observable<CreateCustomerResponse> {
    return this.http.post(`${this.base}/api/dhamen/customers`, body).pipe(
      map((res) => {
        const record = asRecord(res);
        return {
          customerId: readString(record, 'customerId', 'id'),
          message: readString(record, 'message') || 'تم إنشاء العميل',
        };
      })
    );
  }

  updateCustomer(body: UpdateCustomerRequest): Observable<UpdateCustomerResponse> {
    return this.http.put(`${this.base}/api/dhamen/customers`, body).pipe(
      map((res) => {
        const record = asRecord(res);
        return {
          customerId: readString(record, 'customerId', 'id'),
          message: readString(record, 'message') || 'تم تحديث العميل',
        };
      })
    );
  }

  depositMoney(body: DepositMoneyRequest): Observable<DepositMoneyResponse> {
    return this.http.post(`${this.base}/api/dhamen/customers/deposit`, body).pipe(
      map((res) => {
        const record = asRecord(res);
        return {
          customerId: readString(record, 'customerId', 'id') || body.customerId,
          amount: Number(record['amount'] ?? body.amount),
          newBalance: Number(record['newBalance'] ?? record['balance'] ?? 0),
          message: readString(record, 'message') || 'تم الإيداع',
        };
      })
    );
  }

  getCustomerBalance(customerId: string): Observable<BalanceResponse> {
    return this.http.get(`${this.base}/api/dhamen/customers/${customerId}/balance`).pipe(
      map((res) => {
        const record = asRecord(res);
        return {
          id: customerId,
          balance: Number(record['balance'] ?? 0),
          currency: readString(record, 'currency') || environment.currency,
        };
      })
    );
  }

  createSupplier(body: CreateSupplierRequest): Observable<CreateSupplierResponse> {
    return this.http.post(`${this.base}/api/dhamen/suppliers`, body).pipe(
      map((res) => {
        const record = asRecord(res);
        return {
          supplierId: readString(record, 'supplierId', 'id'),
          message: readString(record, 'message') || 'تم إنشاء المورد',
        };
      })
    );
  }

  updateSupplier(body: UpdateSupplierRequest): Observable<UpdateSupplierResponse> {
    return this.http.put(`${this.base}/api/dhamen/suppliers`, body).pipe(
      map((res) => {
        const record = asRecord(res);
        return {
          supplierId: readString(record, 'supplierId', 'id') || body.supplierId,
          message: readString(record, 'message') || 'تم تحديث المورد',
        };
      })
    );
  }

  createSupplierPayment(body: SupplierPaymentRequest): Observable<SupplierPaymentResponse> {
    return this.http
      .post<SupplierPaymentResponse>(`${this.base}/api/dhamen/suppliers/payments`, body)
      .pipe(
        map((res) => ({
          paymentReferenceId: res.paymentReferenceId || body.paymentReferenceId,
          message: res.message || 'تم إنشاء الدفعة',
          lines: res.lines ?? [],
        }))
      );
  }

  getSupplierBalance(supplierId: string): Observable<BalanceResponse> {
    return this.http.get(`${this.base}/api/dhamen/suppliers/${supplierId}/balance`).pipe(
      map((res) => {
        const record = asRecord(res);
        return {
          id: supplierId,
          balance: Number(record['balance'] ?? 0),
          currency: readString(record, 'currency') || environment.currency,
        };
      })
    );
  }

  getSupplierPaymentStatus(
    supplierId: string,
    paymentReferenceId: string
  ): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(
      `${this.base}/api/dhamen/suppliers/${supplierId}/payments/${paymentReferenceId}/status`
    );
  }

  listCustomers(): Observable<Customer[]> {
    return this.unsupported('listCustomers');
  }

  listSuppliers(): Observable<Supplier[]> {
    return this.unsupported('listSuppliers');
  }

  listPayments(): Observable<PaymentRecord[]> {
    return this.unsupported('listPayments');
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.unsupported('getDashboardStats');
  }

  getCustomer(_customerId: string): Observable<Customer> {
    return this.unsupported('getCustomer');
  }

  getSupplier(_supplierId: string): Observable<Supplier> {
    return this.unsupported('getSupplier');
  }

  getPayment(_paymentReferenceId: string): Observable<PaymentRecord> {
    return this.unsupported('getPayment');
  }

  resetDemoData(): Observable<void> {
    return this.unsupported('resetDemoData');
  }

  private unsupported(method: string): Observable<never> {
    return throwError(
      () =>
        new Error(
          `HttpDhamenApi.${method} غير متاح بعد — استخدم apiMode: 'mock' أو أضف endpoint من الباك اند`
        )
    );
  }
}
