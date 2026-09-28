import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, catchError, throwError } from 'rxjs';
import { DhamenApi } from './dhamen-api';
import { getRuntimeConfig } from '../config/runtime-config';
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
import {
  asRecord,
  holderTypeLabel,
  readBool,
  readNullableString,
  readNumber,
  readString,
  readTotalCount,
  releaseStatusLabel,
  unwrapItems,
} from '../utils/api-mappers';

const ACTIVITY_KEY = 'dhamen-http-activity-v1';

/**
 * HTTP implementation of the full Dhamen contract.
 * List shapes are normalized from array or paged wrappers.
 * Payment history / dashboard activity uses a local ledger when backend has no list API.
 */
@Injectable()
export class HttpDhamenApi implements DhamenApi {
  private readonly http = inject(HttpClient);

  private get base(): string {
    return `${getRuntimeConfig().baseUrl.replace(/\/$/, '')}/api/dhamen`;
  }

  private get currency(): string {
    return getRuntimeConfig().currency;
  }

  // —— Customers ——
  createCustomer(body: CreateCustomerRequest): Observable<CreateCustomerResponse> {
    return this.http.post(this.url('/customers'), body).pipe(
      map((res) => {
        const r = asRecord(res);
        const customerId = readString(r, 'customerId', 'id');
        this.pushActivity('customer.create', customerId, `Customer created`);
        return {
          customerId,
          message: readString(r, 'message') || 'Customer created successfully.',
        };
      })
    );
  }

  updateCustomer(body: UpdateCustomerRequest): Observable<UpdateCustomerResponse> {
    return this.http.put(this.url('/customers'), body, { observe: 'response' }).pipe(
      map((res) => {
        const r = asRecord(res.body);
        return {
          customerId: readString(r, 'customerId', 'id') || body.identityNumber,
          message: readString(r, 'message') || 'Customer updated successfully.',
        };
      })
    );
  }

  depositMoney(body: DepositMoneyRequest): Observable<DepositMoneyResponse> {
    return this.http.post(this.url('/customers/deposit'), body).pipe(
      map((res) => {
        const r = asRecord(res);
        this.pushActivity('customer.deposit', body.customerId, `Deposit ${body.amount}`);
        return {
          customerId: readString(r, 'customerId', 'id') || body.customerId,
          amount: Number(r['amount'] ?? body.amount),
          newBalance: Number(r['newBalance'] ?? r['balance'] ?? 0),
          message: readString(r, 'message') || 'Deposit completed successfully.',
        };
      })
    );
  }

  getCustomerBalance(customerId: string): Observable<BalanceResponse> {
    return this.http.get(this.url(`/customers/${customerId}/balance`)).pipe(
      map((res) => this.mapBalance(res, customerId))
    );
  }

  listCustomers(query?: PageQuery): Observable<PagedResult<Customer>> {
    return this.http.get(this.url('/customers'), { params: this.pageParams(query) }).pipe(
      map((res) => this.mapPaged(res, (item) => this.mapCustomer(item)))
    );
  }

  getCustomer(customerId: string): Observable<Customer> {
    return this.listCustomers({ page: 1, pageSize: 200 }).pipe(
      map((page) => {
        const found = page.items.find((c) => c.id === customerId);
        if (!found) {
          throw Object.assign(new Error('Customer not found.'), { status: 404 });
        }
        return found;
      })
    );
  }

  // —— Suppliers ——
  createSupplier(body: CreateSupplierRequest): Observable<CreateSupplierResponse> {
    return this.http.post(this.url('/suppliers'), body).pipe(
      map((res) => {
        const r = asRecord(res);
        const supplierId = readString(r, 'supplierId', 'id');
        this.pushActivity('supplier.create', supplierId, 'Supplier created');
        return {
          supplierId,
          message: readString(r, 'message') || 'Supplier created successfully.',
        };
      })
    );
  }

  updateSupplier(body: UpdateSupplierRequest): Observable<UpdateSupplierResponse> {
    return this.http.put(this.url('/suppliers'), body, { observe: 'response' }).pipe(
      map((res) => {
        const r = asRecord(res.body);
        return {
          supplierId: readString(r, 'supplierId', 'id') || body.supplierId,
          message: readString(r, 'message') || 'Supplier updated successfully.',
        };
      })
    );
  }

