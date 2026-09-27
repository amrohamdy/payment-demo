# Backend integration

The Angular demo covers the full Dhamen API surface from `swagger.json` / `API_REFERENCE.md`.

## Modes

| Mode | How | Notes |
|---|---|---|
| **Mock** (default in development) | `apiMode: 'mock'` | Full sandbox in `localStorage` (`dhamen-demo-store-v2`) |
| **HTTP** | `apiMode: 'http'` + live `baseUrl` | Calls `/api/dhamen/...` on the backend host |

Switch without rebuild:

1. UI: **API settings** (`/settings`) — save base URL / mode (reloads app)
2. Or edit `public/runtime-config.json` on the deployed host
3. Or set `src/environments/environment*.ts`

```json
{
  "apiMode": "http",
  "baseUrl": "https://YOUR-BACKEND-HOST",
  "currency": "SAR",
  "authorityProfileId": null
}
```

`baseUrl` is the **host only** (e.g. `https://localhost:7134`). Paths are always `/api/dhamen/...`. Health probe uses `/health`.

## Domains wired

- Customers / Suppliers (CRUD, deposit, balances, supplier payments + status)
- Escrow accounts, Contracts, Payment schedule lines
- Release requests + penalties
- Payment links
- Payments lifecycle: customer, SADAD, subsequent, status, capture, reverse, refund, refund/iban, cancel-link
- Authority balance (when `authorityProfileId` is set)

## Known backend gaps (demo compensates in UI)

- No payment history list/detail API → local activity ledger in HTTP mode
- No FK / cross-field rules enforced server-side → frontend validation (schedule % = 100, release ≤ line amount, penalty only if `hasPenalty`)
- No contract↔party or release↔payout link → Demo Wizard keeps a **demo context** of IDs
- PUT/DELETE may return `200` or `204` → HTTP client accepts both
- Auth not documented → interceptor hook ready for Bearer token

## Pages

| Route | Purpose |
|---|---|
| `/dashboard` | Counts, balances, activity, health |
| `/customers`, `/suppliers` | Parties |
| `/escrow-accounts`, `/contracts` | Escrow setup + schedule editor |
| `/release-requests` | Approvals + penalties |
| `/payment-links` | Collect links |
| `/payments` | Supplier payouts + pay-in lifecycle hub |
| `/payouts-splits` | Split supplier payouts |
| `/demo-wizard` | Full happy-path story |
| `/settings` | Runtime API config + health |

## Go-live checklist

1. Backend reachable (CORS allows the frontend origin; valid TLS if HTTPS)
2. Set `apiMode: 'http'` and correct `baseUrl`
3. Confirm `/health` (or `GET /api/dhamen/customers?page=1`) succeeds
4. Smoke: create customer → escrow → contract → schedule → payment link → release → supplier payout
