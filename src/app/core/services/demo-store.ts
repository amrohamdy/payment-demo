import {
  Contract,
  Customer,
  DemoActivityEntry,
  EscrowAccount,
  PaymentLink,
  PaymentRecord,
  PaymentScheduleLine,
  PaymentStatus,
  ReleaseRequest,
  ReleaseRequestPenalty,
  Supplier,
} from '../models/dhamen.models';
import { createUuid } from '../utils/id.utils';

const STORAGE_KEY = 'dhamen-demo-store-v2';

export interface DemoStoreState {
  customers: Customer[];
  suppliers: Supplier[];
  payments: PaymentRecord[];
  escrowAccounts: EscrowAccount[];
  contracts: Contract[];
  scheduleLines: PaymentScheduleLine[];
  releaseRequests: ReleaseRequest[];
  penalties: ReleaseRequestPenalty[];
  paymentLinks: PaymentLink[];
  activity: DemoActivityEntry[];
  paymentStatuses: Record<string, PaymentStatus | string>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createSeedState(): DemoStoreState {
  const customerId = '11111111-1111-1111-1111-111111111111';
  const supplierId = '22222222-2222-2222-2222-222222222222';
  const escrowId = '33333333-3333-3333-3333-333333333333';
  const contractId = '44444444-4444-4444-4444-444444444444';
  const line1 = '55555555-5555-5555-5555-555555555551';
  const line2 = '55555555-5555-5555-5555-555555555552';
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
    escrowAccounts: [
      {
        id: escrowId,
        holderType: 'Authority',
        name: 'Authority Escrow VA',
        viban: 'SA0000000000000000000001',
        bban: '00000000000000000001',
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    contracts: [
      {
        id: contractId,
        contractNumber: 'CNT-DEMO-001',
        totalAmount: 10000,
        penaltyPercentage: 2,
        sceFeePercentage: 1,
        moatamedFeePercentage: 0.5,
        vatPercentage: 15,
        escrowAccountId: escrowId,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    scheduleLines: [
      {
        id: line1,
        contractId,
        sequenceNo: 1,
        title: 'Advance 40%',
        percentage: 40,
        amount: 4000,
        dueDate: today(),
        escrowAccountId: escrowId,
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: line2,
        contractId,
        sequenceNo: 2,
        title: 'Completion 60%',
        percentage: 60,
        amount: 6000,
        dueDate: today(),
        escrowAccountId: escrowId,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    releaseRequests: [],
    penalties: [],
    paymentLinks: [],
    activity: [
      {
        id: createUuid(),
        at: stamp,
        kind: 'seed',
        reference: 'CNT-DEMO-001',
        summary: 'Demo sandbox seeded with sample contract and escrow account',
      },
    ],
    paymentStatuses: {},
  };
}

function migrate(raw: unknown): DemoStoreState {
  const seed = createSeedState();
  if (!raw || typeof raw !== 'object') {
    return seed;
  }
  const state = raw as Partial<DemoStoreState>;
  return {
    customers: state.customers ?? seed.customers,
    suppliers: state.suppliers ?? seed.suppliers,
    payments: state.payments ?? [],
    escrowAccounts: state.escrowAccounts ?? seed.escrowAccounts,
    contracts: state.contracts ?? seed.contracts,
    scheduleLines: state.scheduleLines ?? seed.scheduleLines,
    releaseRequests: state.releaseRequests ?? [],
    penalties: state.penalties ?? [],
    paymentLinks: state.paymentLinks ?? [],
    activity: state.activity ?? seed.activity,
    paymentStatuses: state.paymentStatuses ?? {},
  };
}

export function loadStoreState(): DemoStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrate from v1 if present
      const legacy = localStorage.getItem('dhamen-demo-store-v1');
      if (legacy) {
        const migrated = migrate(JSON.parse(legacy));
        saveStoreState(migrated);
        return migrated;
      }
      const seed = createSeedState();
      saveStoreState(seed);
      return seed;
    }
    return migrate(JSON.parse(raw));
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

export function advancePaymentStatus(status: PaymentStatus | string): PaymentStatus {
  switch (status) {
    case 'Pending':
      return 'Processing';
    case 'Processing':
      return 'Completed';
    case 'Completed':
    case 'Failed':
      return status as PaymentStatus;
    default:
      return 'Processing';
  }
}

export function pushActivity(
  state: DemoStoreState,
  kind: string,
  reference: string,
  summary: string,
  entityIds?: Record<string, string>
): void {
  state.activity = [
    {
      id: createUuid(),
      at: nowIso(),
      kind,
      reference,
      summary,
      entityIds,
    },
    ...state.activity,
  ].slice(0, 200);
}