  createSupplierPayment(body: SupplierPaymentRequest): Observable<SupplierPaymentResponse> {
    return this.http.post(this.url('/suppliers/payments'), body).pipe(
      map((res) => {
        const r = asRecord(res);
        this.pushActivity(
          'supplier.payment',
          body.paymentReferenceId,
          `Supplier payout ${body.paymentReferenceId}`
        );
        const linesRaw = Array.isArray(r['lines']) ? r['lines'] : body.supplierPayments;
        return {
          paymentReferenceId: readString(r, 'paymentReferenceId') || body.paymentReferenceId,
          message: readString(r, 'message') || 'Payment created successfully.',
          lines: (linesRaw as unknown[]).map((line, index) => {
            const lr = asRecord(line);
            const src = body.supplierPayments[index];
            return {
              supplierId: readString(lr, 'supplierId') || src?.supplierId || '',
              supplierName: readString(lr, 'supplierName') || '',
              amount: readNumber(lr, 'amount') || src?.amount || 0,
              customerId: readNullableString(lr, 'customerId') ?? src?.customerId ?? null,
              customerName: readNullableString(lr, 'customerName'),
              status: (readString(lr, 'status') as 'Pending') || 'Pending',
            };
          }),
        };
      })
    );
  }

  getSupplierBalance(supplierId: string): Observable<BalanceResponse> {
    return this.http.get(this.url(`/suppliers/${supplierId}/balance`)).pipe(
      map((res) => this.mapBalance(res, supplierId))
    );
  }

  getSupplierPaymentStatus(
    supplierId: string,
    paymentReferenceId: string
  ): Observable<PaymentStatusResponse> {
    return this.http
      .get(this.url(`/suppliers/${supplierId}/payments/${paymentReferenceId}/status`))
      .pipe(
        map((res) => {
          const r = asRecord(res);
          return {
            paymentReferenceId: readString(r, 'paymentReferenceId') || paymentReferenceId,
            supplierId: readString(r, 'supplierId') || supplierId,
            status: readString(r, 'status') || 'Pending',
            amount: readNumber(r, 'amount'),
            updatedAt: readString(r, 'updatedAt') || new Date().toISOString(),
            message: readString(r, 'message'),
          };
        })
      );
  }

  listSuppliers(query?: PageQuery): Observable<PagedResult<Supplier>> {
    return this.http.get(this.url('/suppliers'), { params: this.pageParams(query) }).pipe(
      map((res) => this.mapPaged(res, (item) => this.mapSupplier(item)))
    );
  }

  getSupplier(supplierId: string): Observable<Supplier> {
    return this.listSuppliers({ page: 1, pageSize: 200 }).pipe(
      map((page) => {
        const found = page.items.find((s) => s.id === supplierId);
        if (!found) {
          throw Object.assign(new Error('Supplier not found.'), { status: 404 });
        }
        return found;
      })
    );
  }

  // —— Escrow ——
  createEscrowAccount(body: CreateEscrowAccountRequest): Observable<EscrowAccount> {
    return this.http.post(this.url('/escrow-accounts'), body).pipe(
      map((res) => this.mapEscrow(res, body))
    );
  }

  updateEscrowAccount(body: UpdateEscrowAccountRequest): Observable<EscrowAccount | void> {
    return this.http.put(this.url('/escrow-accounts'), body, { observe: 'response' }).pipe(
      map((res) => (res.body ? this.mapEscrow(res.body, body) : undefined))
    );
  }

  listEscrowAccounts(query?: PageQuery): Observable<PagedResult<EscrowAccount>> {
    return this.http.get(this.url('/escrow-accounts'), { params: this.pageParams(query) }).pipe(
      map((res) => this.mapPaged(res, (item) => this.mapEscrow(item)))
    );
  }

  getEscrowAccount(id: string): Observable<EscrowAccount> {
    return this.http.get(this.url(`/escrow-accounts/${id}`)).pipe(map((res) => this.mapEscrow(res)));
  }

  deleteEscrowAccount(id: string): Observable<void> {
    return this.http.delete(this.url(`/escrow-accounts/${id}`), { observe: 'response' }).pipe(
      map(() => undefined)
    );
  }

