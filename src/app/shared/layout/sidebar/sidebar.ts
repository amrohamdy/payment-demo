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
      title: 'الأساسية',
      items: [{ label: 'لوحة التحكم', route: '/dashboard', icon: 'pi pi-home' }],
    },
    {
      title: 'إدارة الأطراف',
      items: [
        { label: 'العملاء', route: '/customers', icon: 'pi pi-users' },
        { label: 'الموردون', route: '/suppliers', icon: 'pi pi-briefcase' },
      ],
    },
    {
      title: 'العمليات المالية',
      items: [{ label: 'المدفوعات', route: '/payments', icon: 'pi pi-wallet' }],
    },
  ];

  resetDemo(): void {
    this.confirm.confirm({
      header: 'إعادة ضبط الديمو',
      message: 'سيتم حذف العمليات المحلية وإعادة البيانات التجريبية. هل تريد المتابعة؟',
      icon: 'pi pi-refresh',
      acceptLabel: 'إعادة الضبط',
      rejectLabel: 'إلغاء',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.resetDemoData().subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تمت إعادة ضبط بيانات الديمو',
            });
            location.reload();
          },
          error: (err: Error) => {
            this.messages.add({
              severity: 'error',
              summary: 'تعذر إعادة الضبط',
              detail: err.message,
            });
          },
        });
      },
    });
  }
}
