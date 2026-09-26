import { Customer, PaymentRecord, PaymentStatus, Supplier } from '../models/dhamen.models';
import { createUuid } from '../utils/id.utils';

const STORAGE_KEY = 'dhamen-demo-store-v1';

export interface DemoStoreState {
  customers: Customer[];
  suppliers: Supplier[];
  payments: PaymentRecord[];
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createSeedState(): DemoStoreState {
  const customerId = '11111111-1111-1111-1111-111111111111';
  const supplierId = '22222222-2222-2222-2222-222222222222';
  const stamp = nowIso();

  return {
    customers: [
      {
        id: customerId,
        identityNumber: '1234567890',
        name: 'أحمد علي',
        iban: 'SA0380000000608010167519',
        email: 'ahmad.ali@example.com',
        mobile: '0512345678',
        balance: 1500,
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: createUuid(),
        identityNumber: '1098765432',
        name: 'سارة محمد',
        iban: 'SA4420000001234567891234',
        email: 'sara.mohammed@example.com',
        mobile: '0598765432',
        balance: 320.5,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    suppliers: [
      {
        id: supplierId,
        name: 'شركة السلام للتجارة',
        iban: 'SA0380000000608010167519',
        identityNumber: '7001234567',
        payoutThresholdAmount: 1000,
        email: 'info@alsalam-trading.example.com',
        mobile: '0512345678',
        balance: 250,
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: createUuid(),
        name: 'مؤسسة نجد للتوريدات',
        iban: 'SA0310000001234567890123',
        identityNumber: '7009876543',
        payoutThresholdAmount: 2000,
        email: 'finance@najd-supplies.example.com',
        mobile: '0555555555',
        balance: 1800,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    payments: [],
  };
}

export function loadStoreState(): DemoStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedState();
      saveStoreState(seed);
      return seed;
    }
    return JSON.parse(raw) as DemoStoreState;
  } catch {
    const seed = createSeedState();
    saveStoreState(seed);
    return seed;
  }
}

export function saveStoreState(state: DemoStoreState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetStoreState(): DemoStoreState {
  const seed = createSeedState();
  saveStoreState(seed);
  return seed;
}

export function advancePaymentStatus(status: PaymentStatus): PaymentStatus {
  switch (status) {
    case 'Pending':
      return 'Processing';
    case 'Processing':
      return 'Completed';
    default:
      return status;
  }
}
