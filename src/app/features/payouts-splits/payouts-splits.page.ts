import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { forkJoin, startWith } from 'rxjs';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import {
  Customer,
  PaymentRecord,
  Supplier,
  SupplierPaymentRequest,
} from '../../core/models/dhamen.models';
import { createSplitReferenceId } from '../../core/utils/id.utils';
import { roundMoney, sumAmounts } from '../../core/utils/money.utils';
import { positiveAmountValidator } from '../../core/utils/validators';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { SarPipe } from '../../shared/pipes/sar.pipe';

/** Form value for "no customer" — sent to the API as `customerId: null` (authority funds). */
const AUTHORITY_ID = 'authority';

interface CustomerOption {
  id: string;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-payouts-splits-page',
  imports: [
    PageHeader,
    EmptyState,
    StatusBadge,
    SarPipe,
    DatePipe,
    Button,
    Dialog,
    InputNumber,
    InputText,
    Select,
    ProgressSpinner,
    TableModule,
    ReactiveFormsModule,
  ],
  templateUrl: './payouts-splits.page.html',
  styleUrl: './payouts-splits.page.scss',
})
export class PayoutsSplitsPage implements OnInit {
  private readonly api = inject(DHAMEN_API);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formVisible = signal(false);
  readonly checkingRef = signal<string | null>(null);
  readonly payments = signal<PaymentRecord[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly suppliers = signal<Supplier[]>([]);

  readonly customerOptions = computed<CustomerOption[]>(() => [
    { id: AUTHORITY_ID, label: 'None (authority)', hint: 'customerId: null' },
    ...this.customers().map((c) => ({ id: c.id, label: c.name, hint: c.balance.toFixed(2) + ' SAR' })),
  ]);

  readonly form = this.fb.nonNullable.group({
    paymentReferenceId: ['', Validators.required],
    supplierPayments: this.fb.array([this.createLineGroup()]),
  });

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  /** Exact body for POST /api/dhamen/suppliers/payments. */
  readonly requestBody = computed<SupplierPaymentRequest>(() => {
    const value = this.formValue();
    return {
      paymentReferenceId: (value.paymentReferenceId ?? '').trim(),
      supplierPayments: (value.supplierPayments ?? []).map((line) => ({
        supplierId: line.supplierId ?? '',
        amount: roundMoney(Number(line.amount) || 0),
        customerId: !line.customerId || line.customerId === AUTHORITY_ID ? null : line.customerId,
      })),
    };
  });

  readonly total = computed(() =>
    sumAmounts(this.requestBody().supplierPayments.map((line) => line.amount))
  );

  readonly duplicateSupplier = computed(() => {
    const ids = this.requestBody().supplierPayments.map((l) => l.supplierId).filter((id) => !!id);
    return new Set(ids).size !== ids.length;
  });

  readonly canSubmit = computed(() => {
    const body = this.requestBody();
    return (
      !!body.paymentReferenceId &&
      body.supplierPayments.every((l) => !!l.supplierId && l.amount > 0) &&
      !this.duplicateSupplier()
    );
  });

  get supplierPayments(): FormArray {
    return this.form.controls.supplierPayments;
  }

  ngOnInit(): void {
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
        this.openFromQuery();
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  openCreate(supplierId: string | null = null): void {
    this.supplierPayments.clear();
    this.supplierPayments.push(this.createLineGroup(supplierId));
    this.form.controls.paymentReferenceId.setValue(createSplitReferenceId());
    this.formVisible.set(true);
  }

  /** Handles `?create=1` and `?supplierId=` (from Payments hub / Suppliers). */
  private openFromQuery(): void {
    const create = this.route.snapshot.queryParamMap.get('create') === '1';
    const supplierId = this.route.snapshot.queryParamMap.get('supplierId');
    if (!create && !supplierId) {
      return;
    }
    const known = supplierId ? this.suppliers().some((s) => s.id === supplierId) : false;
    this.openCreate(known && supplierId ? supplierId : null);
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  regenerateReference(): void {
    this.form.controls.paymentReferenceId.setValue(createSplitReferenceId());
  }

  addLine(): void {
    this.supplierPayments.push(this.createLineGroup());
  }

  removeLine(index: number): void {
    if (this.supplierPayments.length === 1) {
      return;
    }
    this.supplierPayments.removeAt(index);
  }

  submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api.createSupplierPayment(this.requestBody()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.formVisible.set(false);
        this.messages.add({ severity: 'success', summary: 'Payment created', detail: res.message });
        this.reload();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Payment failed', detail: err.message });
      },
    });
  }

  /** GET /api/dhamen/suppliers/{supplierId}/payments/{paymentReferenceId}/status for every line. */
  checkStatus(payment: PaymentRecord): void {
    this.checkingRef.set(payment.paymentReferenceId);
    forkJoin(
      payment.lines.map((line) =>
        this.api.getSupplierPaymentStatus(line.supplierId, payment.paymentReferenceId)
      )
    ).subscribe({
      next: (statuses) => {
        this.checkingRef.set(null);
        const names = new Map(payment.lines.map((l) => [l.supplierId, l.supplierName]));
        this.messages.add({
          severity: 'info',
          summary: `Status · ${payment.paymentReferenceId}`,
          detail: statuses.map((s) => `${names.get(s.supplierId ?? '') ?? s.supplierId}: ${s.status}`).join(' · '),
        });
        this.reload();
      },
      error: (err: Error) => {
        this.checkingRef.set(null);
        this.messages.add({ severity: 'error', summary: 'Status check failed', detail: err.message });
      },
    });
  }

  paymentTotal(payment: PaymentRecord): number {
    return sumAmounts(payment.lines.map((l) => l.amount));
  }

  private createLineGroup(supplierId: string | null = null) {
    return this.fb.nonNullable.group({
      supplierId: this.fb.control<string | null>(supplierId, Validators.required),
      amount: this.fb.control<number | null>(null, [Validators.required, positiveAmountValidator()]),
      customerId: this.fb.nonNullable.control<string>(AUTHORITY_ID),
    });
  }
}
