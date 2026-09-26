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
      return { customerId: customer.id, message: 'تم إنشاء العميل بنجاح' };
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
      return { customerId: customer.id, message: 'تم تحديث بيانات العميل' };
    });
  }

  depositMoney(body: DepositMoneyRequest): Observable<DepositMoneyResponse> {
    return this.run(() => {
      if (!body.amount || body.amount <= 0) {
        throw this.apiError('المبلغ يجب أن يكون أكبر من صفر');
      }
      const customer = this.requireCustomer(body.customerId);
      customer.balance = roundMoney(customer.balance + body.amount);
      customer.updatedAt = new Date().toISOString();
      this.persist();
      return {
        customerId: customer.id,
        amount: body.amount,
        newBalance: customer.balance,
        message: 'تم الإيداع بنجاح',
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
      return { supplierId: supplier.id, message: 'تم إنشاء المورد بنجاح' };
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
      return { supplierId: supplier.id, message: 'تم تحديث بيانات المورد' };
    });
  }

  createSupplierPayment(body: SupplierPaymentRequest): Observable<SupplierPaymentResponse> {
    return this.run(() => {
      if (!body.paymentReferenceId?.trim()) {
        throw this.apiError('مرجع الدفع مطلوب');
      }
      if (this.state.payments.some((p) => p.paymentReferenceId === body.paymentReferenceId)) {
        throw this.apiError('مرجع الدفع مستخدم مسبقًا');
      }
      if (!body.supplierPayments?.length) {
        throw this.apiError('يجب إضافة مورد واحد على الأقل');
      }

      const supplierIds = body.supplierPayments.map((line) => line.supplierId);
      if (new Set(supplierIds).size !== supplierIds.length) {
        throw this.apiError('لا يمكن تكرار نفس المورد في دفعة واحدة');
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
          throw this.apiError(`رصيد العميل ${customer.name} غير كافٍ للدفعة المطلوبة`);
        }
      }

      for (const line of body.supplierPayments) {
        if (!line.amount || line.amount <= 0) {
          throw this.apiError('مبلغ الدفع يجب أن يكون أكبر من صفر');
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
        message: 'تم إنشاء طلب الدفع بنجاح',
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
        throw this.apiError('لا توجد دفعة لهذا المورد ضمن المرجع المحدد');
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
      throw this.apiError('العميل غير موجود');
    }
    return customer;
  }

  private requireCustomerByIdentity(identityNumber: string): Customer {
    const customer = this.state.customers.find((item) => item.identityNumber === identityNumber.trim());
    if (!customer) {
      throw this.apiError('لم يتم العثور على عميل بهذا رقم الهوية');
    }
    return customer;
  }

  private requireSupplier(supplierId: string): Supplier {
    const supplier = this.state.suppliers.find((item) => item.id === supplierId);
    if (!supplier) {
      throw this.apiError('المورد غير موجود');
    }
    return supplier;
  }

  private requirePayment(paymentReferenceId: string): PaymentRecord {
    const payment = this.state.payments.find((item) => item.paymentReferenceId === paymentReferenceId);
    if (!payment) {
      throw this.apiError('مرجع الدفع غير موجود');
    }
    return payment;
  }

  private ensureUniqueIdentity(identityNumber: string, kind: 'customer' | 'supplier'): void {
    const list = kind === 'customer' ? this.state.customers : this.state.suppliers;
    if (list.some((item) => item.identityNumber === identityNumber.trim())) {
      throw this.apiError(
        kind === 'customer' ? 'رقم هوية العميل مسجل مسبقًا' : 'رقم هوية المورد مسجل مسبقًا'
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
        return 'الدفعة بانتظار المعالجة';
      case 'Processing':
        return 'جاري معالجة الدفعة';
      case 'Completed':
        return 'اكتملت الدفعة بنجاح';
      case 'Failed':
        return 'فشلت الدفعة';
    }
  }

  private apiError(message: string): Error {
    return Object.assign(new Error(message), { status: 400 });
  }
}
