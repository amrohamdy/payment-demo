import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Steps } from 'primeng/steps';
import { MenuItem } from 'primeng/api';
import { switchMap } from 'rxjs';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import { createPaymentReferenceId, createUuid } from '../../core/utils/id.utils';
import {
  identityNumberValidator,
  positiveAmountValidator,
  saudiIbanValidator,
  saudiMobileValidator,
} from '../../core/utils/validators';
import { percentageRangeValidator } from '../../core/utils/business.validators';
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
    SarPipe,
    RouterLink,
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
  readonly customerId = signal<string | null>(null);
  readonly supplierId = signal<string | null>(null);
  readonly escrowId = signal<string | null>(null);
  readonly contractId = signal<string | null>(null);
  readonly scheduleLineId = signal<string | null>(null);
  readonly releaseId = signal<string | null>(null);
  readonly paymentLinkRef = signal<string | null>(null);
  readonly paymentReferenceId = signal<string | null>(null);
  readonly customerBalance = signal<number | null>(null);
  readonly supplierBalance = signal<number | null>(null);
  readonly contextNotes = signal<string[]>([]);

  readonly steps: MenuItem[] = [
    { label: 'Parties' },
    { label: 'Escrow' },
    { label: 'Contract' },
    { label: 'Collect' },
    { label: 'Release' },
    { label: 'Payout' },
  ];

  readonly customerForm = this.fb.nonNullable.group({
    identityNumber: ['', [Validators.required, identityNumberValidator()]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    iban: ['', [Validators.required, saudiIbanValidator()]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, saudiMobileValidator()]],
    depositAmount: this.fb.nonNullable.control(1000, [Validators.required, positiveAmountValidator()]),
  });

  readonly supplierForm = this.fb.nonNullable.group({
    identityNumber: ['', [Validators.required, identityNumberValidator()]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    iban: ['', [Validators.required, saudiIbanValidator()]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, saudiMobileValidator()]],
    payoutThresholdAmount: this.fb.nonNullable.control(1000, [
      Validators.required,
      positiveAmountValidator(),
    ]),
  });

  readonly escrowForm = this.fb.nonNullable.group({
    name: ['Demo Escrow VA', Validators.required],
    viban: ['SA0000000000000000000099', Validators.required],
    bban: ['00000000000000000099', Validators.required],
  });

  readonly contractForm = this.fb.nonNullable.group({
    contractNumber: ['', Validators.required],
    totalAmount: this.fb.nonNullable.control(1000, [Validators.required, positiveAmountValidator()]),
    penaltyPercentage: this.fb.nonNullable.control(2, percentageRangeValidator()),
    sceFeePercentage: this.fb.nonNullable.control(1, percentageRangeValidator()),
    moatamedFeePercentage: this.fb.nonNullable.control(0.5, percentageRangeValidator()),
    vatPercentage: this.fb.nonNullable.control(15, percentageRangeValidator()),
  });

  readonly collectForm = this.fb.nonNullable.group({
    paymentReferenceId: ['', Validators.required],
    amount: this.fb.nonNullable.control(500, [Validators.required, positiveAmountValidator()]),
  });

  readonly payoutForm = this.fb.nonNullable.group({
    paymentReferenceId: ['', Validators.required],
    amount: this.fb.nonNullable.control(250, [Validators.required, positiveAmountValidator()]),
  });

  ngOnInit(): void {
    this.seedDefaults();
  }

  back(): void {
    this.activeIndex.update((i) => Math.max(i - 1, 0));
  }

  next(): void {
    this.activeIndex.update((i) => Math.min(i + 1, this.steps.length - 1));
  }

  private note(text: string): void {
    this.contextNotes.update((list) => [text, ...list].slice(0, 12));
  }

  createParties(): void {
    if (this.customerForm.invalid || this.supplierForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.supplierForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.api
      .createCustomer({
        identityNumber: this.customerForm.controls.identityNumber.value,
        name: this.customerForm.controls.name.value,
        iban: this.customerForm.controls.iban.value,
        email: this.customerForm.controls.email.value,
        mobile: this.customerForm.controls.mobile.value,
      })
      .pipe(
        switchMap((customer) => {
          this.customerId.set(customer.customerId);
          this.note(`Customer ${customer.customerId}`);
          return this.api.depositMoney({
            customerId: customer.customerId,
            amount: Number(this.customerForm.controls.depositAmount.value),
            paymentIWalletNumber: null,
          });
        }),
        switchMap((deposit) => {
          this.customerBalance.set(deposit.newBalance);
          return this.api.createSupplier(this.supplierForm.getRawValue());
        })
      )
      .subscribe({
        next: (supplier) => {
          this.busy.set(false);
          this.supplierId.set(supplier.supplierId);
          this.note(`Supplier ${supplier.supplierId}`);
          this.messages.add({ severity: 'success', summary: 'Parties ready', detail: 'Customer funded + supplier created' });
          this.next();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.messages.add({ severity: 'error', summary: 'Failed', detail: err.message });
        },
      });
  }

  createEscrow(): void {
    if (this.escrowForm.invalid) {
      this.escrowForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.api
      .createEscrowAccount({
        holderType: 'Authority',
        ...this.escrowForm.getRawValue(),
      })
      .subscribe({
        next: (account) => {
          this.busy.set(false);
          this.escrowId.set(account.id);
          this.note(`Escrow ${account.id}`);
          this.messages.add({ severity: 'success', summary: 'Escrow', detail: account.name });
          this.next();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.messages.add({ severity: 'error', summary: 'Failed', detail: err.message });
        },
      });
  }

  createContractAndSchedule(): void {
    if (this.contractForm.invalid || !this.escrowId()) {
      this.contractForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const total = Number(this.contractForm.controls.totalAmount.value);
    this.api
      .createContract({
        ...this.contractForm.getRawValue(),
        totalAmount: total,
        escrowAccountId: this.escrowId(),
      })
      .pipe(
        switchMap((contract) => {
          this.contractId.set(contract.id);
          this.note(`Contract ${contract.contractNumber}`);
          const due = new Date().toISOString().slice(0, 10);
          return this.api.createPaymentScheduleLine({
            contractId: contract.id,
            sequenceNo: 1,
            title: 'Full release',
            percentage: 100,
            amount: total,
            dueDate: due,
            escrowAccountId: this.escrowId(),
          });
        })
      )
      .subscribe({
        next: (line) => {
          this.busy.set(false);
          this.scheduleLineId.set(line.id);
          this.note(`Schedule line ${line.id}`);
          this.messages.add({
            severity: 'success',
            summary: 'Contract + schedule',
            detail: '100% schedule line created',
          });
          this.next();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.messages.add({ severity: 'error', summary: 'Failed', detail: err.message });
        },
      });
  }

  collectFunds(): void {
    const customerId = this.customerId();
    if (!customerId || this.collectForm.invalid) {
      this.collectForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const ref = this.collectForm.controls.paymentReferenceId.value;
    const amount = Number(this.collectForm.controls.amount.value);
    this.api
      .createPaymentLink({
        paymentReferenceId: ref,
        expiresInMinutes: 120,
        customerId,
        amount,
        supplierId: this.supplierId(),
        paymentUrl: null,
      })
      .pipe(
        switchMap((link) => {
          this.paymentLinkRef.set(link.paymentReferenceId);
          this.note(`Payment link ${link.paymentReferenceId}`);
          return this.api.getPaymentStatus(link.paymentReferenceId);
        }),
        switchMap((status) => {
          this.note(`Status ${status.status}`);
          return this.api.capturePayment({
            paymentReferenceId: ref,
            customerIdentifier: this.customerForm.controls.identityNumber.value,
            requestId: createUuid(),
            amount,
          });
        })
      )
      .subscribe({
        next: (capture) => {
          this.busy.set(false);
          this.messages.add({ severity: 'success', summary: 'Collected', detail: capture.message });
          this.next();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.messages.add({ severity: 'error', summary: 'Failed', detail: err.message });
        },
      });
  }

  createRelease(): void {
    const lineId = this.scheduleLineId();
    if (!lineId) return;
    this.busy.set(true);
    const amount = Number(this.contractForm.controls.totalAmount.value);
    this.api
      .createReleaseRequest({
        scheduleLineId: lineId,
        requestDate: new Date().toISOString().slice(0, 10),
        requestedAmount: amount,
        hasPenalty: false,
        status: 'Approved',
      })
      .subscribe({
        next: (release) => {
          this.busy.set(false);
          this.releaseId.set(release.id);
          this.note(`Release ${release.id} Approved`);
          this.messages.add({ severity: 'success', summary: 'Release', detail: 'Approved release request' });
          this.next();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.messages.add({ severity: 'error', summary: 'Failed', detail: err.message });
        },
      });
  }

  createPayout(): void {
    const supplierId = this.supplierId();
    const customerId = this.customerId();
    if (!supplierId || !customerId || this.payoutForm.invalid) {
      this.payoutForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const ref = this.payoutForm.controls.paymentReferenceId.value;
    this.api
      .createSupplierPayment({
        paymentReferenceId: ref,
        supplierPayments: [
          {
            supplierId,
            amount: Number(this.payoutForm.controls.amount.value),
            customerId,
          },
        ],
      })
      .pipe(
        switchMap((payment) => {
          this.paymentReferenceId.set(payment.paymentReferenceId);
          this.note(`Payout ${payment.paymentReferenceId}`);
          return this.api.getSupplierPaymentStatus(supplierId, payment.paymentReferenceId);
        }),
        switchMap(() => this.api.getCustomerBalance(customerId)),
        switchMap((customerBal) => {
          this.customerBalance.set(customerBal.balance);
          return this.api.getSupplierBalance(supplierId);
        })
      )
      .subscribe({
        next: (supplierBal) => {
          this.busy.set(false);
          this.supplierBalance.set(supplierBal.balance);
          this.messages.add({
            severity: 'success',
            summary: 'Demo complete',
            detail: 'Escrow → collect → release → payout linked in demo context',
          });
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.messages.add({ severity: 'error', summary: 'Failed', detail: err.message });
        },
      });
  }

  goToPayments(): void {
    void this.router.navigate(['/payments'], {
      queryParams: { ref: this.paymentReferenceId() },
    });
  }

  private seedDefaults(): void {
    const suffix = createUuid().slice(0, 4);
    this.customerForm.reset({
      identityNumber: `1${String(Date.now()).slice(-9)}`,
      name: `Demo Customer ${suffix}`,
      iban: 'SA0380000000608010167519',
      email: `customer.${suffix}@example.com`,
      mobile: '0512345678',
      depositAmount: 1000,
    });
    this.supplierForm.reset({
      identityNumber: `7${String(Date.now()).slice(-9)}`,
      name: `Demo Supplier ${suffix}`,
      iban: 'SA0310000001234567890123',
      email: `supplier.${suffix}@example.com`,
      mobile: '0598765432',
      payoutThresholdAmount: 1000,
    });
    this.contractForm.patchValue({ contractNumber: `CNT-${suffix.toUpperCase()}` });
    this.collectForm.patchValue({ paymentReferenceId: createPaymentReferenceId() });
    this.payoutForm.patchValue({ paymentReferenceId: `SP-${suffix.toUpperCase()}` });
  }
}
