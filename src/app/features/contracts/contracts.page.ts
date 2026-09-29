import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { Tag } from 'primeng/tag';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import { Contract, EscrowAccount, PaymentScheduleLine } from '../../core/models/dhamen.models';
import {
  percentageRangeValidator,
  scheduleAmountSumOk,
  schedulePercentSumOk,
} from '../../core/utils/business.validators';
import { holderTypeLabel } from '../../core/utils/api-mappers';
import { positiveAmountValidator } from '../../core/utils/validators';
import { roundMoney } from '../../core/utils/money.utils';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { SarPipe } from '../../shared/pipes/sar.pipe';

@Component({
  selector: 'app-contracts-page',
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
    Tag,
    SarPipe,
    DecimalPipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './contracts.page.html',
  styleUrl: './contracts.page.scss',
})
export class ContractsPage implements OnInit {
  private readonly api = inject(DHAMEN_API);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly contracts = signal<Contract[]>([]);
  readonly escrowAccounts = signal<EscrowAccount[]>([]);
  readonly scheduleLines = signal<PaymentScheduleLine[]>([]);
  /** Escrow accounts shown as "Supplier" options: Supplier + Authority only. */
  readonly supplierEscrowOptions = computed(() =>
    this.escrowAccounts()
      .filter((a) => {
        const type = holderTypeLabel(a.holderType);
        return type === 'Supplier' || type === 'Authority';
      })
      .map((a) => ({
        id: a.id,
        label: `${a.name} · ${a.viban || a.bban || a.id.slice(0, 8)}`,
      })),
  );
  /** Escrow accounts filtered by holderType, for the contract's customer / supplier pickers. */
  readonly customerAccounts = computed(() => this.accountsOfType('Customer'));
  readonly supplierAccounts = computed(() => this.accountsOfType('Supplier'));
  readonly formVisible = signal(false);
  readonly scheduleVisible = signal(false);
  readonly editMode = signal(false);
  readonly selected = signal<Contract | null>(null);

  readonly schedulePercentOk = computed(() =>
    schedulePercentSumOk(this.scheduleLines().map((l) => l.percentage)),
  );
  readonly scheduleAmountOk = computed(() => {
    const contract = this.selected();
    if (!contract) return true;
    return scheduleAmountSumOk(
      this.scheduleLines().map((l) => l.amount),
      contract.totalAmount,
    );
  });
  readonly schedulePercentSum = computed(() =>
    roundMoney(this.scheduleLines().reduce((acc, l) => acc + l.percentage, 0)),
  );
  readonly scheduleAmountSum = computed(() =>
    roundMoney(this.scheduleLines().reduce((acc, l) => acc + l.amount, 0)),
  );
  /** Max % this line may use without exceeding 100 across all lines. */
  readonly percentCap = computed(() => {
    const editingId = this.editingLineId();
    const usedOthers = this.scheduleLines()
      .filter((l) => l.id !== editingId)
      .reduce((acc, l) => acc + l.percentage, 0);
    return roundMoney(Math.max(0, 100 - usedOthers));
  });
  /** Max amount this line may use without exceeding contract total. */
  readonly amountCap = computed(() => {
    const contract = this.selected();
    if (!contract) return 0;
    const editingId = this.editingLineId();
    const usedOthers = this.scheduleLines()
      .filter((l) => l.id !== editingId)
      .reduce((acc, l) => acc + l.amount, 0);
    return roundMoney(Math.max(0, contract.totalAmount - usedOthers));
  });
  readonly amountRemaining = computed(() =>
    roundMoney(Math.max(0, (this.selected()?.totalAmount ?? 0) - this.scheduleAmountSum())),
  );
  readonly percentRemaining = computed(() =>
    roundMoney(Math.max(0, 100 - this.schedulePercentSum())),
  );

  readonly form = this.fb.nonNullable.group({
    id: [''],
    contractNumber: ['', [Validators.required, Validators.maxLength(50)]],
    totalAmount: this.fb.control<number | null>(null, [
      Validators.required,
      positiveAmountValidator(),
    ]),
    penaltyPercentage: this.fb.nonNullable.control(0, [
      Validators.required,
      percentageRangeValidator(),
    ]),
    sceFeePercentage: this.fb.nonNullable.control(0, [
      Validators.required,
      percentageRangeValidator(),
    ]),
    moatamedFeePercentage: this.fb.nonNullable.control(0, [
      Validators.required,
      percentageRangeValidator(),
    ]),
    vatPercentage: this.fb.nonNullable.control(15, [
      Validators.required,
      percentageRangeValidator(),
    ]),
    customerEscrowAccountId: this.fb.control<string | null>(null),
    supplierEscrowAccountId: this.fb.control<string | null>(null),
  });

