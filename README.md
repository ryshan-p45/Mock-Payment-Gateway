# Nozow

A local stand-in for [Ozow's](https://ozow.com/integrations) Instant EFT payment gateway. It implements the same
Post Payment Request / HashCheck / NotifyUrl / transaction-status contract as real Ozow, so a VAS API can integrate
against it exactly as it would against Ozow, then point at the real thing later by changing a base URL — no real
money moves, and every payment's outcome (success / cancel / error) is chosen manually or scripted.

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:3000** — it's running. Open **http://localhost:3000/admin** to see the seeded test
merchant's `SiteCode`, `PrivateKey`, and `ApiKey` (needed to sign requests / call the status APIs), create extra
merchants, watch recent transactions, and reset all state. Open **http://localhost:3000/docs** for interactive API
docs (endpoints, schemas, try-it-out) generated from `/openapi.json`.

For a production-like run:

```bash
npm run build
npm run start   # node .output/server/index.mjs
```

## Try it by hand

1. Grab the default merchant's credentials from `/admin` (defaults: `SiteCode=TESTSITE01`,
   `PrivateKey=TestPrivateKey12345`, `ApiKey=TestApiKey12345`, unless you've overridden them via env vars).
2. Compute a `HashCheck` and POST a payment request — e.g. with Node:

   ```js
   const { createHash } = require('node:crypto')
   const privateKey = 'TestPrivateKey12345'
   const fields = {
     SiteCode: 'TESTSITE01', CountryCode: 'ZA', CurrencyCode: 'ZAR', Amount: '100.00',
     TransactionReference: 'REF-001', BankReference: 'BANKREF001',
     Optional1: '', Optional2: '', Optional3: '', Optional4: '', Optional5: '',
     Customer: 'Jane Doe',
     CancelUrl: 'http://localhost:4000/cancel', ErrorUrl: 'http://localhost:4000/error',
     SuccessUrl: 'http://localhost:4000/success', NotifyUrl: 'http://localhost:4000/notify',
     IsTest: 'true',
   }
   const order = ['SiteCode','CountryCode','CurrencyCode','Amount','TransactionReference','BankReference',
     'Optional1','Optional2','Optional3','Optional4','Optional5','Customer','CancelUrl','ErrorUrl',
     'SuccessUrl','NotifyUrl','IsTest']
   const raw = order.map(k => fields[k] ?? '').join('') + privateKey
   const HashCheck = createHash('sha512').update(raw.toLowerCase(), 'utf8').digest('hex')
   console.log({ ...fields, HashCheck })
   ```

3. POST those fields (form-encoded or JSON) to `http://localhost:3000/`. You'll get a `303` redirect to
   `/pay/{transactionId}` — that's the fake hosted payment page.
4. Open that URL in a browser, pick a (fake) bank, then click **Simulate Successful / Cancelled / Failed Payment**.
   This fires your `NotifyUrl` webhook server-to-server, then redirects your browser to `SuccessUrl` / `CancelUrl` /
   `ErrorUrl` with the result appended as query params (same shape as the webhook body), signed with a response
   `Hash`.
5. Check status any time via `GET /GetTransactionByReference?siteCode=...&transactionReference=...` or
   `GET /GetTransaction?siteCode=...&transactionId=...`, both requiring an `ApiKey` header.

The `/admin` page's transaction table also links straight to any still-pending payment page.

## API contract

This mirrors Ozow's documented integration, so existing Ozow client code should work against it unmodified aside
from the base URL.

### `POST /` — Post Payment Request

Form-encoded (or JSON) body:

| Field | Required | Notes |
|---|---|---|
| `SiteCode` | yes | Must match a merchant registered in `/admin` |
| `CountryCode` | yes | Only `ZA` supported |
| `CurrencyCode` | yes | Only `ZAR` supported |
| `Amount` | yes | Decimal string, up to 2 decimal places |
| `TransactionReference` | yes | Your transaction id |
| `BankReference` | yes | Shown to the (fake) customer |
| `IsTest` | yes | `"true"` / `"false"` — echoed back, doesn't change mock behaviour |
| `HashCheck` | yes | See below |
| `Customer`, `Optional1`-`Optional5` | no | Echoed back verbatim |
| `CancelUrl`, `ErrorUrl`, `SuccessUrl`, `NotifyUrl` | no | Where the customer/webhook end up |

On success: `303` redirect to `/pay/{transactionId}`. On failure (missing/invalid field, unknown `SiteCode`, bad
hash): an HTML error page with `400`/`404`.

### HashCheck algorithm

Concatenate these field values in order (missing optional fields as `""`), append the merchant's `PrivateKey`,
lowercase the whole string, then SHA512 it (hex):

```
SiteCode, CountryCode, CurrencyCode, Amount, TransactionReference, BankReference,
Optional1, Optional2, Optional3, Optional4, Optional5, Customer,
CancelUrl, ErrorUrl, SuccessUrl, NotifyUrl, IsTest
```

### NotifyUrl webhook & redirect payload

After an outcome is chosen on the fake payment page, this exact field set is POSTed (form-encoded) to `NotifyUrl`
and also appended as a query string to the `SuccessUrl`/`CancelUrl`/`ErrorUrl` redirect:

```
SiteCode, TransactionId, TransactionReference, Amount, Status, Optional1-5,
CurrencyCode, IsTest, StatusMessage, Hash
```

`Hash` is computed the same way as `HashCheck`, but over this field order (also lowercased + SHA512):

```
SiteCode, TransactionId, TransactionReference, Amount, Status,
Optional1, Optional2, Optional3, Optional4, Optional5, CurrencyCode, IsTest, StatusMessage
```

Your VAS API should recompute this hash and compare before trusting a webhook/redirect — exactly as it would for
real Ozow.

`Status` is one of `Complete`, `Cancelled`, `Error` (an in-flight transaction is `Pending` until resolved on the
fake payment page).

If `NotifyUrl` is unreachable, delivery is attempted once with a 5s timeout and the failure is recorded against the
transaction (visible via the status endpoints' underlying data) — it does not block the browser redirect.

### `GET /GetTransactionByReference?siteCode=&transactionReference=`

Requires header `ApiKey: <merchant apiKey>`. Returns a JSON array (newest first, max 10) of:
`TransactionId, MerchantCode, SiteCode, TransactionReference, CurrencyCode, Amount, Status, StatusMessage,
CreatedDate, PaymentDate`.

### `GET /GetTransaction?siteCode=&transactionId=`

Same auth and same shape, single object. `404` if not found, `401` if `ApiKey` doesn't match.

## What's intentionally different from real Ozow

- Only `ZAR`/`ZA` is accepted (matches Ozow's current live scope, so this isn't a mock-only limitation).
- No real bank list/login — you explicitly pick the outcome on the fake payment page (this mirrors Ozow's own
  `IsTest=true` sandbox behaviour, which also drops you on an outcome-picker instead of doing real banking).
- Only JSON responses from the status endpoints (real Ozow also offers XML via `Accept`).
- Merchants are self-service via `/admin` instead of Ozow's merchant portal — since there's no real Ozow account
  behind this, you register your own `SiteCode`/`PrivateKey`/`ApiKey` locally.
- State is in-memory only and resets on restart (or via the "Reset All Data" button in `/admin`).

## Configuration

Copy `.env.example` to `.env` to override the seeded default merchant's credentials:

```
SEED_SITE_CODE=TESTSITE01
SEED_PRIVATE_KEY=TestPrivateKey12345
SEED_API_KEY=TestApiKey12345
```

## Deploy to Railway

Railway's Railpack builder auto-detects this as a Node app and runs `npm run build` / `npm run start`
(`node .output/server/index.mjs`), which serves SSR pages, server functions, and the API routes above.

1. Push this repo to GitHub.
2. Visit https://railway.com/new and create a project from the repo.
3. In **Variables**, optionally set `SEED_SITE_CODE` / `SEED_PRIVATE_KEY` / `SEED_API_KEY` from `.env.example`.
4. Deploy, then open **Networking** → **Generate Domain**.
5. Point your VAS API's Ozow base URL at the generated domain instead of `pay.ozow.com` / `api.ozow.com`.

Note: state is in-memory, so it resets on every redeploy/restart — expected for a test gateway, but don't rely on
transaction history surviving a deploy.
