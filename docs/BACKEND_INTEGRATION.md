# Backend integration checklist

الواجهة جاهزة للعقود التسعة التالية. غيّر `apiMode` إلى `http` وضع `baseUrl` عند توفر السيرفر.

## Endpoints

| # | Method | Path | Body |
|---|---|---|---|
| 01 | POST | `/api/dhamen/customers` | identityNumber, name, iban, email, mobile |
| 02 | PUT | `/api/dhamen/customers` | same as create (identity as key) |
| 03 | POST | `/api/dhamen/customers/deposit` | customerId, amount, paymentIWalletNumber |
| 04 | GET | `/api/dhamen/customers/{customerId}/balance` | — |
| 05 | POST | `/api/dhamen/suppliers` | name, iban, identityNumber, payoutThresholdAmount, email, mobile |
| 06 | PUT | `/api/dhamen/suppliers` | supplierId + supplier fields |
| 07 | POST | `/api/dhamen/suppliers/payments` | paymentReferenceId, supplierPayments[] |
| 08 | GET | `/api/dhamen/suppliers/{supplierId}/balance` | — |
| 09 | GET | `/api/dhamen/suppliers/{supplierId}/payments/{paymentReferenceId}/status` | — |

## ما نحتاجه من الباك اند قبل التحويل الكامل

1. **Response schema** لكل endpoint (خصوصًا `customerId` / `supplierId` / balance / status).
2. **قيم حالة الدفع** الرسمية (حاليًا الديمو يستخدم: `Pending | Processing | Completed | Failed`).
3. معنى **`customerId: null`** داخل `supplierPayments` (الديمو يعرضه كتمويل من المنصة).
4. قواعد **`payoutThresholdAmount`** — هل مجرد مؤشر أم يطلق تسوية بنكية؟
5. **Validation rules**: IBAN، الجوال، رقم الهوية، حدود المبالغ، العملة.
6. **Auth**: نوع التوكن وheader المطلوب (مكان جاهز في `dhamenHttpInterceptor`).
7. Endpoints إضافية مفيدة للديمو الكامل:
   - list customers / suppliers / payments
   - get customer / supplier by id
   - payment history

## تبديل الوضع

```ts
// src/environments/environment.development.ts
export const environment = {
  production: false,
  apiMode: 'http', // أو 'mock'
  baseUrl: 'https://YOUR-BACKEND-HOST',
  currency: 'SAR',
  mockLatencyMs: 350,
};
```

تنفيذ HTTP موجود في `src/app/core/api/http-dhamen-api.service.ts`.
تنفيذ Mock موجود في `src/app/core/api/mock-dhamen-api.service.ts`.
