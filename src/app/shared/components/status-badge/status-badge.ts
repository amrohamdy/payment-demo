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
        return 'Pending';
      case 'Processing':
        return 'Processing';
      case 'Completed':
        return 'Completed';
      case 'Failed':
        return 'Failed';
      case 'Active':
        return 'Active';
      case 'Inactive':
        return 'Inactive';
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
