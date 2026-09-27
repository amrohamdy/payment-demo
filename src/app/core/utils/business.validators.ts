import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function percentageRangeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }
    const value = Number(control.value);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? null : { percentageRange: true };
  };
}

/** Validates that schedule line percentages across a form array sum to ~100. */
export function schedulePercentSumOk(percentages: number[], tolerance = 0.01): boolean {
  const sum = percentages.reduce((acc, n) => acc + (Number(n) || 0), 0);
  return Math.abs(sum - 100) <= tolerance;
}

export function scheduleAmountSumOk(
  amounts: number[],
  contractTotal: number,
  tolerance = 0.01
): boolean {
  const sum = amounts.reduce((acc, n) => acc + (Number(n) || 0), 0);
  return Math.abs(sum - contractTotal) <= tolerance;
}

export function requestedAmountWithinLine(
  requested: number,
  lineAmount: number
): boolean {
  return Number.isFinite(requested) && requested > 0 && requested <= lineAmount;
}
