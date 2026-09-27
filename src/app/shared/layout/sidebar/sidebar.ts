import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DHAMEN_API } from '../../../core/api/dhamen-api';
import { environment } from '../../../../environments/environment';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Button, ConfirmDialog],
  providers: [ConfirmationService],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly api = inject(DHAMEN_API);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly apiMode = environment.apiMode;
  readonly sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [{ label: 'Dashboard', route: '/dashboard', icon: 'pi pi-th-large' }],
    },
    {
      title: 'PARTIES',
      items: [
        { label: 'Customers', route: '/customers', icon: 'pi pi-users' },
        { label: 'Suppliers', route: '/suppliers', icon: 'pi pi-building' },
      ],
    },
    {
      title: 'PAY-IN & PAY-OUT',
      items: [{ label: 'Payments', route: '/payments', icon: 'pi pi-credit-card' }],
    },
    {
      title: 'ESCROW & PAY-OUT',
      items: [{ label: 'Payouts & Splits', route: '/payouts-splits', icon: 'pi pi-share-alt' }],
    },
  ];

  resetDemo(): void {
    this.confirm.confirm({
      header: 'Reset sandbox data',
      message: 'This will remove local transactions and restore the sample data. Continue?',
      icon: 'pi pi-refresh',
      acceptLabel: 'Reset data',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.resetDemoData().subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Sandbox reset',
              detail: 'The sample data has been restored.',
            });
            location.reload();
          },
          error: (err: Error) => {
            this.messages.add({
              severity: 'error',
              summary: 'Reset failed',
              detail: err.message,
            });
          },
        });
      },
    });
  }
}
