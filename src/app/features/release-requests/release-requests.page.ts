import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
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
  PaymentScheduleLine,
  ReleaseRequest,
  ReleaseRequestPenalty,
} from '../../core/models/dhamen.models';
import { releaseStatusLabel } from '../../core/utils/api-mappers';
import {
  percentageRangeValidator,
  requestedAmountWithinLine,
} from '../../core/utils/business.validators';
import { positiveAmountValidator } from '../../core/utils/validators';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { SarPipe } from '../../shared/pipes/sar.pipe';

@Component({
  selector: 'app-release-requests-page',
  imports: [
    PageHeader,
    Button,
    TableModule,
    Dialog,
    ReactiveFormsModule,
    InputText,
    InputNumber,
    Select,
    Checkbox,
    ProgressSpinner,
    EmptyState,
    ConfirmDialog,
    Tag,
    SarPipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './release-requests.page.html',
  styleUrl: './release-requests.page.scss',
})
export class ReleaseRequestsPage implements OnInit {
  private readonly api = inject(DHAMEN_API);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly requests = signal<ReleaseRequest[]>([]);
  readonly scheduleLines = signal<PaymentScheduleLine[]>([]);
  readonly penalties = signal<ReleaseRequestPenalty[]>([]);
  readonly formVisible = signal(false);
  readonly penaltyVisible = signal(false);
  readonly editMode = signal(false);
  readonly selected = signal<ReleaseRequest | null>(null);

  readonly statusOptions = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
  ];

  readonly usedScheduleLineIds = computed(
    () => new Set(this.requests().map((r) => r.scheduleLineId))
  );

  readonly availableLines = computed(() => {
    const used = this.usedScheduleLineIds();
    const editing = this.selected();
    return this.scheduleLines().filter(
      (l) => !used.has(l.id) || l.id === editing?.scheduleLineId
    );
  });

  readonly form = this.fb.nonNullable.group({
    id: [''],
    scheduleLineId: this.fb.control<string | null>(null, Validators.required),
    requestDate: [new Date().toISOString().slice(0, 10), Validators.required],
    requestedAmount: this.fb.control<number | null>(null, [
      Validators.required,
      positiveAmountValidator(),
    ]),
    hasPenalty: this.fb.nonNullable.control(false),
    status: this.fb.nonNullable.control<'Pending' | 'Approved' | 'Rejected'>(
      'Pending',
      Validators.required
    ),
  });

  readonly penaltyForm = this.fb.nonNullable.group({
    id: [''],
    penaltyAmount: this.fb.control<number | null>(null, [
      Validators.required,
      positiveAmountValidator(),
    ]),
    penaltyPercentage: this.fb.control<number | null>(null, [
      Validators.required,
      percentageRangeValidator(),
    ]),
    daysLate: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    reason: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  statusLabel(value: unknown): string {
    return releaseStatusLabel(value);
  }

  statusSeverity(value: unknown): 'warn' | 'success' | 'danger' | 'info' {
    const status = releaseStatusLabel(value);
    if (status === 'Approved') return 'success';
    if (status === 'Rejected') return 'danger';
    return 'warn';
  }

  lineTitle(id: string): string {
    const line = this.scheduleLines().find((l) => l.id === id);
    return line ? `#${line.sequenceNo} ${line.title}` : id.slice(0, 8);
  }

  lineAmount(id: string): number {
    return this.scheduleLines().find((l) => l.id === id)?.amount ?? 0;
  }

  reload(): void {
    this.loading.set(true);
    forkJoin({
      requests: this.api.listReleaseRequests({ page: 1, pageSize: 100 }),
      lines: this.api.listPaymentScheduleLines({ page: 1, pageSize: 100 }),
      penalties: this.api.listReleaseRequestPenalties({ page: 1, pageSize: 100 }),
    }).subscribe({
      next: ({ requests, lines, penalties }) => {
        this.requests.set(requests.items);
        this.scheduleLines.set(lines.items);
        this.penalties.set(penalties.items);
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
    this.selected.set(null);
    this.form.reset({
      id: '',
      scheduleLineId: this.availableLines()[0]?.id ?? null,
      requestDate: new Date().toISOString().slice(0, 10),
      requestedAmount: null,
      hasPenalty: false,
      status: 'Pending',
    });
    this.formVisible.set(true);
  }

  openEdit(request: ReleaseRequest): void {
    this.editMode.set(true);
    this.selected.set(request);
    this.form.reset({
      id: request.id,
      scheduleLineId: request.scheduleLineId,
      requestDate: request.requestDate,
      requestedAmount: request.requestedAmount,
      hasPenalty: request.hasPenalty,
      status: releaseStatusLabel(request.status),
    });
    this.form.controls.scheduleLineId.disable();
    this.formVisible.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const lineAmount = this.lineAmount(String(value.scheduleLineId));
    if (!requestedAmountWithinLine(Number(value.requestedAmount), lineAmount)) {
      this.messages.add({
        severity: 'warn',
        summary: 'Validation',
        detail: `Requested amount must be > 0 and ≤ schedule line amount (${lineAmount}).`,
      });
      return;
    }

    this.saving.set(true);
    const request$ = this.editMode()
      ? this.api.updateReleaseRequest({
          id: value.id,
          requestDate: value.requestDate,
          requestedAmount: Number(value.requestedAmount),
          hasPenalty: value.hasPenalty,
          status: value.status,
        })
      : this.api.createReleaseRequest({
          scheduleLineId: String(value.scheduleLineId),
          requestDate: value.requestDate,
          requestedAmount: Number(value.requestedAmount),
          hasPenalty: value.hasPenalty,
          status: value.status,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formVisible.set(false);
        this.form.controls.scheduleLineId.enable();
        this.messages.add({ severity: 'success', summary: 'Saved', detail: 'Release request saved.' });
        this.reload();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Save failed', detail: err.message });
      },
    });
  }

  openPenalty(request: ReleaseRequest): void {
    if (!request.hasPenalty) {
      this.messages.add({
        severity: 'warn',
        summary: 'Penalty not allowed',
        detail: 'Enable hasPenalty on the release request first.',
      });
      return;
    }
    this.selected.set(request);
    const existing = this.penalties().find((p) => p.releaseRequestId === request.id);
    this.penaltyForm.reset({
      id: existing?.id ?? '',
      penaltyAmount: existing?.penaltyAmount ?? null,
      penaltyPercentage: existing?.penaltyPercentage ?? null,
      daysLate: existing?.daysLate ?? null,
      reason: existing?.reason ?? '',
    });
    this.penaltyVisible.set(true);
  }

  savePenalty(): void {
    const request = this.selected();
    if (!request || this.penaltyForm.invalid) {
      this.penaltyForm.markAllAsTouched();
      return;
    }
    const value = this.penaltyForm.getRawValue();
    this.saving.set(true);
    const request$ = value.id
      ? this.api.updateReleaseRequestPenalty({
          id: value.id,
          penaltyAmount: Number(value.penaltyAmount),
          penaltyPercentage: Number(value.penaltyPercentage),
          daysLate: Number(value.daysLate),
          reason: value.reason.trim() || null,
        })
      : this.api.createReleaseRequestPenalty({
          releaseRequestId: request.id,
          penaltyAmount: Number(value.penaltyAmount),
          penaltyPercentage: Number(value.penaltyPercentage),
          daysLate: Number(value.daysLate),
          reason: value.reason.trim() || null,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.penaltyVisible.set(false);
        this.messages.add({ severity: 'success', summary: 'Saved', detail: 'Penalty saved.' });
        this.reload();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Save failed', detail: err.message });
      },
    });
  }

  remove(request: ReleaseRequest): void {
    this.confirm.confirm({
      header: 'Delete release request',
      message: 'Delete this release request and its penalties?',
      acceptLabel: 'Delete',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.deleteReleaseRequest(request.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Deleted', detail: 'Removed.' });
            this.reload();
          },
          error: (err: Error) =>
            this.messages.add({ severity: 'error', summary: 'Delete failed', detail: err.message }),
        });
      },
    });
  }

  penaltyFor(requestId: string): ReleaseRequestPenalty | undefined {
    return this.penalties().find((p) => p.releaseRequestId === requestId);
  }
}
