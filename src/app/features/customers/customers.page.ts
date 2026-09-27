import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import { Customer } from '../../core/models/dhamen.models';
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
  selector: 'app-customers-page',
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
    SarPipe,
    Select,
    DecimalPipe,
  ],
  templateUrl: './customers.page.html',
  styleUrl: './customers.page.scss',
})
export class CustomersPage implements OnInit {
  private readonly api = inject(DHAMEN_API);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly formVisible = signal(false);
  readonly depositVisible = signal(false);
  readonly editMode = signal(false);
  readonly selectedCustomer = signal<Customer | null>(null);

  readonly form = this.fb.nonNullable.group({
    identityNumber: ['', [Validators.required, identityNumberValidator()]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    iban: ['', [Validators.required, saudiIbanValidator()]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, saudiMobileValidator()]],
  });

  readonly depositForm = this.fb.nonNullable.group({
    customerId: this.fb.control<string | null>(null, Validators.required),
    amount: this.fb.nonNullable.control<number | null>(null, [
      Validators.required,
      positiveAmountValidator(),
    ]),
    paymentIWalletNumber: [''],
  });

  readonly quickAmounts = [500, 1000, 5000, 10000];

  private readonly depositCustomerId = toSignal(this.depositForm.controls.customerId.valueChanges, {
    initialValue: null,
  });

  readonly depositCustomer = computed(
    () => this.customers().find((c) => c.id === this.depositCustomerId()) ?? null
  );

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.listCustomers().subscribe({
      next: (items) => {
        this.customers.set(items);
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
      identityNumber: '',
      name: '',
      iban: '',
      email: '',
      mobile: '',
    });
    this.form.controls.identityNumber.enable();
    this.formVisible.set(true);
  }

  openEdit(customer: Customer): void {
    this.editMode.set(true);
    this.selectedCustomer.set(customer);
    this.form.reset({
      identityNumber: customer.identityNumber,
      name: customer.name,
      iban: customer.iban,
      email: customer.email,
      mobile: customer.mobile,
    });
    this.form.controls.identityNumber.disable();
    this.formVisible.set(true);
  }

  openDeposit(customer: Customer): void {
    this.selectedCustomer.set(customer);
    this.depositForm.reset({ customerId: customer.id, amount: null, paymentIWalletNumber: '' });
    this.depositVisible.set(true);
  }

  saveCustomer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    const request$ = this.editMode()
      ? this.api.updateCustomer(value)
      : this.api.createCustomer(value);

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.formVisible.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Customer saved',
          detail: res.message,
        });
        this.reload();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Save failed', detail: err.message });
      },
    });
  }

  setDepositAmount(amount: number): void {
    this.depositForm.controls.amount.setValue(amount);
  }

  submitDeposit(): void {
    const customer = this.depositCustomer();
    if (!customer || this.depositForm.invalid) {
      this.depositForm.markAllAsTouched();
      return;
    }
    const amount = Number(this.depositForm.controls.amount.value);
    const walletNumber = this.depositForm.controls.paymentIWalletNumber.value.trim();
    this.saving.set(true);
    this.api
      .depositMoney({
        customerId: customer.id,
        amount,
        paymentIWalletNumber: walletNumber || null,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.depositVisible.set(false);
          this.messages.add({
            severity: 'success',
            summary: 'Deposit completed',
            detail: `${res.message} — New balance: ${res.newBalance}`,
          });
          this.reload();
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.messages.add({ severity: 'error', summary: 'Deposit failed', detail: err.message });
        },
      });
  }

  refreshBalance(customer: Customer): void {
    this.api.getCustomerBalance(customer.id).subscribe({
      next: (res) => {
        this.messages.add({
          severity: 'info',
          summary: 'Customer balance',
          detail: `${customer.name}: ${res.balance} ${res.currency}`,
        });
        this.reload();
      },
      error: (err: Error) => {
        this.messages.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }
}
