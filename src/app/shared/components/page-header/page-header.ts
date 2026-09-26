import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div>
        @if (eyebrow()) {
          <p class="page-header__eyebrow">{{ eyebrow() }}</p>
        }
        <h1 class="page-header__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-header__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .page-header__eyebrow {
      margin: 0 0 0.25rem;
      color: var(--dh-muted);
      font-size: 0.875rem;
    }
    .page-header__title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--dh-text);
    }
    .page-header__subtitle {
      margin: 0.35rem 0 0;
      color: var(--dh-muted);
      font-size: 0.95rem;
    }
    .page-header__actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly eyebrow = input<string>('');
}
