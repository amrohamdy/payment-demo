import { Injectable } from '@angular/core';
import { Observable, of, switchMap, throwError, timer } from 'rxjs';
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
  PaymentStatus,
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
  DemoStoreState,
  advancePaymentStatus,
  loadStoreState,
  pushActivity,
  resetStoreState,
  saveStoreState,
} from '../services/demo-store';
import { createUuid } from '../utils/id.utils';
import { hasSufficientBalance, roundMoney, sumAmounts } from '../utils/money.utils';
import { holderTypeLabel, releaseStatusLabel } from '../utils/api-mappers';

@Injectable()
export class MockDhamenApi implements DhamenApi {
  private state: DemoStoreState = loadStoreState();

  createCustomer(body: CreateCustomerRequest): Observable<CreateCustomerResponse> {
    return this.run(() => {
      this.ensureUniqueIdentity(body.identityNumber, 'customer');
      const stamp = new Date().toISOString();
      const customer: Customer = {
        id: createUuid(),
        identityNumber: body.identityNumber.trim(),
        name: body.name.trim(),
        iban: body.iban.trim().toUpperCase(),
        email: body.email.trim(),
        mobile: body.mobile.trim(),
        balance: 0,
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.state.customers = [customer, ...this.state.customers];
      pushActivity(this.state, 'customer.create', customer.id, `Customer ${customer.name} created`);
      this.persist();
      return { customerId: customer.id, message: 'Customer created successfully.' };
    });
  }

  updateCustomer(body: UpdateCustomerRequest): Observable<UpdateCustomerResponse> {
    return this.run(() => {
      const customer = this.requireCustomerByIdentity(body.identityNumber);
      customer.name = body.name.trim();
      customer.iban = body.iban.trim().toUpperCase();
      customer.email = body.email.trim();
      customer.mobile = body.mobile.trim();
      customer.updatedAt = new Date().toISOString();
      this.persist();
      return { customerId: customer.id, message: 'Customer updated successfully.' };
    });
  }

  depositMoney(body: DepositMoneyRequest): Observable<DepositMoneyResponse> {
    return this.run(() => {
      if (!body.amount || body.amount <= 0) {
        throw this.apiError('The amount must be greater than zero.');
      }
      const customer = this.requireCustomer(body.customerId);
      customer.balance = roundMoney(customer.balance + body.amount);
      customer.updatedAt = new Date().toISOString();
      pushActivity(this.state, 'customer.deposit', customer.id, `Deposit ${body.amount}`);
      this.persist();
      return {
        customerId: customer.id,
        amount: body.amount,
        newBalance: customer.balance,
        message: 'Deposit completed successfully.',
      };
    });
  }

  getCustomerBalance(customerId: string): Observable<BalanceResponse> {
    return this.run(() => {
      const customer = this.requireCustomer(customerId);
      return { id: customer.id, balance: customer.balance, currency: getRuntimeConfig().currency };
    });
  }

  listCustomers(query?: PageQuery): Observable<PagedResult<Customer>> {
    return this.run(() => this.page(this.state.customers, query));
  }

  getCustomer(customerId: string): Observable<Customer> {
    return this.run(() => ({ ...this.requireCustomer(customerId) }));
  }

  createSupplier(body: CreateSupplierRequest): Observable<CreateSupplierResponse> {
    return this.run(() => {
      this.ensureUniqueIdentity(body.identityNumber, 'supplier');
      const stamp = new Date().toISOString();
      const supplier: Supplier = {
        id: createUuid(),
        name: body.name.trim(),
        iban: body.iban.trim().toUpperCase(),
        identityNumber: body.identityNumber.trim(),
        payoutThresholdAmount: roundMoney(body.payoutThresholdAmount),
        email: body.email.trim(),
        mobile: body.mobile.trim(),
        balance: 0,
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.state.suppliers = [supplier, ...this.state.suppliers];
      pushActivity(this.state, 'supplier.create', supplier.id, `Supplier ${supplier.name} created`);
      this.persist();
      return { supplierId: supplier.id, message: 'Supplier created successfully.' };
    });
  }

  updateSupplier(body: UpdateSupplierRequest): Observable<UpdateSupplierResponse> {
    return this.run(() => {
      const supplier = this.requireSupplier(body.supplierId);
      supplier.name = body.name.trim();
      supplier.iban = body.iban.trim().toUpperCase();
      supplier.identityNumber = body.identityNumber.trim();
      supplier.payoutThresholdAmount = roundMoney(body.payoutThresholdAmount);
      supplier.email = body.email.trim();
      supplier.mobile = body.mobile.trim();
      supplier.updatedAt = new Date().toISOString();
      this.persist();
      return { supplierId: supplier.id, message: 'Supplier updated successfully.' };
    });
  }

  createSupplierPayment(body: SupplierPaymentRequest): Observable<SupplierPaymentResponse> {
    return this.run(() => {
      if (!body.paymentReferenceId?.trim()) {
        throw this.apiError('Payment reference is required.');
      }
      if (this.state.payments.some((p) => p.paymentReferenceId === body.paymentReferenceId)) {
        throw this.apiError('This payment reference is already in use.');
      }
      if (!body.supplierPayments?.length) {
        throw this.apiError('Add at least one supplier.');
      }
      const supplierIds = body.supplierPayments.map((line) => line.supplierId);
      if (new Set(supplierIds).size !== supplierIds.length) {
        throw this.apiError('A supplier cannot be repeated in the same payment.');
      }

      const fundedByCustomer = body.supplierPayments.filter((line) => !!line.customerId);
      const customerGroups = new Map<string, number>();
      for (const line of fundedByCustomer) {
        const customerId = line.customerId!;
        customerGroups.set(customerId, roundMoney((customerGroups.get(customerId) ?? 0) + line.amount));
      }
      for (const [customerId, total] of customerGroups.entries()) {
        const customer = this.requireCustomer(customerId);
        if (!hasSufficientBalance(customer.balance, total)) {
          throw this.apiError(`${customer.name} does not have enough balance for this payment.`);
        }
      }
      for (const line of body.supplierPayments) {
        if (!line.amount || line.amount <= 0) {
          throw this.apiError('Payment amount must be greater than zero.');
        }
        this.requireSupplier(line.supplierId);
      }

      const stamp = new Date().toISOString();
      const lines = body.supplierPayments.map((line) => {
        const supplier = this.requireSupplier(line.supplierId);
        const customer = line.customerId ? this.requireCustomer(line.customerId) : null;
        if (customer) {
          customer.balance = roundMoney(customer.balance - line.amount);
          customer.updatedAt = stamp;
        }
        supplier.balance = roundMoney(supplier.balance + line.amount);
        supplier.updatedAt = stamp;
        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          amount: roundMoney(line.amount),
          customerId: customer?.id ?? null,
          customerName: customer?.name ?? null,
          status: 'Pending' as PaymentStatus,
        };
      });

      const record: PaymentRecord = {
        paymentReferenceId: body.paymentReferenceId.trim(),
        createdAt: stamp,
        lines,
        overallStatus: 'Pending',
        source: 'supplier-payout',
      };
      this.state.payments = [record, ...this.state.payments];
      this.state.paymentStatuses[record.paymentReferenceId] = 'Pending';
      pushActivity(this.state, 'supplier.payment', record.paymentReferenceId, 'Supplier payout created');
      this.persist();
      return {
        paymentReferenceId: record.paymentReferenceId,
        message: 'Payment request created successfully.',
        lines: record.lines,
      };
    });
  }

  getSupplierBalance(supplierId: string): Observable<BalanceResponse> {
    return this.run(() => {
      const supplier = this.requireSupplier(supplierId);
      return { id: supplier.id, balance: supplier.balance, currency: getRuntimeConfig().currency };
    });
  }

  getSupplierPaymentStatus(
    supplierId: string,
    paymentReferenceId: string
  ): Observable<PaymentStatusResponse> {
    return this.run(() => {
      const payment = this.requirePayment(paymentReferenceId);
      const line = payment.lines.find((item) => item.supplierId === supplierId);
      if (!line) {
        throw this.apiError('No payment was found for this supplier and reference.');
      }
      if (line.status === 'Pending' || line.status === 'Processing') {
        line.status = advancePaymentStatus(line.status);
        payment.overallStatus = this.computeOverallStatus(payment);
        this.state.paymentStatuses[paymentReferenceId] = payment.overallStatus;
        this.persist();
      }
      return {
        paymentReferenceId,
        supplierId,
        status: line.status,
        amount: line.amount,
        updatedAt: new Date().toISOString(),
        message: this.statusMessage(line.status),
      };
    });
  }

  listSuppliers(query?: PageQuery): Observable<PagedResult<Supplier>> {
    return this.run(() => this.page(this.state.suppliers, query));
  }

  getSupplier(supplierId: string): Observable<Supplier> {
    return this.run(() => ({ ...this.requireSupplier(supplierId) }));
  }

  createEscrowAccount(body: CreateEscrowAccountRequest): Observable<EscrowAccount> {
    return this.run(() => {
      const stamp = new Date().toISOString();
      const account: EscrowAccount = {
        id: createUuid(),
        holderType: holderTypeLabel(body.holderType) as EscrowAccount['holderType'],
        name: body.name.trim(),
        viban: body.viban.trim(),
        bban: body.bban.trim(),
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.state.escrowAccounts = [account, ...this.state.escrowAccounts];
      pushActivity(this.state, 'escrow.create', account.id, `Escrow ${account.name}`);
      this.persist();
      return { ...account };
    });
  }

  updateEscrowAccount(body: UpdateEscrowAccountRequest): Observable<EscrowAccount | void> {
    return this.run(() => {
      const account = this.requireEscrow(body.id);
      account.holderType = holderTypeLabel(body.holderType) as EscrowAccount['holderType'];
      account.name = body.name.trim();
      account.viban = body.viban.trim();
      account.bban = body.bban.trim();
      account.updatedAt = new Date().toISOString();
      this.persist();
      return { ...account };
    });
  }

  listEscrowAccounts(query?: PageQuery): Observable<PagedResult<EscrowAccount>> {
    return this.run(() => this.page(this.state.escrowAccounts, query));
  }

  getEscrowAccount(id: string): Observable<EscrowAccount> {
    return this.run(() => ({ ...this.requireEscrow(id) }));
  }

  deleteEscrowAccount(id: string): Observable<void> {
    return this.run(() => {
      this.requireEscrow(id);
      this.state.escrowAccounts = this.state.escrowAccounts.filter((a) => a.id !== id);
      this.persist();
    });
  }

  createContract(body: CreateContractRequest): Observable<Contract> {
    return this.run(() => {
      if (this.state.contracts.some((c) => c.contractNumber === body.contractNumber.trim())) {
        throw this.apiError('Contract number already exists.', 409);
      }
      this.validatePercentages(body);
      if (body.escrowAccountId) {
        this.requireEscrow(body.escrowAccountId);
      }
      const stamp = new Date().toISOString();
      const contract: Contract = {
        id: createUuid(),
        contractNumber: body.contractNumber.trim(),
        totalAmount: roundMoney(body.totalAmount),
        penaltyPercentage: body.penaltyPercentage,
        sceFeePercentage: body.sceFeePercentage,
        moatamedFeePercentage: body.moatamedFeePercentage,
        vatPercentage: body.vatPercentage,
        escrowAccountId: body.escrowAccountId,
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.state.contracts = [contract, ...this.state.contracts];
      pushActivity(this.state, 'contract.create', contract.id, `Contract ${contract.contractNumber}`);
      this.persist();
      return { ...contract };
    });
  }

  updateContract(body: UpdateContractRequest): Observable<Contract | void> {
    return this.run(() => {
      const contract = this.requireContract(body.id);
      this.validatePercentages(body);
      if (
        this.state.contracts.some(
          (c) => c.id !== body.id && c.contractNumber === body.contractNumber.trim()
        )
      ) {
        throw this.apiError('Contract number already exists.', 409);
      }
      if (body.escrowAccountId) {
        this.requireEscrow(body.escrowAccountId);
      }
      contract.contractNumber = body.contractNumber.trim();
      contract.totalAmount = roundMoney(body.totalAmount);
      contract.penaltyPercentage = body.penaltyPercentage;
      contract.sceFeePercentage = body.sceFeePercentage;
      contract.moatamedFeePercentage = body.moatamedFeePercentage;
      contract.vatPercentage = body.vatPercentage;
      contract.escrowAccountId = body.escrowAccountId;
      contract.updatedAt = new Date().toISOString();
      this.persist();
      return { ...contract };
    });
  }

  listContracts(query?: PageQuery): Observable<PagedResult<Contract>> {
    return this.run(() => this.page(this.state.contracts, query));
  }

  getContract(id: string): Observable<Contract> {
    return this.run(() => ({ ...this.requireContract(id) }));
  }

  deleteContract(id: string): Observable<void> {
    return this.run(() => {
      this.requireContract(id);
      this.state.contracts = this.state.contracts.filter((c) => c.id !== id);
      this.state.scheduleLines = this.state.scheduleLines.filter((l) => l.contractId !== id);
      this.persist();
    });
  }

  createPaymentScheduleLine(
    body: CreatePaymentScheduleLineRequest
  ): Observable<PaymentScheduleLine> {
    return this.run(() => {
      this.requireContract(body.contractId);
      if (
        this.state.scheduleLines.some(
          (l) => l.contractId === body.contractId && l.sequenceNo === body.sequenceNo
        )
      ) {
        throw this.apiError('sequenceNo must be unique per contract.', 409);
      }
      const stamp = new Date().toISOString();
      const line: PaymentScheduleLine = {
        id: createUuid(),
        contractId: body.contractId,
        sequenceNo: body.sequenceNo,
        title: body.title.trim(),
        percentage: body.percentage,
        amount: roundMoney(body.amount),
        dueDate: body.dueDate,
        escrowAccountId: body.escrowAccountId,
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.state.scheduleLines = [...this.state.scheduleLines, line].sort(
        (a, b) => a.sequenceNo - b.sequenceNo
      );
      this.persist();
      return { ...line };
    });
  }

  updatePaymentScheduleLine(
    body: UpdatePaymentScheduleLineRequest
  ): Observable<PaymentScheduleLine | void> {
    return this.run(() => {
      const line = this.requireScheduleLine(body.id);
      if (
        this.state.scheduleLines.some(
          (l) =>
            l.id !== body.id &&
            l.contractId === line.contractId &&
            l.sequenceNo === body.sequenceNo
        )
      ) {
        throw this.apiError('sequenceNo must be unique per contract.', 409);
      }
      line.sequenceNo = body.sequenceNo;
      line.title = body.title.trim();
      line.percentage = body.percentage;
      line.amount = roundMoney(body.amount);
      line.dueDate = body.dueDate;
      line.escrowAccountId = body.escrowAccountId;
      line.updatedAt = new Date().toISOString();
      this.persist();
      return { ...line };
    });
  }

  listPaymentScheduleLines(
    query?: PageQuery & { contractId?: string }
  ): Observable<PagedResult<PaymentScheduleLine>> {
    return this.run(() => {
      let items = [...this.state.scheduleLines];
      if (query?.contractId) {
        items = items.filter((l) => l.contractId === query.contractId);
      }
      return this.page(items, query);
    });
  }

  getPaymentScheduleLine(id: string): Observable<PaymentScheduleLine> {
    return this.run(() => ({ ...this.requireScheduleLine(id) }));
  }

  deletePaymentScheduleLine(id: string): Observable<void> {
    return this.run(() => {
      this.requireScheduleLine(id);
      this.state.scheduleLines = this.state.scheduleLines.filter((l) => l.id !== id);
      this.persist();
    });
  }

  createReleaseRequest(body: CreateReleaseRequestRequest): Observable<ReleaseRequest> {
    return this.run(() => {
      const line = this.requireScheduleLine(body.scheduleLineId);
      if (this.state.releaseRequests.some((r) => r.scheduleLineId === body.scheduleLineId)) {
        throw this.apiError('A release request already exists for this schedule line.', 409);
      }
      if (body.requestedAmount > line.amount) {
        throw this.apiError('Requested amount cannot exceed schedule line amount.');
      }
      const stamp = new Date().toISOString();
      const request: ReleaseRequest = {
        id: createUuid(),
        scheduleLineId: body.scheduleLineId,
        requestDate: body.requestDate,
        requestedAmount: roundMoney(body.requestedAmount),
        hasPenalty: body.hasPenalty,
        status: releaseStatusLabel(body.status),
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.state.releaseRequests = [request, ...this.state.releaseRequests];
      pushActivity(this.state, 'release.create', request.id, `Release ${request.requestedAmount}`);
      this.persist();
      return { ...request };
    });
  }

  updateReleaseRequest(body: UpdateReleaseRequestRequest): Observable<ReleaseRequest | void> {
    return this.run(() => {
      const request = this.requireRelease(body.id);
      const line = this.requireScheduleLine(request.scheduleLineId);
      if (body.requestedAmount > line.amount) {
        throw this.apiError('Requested amount cannot exceed schedule line amount.');
      }
      request.requestDate = body.requestDate;
      request.requestedAmount = roundMoney(body.requestedAmount);
      request.hasPenalty = body.hasPenalty;
      request.status = releaseStatusLabel(body.status);
      request.updatedAt = new Date().toISOString();
      this.persist();
      return { ...request };
    });
  }

  listReleaseRequests(query?: PageQuery): Observable<PagedResult<ReleaseRequest>> {
    return this.run(() => this.page(this.state.releaseRequests, query));
  }

  getReleaseRequest(id: string): Observable<ReleaseRequest> {
    return this.run(() => ({ ...this.requireRelease(id) }));
  }

  deleteReleaseRequest(id: string): Observable<void> {
    return this.run(() => {
      this.requireRelease(id);
      this.state.releaseRequests = this.state.releaseRequests.filter((r) => r.id !== id);
      this.state.penalties = this.state.penalties.filter((p) => p.releaseRequestId !== id);
      this.persist();
    });
  }

  createReleaseRequestPenalty(
    body: CreateReleaseRequestPenaltyRequest
  ): Observable<ReleaseRequestPenalty> {
    return this.run(() => {
      const request = this.requireRelease(body.releaseRequestId);
      if (!request.hasPenalty) {
        throw this.apiError('Penalty is only allowed when hasPenalty is true.');
      }
      const stamp = new Date().toISOString();
      const penalty: ReleaseRequestPenalty = {
        id: createUuid(),
        releaseRequestId: body.releaseRequestId,
        penaltyAmount: roundMoney(body.penaltyAmount),
        penaltyPercentage: body.penaltyPercentage,
        daysLate: body.daysLate,
        reason: body.reason,
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.state.penalties = [penalty, ...this.state.penalties];
      this.persist();
      return { ...penalty };
    });
  }

  updateReleaseRequestPenalty(
    body: UpdateReleaseRequestPenaltyRequest
  ): Observable<ReleaseRequestPenalty | void> {
    return this.run(() => {
      const penalty = this.requirePenalty(body.id);
      penalty.penaltyAmount = roundMoney(body.penaltyAmount);
      penalty.penaltyPercentage = body.penaltyPercentage;
      penalty.daysLate = body.daysLate;
      penalty.reason = body.reason;
      penalty.updatedAt = new Date().toISOString();
      this.persist();
      return { ...penalty };
    });
  }

  listReleaseRequestPenalties(
    query?: PageQuery
  ): Observable<PagedResult<ReleaseRequestPenalty>> {
    return this.run(() => this.page(this.state.penalties, query));
  }

  getReleaseRequestPenalty(id: string): Observable<ReleaseRequestPenalty> {
    return this.run(() => ({ ...this.requirePenalty(id) }));
  }

  deleteReleaseRequestPenalty(id: string): Observable<void> {
    return this.run(() => {
      this.requirePenalty(id);
      this.state.penalties = this.state.penalties.filter((p) => p.id !== id);
      this.persist();
    });
  }

  createPaymentLink(body: CreatePaymentLinkRequest): Observable<PaymentLink> {
    return this.run(() => {
      this.requireCustomer(body.customerId);
      if (this.state.paymentLinks.some((l) => l.paymentReferenceId === body.paymentReferenceId)) {
        throw this.apiError('Payment reference already used.', 409);
      }
      const stamp = new Date().toISOString();
      const link: PaymentLink = {
        id: createUuid(),
        paymentReferenceId: body.paymentReferenceId.trim(),
        expiresInMinutes: body.expiresInMinutes,
        customerId: body.customerId,
        amount: roundMoney(body.amount),
        supplierId: body.supplierId,
        paymentUrl: body.paymentUrl || `https://pay.demo.local/${body.paymentReferenceId}`,
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.state.paymentLinks = [link, ...this.state.paymentLinks];
      this.state.paymentStatuses[link.paymentReferenceId] = 'Pending';
      pushActivity(this.state, 'payment-link.create', link.paymentReferenceId, 'Payment link created');
      this.persist();
      return { ...link };
    });
  }

  updatePaymentLink(body: UpdatePaymentLinkRequest): Observable<PaymentLink | void> {
    return this.run(() => {
      const link = this.requirePaymentLink(body.id);
      link.expiresInMinutes = body.expiresInMinutes;
      link.amount = roundMoney(body.amount);
      link.supplierId = body.supplierId;
      link.paymentUrl = body.paymentUrl;
      link.updatedAt = new Date().toISOString();
      this.persist();
      return { ...link };
    });
  }

  listPaymentLinks(query?: PageQuery): Observable<PagedResult<PaymentLink>> {
    return this.run(() => this.page(this.state.paymentLinks, query));
  }

  getPaymentLink(id: string): Observable<PaymentLink> {
    return this.run(() => ({ ...this.requirePaymentLink(id) }));
  }

  deletePaymentLink(id: string): Observable<void> {
    return this.run(() => {
      this.requirePaymentLink(id);
      this.state.paymentLinks = this.state.paymentLinks.filter((l) => l.id !== id);
      this.persist();
    });
  }

  createCustomerPayment(body: CreateCustomerPaymentRequest): Observable<MutationResponse> {
    return this.run(() => {
      const ref = body.paymentReferenceId?.trim() || `CP-${Date.now()}`;
      this.state.paymentStatuses[ref] = body.customerPayments.some((p) => p.isPreAuth)
        ? 'Pending'
        : 'Processing';
      pushActivity(this.state, 'customer.payment', ref, 'Customer payment created');
      this.persist();
      return { id: ref, message: 'Customer payment created successfully.' };
    });
  }

  createSadadPayment(body: CreateSadadPaymentRequest): Observable<MutationResponse> {
    return this.run(() => {
      const ref = body.paymentReferenceId?.trim() || `SD-${Date.now()}`;
      this.state.paymentStatuses[ref] = 'Pending';
      pushActivity(this.state, 'sadad.payment', ref, `SADAD payment ${body.amount}`);
      this.persist();
      return { id: ref, message: 'SADAD payment created successfully.' };
    });
  }

  createSubsequentPayment(body: CreateSubsequentPaymentRequest): Observable<MutationResponse> {
    return this.run(() => {
      const ref = body.paymentReferenceId?.trim() || `SU-${Date.now()}`;
      this.state.paymentStatuses[ref] = 'Pending';
      pushActivity(
        this.state,
        'subsequent.payment',
        ref,
        `Subsequent of ${body.originalPaymentReferenceId}`
      );
      this.persist();
      return { id: ref, message: 'Subsequent payment created successfully.' };
    });
  }

  getPaymentStatus(
    paymentReferenceId: string,
    customerIdentifier?: string | null
  ): Observable<PaymentStatusResponse> {
    return this.run(() => {
      let status = this.state.paymentStatuses[paymentReferenceId] || 'Pending';
      if (status === 'Pending' || status === 'Processing') {
        status = advancePaymentStatus(status);
        this.state.paymentStatuses[paymentReferenceId] = status;
        this.persist();
      }
      return {
        paymentReferenceId,
        status,
        updatedAt: new Date().toISOString(),
        message: this.statusMessage(status as PaymentStatus),
        customerIdentifier: customerIdentifier || undefined,
      };
    });
  }

  capturePayment(body: CapturePaymentRequest): Observable<MutationResponse> {
    return this.run(() => {
      const ref = body.paymentReferenceId || '';
      this.state.paymentStatuses[ref] = 'Completed';
      pushActivity(this.state, 'payment.capture', ref, `Captured ${body.amount ?? ''}`);
      this.persist();
      return { id: ref, message: 'Payment captured successfully.' };
    });
  }

  reversePayment(body: ReversePaymentRequest): Observable<MutationResponse> {
    return this.run(() => {
      const ref = body.paymentReferenceId || '';
      this.state.paymentStatuses[ref] = 'Failed';
      pushActivity(this.state, 'payment.reverse', ref, 'Payment reversed');
      this.persist();
      return { id: ref, message: 'Payment reversed successfully.' };
    });
  }

  refundPayment(body: RefundPaymentRequest): Observable<MutationResponse> {
    return this.run(() => {
      const ref = body.paymentReferenceId || '';
      pushActivity(this.state, 'payment.refund', ref, `Refund ${body.amount ?? ''}`);
      this.persist();
      return { id: ref, message: 'Refund submitted successfully.' };
    });
  }

  refundToIban(body: RefundToIbanRequest): Observable<MutationResponse> {
    return this.run(() => {
      const ref = body.paymentReferenceId || '';
      pushActivity(this.state, 'payment.refund-iban', ref, `Refund to ${body.iban}`);
      this.persist();
      return { id: ref, message: 'IBAN refund submitted successfully.' };
    });
  }

  cancelPaymentLink(body: CancelPaymentLinkRequest): Observable<MutationResponse> {
    return this.run(() => {
      const ref = body.paymentReferenceId || '';
      this.state.paymentStatuses[ref] = 'Failed';
      pushActivity(this.state, 'payment.cancel-link', ref, 'Payment link cancelled');
      this.persist();
      return { id: ref, message: 'Payment link cancelled successfully.' };
    });
  }

  getAuthorityBalance(authorityProfileId: string): Observable<BalanceResponse> {
    return this.run(() => ({
      id: authorityProfileId,
      balance: 24120,
      currency: getRuntimeConfig().currency,
    }));
  }

  listPayments(): Observable<PaymentRecord[]> {
    return this.run(() => [...this.state.payments]);
  }

  getPayment(paymentReferenceId: string): Observable<PaymentRecord> {
    return this.run(() => structuredClone(this.requirePayment(paymentReferenceId)));
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.run(() => ({
      customersCount: this.state.customers.length,
      suppliersCount: this.state.suppliers.length,
      customersBalanceTotal: sumAmounts(this.state.customers.map((c) => c.balance)),
      suppliersBalanceTotal: sumAmounts(this.state.suppliers.map((s) => s.balance)),
      paymentsCount: this.state.payments.length,
      contractsCount: this.state.contracts.length,
      releaseRequestsCount: this.state.releaseRequests.length,
      paymentLinksCount: this.state.paymentLinks.length,
      latestPayment: this.state.payments[0] ?? null,
    }));
  }

  listActivity(): Observable<DemoActivityEntry[]> {
    return this.run(() => [...this.state.activity]);
  }

  resetDemoData(): Observable<void> {
    return this.run(() => {
      this.state = resetStoreState();
    });
  }

  checkHealth(): Observable<boolean> {
    return of(true);
  }

  private run<T>(work: () => T): Observable<T> {
    return timer(getRuntimeConfig().mockLatencyMs).pipe(
      switchMap(() => {
        try {
          return of(work());
        } catch (error) {
          return throwError(() => error);
        }
      })
    );
  }

  private persist(): void {
    saveStoreState(this.state);
  }

  private page<T>(items: T[], query?: PageQuery): PagedResult<T> {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 50;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      page,
      pageSize,
      totalCount: items.length,
    };
  }

  private validatePercentages(body: {
    penaltyPercentage: number;
    sceFeePercentage: number;
    moatamedFeePercentage: number;
    vatPercentage: number;
    totalAmount: number;
  }): void {
    for (const value of [
      body.penaltyPercentage,
      body.sceFeePercentage,
      body.moatamedFeePercentage,
      body.vatPercentage,
    ]) {
      if (value < 0 || value > 100) {
        throw this.apiError('Percentages must be between 0 and 100.');
      }
    }
    if (!body.totalAmount || body.totalAmount <= 0) {
      throw this.apiError('totalAmount must be greater than zero.');
    }
  }

  private requireCustomer(customerId: string): Customer {
    const customer = this.state.customers.find((item) => item.id === customerId);
    if (!customer) throw this.apiError('Customer not found.', 404);
    return customer;
  }

  private requireCustomerByIdentity(identityNumber: string): Customer {
    const customer = this.state.customers.find(
      (item) => item.identityNumber === identityNumber.trim()
    );
    if (!customer) throw this.apiError('No customer was found with this identity number.', 404);
    return customer;
  }

  private requireSupplier(supplierId: string): Supplier {
    const supplier = this.state.suppliers.find((item) => item.id === supplierId);
    if (!supplier) throw this.apiError('Supplier not found.', 404);
    return supplier;
  }

  private requirePayment(paymentReferenceId: string): PaymentRecord {
    const payment = this.state.payments.find((item) => item.paymentReferenceId === paymentReferenceId);
    if (!payment) throw this.apiError('Payment reference not found.', 404);
    return payment;
  }

  private requireEscrow(id: string): EscrowAccount {
    const account = this.state.escrowAccounts.find((item) => item.id === id);
    if (!account) throw this.apiError('Escrow account not found.', 404);
    return account;
  }

  private requireContract(id: string): Contract {
    const contract = this.state.contracts.find((item) => item.id === id);
    if (!contract) throw this.apiError('Contract not found.', 404);
    return contract;
  }

  private requireScheduleLine(id: string): PaymentScheduleLine {
    const line = this.state.scheduleLines.find((item) => item.id === id);
    if (!line) throw this.apiError('Payment schedule line not found.', 404);
    return line;
  }

  private requireRelease(id: string): ReleaseRequest {
    const request = this.state.releaseRequests.find((item) => item.id === id);
    if (!request) throw this.apiError('Release request not found.', 404);
    return request;
  }

  private requirePenalty(id: string): ReleaseRequestPenalty {
    const penalty = this.state.penalties.find((item) => item.id === id);
    if (!penalty) throw this.apiError('Penalty not found.', 404);
    return penalty;
  }

  private requirePaymentLink(id: string): PaymentLink {
    const link = this.state.paymentLinks.find((item) => item.id === id);
    if (!link) throw this.apiError('Payment link not found.', 404);
    return link;
  }

  private ensureUniqueIdentity(identityNumber: string, kind: 'customer' | 'supplier'): void {
    const list = kind === 'customer' ? this.state.customers : this.state.suppliers;
    if (list.some((item) => item.identityNumber === identityNumber.trim())) {
      throw this.apiError(
        kind === 'customer'
          ? 'This customer identity number is already registered.'
          : 'This supplier identity number is already registered.',
        409
      );
    }
  }

  private computeOverallStatus(payment: PaymentRecord): PaymentStatus {
    if (payment.lines.every((line) => line.status === 'Completed')) return 'Completed';
    if (payment.lines.some((line) => line.status === 'Failed')) return 'Failed';
    if (payment.lines.some((line) => line.status === 'Processing' || line.status === 'Completed')) {
      return 'Processing';
    }
    return 'Pending';
  }

  private statusMessage(status: PaymentStatus | string): string {
    switch (status) {
      case 'Pending':
        return 'Payment is awaiting processing.';
      case 'Processing':
        return 'Payment is being processed.';
      case 'Completed':
        return 'Payment completed successfully.';
      case 'Failed':
        return 'Payment failed.';
      default:
        return String(status);
    }
  }

  private apiError(message: string, status = 400): Error {
    return Object.assign(new Error(message), { status });
  }
}
