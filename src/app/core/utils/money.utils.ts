export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function sumAmounts(amounts: readonly number[]): number {
  return roundMoney(amounts.reduce((total, amount) => total + amount, 0));
}

export function hasSufficientBalance(balance: number, amount: number): boolean {
  return roundMoney(balance) >= roundMoney(amount);
}

export function payoutProgress(balance: number, threshold: number): number {
  if (threshold <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((balance / threshold) * 100));
}