  readonly lineForm = this.fb.nonNullable.group({
    id: [''],
    sequenceNo: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
    title: ['', [Validators.required, Validators.maxLength(200)]],
    percentage: this.fb.control<number | null>(null, [
      Validators.required,
      percentageRangeValidator(),
    ]),
    amount: this.fb.control<number | null>(null, [Validators.required, positiveAmountValidator()]),
    dueDate: ['', Validators.required],
    // escrowAccountId: this.fb.control<string | null>(null, Validators.required),
  });

  readonly lineEditMode = signal(false);
  readonly editingLineId = signal<string | null>(null);

  constructor() {
    this.linkPercentageAndAmount();
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    // Loaded separately so the Customer/Supplier account lists still fill if contracts fail.
    this.api.listEscrowAccounts({ page: 1, pageSize: 100 }).subscribe({
      next: (escrow) => this.escrowAccounts.set(escrow.items),
      error: (err: Error) =>
        this.messages.add({ severity: 'error', summary: 'Escrow accounts', detail: err.message }),
    });
    this.api.listContracts({ page: 1, pageSize: 100 }).subscribe({
      next: (contracts) => {
        this.contracts.set(contracts.items);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Contracts', detail: err.message });
      },
    });
  }

  private accountsOfType(type: 'Customer' | 'Supplier') {
    return this.escrowAccounts()
      .filter((a) => holderTypeLabel(a.holderType) === type)
      .map((a) => ({ id: a.id, name: a.name, hint: a.viban || a.bban || '' }));
  }

  escrowName(id: string | null): string {
    if (!id) return '—';
    return this.escrowAccounts().find((a) => a.id === id)?.name ?? id.slice(0, 8);
  }

  openCreate(): void {
    this.editMode.set(false);
    this.form.reset({
      id: '',
      contractNumber: '',
      totalAmount: null,
      penaltyPercentage: 0,
      sceFeePercentage: 0,
      moatamedFeePercentage: 0,
      vatPercentage: 15,
      customerEscrowAccountId: null,
      supplierEscrowAccountId: null,
    });
    this.formVisible.set(true);
  }

  openEdit(contract: Contract): void {
    this.editMode.set(true);
    this.selected.set(contract);
    this.form.reset({
      id: contract.id,
      contractNumber: contract.contractNumber,
      totalAmount: contract.totalAmount,
      penaltyPercentage: contract.penaltyPercentage,
      sceFeePercentage: contract.sceFeePercentage,
      moatamedFeePercentage: contract.moatamedFeePercentage,
      vatPercentage: contract.vatPercentage,
      customerEscrowAccountId: contract.customerEscrowAccountId,
      supplierEscrowAccountId: contract.supplierEscrowAccountId,
    });
    this.formVisible.set(true);
  }

