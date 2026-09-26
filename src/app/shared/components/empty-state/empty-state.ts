import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">{{ icon() }}</div>
      <h3>{{ title() }}</h3>
      @if (message()) {
        <p>{{ message() }}</p>
      }
      <div class="empty-state__actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .empty-state {
      text-align: center;
      padding: 2.5rem 1.5rem;
      background: #fff;
      border-radius: 12px;
      border: 1px dashed #d7dde5;
    }
    .empty-state__icon {
      font-size: 2rem;
      margin-bottom: 0.75rem;
    }
    h3 {
      margin: 0 0 0.35rem;
      font-size: 1.1rem;
    }
    p {
      margin: 0;
      color: var(--dh-muted);
    }
    .empty-state__actions {
      margin-top: 1rem;
      display: flex;
      justify-content: center;
      gap: 0.75rem;
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly icon = input<string>('📭');
}
