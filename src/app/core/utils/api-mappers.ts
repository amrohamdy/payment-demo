/** Helpers to normalize loosely-shaped backend JSON into typed models. */

export type LooseRecord = Record<string, unknown>;

export function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as LooseRecord)
    : {};
}

export function readString(source: LooseRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

export function readNumber(source: LooseRecord, ...keys: string[]): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

export function readBool(source: LooseRecord, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return false;
}

export function readNullableString(source: LooseRecord, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (value === null) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
  }
  return null;
}

export function unwrapItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  const record = asRecord(payload);
  for (const key of ['items', 'data', 'results', 'value', 'content']) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

export function readTotalCount(payload: unknown, fallback: number): number {
  const record = asRecord(payload);
  for (const key of ['totalCount', 'total', 'count', 'totalItems']) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return fallback;
}

export function holderTypeLabel(value: unknown): string {
  if (value === 1 || value === '1' || value === 'Authority') return 'Authority';
  if (value === 2 || value === '2' || value === 'Customer') return 'Customer';
  if (value === 3 || value === '3' || value === 'Supplier') return 'Supplier';
  return String(value ?? '');
}

export function releaseStatusLabel(value: unknown): 'Pending' | 'Approved' | 'Rejected' {
  if (value === 1 || value === '1' || value === 'Approved') return 'Approved';
  if (value === 2 || value === '2' || value === 'Rejected') return 'Rejected';
  return 'Pending';
}
