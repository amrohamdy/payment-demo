import { beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { MockDhamenApi } from './mock-dhamen-api.service';

describe('MockDhamenApi', () => {
  let api: MockDhamenApi;

  beforeEach(async () => {
    localStorage.clear();
    api = new MockDhamenApi();
    await firstValueFrom(api.resetDemoData());
  });

  it('creates customer and deposits money', async () => {
    const created = await firstValueFrom(
      api.createCustomer({
        identityNumber: '1987654321',
        name: 'عميل اختبار',
        iban: 'SA0380000000608010167519',
        email: 'test@example.com',
        mobile: '0511111111',
      })
    );

    const deposit = await firstValueFrom(
      api.depositMoney({
        customerId: created.customerId,
        amount: 200,
        paymentIWalletNumber: null,
      })
    );

    expect(deposit.newBalance).toBe(200);
    const balance = await firstValueFrom(api.getCustomerBalance(created.customerId));
    expect(balance.balance).toBe(200);
  });

  it('rejects payment when customer balance is insufficient', async () => {
    const customers = await firstValueFrom(api.listCustomers());
    const suppliers = await firstValueFrom(api.listSuppliers());
    const customer = customers.items[0];
    const supplier = suppliers.items[0];

    await expect(
      firstValueFrom(
        api.createSupplierPayment({
          paymentReferenceId: 'REF-TEST-FAIL',
          supplierPayments: [
            {
              supplierId: supplier.id,
              amount: customer.balance + 1000,
              customerId: customer.id,
            },
          ],
        })
      )
    ).rejects.toThrow(/enough balance/);
  });

  it('creates payment, updates balances, and advances status', async () => {
    const customers = await firstValueFrom(api.listCustomers());
    const suppliers = await firstValueFrom(api.listSuppliers());
    const customer = customers.items[0];
    const supplier = suppliers.items[0];
    const amount = 100;
    const customerBefore = customer.balance;
    const supplierBefore = supplier.balance;

    const payment = await firstValueFrom(
      api.createSupplierPayment({
        paymentReferenceId: 'REF-TEST-OK',
        supplierPayments: [
          {
            supplierId: supplier.id,
            amount,
            customerId: customer.id,
          },
        ],
      })
    );

    expect(payment.paymentReferenceId).toBe('REF-TEST-OK');

    const customerAfter = await firstValueFrom(api.getCustomerBalance(customer.id));
    const supplierAfter = await firstValueFrom(api.getSupplierBalance(supplier.id));
    expect(customerAfter.balance).toBe(customerBefore - amount);
    expect(supplierAfter.balance).toBe(supplierBefore + amount);

    const status1 = await firstValueFrom(
      api.getSupplierPaymentStatus(supplier.id, 'REF-TEST-OK')
    );
    expect(status1.status).toBe('Processing');

    const status2 = await firstValueFrom(
      api.getSupplierPaymentStatus(supplier.id, 'REF-TEST-OK')
    );
    expect(status2.status).toBe('Completed');
  });

  it('supports platform-funded payment when customerId is null', async () => {
    const suppliers = await firstValueFrom(api.listSuppliers());
    const supplier = suppliers.items[0];
    const before = supplier.balance;

    await firstValueFrom(
      api.createSupplierPayment({
        paymentReferenceId: 'REF-PLATFORM',
        supplierPayments: [
          {
            supplierId: supplier.id,
            amount: 50,
            customerId: null,
          },
        ],
      })
    );

    const after = await firstValueFrom(api.getSupplierBalance(supplier.id));
    expect(after.balance).toBe(before + 50);
  });
});
