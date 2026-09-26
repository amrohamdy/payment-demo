import { describe, expect, it } from 'vitest';
import {
  hasSufficientBalance,
  payoutProgress,
  roundMoney,
  sumAmounts,
} from './money.utils';

describe('money.utils', () => {
  it('rounds money to 2 decimals', () => {
    expect(roundMoney(10.556)).toBe(10.56);
  });

  it('sums amounts safely', () => {
    expect(sumAmounts([100.1, 200.2, 0.05])).toBe(300.35);
  });

  it('checks sufficient balance', () => {
    expect(hasSufficientBalance(500, 500)).toBe(true);
    expect(hasSufficientBalance(499.99, 500)).toBe(false);
  });

  it('computes payout progress capped at 100', () => {
    expect(payoutProgress(500, 1000)).toBe(50);
    expect(payoutProgress(1500, 1000)).toBe(100);
    expect(payoutProgress(100, 0)).toBe(0);
  });
});
