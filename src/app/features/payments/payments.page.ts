import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { forkJoin } from 'rxjs';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import { Customer, PaymentRecord, Supplier } from '../../core/models/dhamen.models';
import { createPaymentReferenceId } from '../../core/utils/id.utils';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { SarPipe } from '../../shared/pipes/sar.pipe';

@Component({
  selector: 'app-payments-page',
  imports: [
    PageHeader,
    Button,
    TableModule,
    Dialog,
    ReactiveFormsModule,
    InputText,
    InputNumber,
    ProgressSpinner,
    EmptyState,
    StatusBadge,
    SarPipe,
    RouterLink,
    DatePipe,
  ],
  templateUrl: './payments.page.html',
  styleUrl: './payments.page.scss',
})
export class PaymentsPage implements OnInit {
  private readonly api = inject(DHAMEN_API);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly refreshing = signal(false);
  readonly payments = signal<PaymentRecord[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly selectedPayment = signal<PaymentRecord | null>(null);
  readonly lifecycleVisible = signal(false);
  readonly lifecycleBusy = signal(false);
  readonly lastLifecycleStatus = signal<string | null>(null);

  readonly lifecycleForm = this.fb.nonNullable.group({
    paymentReferenceId: ['', Validators.required],
    customerIdentifier: [''],
    amount: this.fb.control<number | null>(null),
    requestId: [''],
    iban: [''],
    customerName: [''],
    originalPaymentReferenceId: [''],
  });

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('create') === '1') {
      void this.router.navigate(['/payouts-splits'], { queryParams: { create: '1' }, replaceUrl: true });
      return;
    }
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    forkJoin({
      payments: this.api.listPayments(),
      customers: this.api.listCustomers({ page: 1, pageSize: 200 }),
      suppliers: this.api.listSuppliers({ page: 1, pageSize: 200 }),
    }).subscribe({
      next: ({ payments, customers, suppliers }) => {
        this.payments.set(payments);
        this.customers.set(customers.items);
        this.suppliers.set(suppliers.items);
        this.loading.set(false);
        const focus = this.route.snapshot.queryParamMap.get('ref');
        if (focus) {
          const match = payments.find((p) => p.paymentReferenceId === focus) ?? null;
          this.selectedPayment.set(match);
        }
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  viewPayment(payment: PaymentRecord): void {
    this.selectedPayment.set(payment);
  }

  refreshStatuses(payment: PaymentRecord): void {
    this.refreshing.set(true);
    const calls = payment.lines.map((line) =>
      this.api.getSupplierPaymentStatus(line.supplierId, payment.paymentReferenceId)
    );
    forkJoin(calls).subscribe({
      next: (statuses) => {
        this.refreshing.set(false);
        const summary = statuses.map((s) => `${s.status}`).join(' / ');
        this.messages.add({
          severity: 'info',
          summary: 'Status updated',
          detail: summary,
        });
        this.reload();
        this.api.getPayment(payment.paymentReferenceId).subscribe({
          next: (updated) => this.selectedPayment.set(updated),
        });
      },
      error: (err: Error) => {
        this.refreshing.set(false);
        this.messages.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  openLifecycle(): void {
    this.lifecycleForm.reset({
      paymentReferenceId: createPaymentReferenceId(),
      customerIdentifier: this.customers()[0]?.identityNumber ?? '',
      amount: 100,
      requestId: createUuid(),
      iban: this.customers()[0]?.iban ?? '',
      customerName: this.customers()[0]?.name ?? '',
      originalPaymentReferenceId: '',
    });
    this.lifecycleVisible.set(true);
  }

  runLifecycle(
    action:
      | 'customer'
      | 'sadad'
      | 'subsequent'
      | 'status'
      | 'capture'
      | 'reverse'
      | 'refund'
      | 'refundIban'
      | 'cancel'
  ): void {
    const value = this.lifecycleForm.getRawValue();
    if (!value.paymentReferenceId.trim()) {
      this.lifecycleForm.markAllAsTouched();
      return;
    }
    this.lifecycleBusy.set(true);
    const ref = value.paymentReferenceId.trim();
    const customerIdentifier = value.customerIdentifier.trim() || null;
    const amount = value.amount === null ? null : Number(value.amount);
    const requestId = value.requestId.trim() || createUuid();

    const done = (message: string) => {
      this.lifecycleBusy.set(false);
      this.lastLifecycleStatus.set(message);
      this.messages.add({ severity: 'success', summary: action, detail: message });
      this.reload();
    };
    const fail = (err: Error) => {
      this.lifecycleBusy.set(false);
      this.messages.add({ severity: 'error', summary: action, detail: err.message });
    };

    switch (action) {
      case 'customer':
        this.api
          .createCustomerPayment({
            paymentReferenceId: ref,
            paymentExpiredOnMinutes: 60,
            customerPayments: [
              {
                name: value.customerName || null,
                customerIdentifier,
                amount: amount ?? 0,
                supplierId: this.suppliers()[0]?.id ?? null,
                isPreAuth: true,
                enableBNPL: false,
                mobile: null,
                email: null,
                enableRecurring: false,
                returnUrl: null,
              },
            ],
          })
          .subscribe({ next: (res) => done(res.message), error: fail });
        break;
      case 'sadad':
        this.api
          .createSadadPayment({
            paymentReferenceId: ref,
            name: value.customerName || null,
            customerIdentifier,
            amount: amount ?? 0,
            supplierId: this.suppliers()[0]?.id ?? null,
            email: null,
            mobile: null,
          })
          .subscribe({ next: (res) => done(res.message), error: fail });
        break;
      case 'subsequent':
        this.api
          .createSubsequentPayment({
            paymentReferenceId: ref,
            originalPaymentReferenceId: value.originalPaymentReferenceId || null,
            customerIdentifier,
            amount: amount ?? 0,
          })
          .subscribe({ next: (res) => done(res.message), error: fail });
        break;
      case 'status':
        this.api.getPaymentStatus(ref, customerIdentifier).subscribe({
          next: (status) => {
            this.lifecycleBusy.set(false);
            this.lastLifecycleStatus.set(`${status.status}`);
            this.messages.add({
              severity: 'info',
              summary: String(status.status),
              detail: status.message || ref,
            });
          },
          error: fail,
        });
        break;
      case 'capture':
        this.api
          .capturePayment({
            paymentReferenceId: ref,
            customerIdentifier,
            requestId,
            amount,
          })
          .subscribe({ next: (res) => done(res.message), error: fail });
        break;
      case 'reverse':
        this.api
          .reversePayment({ paymentReferenceId: ref, customerIdentifier })
          .subscribe({ next: (res) => done(res.message), error: fail });
        break;
      case 'refund':
        this.api
          .refundPayment({
            paymentReferenceId: ref,
            customerIdentifier,
            requestId,
            amount,
          })
          .subscribe({ next: (res) => done(res.message), error: fail });
        break;
      case 'refundIban':
        this.api
          .refundToIban({
            requestId,
            paymentReferenceId: ref,
            customerName: value.customerName || null,
            iban: value.iban || null,
            amount,
          })
          .subscribe({ next: (res) => done(res.message), error: fail });
        break;
      case 'cancel':
        this.api
          .cancelPaymentLink({ paymentReferenceId: ref, customerIdentifier })
          .subscribe({ next: (res) => done(res.message), error: fail });
        break;
    }
  }
}

function createUuid(): string {
  return crypto.randomUUID?.() ?? `req-${Date.now()}`;
}
