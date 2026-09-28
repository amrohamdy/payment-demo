import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { forkJoin } from 'rxjs';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import {
  Contract,
  EscrowAccount,
  PaymentScheduleLine,
} from '../../core/models/dhamen.models';
import {
  percentageRangeValidator,
  scheduleAmountSumOk,
  schedulePercentSumOk,
} from '../../core/utils/business.validators';
import { positiveAmountValidator } from '../../core/utils/validators';
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
  readonly formVisible = signal(false);
  readonly scheduleVisible = signal(false);
  readonly editMode = signal(false);
  readonly selected = signal<Contract | null>(null);

  readonly schedulePercentOk = computed(() =>
    schedulePercentSumOk(this.scheduleLines().map((l) => l.percentage))
  );
  readonly scheduleAmountOk = computed(() => {
    const contract = this.selected();
    if (!contract) return true;
    return scheduleAmountSumOk(
      this.scheduleLines().map((l) => l.amount),
      contract.totalAmount
    );
  });
  readonly schedulePercentSum = computed(() =>
    this.scheduleLines().reduce((acc, l) => acc + l.percentage, 0)
  );
  readonly scheduleAmountSum = computed(() =>
    this.scheduleLines().reduce((acc, l) => acc + l.amount, 0)
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
    escrowAccountId: this.fb.control<string | null>(null),
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
    escrowAccountId: this.fb.control<string | null>(null),
  });

  readonly lineEditMode = signal(false);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    forkJoin({
      contracts: this.api.listContracts({ page: 1, pageSize: 100 }),
      escrow: this.api.listEscrowAccounts({ page: 1, pageSize: 100 }),
    }).subscribe({
      next: ({ contracts, escrow }) => {
        this.contracts.set(contracts.items);
        this.escrowAccounts.set(escrow.items);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
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
      escrowAccountId: this.escrowAccounts()[0]?.id ?? null,
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
      escrowAccountId: contract.escrowAccountId,
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
      escrowAccountId: value.escrowAccountId,
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
    const nextSeq =
      this.scheduleLines().reduce((max, l) => Math.max(max, l.sequenceNo), 0) + 1;
    this.lineEditMode.set(false);
    this.lineForm.reset({
      id: '',
      sequenceNo: nextSeq,
      title: '',
      percentage: null,
      amount: null,
      dueDate: new Date().toISOString().slice(0, 10),
      escrowAccountId: this.selected()?.escrowAccountId ?? null,
    });
  }

  openLineEdit(line: PaymentScheduleLine): void {
    this.lineEditMode.set(true);
    this.lineForm.reset({
      id: line.id,
      sequenceNo: line.sequenceNo,
      title: line.title,
      percentage: line.percentage,
      amount: line.amount,
      dueDate: line.dueDate,
      escrowAccountId: line.escrowAccountId,
    });
  }

  saveLine(): void {
    const contract = this.selected();
    if (!contract || this.lineForm.invalid) {
      this.lineForm.markAllAsTouched();
      return;
    }
    const value = this.lineForm.getRawValue();
    this.saving.set(true);
    const request$ = this.lineEditMode()
      ? this.api.updatePaymentScheduleLine({
          id: value.id,
          sequenceNo: Number(value.sequenceNo),
          title: value.title,
          percentage: Number(value.percentage),
          amount: Number(value.amount),
          dueDate: value.dueDate,
          escrowAccountId: value.escrowAccountId,
        })
      : this.api.createPaymentScheduleLine({
          contractId: contract.id,
          sequenceNo: Number(value.sequenceNo),
          title: value.title,
          percentage: Number(value.percentage),
          amount: Number(value.amount),
          dueDate: value.dueDate,
          escrowAccountId: value.escrowAccountId,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.lineEditMode.set(false);
        this.messages.add({ severity: 'success', summary: 'Saved', detail: 'Schedule line saved.' });
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
            this.messages.add({ severity: 'success', summary: 'Deleted', detail: 'Contract removed.' });
            this.reload();
          },
          error: (err: Error) =>
            this.messages.add({ severity: 'error', summary: 'Delete failed', detail: err.message }),
        });
      },
    });
  }
}
