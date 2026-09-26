# ضامن | Dhamen Demo

مشروع Angular مستقل يعرض رحلة أعمال منصة **ضامن** بين العملاء والموردين باستخدام عقود الـ APIs التسعة القادمة من الباك اند.

## التشغيل

```bash
npm install
npm start
```

افتح: http://localhost:4200

## السكربتات

| الأمر | الوصف |
|---|---|
| `npm start` | تشغيل الديمو (Mock API) |
| `npm test` | اختبارات الوحدة (Vitest) |
| `npm run build` | بناء الإنتاج |

## فلو الأعمال

1. إنشاء/تحديث عميل
2. إيداع مبلغ في رصيد العميل
3. إنشاء/تحديث مورد مع `payoutThresholdAmount`
4. إنشاء دفعة (`paymentReferenceId` + `supplierPayments[]`)
5. متابعة رصيد المورد وحالة الدفع

## ربط الباك اند لاحقًا

في `src/environments/environment*.ts`:

```ts
apiMode: 'http',
baseUrl: 'https://YOUR-BACKEND-HOST',
```

التفاصيل المطلوبة من الباك اند موثّقة في [`docs/BACKEND_INTEGRATION.md`](docs/BACKEND_INTEGRATION.md).

## التقنيات

- Angular 21 (standalone)
- PrimeNG 21
- Bootstrap 5 (RTL utilities)
- IBM Plex Sans Arabic
- Theme green: `#16845B`
