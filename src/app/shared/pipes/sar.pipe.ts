import { CurrencyPipe } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { formatMoney } from '../../core/utils/money.utils';

@Pipe({ name: 'sar' })
export class SarPipe implements PipeTransform {
  private readonly currencyPipe = inject(CurrencyPipe, { optional: true });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return formatMoney(value, environment.currency);
  }
}
