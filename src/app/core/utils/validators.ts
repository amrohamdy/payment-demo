import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const SAUDI_IBAN_PATTERN = /^SA[0-9]{22}$/i;
/** Local `05xxxxxxxx` or international `9665xxxxxxxx` / `+9665xxxxxxxx`. */
const MOBILE_PATTERN = /^(?:\+?966|0)5[0-9]{8}$/;
const IDENTITY_PATTERN = /^[12][0-9]{9}$/;

export function saudiIbanValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return SAUDI_IBAN_PATTERN.test(value) ? null : { saudiIban: true };
  };
}

export function saudiMobileValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return MOBILE_PATTERN.test(value) ? null : { saudiMobile: true };
  };
}

export function identityNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return IDENTITY_PATTERN.test(value) ? null : { identityNumber: true };
  };
}

export function positiveAmountValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }
    return Number.isFinite(value) && value > 0 ? null : { positiveAmount: true };
  };
}
