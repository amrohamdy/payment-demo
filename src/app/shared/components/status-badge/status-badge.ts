import { Component, input } from '@angular/core';
import { Tag } from 'primeng/tag';
import { PaymentStatus } from '../../../core/models/dhamen.models';

@Component({
  selector: 'app-status-badge',
  imports: [Tag],
  template: `
    <p-tag [value]="label()" [severity]="severity()" [rounded]="true" />
  `,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
})
export class StatusBadge {
  readonly status = input.required<PaymentStatus | 'Active' | 'Inactive'>();

  label(): string {
    switch (this.status()) {
      case 'Pending':
        return 'قيد الانتظار';
      case 'Processing':
        return 'قيد المعالجة';
      case 'Completed':
        return 'مكتمل';
      case 'Failed':
        return 'فشل';
      case 'Active':
        return 'مفعل';
      case 'Inactive':
        return 'غير مفعل';
    }
  }

  severity(): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (this.status()) {
      case 'Completed':
      case 'Active':
        return 'success';
      case 'Processing':
        return 'info';
      case 'Pending':
        return 'warn';
      case 'Failed':
      case 'Inactive':
        return 'danger';
    }
  }
}
