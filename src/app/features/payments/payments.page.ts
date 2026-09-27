import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { forkJoin } from 'rxjs';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import { Customer, PaymentRecord, Supplier } from '../../core/models/dhamen.models';
import { createPaymentReferenceId } from '../../core/utils/id.utils';
import { positiveAmountValidator } from '../../core/utils/validators';
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
    Select,
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

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly refreshing = signal(false);
  readonly payments = signal<PaymentRecord[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly formVisible = signal(false);
  readonly selectedPayment = signal<PaymentRecord | null>(null);

  readonly form = this.fb.nonNullable.group({
    paymentReferenceId: ['', Validators.required],
    defaultCustomerId: this.fb.control<string | null>(null),
    lines: this.fb.array([this.createLineGroup()]),
  });

  get lines(): FormArray {
    return this.form.controls.lines;
  }

  ngOnInit(): void {
    this.reload();
    const open = this.route.snapshot.queryParamMap.get('create');
    if (open === '1') {
      this.openCreate();
    }
  }

  reload(): void {
    this.loading.set(true);
    forkJoin({
      payments: this.api.listPayments(),
      customers: this.api.listCustomers(),
      suppliers: this.api.listSuppliers(),
    }).subscribe({
      next: ({ payments, customers, suppliers }) => {
        this.payments.set(payments);
        this.customers.set(customers);
        this.suppliers.set(suppliers);
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

  openCreate(): void {
    this.form.reset({
      paymentReferenceId: createPaymentReferenceId(),
      defaultCustomerId: this.customers()[0]?.id ?? null,
    });
    this.lines.clear();
    this.lines.push(this.createLineGroup(this.suppliers()[0]?.id ?? null));
    this.formVisible.set(true);
  }

  addLine(): void {
    this.lines.push(this.createLineGroup());
  }

  removeLine(index: number): void {
    if (this.lines.length === 1) {
      return;
    }
    this.lines.removeAt(index);
  }

  submitPayment(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const defaultCustomerId = value.defaultCustomerId;
    this.saving.set(true);
    this.api
      .createSupplierPayment({
        paymentReferenceId: value.paymentReferenceId.trim(),
        supplierPayments: value.lines.map((line) => ({
          supplierId: String(line.supplierId),
          amount: Number(line.amount),
          customerId: line.fundFromCustomer
            ? (line.customerId ?? defaultCustomerId)
            : null,
        })),
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.formVisible.set(false);
          this.messages.add({
            severity: 'success',
            summary: 'Payment created',
            detail: res.message,
          });
          this.reload();
          this.api.getPayment(res.paymentReferenceId).subscribe({
            next: (payment) => this.selectedPayment.set(payment),
          });
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.messages.add({ severity: 'error', summary: 'Payment failed', detail: err.message });
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

  private createLineGroup(supplierId: string | null = null) {
    return this.fb.nonNullable.group({
      supplierId: this.fb.control<string | null>(supplierId, Validators.required),
      amount: this.fb.control<number | null>(null, [Validators.required, positiveAmountValidator()]),
      fundFromCustomer: this.fb.nonNullable.control(true),
      customerId: this.fb.control<string | null>(null),
    });
  }
}
