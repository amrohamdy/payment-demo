import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
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

/**
 * Contract for the nine backend endpoints + demo helpers (list/reset)
 * used while list/history APIs are not yet provided by the backend.
 */
export interface DhamenApi {
  createCustomer(body: CreateCustomerRequest): Observable<CreateCustomerResponse>;
  updateCustomer(body: UpdateCustomerRequest): Observable<UpdateCustomerResponse>;
  depositMoney(body: DepositMoneyRequest): Observable<DepositMoneyResponse>;
  getCustomerBalance(customerId: string): Observable<BalanceResponse>;

  createSupplier(body: CreateSupplierRequest): Observable<CreateSupplierResponse>;
  updateSupplier(body: UpdateSupplierRequest): Observable<UpdateSupplierResponse>;
  createSupplierPayment(body: SupplierPaymentRequest): Observable<SupplierPaymentResponse>;
  getSupplierBalance(supplierId: string): Observable<BalanceResponse>;
  getSupplierPaymentStatus(
    supplierId: string,
    paymentReferenceId: string
  ): Observable<PaymentStatusResponse>;

  /** Local demo helpers (not part of the nine backend contracts). */
  listCustomers(): Observable<Customer[]>;
  listSuppliers(): Observable<Supplier[]>;
  listPayments(): Observable<PaymentRecord[]>;
  getDashboardStats(): Observable<DashboardStats>;
  getCustomer(customerId: string): Observable<Customer>;
  getSupplier(supplierId: string): Observable<Supplier>;
  getPayment(paymentReferenceId: string): Observable<PaymentRecord>;
  resetDemoData(): Observable<void>;
}

export const DHAMEN_API = new InjectionToken<DhamenApi>('DHAMEN_API');