  // —— Contracts ——
  createContract(body: CreateContractRequest): Observable<Contract> {
    return this.http.post(this.url('/contracts'), body).pipe(
      map((res) => {
        const mapped = this.mapContract(res, body);
        this.pushActivity('contract.create', mapped.id, `Contract ${mapped.contractNumber}`);
        return mapped;
      })
    );
  }

  updateContract(body: UpdateContractRequest): Observable<Contract | void> {
    return this.http.put(this.url('/contracts'), body, { observe: 'response' }).pipe(
      map((res) => (res.body ? this.mapContract(res.body, body) : undefined))
    );
  }

  listContracts(query?: PageQuery): Observable<PagedResult<Contract>> {
    return this.http.get(this.url('/contracts'), { params: this.pageParams(query) }).pipe(
      map((res) => this.mapPaged(res, (item) => this.mapContract(item)))
    );
  }

  getContract(id: string): Observable<Contract> {
    return this.http.get(this.url(`/contracts/${id}`)).pipe(map((res) => this.mapContract(res)));
  }

  deleteContract(id: string): Observable<void> {
    return this.http.delete(this.url(`/contracts/${id}`), { observe: 'response' }).pipe(
      map(() => undefined)
    );
  }

  // —— Schedule lines ——
  createPaymentScheduleLine(
    body: CreatePaymentScheduleLineRequest
  ): Observable<PaymentScheduleLine> {
    return this.http.post(this.url('/payment-schedule-lines'), body).pipe(
      map((res) => this.mapScheduleLine(res, body))
    );
  }

  updatePaymentScheduleLine(
    body: UpdatePaymentScheduleLineRequest
  ): Observable<PaymentScheduleLine | void> {
    return this.http.put(this.url('/payment-schedule-lines'), body, { observe: 'response' }).pipe(
      map((res) => (res.body ? this.mapScheduleLine(res.body, body) : undefined))
    );
  }

  listPaymentScheduleLines(
    query?: PageQuery & { contractId?: string }
  ): Observable<PagedResult<PaymentScheduleLine>> {
    let params = this.pageParams(query);
    if (query?.contractId) {
      params = params.set('contractId', query.contractId);
    }
    return this.http.get(this.url('/payment-schedule-lines'), { params }).pipe(
      map((res) => this.mapPaged(res, (item) => this.mapScheduleLine(item)))
    );
  }

  getPaymentScheduleLine(id: string): Observable<PaymentScheduleLine> {
    return this.http
      .get(this.url(`/payment-schedule-lines/${id}`))
      .pipe(map((res) => this.mapScheduleLine(res)));
  }

  deletePaymentScheduleLine(id: string): Observable<void> {
    return this.http
      .delete(this.url(`/payment-schedule-lines/${id}`), { observe: 'response' })
      .pipe(map(() => undefined));
  }

  // —— Release requests ——
  createReleaseRequest(body: CreateReleaseRequestRequest): Observable<ReleaseRequest> {
    return this.http.post(this.url('/release-requests'), body).pipe(
      map((res) => {
        const mapped = this.mapRelease(res, body);
        this.pushActivity('release.create', mapped.id, `Release request ${mapped.requestedAmount}`);
        return mapped;
      })
    );
  }

  updateReleaseRequest(body: UpdateReleaseRequestRequest): Observable<ReleaseRequest | void> {
    return this.http.put(this.url('/release-requests'), body, { observe: 'response' }).pipe(
      map((res) => (res.body ? this.mapRelease(res.body, body) : undefined))
    );
  }

  listReleaseRequests(query?: PageQuery): Observable<PagedResult<ReleaseRequest>> {
    return this.http.get(this.url('/release-requests'), { params: this.pageParams(query) }).pipe(
      map((res) => this.mapPaged(res, (item) => this.mapRelease(item)))
    );
  }

  getReleaseRequest(id: string): Observable<ReleaseRequest> {
    return this.http.get(this.url(`/release-requests/${id}`)).pipe(map((res) => this.mapRelease(res)));
  }

