export function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createPaymentReferenceId(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `REF-${year}-${suffix}`;
}

/** e.g. SP-20260927-ZVHE1 */
export function createSplitReferenceId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `SP-${date}-${suffix}`;
}
