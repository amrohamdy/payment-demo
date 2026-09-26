import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { Steps } from 'primeng/steps';
import { MenuItem } from 'primeng/api';
import { switchMap } from 'rxjs';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import { Customer, Supplier } from '../../core/models/dhamen.models';
import { createPaymentReferenceId, createUuid } from '../../core/utils/id.utils';
import {
  identityNumberValidator,
  positiveAmountValidator,
  saudiIbanValidator,
  saudiMobileValidator,
} from '../../core/utils/validators';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { SarPipe } from '../../shared/pipes/sar.pipe';

@Component({
  selector: 'app-demo-wizard-page',
  imports: [
    PageHeader,
    Steps,
    Button,
    ReactiveFormsModule,
    InputText,
    InputNumber,
    Select,
    SarPipe,
  ],
  templateUrl: './demo-wizard.page.html',
  styleUrl: './demo-wizard.page.scss',
})
export class DemoWizardPage implements OnInit {
  private readonly api = inject(DHAMEN_API);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  readonly activeIndex = signal(0);
  readonly busy = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly createdCustomerId = signal<string | null>(null);
  readonly createdSupplierId = signal<string | null>(null);
  readonly paymentReferenceId = signal<string | null>(null);
  readonly customerBalance = signal<number | null>(null);
  readonly supplierBalance = signal<number | null>(null);

  readonly steps: MenuItem[] = [
    { label: 'عميل' },
    { label: 'إيداع' },
    { label: 'مورد' },
    { label: 'دفع' },
    { label: 'متابعة' },
  ];

  readonly customerForm = this.fb.nonNullable.group({
    identityNumber: ['', [Validators.required, identityNumberValidator()]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    iban: ['', [Validators.required, saudiIbanValidator()]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, saudiMobileValidator()]],
  });

  readonly depositForm = this.fb.nonNullable.group({
    amount: this.fb.nonNullable.control<number>(500, [
      Validators.required,
      positiveAmountValidator(),
    ]),
  });

  readonly supplierForm = this.fb.nonNullable.group({
    identityNumber: ['', [Validators.required, identityNumberValidator()]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    iban: ['', [Validators.required, saudiIbanValidator()]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, saudiMobileValidator()]],
    payoutThresholdAmount: this.fb.nonNullable.control<number>(1000, [
      Validators.required,
      positiveAmountValidator(),
    ]),
  });

  readonly paymentForm = this.fb.nonNullable.group({
    paymentReferenceId: ['', Validators.required],
    customerId: this.fb.control<string | null>(null, Validators.required),
    supplierId: this.fb.control<string | null>(null, Validators.required),
    amount: this.fb.nonNullable.control<number>(250, [
      Validators.required,
      positiveAmountValidator(),
    ]),
  });

  ngOnInit(): void {
    this.seedWizardDefaults();
    this.refreshLists();
  }

  next(): void {
    this.activeIndex.update((i) => Math.min(i + 1, this.steps.length - 1));
  }

  back(): void {
    this.activeIndex.update((i) => Math.max(i - 1, 0));
  }