  deleteReleaseRequest(id: string): Observable<void> {
    return this.http.delete(this.url(`/release-requests/${id}`), { observe: 'response' }).pipe(
      map(() => undefined)
    );
  }

  // —— Penalties ——
  createReleaseRequestPenalty(
    body: CreateReleaseRequestPenaltyRequest
  ): Observable<ReleaseRequestPenalty> {
    return this.http.post(this.url('/release-request-penalties'), body).pipe(
      map((res) => this.mapPenalty(res, body))
    );
  }

  updateReleaseRequestPenalty(
    body: UpdateReleaseRequestPenaltyRequest
  ): Observable<ReleaseRequestPenalty | void> {
    return this.http
      .put(this.url('/release-request-penalties'), body, { observe: 'response' })
      .pipe(map((res) => (res.body ? this.mapPenalty(res.body, body) : undefined)));
  }

  listReleaseRequestPenalties(
    query?: PageQuery
  ): Observable<PagedResult<ReleaseRequestPenalty>> {
    return this.http
      .get(this.url('/release-request-penalties'), { params: this.pageParams(query) })
      .pipe(map((res) => this.mapPaged(res, (item) => this.mapPenalty(item))));
  }

  getReleaseRequestPenalty(id: string): Observable<ReleaseRequestPenalty> {
    return this.http
      .get(this.url(`/release-request-penalties/${id}`))
      .pipe(map((res) => this.mapPenalty(res)));
  }

  deleteReleaseRequestPenalty(id: string): Observable<void> {
    return this.http
      .delete(this.url(`/release-request-penalties/${id}`), { observe: 'response' })
      .pipe(map(() => undefined));
  }

  // —— Payment links ——
  createPaymentLink(body: CreatePaymentLinkRequest): Observable<PaymentLink> {
    return this.http.post(this.url('/payment-links'), body).pipe(
      map((res) => {
        const mapped = this.mapPaymentLink(res, body);
        this.pushActivity('payment-link.create', mapped.paymentReferenceId, 'Payment link created');
        return mapped;
      })
    );
  }

  updatePaymentLink(body: UpdatePaymentLinkRequest): Observable<PaymentLink | void> {
    return this.http.put(this.url('/payment-links'), body, { observe: 'response' }).pipe(
      map((res) => (res.body ? this.mapPaymentLink(res.body, body) : undefined))
    );
  }

  listPaymentLinks(query?: PageQuery): Observable<PagedResult<PaymentLink>> {
    return this.http.get(this.url('/payment-links'), { params: this.pageParams(query) }).pipe(
      map((res) => this.mapPaged(res, (item) => this.mapPaymentLink(item)))
    );
  }

  getPaymentLink(id: string): Observable<PaymentLink> {
    return this.http.get(this.url(`/payment-links/${id}`)).pipe(map((res) => this.mapPaymentLink(res)));
  }

  deletePaymentLink(id: string): Observable<void> {
    return this.http.delete(this.url(`/payment-links/${id}`), { observe: 'response' }).pipe(
      map(() => undefined)
    );
  }

  // —— Payments lifecycle ——
  createCustomerPayment(body: CreateCustomerPaymentRequest): Observable<MutationResponse> {
    return this.mutate('/payments/customer', body, 'customer.payment', body.paymentReferenceId);
  }

  createSadadPayment(body: CreateSadadPaymentRequest): Observable<MutationResponse> {
    return this.mutate('/payments/sadad', body, 'sadad.payment', body.paymentReferenceId);
  }

  createSubsequentPayment(body: CreateSubsequentPaymentRequest): Observable<MutationResponse> {
    return this.mutate('/payments/subsequent', body, 'subsequent.payment', body.paymentReferenceId);
  }

  getPaymentStatus(
    paymentReferenceId: string,
    customerIdentifier?: string | null
  ): Observable<PaymentStatusResponse> {
    let params = new HttpParams().set('paymentReferenceId', paymentReferenceId);
    if (customerIdentifier) {
      params = params.set('customerIdentifier', customerIdentifier);
    }
    return this.http.get(this.url('/payments/status'), { params }).pipe(
      map((res) => {
        const r = asRecord(res);
        return {
          paymentReferenceId: readString(r, 'paymentReferenceId') || paymentReferenceId,
          status: readString(r, 'status') || 'Pending',
          amount: readNumber(r, 'amount'),
          updatedAt: readString(r, 'updatedAt') || new Date().toISOString(),
          message: readString(r, 'message'),
          customerIdentifier: readString(r, 'customerIdentifier') || customerIdentifier || undefined,
        };
      })
    );
  }

