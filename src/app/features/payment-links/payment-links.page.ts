import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { forkJoin } from 'rxjs';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import { Customer, PaymentLink, Supplier } from '../../core/models/dhamen.models';
import { createPaymentReferenceId } from '../../core/utils/id.utils';
import { positiveAmountValidator } from '../../core/utils/validators';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { SarPipe } from '../../shared/pipes/sar.pipe';

@Component({
  selector: 'app-payment-links-page',
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
    ConfirmDialog,
    SarPipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './payment-links.page.html',
  styleUrl: './payment-links.page.scss',
})
export class PaymentLinksPage implements OnInit {
  private readonly api = inject(DHAMEN_API);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly links = signal<PaymentLink[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly formVisible = signal(false);
  readonly editMode = signal(false);
  readonly selected = signal<PaymentLink | null>(null);

  readonly form = this.fb.nonNullable.group({
    id: [''],
    paymentReferenceId: ['', [Validators.required, Validators.maxLength(50)]],
    expiresInMinutes: this.fb.control<number | null>(60),
    customerId: this.fb.control<string | null>(null, Validators.required),
    amount: this.fb.control<number | null>(null, [Validators.required, positiveAmountValidator()]),
    supplierId: this.fb.control<string | null>(null),
    paymentUrl: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  customerName(id: string): string {
    return this.customers().find((c) => c.id === id)?.name ?? id.slice(0, 8);
  }

  reload(): void {
    this.loading.set(true);
    forkJoin({
      links: this.api.listPaymentLinks({ page: 1, pageSize: 100 }),
      customers: this.api.listCustomers({ page: 1, pageSize: 200 }),
      suppliers: this.api.listSuppliers({ page: 1, pageSize: 200 }),
    }).subscribe({
      next: ({ links, customers, suppliers }) => {
        this.links.set(links.items);
        this.customers.set(customers.items);
        this.suppliers.set(suppliers.items);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  openCreate(): void {
    this.editMode.set(false);
    this.form.reset({
      id: '',
      paymentReferenceId: createPaymentReferenceId(),
      expiresInMinutes: 60,
      customerId: this.customers()[0]?.id ?? null,
      amount: null,
      supplierId: null,
      paymentUrl: '',
    });
    this.form.controls.paymentReferenceId.enable();
    this.form.controls.customerId.enable();
    this.formVisible.set(true);
  }

  openEdit(link: PaymentLink): void {
    this.editMode.set(true);
    this.selected.set(link);
    this.form.reset({
      id: link.id,
      paymentReferenceId: link.paymentReferenceId,
      expiresInMinutes: link.expiresInMinutes,
      customerId: link.customerId,
      amount: link.amount,
      supplierId: link.supplierId,
      paymentUrl: link.paymentUrl ?? '',
    });
    this.form.controls.paymentReferenceId.disable();
    this.form.controls.customerId.disable();
    this.formVisible.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    const request$ = this.editMode()
      ? this.api.updatePaymentLink({
          id: value.id,
          expiresInMinutes: value.expiresInMinutes,
          amount: Number(value.amount),
          supplierId: value.supplierId,
          paymentUrl: value.paymentUrl.trim() || null,
        })
      : this.api.createPaymentLink({
          paymentReferenceId: value.paymentReferenceId,
          expiresInMinutes: value.expiresInMinutes,
          customerId: String(value.customerId),
          amount: Number(value.amount),
          supplierId: value.supplierId,
          paymentUrl: value.paymentUrl.trim() || null,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formVisible.set(false);
        this.messages.add({ severity: 'success', summary: 'Saved', detail: 'Payment link saved.' });
        this.reload();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Save failed', detail: err.message });
      },
    });
  }

  copyUrl(link: PaymentLink): void {
    const url = link.paymentUrl || '';
    if (!url) {
      this.messages.add({ severity: 'warn', summary: 'No URL', detail: 'This link has no payment URL.' });
      return;
    }
    void navigator.clipboard.writeText(url).then(() => {
      this.messages.add({ severity: 'success', summary: 'Copied', detail: url });
    });
  }

  cancelLink(link: PaymentLink): void {
    this.api
      .cancelPaymentLink({
        paymentReferenceId: link.paymentReferenceId,
        customerIdentifier: null,
      })
      .subscribe({
        next: (res) =>
          this.messages.add({ severity: 'success', summary: 'Cancelled', detail: res.message }),
        error: (err: Error) =>
          this.messages.add({ severity: 'error', summary: 'Cancel failed', detail: err.message }),
      });
  }

  checkStatus(link: PaymentLink): void {
    this.api.getPaymentStatus(link.paymentReferenceId).subscribe({
      next: (status) =>
        this.messages.add({
          severity: 'info',
          summary: String(status.status),
          detail: status.message || link.paymentReferenceId,
        }),
      error: (err: Error) =>
        this.messages.add({ severity: 'error', summary: 'Status failed', detail: err.message }),
    });
  }

  remove(link: PaymentLink): void {
    this.confirm.confirm({
      header: 'Delete payment link',
      message: `Delete ${link.paymentReferenceId}?`,
      acceptLabel: 'Delete',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.deletePaymentLink(link.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Deleted', detail: 'Link removed.' });
            this.reload();
          },
          error: (err: Error) =>
            this.messages.add({ severity: 'error', summary: 'Delete failed', detail: err.message }),
        });
      },
    });
  }
}