  createCustomerStep(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.api.createCustomer(this.customerForm.getRawValue()).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.createdCustomerId.set(res.customerId);
        this.paymentForm.controls.customerId.setValue(res.customerId);
        this.messages.add({ severity: 'success', summary: 'عميل', detail: res.message });
        this.refreshLists();
        this.next();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.messages.add({ severity: 'error', summary: 'فشل', detail: err.message });
      },
    });
  }

  depositStep(): void {
    const customerId = this.createdCustomerId() ?? this.paymentForm.controls.customerId.value;
    if (!customerId || this.depositForm.invalid) {
      this.depositForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.api
      .depositMoney({
        customerId,
        amount: Number(this.depositForm.controls.amount.value),
        paymentIWalletNumber: null,
      })
      .pipe(switchMap((res) => {
        this.customerBalance.set(res.newBalance);
        return this.api.getCustomerBalance(customerId);
      }))
      .subscribe({
        next: (balance) => {
          this.busy.set(false);
          this.customerBalance.set(balance.balance);
          this.messages.add({
            severity: 'success',
            summary: 'إيداع',
            detail: `الرصيد الحالي ${balance.balance}`,
          });
          this.refreshLists();
          this.next();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.messages.add({ severity: 'error', summary: 'فشل', detail: err.message });
        },
      });
  }

  createSupplierStep(): void {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.api.createSupplier(this.supplierForm.getRawValue()).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.createdSupplierId.set(res.supplierId);
        this.paymentForm.controls.supplierId.setValue(res.supplierId);
        this.messages.add({ severity: 'success', summary: 'مورد', detail: res.message });
        this.refreshLists();
        this.next();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.messages.add({ severity: 'error', summary: 'فشل', detail: err.message });
      },
    });
  }

  paymentStep(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    const value = this.paymentForm.getRawValue();
    this.busy.set(true);
    this.api
      .createSupplierPayment({
        paymentReferenceId: value.paymentReferenceId,
        supplierPayments: [
          {
            supplierId: String(value.supplierId),
            amount: Number(value.amount),
            customerId: value.customerId,
          },
        ],
      })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.paymentReferenceId.set(res.paymentReferenceId);
          this.messages.add({ severity: 'success', summary: 'دفعة', detail: res.message });
          this.refreshBalances();
          this.next();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.messages.add({ severity: 'error', summary: 'فشل', detail: err.message });
        },
      });
  }

  refreshStatuses(): void {
    const supplierId = this.paymentForm.controls.supplierId.value;
    const ref = this.paymentReferenceId();
    if (!supplierId || !ref) {
      return;
    }
    this.busy.set(true);
    this.api.getSupplierPaymentStatus(supplierId, ref).subscribe({
      next: (status) => {
        this.busy.set(false);
        this.messages.add({
          severity: status.status === 'Completed' ? 'success' : 'info',
          summary: status.status,
          detail: status.message,
        });
        this.refreshBalances();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.messages.add({ severity: 'error', summary: 'فشل', detail: err.message });
      },
    });
  }

  goToPaymentDetails(): void {
    const ref = this.paymentReferenceId();
    void this.router.navigate(['/payments'], { queryParams: { ref } });
  }

  private refreshLists(): void {
    this.api.listCustomers().subscribe({ next: (items) => this.customers.set(items) });
    this.api.listSuppliers().subscribe({ next: (items) => this.suppliers.set(items) });
  }

  private refreshBalances(): void {
    const customerId = this.paymentForm.controls.customerId.value;
    const supplierId = this.paymentForm.controls.supplierId.value;
    if (customerId) {
      this.api.getCustomerBalance(customerId).subscribe({
        next: (res) => this.customerBalance.set(res.balance),
      });
    }
    if (supplierId) {
      this.api.getSupplierBalance(supplierId).subscribe({
        next: (res) => this.supplierBalance.set(res.balance),
      });
    }
  }

  private seedWizardDefaults(): void {
    const suffix = createUuid().slice(0, 4);
    this.customerForm.reset({
      identityNumber: `1${String(Date.now()).slice(-9)}`,
      name: `عميل تجريبي ${suffix}`,
      iban: 'SA0380000000608010167519',
      email: `customer.${suffix}@example.com`,
      mobile: '0512345678',
    });
    this.supplierForm.reset({
      identityNumber: `7${String(Date.now()).slice(-9)}`,
      name: `مورد تجريبي ${suffix}`,
      iban: 'SA0310000001234567890123',
      email: `supplier.${suffix}@example.com`,
      mobile: '0598765432',
      payoutThresholdAmount: 1000,
    });
    this.paymentForm.patchValue({
      paymentReferenceId: createPaymentReferenceId(),
    });
  }
}
