import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ProgressBar } from 'primeng/progressbar';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import { Supplier } from '../../core/models/dhamen.models';
import { payoutProgress } from '../../core/utils/money.utils';
import {
  identityNumberValidator,
  positiveAmountValidator,
  saudiIbanValidator,
  saudiMobileValidator,
} from '../../core/utils/validators';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { SarPipe } from '../../shared/pipes/sar.pipe';

@Component({
  selector: 'app-suppliers-page',
  imports: [
    PageHeader,
    Button,
    TableModule,
    Dialog,
    ReactiveFormsModule,
    InputText,
    InputNumber,
    ProgressSpinner,
    ProgressBar,
    EmptyState,
    SarPipe,
    Tag,
  ],
  templateUrl: './suppliers.page.html',
  styleUrl: './suppliers.page.scss',
})
export class SuppliersPage implements OnInit {
  private readonly api = inject(DHAMEN_API);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly suppliers = signal<Supplier[]>([]);
  readonly formVisible = signal(false);
  readonly editMode = signal(false);
  readonly selectedSupplier = signal<Supplier | null>(null);

  readonly form = this.fb.nonNullable.group({
    supplierId: [''],
    identityNumber: ['', [Validators.required, identityNumberValidator()]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    iban: ['', [Validators.required, saudiIbanValidator()]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, saudiMobileValidator()]],
    payoutThresholdAmount: this.fb.nonNullable.control<number | null>(null, [
      Validators.required,
      positiveAmountValidator(),
    ]),
  });

  ngOnInit(): void {
    this.reload();
  }

  progress(supplier: Supplier): number {
    return payoutProgress(supplier.balance, supplier.payoutThresholdAmount);
  }

  thresholdReached(supplier: Supplier): boolean {
    return supplier.balance >= supplier.payoutThresholdAmount;
  }

  reload(): void {
    this.loading.set(true);
    this.api.listSuppliers().subscribe({
      next: (items) => {
        this.suppliers.set(items);
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
      supplierId: '',
      identityNumber: '',
      name: '',
      iban: '',
      email: '',
      mobile: '',
      payoutThresholdAmount: 1000,
    });
    this.formVisible.set(true);
  }

  openEdit(supplier: Supplier): void {
    this.editMode.set(true);
    this.selectedSupplier.set(supplier);
    this.form.reset({
      supplierId: supplier.id,
      identityNumber: supplier.identityNumber,
      name: supplier.name,
      iban: supplier.iban,
      email: supplier.email,
      mobile: supplier.mobile,
      payoutThresholdAmount: supplier.payoutThresholdAmount,
    });
    this.formVisible.set(true);
  }

  saveSupplier(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);

    const request$ = this.editMode()
      ? this.api.updateSupplier({
          supplierId: value.supplierId,
          name: value.name,
          iban: value.iban,
          identityNumber: value.identityNumber,
          payoutThresholdAmount: Number(value.payoutThresholdAmount),
          email: value.email,
          mobile: value.mobile,
        })
      : this.api.createSupplier({
          name: value.name,
          iban: value.iban,
          identityNumber: value.identityNumber,
          payoutThresholdAmount: Number(value.payoutThresholdAmount),
          email: value.email,
          mobile: value.mobile,
        });

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.formVisible.set(false);
        this.messages.add({ severity: 'success', summary: 'Supplier saved', detail: res.message });
        this.reload();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Save failed', detail: err.message });
      },
    });
  }

  refreshBalance(supplier: Supplier): void {
    this.api.getSupplierBalance(supplier.id).subscribe({
      next: (res) => {
        this.messages.add({
          severity: 'info',
          summary: 'Supplier balance',
          detail: `${supplier.name}: ${res.balance} ${res.currency}`,
        });
        this.reload();
      },
      error: (err: Error) => {
        this.messages.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }
}