  saveContract(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    const payload = {
      contractNumber: value.contractNumber,
      totalAmount: Number(value.totalAmount),
      penaltyPercentage: Number(value.penaltyPercentage),
      sceFeePercentage: Number(value.sceFeePercentage),
      moatamedFeePercentage: Number(value.moatamedFeePercentage),
      vatPercentage: Number(value.vatPercentage),
      // escrowAccountId: value.customerEscrowAccountId,
      customerEscrowAccountId: value.customerEscrowAccountId,
      supplierEscrowAccountId: value.supplierEscrowAccountId,
    };
    const request$ = this.editMode()
      ? this.api.updateContract({ ...payload, id: value.id })
      : this.api.createContract(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formVisible.set(false);
        this.messages.add({ severity: 'success', summary: 'Saved', detail: 'Contract saved.' });
        this.reload();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Save failed', detail: err.message });
      },
    });
  }

  openSchedule(contract: Contract): void {
    this.selected.set(contract);
    this.scheduleVisible.set(true);
    this.reloadSchedule(contract.id);
    this.openLineCreate();
  }

  reloadSchedule(contractId: string): void {
    this.api.listPaymentScheduleLines({ contractId, page: 1, pageSize: 100 }).subscribe({
      next: (page) => this.scheduleLines.set(page.items),
      error: (err: Error) =>
        this.messages.add({ severity: 'error', summary: 'Error', detail: err.message }),
    });
  }

  openLineCreate(): void {
    const nextSeq = this.scheduleLines().reduce((max, l) => Math.max(max, l.sequenceNo), 0) + 1;
    // const defaultEscrow =
    //   this.selected()?.escrowAccountId &&
    //   this.supplierEscrowOptions().some((o) => o.id === this.selected()?.escrowAccountId)
    //     ? this.selected()!.escrowAccountId
    //     : (this.supplierEscrowOptions()[0]?.id ?? null);
    this.lineEditMode.set(false);
    this.editingLineId.set(null);
    this.lineForm.reset({
      id: '',
      sequenceNo: nextSeq,
      title: '',
      percentage: null,
      amount: null,
      dueDate: new Date().toISOString().slice(0, 10),
      // escrowAccountId: defaultEscrow,
    });
  }

  openLineEdit(line: PaymentScheduleLine): void {
    this.lineEditMode.set(true);
    this.editingLineId.set(line.id);
    this.lineForm.reset({
      id: line.id,
      sequenceNo: line.sequenceNo,
      title: line.title,
      percentage: line.percentage,
      amount: line.amount,
      dueDate: line.dueDate,
      // escrowAccountId: line.escrowAccountId,
    });
  }

  saveLine(): void {
    const contract = this.selected();
    if (!contract || this.lineForm.invalid) {
      this.lineForm.markAllAsTouched();
      return;
    }
    const value = this.lineForm.getRawValue();
    const percentage = Number(value.percentage);
    const amount = Number(value.amount);
    const editingId = this.editingLineId();
    const otherLines = this.scheduleLines().filter((l) => l.id !== editingId);
    const percentSum = roundMoney(
      otherLines.reduce((acc, l) => acc + l.percentage, 0) + percentage,
    );
    const amountSum = roundMoney(otherLines.reduce((acc, l) => acc + l.amount, 0) + amount);

    if (percentSum > 100.01) {
      this.messages.add({
        severity: 'warn',
        summary: 'Percentage exceeded',
        detail: `Schedule percentages would be ${percentSum}% (max 100%). Remaining: ${this.percentCap()}%.`,
      });
      return;
    }
    if (amountSum > contract.totalAmount + 0.01) {
      this.messages.add({
        severity: 'warn',
        summary: 'Amount exceeded',
        detail: `Schedule amounts would be ${amountSum} (contract total ${contract.totalAmount}). Remaining: ${this.amountCap()}.`,
      });
      return;
    }

    this.saving.set(true);
    const request$ = this.lineEditMode()
      ? this.api.updatePaymentScheduleLine({
          id: value.id,
          sequenceNo: Number(value.sequenceNo),
          title: value.title,
          percentage,
          amount,
          dueDate: value.dueDate,
          // escrowAccountId: value.escrowAccountId,
        })
      : this.api.createPaymentScheduleLine({
          contractId: contract.id,
          sequenceNo: Number(value.sequenceNo),
          title: value.title,
          percentage,
          amount,
          dueDate: value.dueDate,
          // escrowAccountId: value.escrowAccountId,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.lineEditMode.set(false);
        this.editingLineId.set(null);
        this.messages.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Schedule line saved.',
        });
        this.reloadSchedule(contract.id);
        this.openLineCreate();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Save failed', detail: err.message });
      },
    });
  }

  removeLine(line: PaymentScheduleLine): void {
    const contract = this.selected();
    if (!contract) return;
    this.api.deletePaymentScheduleLine(line.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Deleted', detail: 'Line removed.' });
        this.reloadSchedule(contract.id);
      },
      error: (err: Error) =>
        this.messages.add({ severity: 'error', summary: 'Delete failed', detail: err.message }),
    });
  }

  removeContract(contract: Contract): void {
    this.confirm.confirm({
      header: 'Delete contract',
      message: `Delete ${contract.contractNumber}? Related schedule lines may remain on the backend.`,
      acceptLabel: 'Delete',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.deleteContract(contract.id).subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Contract removed.',
            });
            this.reload();
          },
          error: (err: Error) =>
            this.messages.add({ severity: 'error', summary: 'Delete failed', detail: err.message }),
        });
      },
    });
  }

  /**
   * Keeps a schedule line's percentage and amount in sync with the contract total.
   * Only reacts to user edits (dirty controls), so form resets don't overwrite each other.
   */
  private linkPercentageAndAmount(): void {
    const { percentage, amount } = this.lineForm.controls;

    percentage.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const total = this.selected()?.totalAmount ?? 0;
      if (!percentage.dirty || !total) return;
      const next = value == null ? null : roundMoney((total * Number(value)) / 100);
      amount.setValue(next, { emitEvent: false });
      amount.markAsDirty();
    });

    amount.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const total = this.selected()?.totalAmount ?? 0;
      if (!amount.dirty || !total) return;
      const next = value == null ? null : roundMoney((Number(value) / total) * 100);
      percentage.setValue(next, { emitEvent: false });
      percentage.markAsDirty();
    });
  }
}
