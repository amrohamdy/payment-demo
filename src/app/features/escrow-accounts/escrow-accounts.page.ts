import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import { EscrowAccount } from '../../core/models/dhamen.models';
import { holderTypeLabel } from '../../core/utils/api-mappers';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-escrow-accounts-page',
  imports: [
    PageHeader,
    Button,
    TableModule,
    Dialog,
    ReactiveFormsModule,
    InputText,
    Select,
    ProgressSpinner,
    EmptyState,
    ConfirmDialog,
  ],
  providers: [ConfirmationService],
  templateUrl: './escrow-accounts.page.html',
  styleUrl: './escrow-accounts.page.scss',
})
export class EscrowAccountsPage implements OnInit {
  private readonly api = inject(DHAMEN_API);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly accounts = signal<EscrowAccount[]>([]);
  readonly formVisible = signal(false);
  readonly editMode = signal(false);
  readonly selected = signal<EscrowAccount | null>(null);

  readonly holderOptions = [
    { label: 'Authority', value: 'Authority' },
    { label: 'Customer', value: 'Customer' },
    { label: 'Supplier', value: 'Supplier' },
  ];

  readonly form = this.fb.nonNullable.group({
    id: [''],
    holderType: this.fb.nonNullable.control<'Authority' | 'Customer' | 'Supplier'>(
      'Authority',
      Validators.required
    ),
    name: ['', [Validators.required, Validators.maxLength(200)]],
    viban: ['', [Validators.required, Validators.maxLength(34)]],
    bban: ['', [Validators.required, Validators.maxLength(34)]],
  });

  ngOnInit(): void {
    this.reload();
  }

  holderLabel(value: unknown): string {
    return holderTypeLabel(value);
  }

  reload(): void {
    this.loading.set(true);
    this.api.listEscrowAccounts({ page: 1, pageSize: 100 }).subscribe({
      next: (page) => {
        this.accounts.set(page.items);
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
      holderType: 'Authority',
      name: '',
      viban: '',
      bban: '',
    });
    this.formVisible.set(true);
  }

  openEdit(account: EscrowAccount): void {
    this.editMode.set(true);
    this.selected.set(account);
    this.form.reset({
      id: account.id,
      holderType: holderTypeLabel(account.holderType) as 'Authority' | 'Customer' | 'Supplier',
      name: account.name,
      viban: account.viban,
      bban: account.bban,
    });
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
      ? this.api.updateEscrowAccount({
          id: value.id,
          holderType: value.holderType,
          name: value.name,
          viban: value.viban,
          bban: value.bban,
        })
      : this.api.createEscrowAccount({
          holderType: value.holderType,
          name: value.name,
          viban: value.viban,
          bban: value.bban,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formVisible.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Escrow account saved.',
        });
        this.reload();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Save failed', detail: err.message });
      },
    });
  }

  remove(account: EscrowAccount): void {
    this.confirm.confirm({
      header: 'Delete escrow account',
      message: `Delete "${account.name}"?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.deleteEscrowAccount(account.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Deleted', detail: 'Account removed.' });
            this.reload();
          },
          error: (err: Error) =>
            this.messages.add({ severity: 'error', summary: 'Delete failed', detail: err.message }),
        });
      },
    });
  }
}
