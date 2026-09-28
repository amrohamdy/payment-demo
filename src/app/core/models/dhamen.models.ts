/** Domain models and API DTOs for Dhamen demo (aligned with swagger + API_REFERENCE). */

export type PaymentStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

export type AccountHolderType = 'Authority' | 'Customer' | 'Supplier' | 1 | 2 | 3;

export type ReleaseRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 0 | 1 | 2;

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface Customer {
  id: string;
  identityNumber: string;
  name: string;
  iban: string;
  email: string;
  mobile: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  iban: string;
  identityNumber: string;
  payoutThresholdAmount: number;
  email: string;
  mobile: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowAccount {
  id: string;
  holderType: AccountHolderType;
  name: string;
  viban: string;
  bban: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  totalAmount: number;
  penaltyPercentage: number;
  sceFeePercentage: number;
  moatamedFeePercentage: number;
  vatPercentage: number;
  escrowAccountId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentScheduleLine {
  id: string;
  contractId: string;
  sequenceNo: number;
  title: string;
  percentage: number;
  amount: number;
  dueDate: string;
  escrowAccountId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReleaseRequest {
  id: string;
  scheduleLineId: string;
  requestDate: string;
  requestedAmount: number;
  hasPenalty: boolean;
  status: ReleaseRequestStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReleaseRequestPenalty {
  id: string;
  releaseRequestId: string;
  penaltyAmount: number;
  penaltyPercentage: number;
  daysLate: number;
  reason: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentLink {
  id: string;
  paymentReferenceId: string;
  expiresInMinutes: number | null;
  customerId: string;
  amount: number;
  supplierId: string | null;
  paymentUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomerRequest {
  identityNumber: string;
  name: string;
  iban: string;
  email: string;
  mobile: string;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  customerId: string;
}

export interface DepositMoneyRequest {
  customerId: string;
  amount: number;
  paymentIWalletNumber: string | null;
}

export interface CreateSupplierRequest {
  name: string;
  iban: string;
  identityNumber: string;
  payoutThresholdAmount: number;
  email: string;
  mobile: string;
}

export interface UpdateSupplierRequest {
  supplierId: string;
  name: string;
  iban: string;
  identityNumber: string;
  payoutThresholdAmount: number;
  email: string;
  mobile: string;
}

export interface SupplierPaymentLine {
  supplierId: string;
  amount: number;
  customerId: string | null;
}

export interface SupplierPaymentRequest {
  paymentReferenceId: string;
  supplierPayments: SupplierPaymentLine[];
}

export interface CreateEscrowAccountRequest {
  holderType: AccountHolderType;
  name: string;
  viban: string;
  bban: string;
}

export interface UpdateEscrowAccountRequest extends CreateEscrowAccountRequest {
  id: string;
}

export interface CreateContractRequest {
  contractNumber: string;
  totalAmount: number;
  penaltyPercentage: number;
  sceFeePercentage: number;
  moatamedFeePercentage: number;
  vatPercentage: number;
  escrowAccountId: string | null;
}

export interface UpdateContractRequest extends CreateContractRequest {
  id: string;
}

export interface CreatePaymentScheduleLineRequest {
  contractId: string;
  sequenceNo: number;
  title: string;
  percentage: number;
  amount: number;
  dueDate: string;
  escrowAccountId: string | null;
}

export interface UpdatePaymentScheduleLineRequest {
  id: string;
  sequenceNo: number;
  title: string;
  percentage: number;
  amount: number;
  dueDate: string;
  escrowAccountId: string | null;
}

export interface CreateReleaseRequestRequest {
  scheduleLineId: string;
  requestDate: string;
  requestedAmount: number;
  hasPenalty: boolean;
  status: ReleaseRequestStatus;
}

export interface UpdateReleaseRequestRequest {
  id: string;
  requestDate: string;
  requestedAmount: number;
  hasPenalty: boolean;
  status: ReleaseRequestStatus;
}

export interface CreateReleaseRequestPenaltyRequest {
  releaseRequestId: string;
  penaltyAmount: number;
  penaltyPercentage: number;
  daysLate: number;
  reason: string | null;
}

export interface UpdateReleaseRequestPenaltyRequest {
  id: string;
  penaltyAmount: number;
  penaltyPercentage: number;
  daysLate: number;
  reason: string | null;
}

export interface CreatePaymentLinkRequest {
  paymentReferenceId: string;
  expiresInMinutes: number | null;
  customerId: string;
  amount: number;
  supplierId: string | null;
  paymentUrl: string | null;
}

export interface UpdatePaymentLinkRequest {
  id: string;
  expiresInMinutes: number | null;
  amount: number;
  supplierId: string | null;
  paymentUrl: string | null;
}

export interface CustomerPaymentItem {
  name: string | null;
  customerIdentifier: string | null;
  amount: number;
  supplierId: string | null;
  isPreAuth: boolean | null;
  enableBNPL: boolean | null;
  mobile: string | null;
  email: string | null;
  enableRecurring: boolean | null;
  returnUrl: string | null;
}

export interface CreateCustomerPaymentRequest {
  paymentReferenceId: string | null;
  customerPayments: CustomerPaymentItem[];
  paymentExpiredOnMinutes: number | null;
}

export interface CreateSadadPaymentRequest {
  paymentReferenceId: string | null;
  name: string | null;
  customerIdentifier: string | null;
  amount: number;
  supplierId: string | null;
  email: string | null;
  mobile: string | null;
}

export interface CreateSubsequentPaymentRequest {
  paymentReferenceId: string | null;
  originalPaymentReferenceId: string | null;
  customerIdentifier: string | null;
  amount: number;
}

export interface CapturePaymentRequest {
  paymentReferenceId: string | null;
  customerIdentifier: string | null;
  requestId: string | null;
  amount: number | null;
}

export interface ReversePaymentRequest {
  paymentReferenceId: string | null;
  customerIdentifier: string | null;
}

export interface RefundPaymentRequest {
  paymentReferenceId: string | null;
  customerIdentifier: string | null;
  requestId: string | null;
  amount: number | null;
}

export interface RefundToIbanRequest {
  requestId: string | null;
  paymentReferenceId: string | null;
  customerName: string | null;
  iban: string | null;
  amount: number | null;
}

export interface CancelPaymentLinkRequest {
  paymentReferenceId: string | null;
  customerIdentifier: string | null;
}

export interface BalanceResponse {
  id: string;
  balance: number;
  currency: string;
}

export interface PaymentLineRecord {
  supplierId: string;
  supplierName: string;
  amount: number;
  customerId: string | null;
  customerName: string | null;
  status: PaymentStatus;
}

export interface PaymentRecord {
  paymentReferenceId: string;
  createdAt: string;
  lines: PaymentLineRecord[];
  overallStatus: PaymentStatus;
  source?: 'supplier-payout' | 'customer-payment' | 'sadad' | 'subsequent' | 'payment-link';
}

export interface PaymentStatusResponse {
  paymentReferenceId: string;
  supplierId?: string;
  status: PaymentStatus | string;
  amount?: number;
  updatedAt?: string;
  message?: string;
  customerIdentifier?: string;
}

export interface CreateCustomerResponse {
  customerId: string;
  message: string;
}

export interface UpdateCustomerResponse {
  customerId: string;
  message: string;
}

export interface DepositMoneyResponse {
  customerId: string;
  amount: number;
  newBalance: number;
  message: string;
}

export interface CreateSupplierResponse {
  supplierId: string;
  message: string;
}

export interface UpdateSupplierResponse {
  supplierId: string;
  message: string;
}

export interface SupplierPaymentResponse {
  paymentReferenceId: string;
  message: string;
  lines: PaymentLineRecord[];
}

export interface MutationResponse {
  id: string;
  message: string;
}

export interface DashboardStats {
  customersCount: number;
  suppliersCount: number;
  customersBalanceTotal: number;
  suppliersBalanceTotal: number;
  paymentsCount: number;
  contractsCount: number;
  releaseRequestsCount: number;
  paymentLinksCount: number;
  latestPayment: PaymentRecord | null;
}

/** Local-only activity used when backend has no payment history list. */
export interface DemoActivityEntry {
  id: string;
  at: string;
  kind: string;
  reference: string;
  summary: string;
  entityIds?: Record<string, string>;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}
