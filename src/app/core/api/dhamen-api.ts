import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BalanceResponse,
  CancelPaymentLinkRequest,
  CapturePaymentRequest,
  Contract,
  CreateContractRequest,
  CreateCustomerPaymentRequest,
  CreateCustomerRequest,
  CreateCustomerResponse,
  CreateEscrowAccountRequest,
  CreatePaymentLinkRequest,
  CreatePaymentScheduleLineRequest,
  CreateReleaseRequestPenaltyRequest,
  CreateReleaseRequestRequest,
  CreateSadadPaymentRequest,
  CreateSubsequentPaymentRequest,
  CreateSupplierRequest,
  CreateSupplierResponse,
  Customer,
  DashboardStats,
  DemoActivityEntry,
  DepositMoneyRequest,
  DepositMoneyResponse,
  EscrowAccount,
  MutationResponse,
  PageQuery,
  PagedResult,
  PaymentLink,
  PaymentRecord,
  PaymentScheduleLine,
  PaymentStatusResponse,
  RefundPaymentRequest,
  RefundToIbanRequest,
  ReleaseRequest,
  ReleaseRequestPenalty,
  ReversePaymentRequest,
  Supplier,
  SupplierPaymentRequest,
  SupplierPaymentResponse,
  UpdateContractRequest,
  UpdateCustomerRequest,
  UpdateCustomerResponse,
  UpdateEscrowAccountRequest,
  UpdatePaymentLinkRequest,
  UpdatePaymentScheduleLineRequest,
  UpdateReleaseRequestPenaltyRequest,
  UpdateReleaseRequestRequest,
  UpdateSupplierRequest,
  UpdateSupplierResponse,
} from '../models/dhamen.models';

/**
 * Full Dhamen API surface (swagger + API_REFERENCE) plus demo helpers
 * for history/dashboard when backend does not expose them.
 */
export interface DhamenApi {
  // Customers
  createCustomer(body: CreateCustomerRequest): Observable<CreateCustomerResponse>;
  updateCustomer(body: UpdateCustomerRequest): Observable<UpdateCustomerResponse>;
  depositMoney(body: DepositMoneyRequest): Observable<DepositMoneyResponse>;
  getCustomerBalance(customerId: string): Observable<BalanceResponse>;
  listCustomers(query?: PageQuery): Observable<PagedResult<Customer>>;
  getCustomer(customerId: string): Observable<Customer>;

  // Suppliers
  createSupplier(body: CreateSupplierRequest): Observable<CreateSupplierResponse>;
  updateSupplier(body: UpdateSupplierRequest): Observable<UpdateSupplierResponse>;
  createSupplierPayment(body: SupplierPaymentRequest): Observable<SupplierPaymentResponse>;
  getSupplierBalance(supplierId: string): Observable<BalanceResponse>;
  getSupplierPaymentStatus(
    supplierId: string,
    paymentReferenceId: string
  ): Observable<PaymentStatusResponse>;
  listSuppliers(query?: PageQuery): Observable<PagedResult<Supplier>>;
  getSupplier(supplierId: string): Observable<Supplier>;

  // Escrow accounts
  createEscrowAccount(body: CreateEscrowAccountRequest): Observable<EscrowAccount>;
  updateEscrowAccount(body: UpdateEscrowAccountRequest): Observable<EscrowAccount | void>;
  listEscrowAccounts(query?: PageQuery): Observable<PagedResult<EscrowAccount>>;
  getEscrowAccount(id: string): Observable<EscrowAccount>;
  deleteEscrowAccount(id: string): Observable<void>;

  // Contracts
  createContract(body: CreateContractRequest): Observable<Contract>;
  updateContract(body: UpdateContractRequest): Observable<Contract | void>;
  listContracts(query?: PageQuery): Observable<PagedResult<Contract>>;
  getContract(id: string): Observable<Contract>;
  deleteContract(id: string): Observable<void>;

  // Payment schedule lines
  createPaymentScheduleLine(body: CreatePaymentScheduleLineRequest): Observable<PaymentScheduleLine>;
  updatePaymentScheduleLine(
    body: UpdatePaymentScheduleLineRequest
  ): Observable<PaymentScheduleLine | void>;
  listPaymentScheduleLines(
    query?: PageQuery & { contractId?: string }
  ): Observable<PagedResult<PaymentScheduleLine>>;
  getPaymentScheduleLine(id: string): Observable<PaymentScheduleLine>;
  deletePaymentScheduleLine(id: string): Observable<void>;

  // Release requests
  createReleaseRequest(body: CreateReleaseRequestRequest): Observable<ReleaseRequest>;
  updateReleaseRequest(body: UpdateReleaseRequestRequest): Observable<ReleaseRequest | void>;
  listReleaseRequests(query?: PageQuery): Observable<PagedResult<ReleaseRequest>>;
  getReleaseRequest(id: string): Observable<ReleaseRequest>;
  deleteReleaseRequest(id: string): Observable<void>;

  // Release penalties
  createReleaseRequestPenalty(
    body: CreateReleaseRequestPenaltyRequest
  ): Observable<ReleaseRequestPenalty>;
  updateReleaseRequestPenalty(
    body: UpdateReleaseRequestPenaltyRequest
  ): Observable<ReleaseRequestPenalty | void>;
  listReleaseRequestPenalties(query?: PageQuery): Observable<PagedResult<ReleaseRequestPenalty>>;
  getReleaseRequestPenalty(id: string): Observable<ReleaseRequestPenalty>;
  deleteReleaseRequestPenalty(id: string): Observable<void>;

  // Payment links
  createPaymentLink(body: CreatePaymentLinkRequest): Observable<PaymentLink>;
  updatePaymentLink(body: UpdatePaymentLinkRequest): Observable<PaymentLink | void>;
  listPaymentLinks(query?: PageQuery): Observable<PagedResult<PaymentLink>>;
  getPaymentLink(id: string): Observable<PaymentLink>;
  deletePaymentLink(id: string): Observable<void>;

  // Payments lifecycle
  createCustomerPayment(body: CreateCustomerPaymentRequest): Observable<MutationResponse>;
  createSadadPayment(body: CreateSadadPaymentRequest): Observable<MutationResponse>;
  createSubsequentPayment(body: CreateSubsequentPaymentRequest): Observable<MutationResponse>;
  getPaymentStatus(
    paymentReferenceId: string,
    customerIdentifier?: string | null
  ): Observable<PaymentStatusResponse>;
  capturePayment(body: CapturePaymentRequest): Observable<MutationResponse>;
  reversePayment(body: ReversePaymentRequest): Observable<MutationResponse>;
  refundPayment(body: RefundPaymentRequest): Observable<MutationResponse>;
  refundToIban(body: RefundToIbanRequest): Observable<MutationResponse>;
  cancelPaymentLink(body: CancelPaymentLinkRequest): Observable<MutationResponse>;

  // Authority
  getAuthorityBalance(authorityProfileId: string): Observable<BalanceResponse>;

  // Demo helpers
  listPayments(): Observable<PaymentRecord[]>;
  getPayment(paymentReferenceId: string): Observable<PaymentRecord>;
  getDashboardStats(): Observable<DashboardStats>;
  listActivity(): Observable<DemoActivityEntry[]>;
  resetDemoData(): Observable<void>;
  checkHealth(): Observable<boolean>;
}

export const DHAMEN_API = new InjectionToken<DhamenApi>('DHAMEN_API');
