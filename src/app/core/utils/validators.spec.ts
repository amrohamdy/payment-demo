import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  identityNumberValidator,
  positiveAmountValidator,
  saudiIbanValidator,
  saudiMobileValidator,
} from './validators';

describe('validators', () => {
  it('validates saudi IBAN', () => {
    const control = new FormControl('SA0380000000608010167519');
    expect(saudiIbanValidator()(control)).toBeNull();
    control.setValue('SA123');
    expect(saudiIbanValidator()(control)).toEqual({ saudiIban: true });
  });

  it('validates mobile', () => {
    const control = new FormControl('0512345678');
    expect(saudiMobileValidator()(control)).toBeNull();
    control.setValue('+966512345678');
    expect(saudiMobileValidator()(control)).toBeNull();
    control.setValue('966512345678');
    expect(saudiMobileValidator()(control)).toBeNull();
    control.setValue('0412345678');
    expect(saudiMobileValidator()(control)).toEqual({ saudiMobile: true });
  });

  it('validates identity number', () => {
    const control = new FormControl('1234567890');
    expect(identityNumberValidator()(control)).toBeNull();
    control.setValue('3234567890');
    expect(identityNumberValidator()(control)).toEqual({ identityNumber: true });
  });

  it('validates positive amount', () => {
    const control = new FormControl(10);
    expect(positiveAmountValidator()(control)).toBeNull();
    control.setValue(0);
    expect(positiveAmountValidator()(control)).toEqual({ positiveAmount: true });
  });
});