  capturePayment(body: CapturePaymentRequest): Observable<MutationResponse> {
    return this.mutate('/payments/capture', body, 'payment.capture', body.paymentReferenceId);
  }

  reversePayment(body: ReversePaymentRequest): Observable<MutationResponse> {
    return this.mutate('/payments/reverse', body, 'payment.reverse', body.paymentReferenceId);
  }

  refundPayment(body: RefundPaymentRequest): Observable<MutationResponse> {
    return this.mutate('/payments/refund', body, 'payment.refund', body.paymentReferenceId);
  }

  refundToIban(body: RefundToIbanRequest): Observable<MutationResponse> {
    return this.mutate('/payments/refund/iban', body, 'payment.refund-iban', body.paymentReferenceId);
  }

  cancelPaymentLink(body: CancelPaymentLinkRequest): Observable<MutationResponse> {
    return this.mutate('/payments/cancel-link', body, 'payment.cancel-link', body.paymentReferenceId);
  }

  getAuthorityBalance(authorityProfileId: string): Observable<BalanceResponse> {
    return this.http.get(this.url(`/authority/${authorityProfileId}/balance`)).pipe(
      map((res) => this.mapBalance(res, authorityProfileId))
    );
  }

  // —— Demo helpers ——
  listPayments(): Observable<PaymentRecord[]> {
    const activity = this.readActivity()
      .filter((a) => a.kind.includes('payment') || a.kind.includes('supplier.payment'))
      .map((a) => ({
        paymentReferenceId: a.reference,
        createdAt: a.at,
        lines: [],
        overallStatus: 'Pending' as const,
        source: 'customer-payment' as const,
      }));
    return of(activity);
  }

  getPayment(paymentReferenceId: string): Observable<PaymentRecord> {
    return this.listPayments().pipe(
      map((items) => {
        const found = items.find((p) => p.paymentReferenceId === paymentReferenceId);
        if (!found) {
          throw Object.assign(new Error('Payment reference not found.'), { status: 404 });
        }
        return found;
      })
    );
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get(this.url('/customers'), { params: this.pageParams({ page: 1, pageSize: 1 }) }).pipe(
      map((customersRes) => {
        const customersCount = readTotalCount(customersRes, unwrapItems(customersRes).length);
        return customersCount;
      }),
      // Aggregate lightly — full counts fetched in parallel by callers when needed.
      catchError(() => of(0)),
      map((customersCount) => ({
        customersCount,
        suppliersCount: 0,
        customersBalanceTotal: 0,
        suppliersBalanceTotal: 0,
        paymentsCount: this.readActivity().length,
        contractsCount: 0,
        releaseRequestsCount: 0,
        paymentLinksCount: 0,
        latestPayment: null,
      }))
    );
  }

  listActivity(): Observable<DemoActivityEntry[]> {
    return of(this.readActivity());
  }

  resetDemoData(): Observable<void> {
    return throwError(() => new Error('Reset sandbox is not available against the live API.'));
  }

  checkHealth(): Observable<boolean> {
    const host = getRuntimeConfig().baseUrl.replace(/\/$/, '');
    return this.http.get(`${host}/health`, { responseType: 'text' }).pipe(
      map(() => true),
      catchError(() =>
        this.http.get(this.url('/customers'), { params: { page: '1', pageSize: '1' } }).pipe(
          map(() => true),
          catchError(() => of(false))
        )
      )
    );
  }

