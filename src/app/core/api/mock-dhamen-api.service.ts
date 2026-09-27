import { Injectable } from '@angular/core';
import { Observable, of, switchMap, throwError, timer } from 'rxjs';
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
  PaymentStatus,
  PaymentStatusResponse,
  Supplier,
  SupplierPaymentRequest,
  SupplierPaymentResponse,
  UpdateCustomerRequest,
  UpdateCustomerResponse,
  UpdateSupplierRequest,
  UpdateSupplierResponse,
} from '../models/dhamen.models';
import {
  DemoStoreState,
  advancePaymentStatus,
  loadStoreState,
  resetStoreState,
  saveStoreState,
} from '../services/demo-store';
import { createUuid } from '../utils/id.utils';
import { hasSufficientBalance, roundMoney, sumAmounts } from '../utils/money.utils';

@Injectable()
export class MockDhamenApi implements DhamenApi {
  private state: DemoStoreState = loadStoreState();

  createCustomer(body: CreateCustomerRequest): Observable<CreateCustomerResponse> {
    return this.run(() => {
      this.ensureUniqueIdentity(body.identityNumber, 'customer');
      const stamp = new Date().toISOString();
      const customer: Customer = {
        id: createUuid(),
        identityNumber: body.identityNumber.trim(),
        name: body.name.trim(),
        iban: body.iban.trim().toUpperCase(),
        email: body.email.trim(),
        mobile: body.mobile.trim(),
        balance: 0,
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.state.customers = [customer, ...this.state.customers];
      this.persist();
      return { customerId: customer.id, message: 'Customer created successfully.' };
    });
  }

  updateCustomer(body: UpdateCustomerRequest): Observable<UpdateCustomerResponse> {
    return this.run(() => {
      const customer = this.requireCustomerByIdentity(body.identityNumber);
      customer.name = body.name.trim();
      customer.iban = body.iban.trim().toUpperCase();
      customer.email = body.email.trim();
      customer.mobile = body.mobile.trim();
      customer.updatedAt = new Date().toISOString();
      this.persist();
      return { customerId: customer.id, message: 'Customer updated successfully.' };
    });
  }

  depositMoney(body: DepositMoneyRequest): Observable<DepositMoneyResponse> {
    return this.run(() => {
      if (!body.amount || body.amount <= 0) {
        throw this.apiError('The amount must be greater than zero.');
      }
      const customer = this.requireCustomer(body.customerId);
      customer.balance = roundMoney(customer.balance + body.amount);
      customer.updatedAt = new Date().toISOString();
      this.persist();
      return {
        customerId: customer.id,
        amount: body.amount,
        newBalance: customer.balance,
        message: 'Deposit completed successfully.',
      };
    });
  }

  getCustomerBalance(customerId: string): Observable<BalanceResponse> {
    return this.run(() => {
      const customer = this.requireCustomer(customerId);
      return {
        id: customer.id,
        balance: customer.balance,
        currency: environment.currency,
      };
    });
  }

  createSupplier(body: CreateSupplierRequest): Observable<CreateSupplierResponse> {
    return this.run(() => {
      this.ensureUniqueIdentity(body.identityNumber, 'supplier');
      const stamp = new Date().toISOString();
      const supplier: Supplier = {
        id: createUuid(),
        name: body.name.trim(),
        iban: body.iban.trim().toUpperCase(),
        identityNumber: body.identityNumber.trim(),
        payoutThresholdAmount: roundMoney(body.payoutThresholdAmount),
        email: body.email.trim(),
        mobile: body.mobile.trim(),
        balance: 0,
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.state.suppliers = [supplier, ...this.state.suppliers];
      this.persist();
      return { supplierId: supplier.id, message: 'Supplier created successfully.' };
    });
  }

  updateSupplier(body: UpdateSupplierRequest): Observable<UpdateSupplierResponse> {
    return this.run(() => {
      const supplier = this.requireSupplier(body.supplierId);
      supplier.name = body.name.trim();
      supplier.iban = body.iban.trim().toUpperCase();
      supplier.identityNumber = body.identityNumber.trim();
      supplier.payoutThresholdAmount = roundMoney(body.payoutThresholdAmount);
      supplier.email = body.email.trim();
      supplier.mobile = body.mobile.trim();
      supplier.updatedAt = new Date().toISOString();
      this.persist();
      return { supplierId: supplier.id, message: 'Supplier updated successfully.' };
    });
  }

  createSupplierPayment(body: SupplierPaymentRequest): Observable<SupplierPaymentResponse> {
    return this.run(() => {
      if (!body.paymentReferenceId?.trim()) {
        throw this.apiError('Payment reference is required.');
      }
      if (this.state.payments.some((p) => p.paymentReferenceId === body.paymentReferenceId)) {
        throw this.apiError('This payment reference is already in use.');
      }
      if (!body.supplierPayments?.length) {
        throw this.apiError('Add at least one supplier.');
      }

      const supplierIds = body.supplierPayments.map((line) => line.supplierId);
      if (new Set(supplierIds).size !== supplierIds.length) {
        throw this.apiError('A supplier cannot be repeated in the same payment.');
      }

      const fundedByCustomer = body.supplierPayments.filter((line) => !!line.customerId);
      const customerGroups = new Map<string, number>();
      for (const line of fundedByCustomer) {
        const customerId = line.customerId!;
        customerGroups.set(customerId, roundMoney((customerGroups.get(customerId) ?? 0) + line.amount));
      }

      for (const [customerId, total] of customerGroups.entries()) {
        const customer = this.requireCustomer(customerId);
        if (!hasSufficientBalance(customer.balance, total)) {
          throw this.apiError(`${customer.name} does not have enough balance for this payment.`);
        }
      }

      for (const line of body.supplierPayments) {
        if (!line.amount || line.amount <= 0) {
          throw this.apiError('Payment amount must be greater than zero.');
        }
        this.requireSupplier(line.supplierId);
      }

      const stamp = new Date().toISOString();
      const lines = body.supplierPayments.map((line) => {
        const supplier = this.requireSupplier(line.supplierId);
        const customer = line.customerId ? this.requireCustomer(line.customerId) : null;
        const status: PaymentStatus = 'Pending';

        if (customer) {
          customer.balance = roundMoney(customer.balance - line.amount);
          customer.updatedAt = stamp;
        }
        supplier.balance = roundMoney(supplier.balance + line.amount);
        supplier.updatedAt = stamp;

        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          amount: roundMoney(line.amount),
          customerId: customer?.id ?? null,
          customerName: customer?.name ?? null,
          status,
        };
      });

      const record: PaymentRecord = {
        paymentReferenceId: body.paymentReferenceId.trim(),
        createdAt: stamp,
        lines,
        overallStatus: 'Pending',
      };
      this.state.payments = [record, ...this.state.payments];
      this.persist();

      return {
        paymentReferenceId: record.paymentReferenceId,
        message: 'Payment request created successfully.',
        lines: record.lines,
      };
    });
  }

  getSupplierBalance(supplierId: string): Observable<BalanceResponse> {
    return this.run(() => {
      const supplier = this.requireSupplier(supplierId);
      return {
        id: supplier.id,
        balance: supplier.balance,
        currency: environment.currency,
      };
    });
  }

  getSupplierPaymentStatus(
    supplierId: string,
    paymentReferenceId: string
  ): Observable<PaymentStatusResponse> {
    return this.run(() => {
      const payment = this.requirePayment(paymentReferenceId);
      const line = payment.lines.find((item) => item.supplierId === supplierId);
      if (!line) {
        throw this.apiError('No payment was found for this supplier and reference.');
      }

      // Advance mock lifecycle on each status poll until Completed/Failed.
      if (line.status === 'Pending' || line.status === 'Processing') {
        line.status = advancePaymentStatus(line.status);
        payment.overallStatus = this.computeOverallStatus(payment);
        this.persist();
      }

      return {
        paymentReferenceId,
        supplierId,
        status: line.status,
        amount: line.amount,
        updatedAt: new Date().toISOString(),
        message: this.statusMessage(line.status),
      };
    });
  }

  listCustomers(): Observable<Customer[]> {
    return this.run(() => [...this.state.customers]);
  }

  listSuppliers(): Observable<Supplier[]> {
    return this.run(() => [...this.state.suppliers]);
  }

  listPayments(): Observable<PaymentRecord[]> {
    return this.run(() => [...this.state.payments]);
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.run(() => ({
      customersCount: this.state.customers.length,
      suppliersCount: this.state.suppliers.length,
      customersBalanceTotal: sumAmounts(this.state.customers.map((c) => c.balance)),
      suppliersBalanceTotal: sumAmounts(this.state.suppliers.map((s) => s.balance)),
      paymentsCount: this.state.payments.length,
      latestPayment: this.state.payments[0] ?? null,
    }));
  }

  getCustomer(customerId: string): Observable<Customer> {
    return this.run(() => ({ ...this.requireCustomer(customerId) }));
  }

  getSupplier(supplierId: string): Observable<Supplier> {
    return this.run(() => ({ ...this.requireSupplier(supplierId) }));
  }

  getPayment(paymentReferenceId: string): Observable<PaymentRecord> {
    return this.run(() => structuredClone(this.requirePayment(paymentReferenceId)));
  }

  resetDemoData(): Observable<void> {
    return this.run(() => {
      this.state = resetStoreState();
    });
  }

  private run<T>(work: () => T): Observable<T> {
    return timer(environment.mockLatencyMs).pipe(
      switchMap(() => {
        try {
          return of(work());
        } catch (error) {
          return throwError(() => error);
        }
      })
    );
  }

  private persist(): void {
    saveStoreState(this.state);
  }

  private requireCustomer(customerId: string): Customer {
    const customer = this.state.customers.find((item) => item.id === customerId);
    if (!customer) {
      throw this.apiError('Customer not found.');
    }
    return customer;
  }

  private requireCustomerByIdentity(identityNumber: string): Customer {
    const customer = this.state.customers.find((item) => item.identityNumber === identityNumber.trim());
    if (!customer) {
      throw this.apiError('No customer was found with this identity number.');
    }
    return customer;
  }

  private requireSupplier(supplierId: string): Supplier {
    const supplier = this.state.suppliers.find((item) => item.id === supplierId);
    if (!supplier) {
      throw this.apiError('Supplier not found.');
    }
    return supplier;
  }

  private requirePayment(paymentReferenceId: string): PaymentRecord {
    const payment = this.state.payments.find((item) => item.paymentReferenceId === paymentReferenceId);
    if (!payment) {
      throw this.apiError('Payment reference not found.');
    }
    return payment;
  }

  private ensureUniqueIdentity(identityNumber: string, kind: 'customer' | 'supplier'): void {
    const list = kind === 'customer' ? this.state.customers : this.state.suppliers;
    if (list.some((item) => item.identityNumber === identityNumber.trim())) {
      throw this.apiError(
        kind === 'customer'
          ? 'This customer identity number is already registered.'
          : 'This supplier identity number is already registered.'
      );
    }
  }

  private computeOverallStatus(payment: PaymentRecord): PaymentStatus {
    if (payment.lines.every((line) => line.status === 'Completed')) {
      return 'Completed';
    }
    if (payment.lines.some((line) => line.status === 'Failed')) {
      return 'Failed';
    }
    if (payment.lines.some((line) => line.status === 'Processing' || line.status === 'Completed')) {
      return 'Processing';
    }
    return 'Pending';
  }

  private statusMessage(status: PaymentStatus): string {
    switch (status) {
      case 'Pending':
        return 'Payment is awaiting processing.';
      case 'Processing':
        return 'Payment is being processed.';
      case 'Completed':
        return 'Payment completed successfully.';
      case 'Failed':
        return 'Payment failed.';
    }
  }

  private apiError(message: string): Error {
    return Object.assign(new Error(message), { status: 400 });
  }
}
