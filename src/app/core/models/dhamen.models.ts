/** Domain models and API DTOs for Dhamen demo. */

export type PaymentStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

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

export interface CreateCustomerRequest {
  identityNumber: string;
  name: string;
  iban: string;
  email: string;
  mobile: string;
}

export type UpdateCustomerRequest = CreateCustomerRequest;

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
}

export interface PaymentStatusResponse {
  paymentReferenceId: string;
  supplierId: string;
  status: PaymentStatus;
  amount: number;
  updatedAt: string;
  message: string;
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

export interface DashboardStats {
  customersCount: number;
  suppliersCount: number;
  customersBalanceTotal: number;
  suppliersBalanceTotal: number;
  paymentsCount: number;
  latestPayment: PaymentRecord | null;
}