  // —— helpers ——
  private url(path: string): string {
    return `${this.base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private pageParams(query?: PageQuery): HttpParams {
    return new HttpParams()
      .set('page', String(query?.page ?? 1))
      .set('pageSize', String(query?.pageSize ?? 50));
  }

  private mutate(
    path: string,
    body: unknown,
    kind: string,
    reference: string | null | undefined
  ): Observable<MutationResponse> {
    return this.http.post(this.url(path), body).pipe(
      map((res) => {
        const r = asRecord(res);
        const id = readString(r, 'id', 'paymentReferenceId') || reference || '';
        this.pushActivity(kind, id || kind, readString(r, 'message') || kind);
        return {
          id,
          message: readString(r, 'message') || 'Request completed successfully.',
        };
      })
    );
  }

  private mapPaged<T>(payload: unknown, mapItem: (item: unknown) => T): PagedResult<T> {
    const items = unwrapItems(payload).map(mapItem);
    return {
      items,
      page: 1,
      pageSize: items.length || 20,
      totalCount: readTotalCount(payload, items.length),
    };
  }

  private mapBalance(res: unknown, id: string): BalanceResponse {
    const r = asRecord(res);
    return {
      id: readString(r, 'id', 'customerId', 'supplierId') || id,
      balance: readNumber(r, 'balance', 'amount'),
      currency: readString(r, 'currency') || this.currency,
    };
  }

  private mapCustomer(item: unknown): Customer {
    const r = asRecord(item);
    const stamp = new Date().toISOString();
    return {
      id: readString(r, 'id', 'customerId'),
      identityNumber: readString(r, 'identityNumber'),
      name: readString(r, 'name'),
      iban: readString(r, 'iban'),
      email: readString(r, 'email'),
      mobile: readString(r, 'mobile'),
      balance: readNumber(r, 'balance'),
      createdAt: readString(r, 'createdAt') || stamp,
      updatedAt: readString(r, 'updatedAt') || stamp,
    };
  }

  private mapSupplier(item: unknown): Supplier {
    const r = asRecord(item);
    const stamp = new Date().toISOString();
    return {
      id: readString(r, 'id', 'supplierId'),
      name: readString(r, 'name'),
      iban: readString(r, 'iban'),
      identityNumber: readString(r, 'identityNumber'),
      payoutThresholdAmount: readNumber(r, 'payoutThresholdAmount'),
      email: readString(r, 'email'),
      mobile: readString(r, 'mobile'),
      balance: readNumber(r, 'balance'),
      createdAt: readString(r, 'createdAt') || stamp,
      updatedAt: readString(r, 'updatedAt') || stamp,
    };
  }

  private mapEscrow(item: unknown, fallback?: Partial<CreateEscrowAccountRequest & { id?: string }>): EscrowAccount {
    const r = asRecord(item);
    return {
      id: readString(r, 'id') || fallback?.id || '',
      holderType: (holderTypeLabel(r['holderType'] ?? fallback?.holderType) as EscrowAccount['holderType']) || 'Authority',
      name: readString(r, 'name') || fallback?.name || '',
      viban: readString(r, 'viban') || fallback?.viban || '',
      bban: readString(r, 'bban') || fallback?.bban || '',
      createdAt: readString(r, 'createdAt') || undefined,
      updatedAt: readString(r, 'updatedAt') || undefined,
    };
  }

  private mapContract(item: unknown, fallback?: Partial<CreateContractRequest & { id?: string }>): Contract {
    const r = asRecord(item);
    return {
      id: readString(r, 'id') || fallback?.id || '',
      contractNumber: readString(r, 'contractNumber') || fallback?.contractNumber || '',
      totalAmount: readNumber(r, 'totalAmount') || fallback?.totalAmount || 0,
      penaltyPercentage: readNumber(r, 'penaltyPercentage') || fallback?.penaltyPercentage || 0,
      sceFeePercentage: readNumber(r, 'sceFeePercentage') || fallback?.sceFeePercentage || 0,
      moatamedFeePercentage: readNumber(r, 'moatamedFeePercentage') || fallback?.moatamedFeePercentage || 0,
      vatPercentage: readNumber(r, 'vatPercentage') || fallback?.vatPercentage || 0,
      escrowAccountId: readNullableString(r, 'escrowAccountId') ?? fallback?.escrowAccountId ?? null,
      createdAt: readString(r, 'createdAt') || undefined,
      updatedAt: readString(r, 'updatedAt') || undefined,
    };
  }

  private mapScheduleLine(
    item: unknown,
    fallback?: Partial<CreatePaymentScheduleLineRequest & { id?: string }>
  ): PaymentScheduleLine {
    const r = asRecord(item);
    return {
      id: readString(r, 'id') || fallback?.id || '',
      contractId: readString(r, 'contractId') || fallback?.contractId || '',
      sequenceNo: readNumber(r, 'sequenceNo') || fallback?.sequenceNo || 0,
      title: readString(r, 'title') || fallback?.title || '',
      percentage: readNumber(r, 'percentage') || fallback?.percentage || 0,
      amount: readNumber(r, 'amount') || fallback?.amount || 0,
      dueDate: readString(r, 'dueDate') || fallback?.dueDate || '',
      escrowAccountId: readNullableString(r, 'escrowAccountId') ?? fallback?.escrowAccountId ?? null,
      createdAt: readString(r, 'createdAt') || undefined,
      updatedAt: readString(r, 'updatedAt') || undefined,
    };
  }

  private mapRelease(
    item: unknown,
    fallback?: Partial<CreateReleaseRequestRequest & { id?: string }>
  ): ReleaseRequest {
    const r = asRecord(item);
    return {
      id: readString(r, 'id') || fallback?.id || '',
      scheduleLineId: readString(r, 'scheduleLineId') || fallback?.scheduleLineId || '',
      requestDate: readString(r, 'requestDate') || fallback?.requestDate || '',
      requestedAmount: readNumber(r, 'requestedAmount') || fallback?.requestedAmount || 0,
      hasPenalty: readBool(r, 'hasPenalty') || !!fallback?.hasPenalty,
      status: releaseStatusLabel(r['status'] ?? fallback?.status),
      createdAt: readString(r, 'createdAt') || undefined,
      updatedAt: readString(r, 'updatedAt') || undefined,
    };
  }

  private mapPenalty(
    item: unknown,
    fallback?: Partial<CreateReleaseRequestPenaltyRequest & { id?: string }>
  ): ReleaseRequestPenalty {
    const r = asRecord(item);
    return {
      id: readString(r, 'id') || fallback?.id || '',
      releaseRequestId: readString(r, 'releaseRequestId') || fallback?.releaseRequestId || '',
      penaltyAmount: readNumber(r, 'penaltyAmount') || fallback?.penaltyAmount || 0,
      penaltyPercentage: readNumber(r, 'penaltyPercentage') || fallback?.penaltyPercentage || 0,
      daysLate: readNumber(r, 'daysLate') || fallback?.daysLate || 0,
      reason: readNullableString(r, 'reason') ?? fallback?.reason ?? null,
      createdAt: readString(r, 'createdAt') || undefined,
      updatedAt: readString(r, 'updatedAt') || undefined,
    };
  }

  private mapPaymentLink(
    item: unknown,
    fallback?: Partial<CreatePaymentLinkRequest & { id?: string }>
  ): PaymentLink {
    const r = asRecord(item);
    return {
      id: readString(r, 'id') || fallback?.id || '',
      paymentReferenceId: readString(r, 'paymentReferenceId') || fallback?.paymentReferenceId || '',
      expiresInMinutes:
        r['expiresInMinutes'] === null || r['expiresInMinutes'] === undefined
          ? (fallback?.expiresInMinutes ?? null)
          : readNumber(r, 'expiresInMinutes'),
      customerId: readString(r, 'customerId') || fallback?.customerId || '',
      amount: readNumber(r, 'amount') || fallback?.amount || 0,
      supplierId: readNullableString(r, 'supplierId') ?? fallback?.supplierId ?? null,
      paymentUrl: readNullableString(r, 'paymentUrl') ?? fallback?.paymentUrl ?? null,
      createdAt: readString(r, 'createdAt') || undefined,
      updatedAt: readString(r, 'updatedAt') || undefined,
    };
  }

  private pushActivity(kind: string, reference: string, summary: string): void {
    const entry: DemoActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      at: new Date().toISOString(),
      kind,
      reference: reference || kind,
      summary,
    };
    const next = [entry, ...this.readActivity()].slice(0, 200);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  }

  private readActivity(): DemoActivityEntry[] {
    try {
      const raw = localStorage.getItem(ACTIVITY_KEY);
      return raw ? (JSON.parse(raw) as DemoActivityEntry[]) : [];
    } catch {
      return [];
    }
  }
}
