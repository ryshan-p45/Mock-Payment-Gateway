import { createFileRoute } from '@tanstack/react-router'

import { verifyRequestHash } from '@/lib/nozow/hash'
import { errorPage, parseBody } from '@/lib/nozow/http'
import { getMerchant, newTransactionId, saveTransaction } from '@/lib/nozow/store'
import type { PaymentRequestFields, Transaction } from '@/lib/nozow/types'

const REQUIRED_FIELDS = [
  'SiteCode',
  'CountryCode',
  'CurrencyCode',
  'Amount',
  'TransactionReference',
  'BankReference',
  'IsTest',
  'HashCheck',
] as const

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

export const Route = createFileRoute('/')({
  component: Home,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await parseBody(request)) as unknown as PaymentRequestFields

        const missing = REQUIRED_FIELDS.filter((field) => !body[field])
        if (missing.length > 0) {
          return errorPage('Invalid Payment Request', `Missing required field(s): ${missing.join(', ')}.`)
        }

        if (body.CountryCode !== 'ZA' || body.CurrencyCode !== 'ZAR') {
          return errorPage(
            'Invalid Payment Request',
            'This mock only supports CountryCode "ZA" and CurrencyCode "ZAR".',
          )
        }

        if (!AMOUNT_PATTERN.test(body.Amount) || Number(body.Amount) <= 0) {
          return errorPage('Invalid Payment Request', 'Amount must be a positive decimal with up to 2 decimal places.')
        }

        const merchant = getMerchant(body.SiteCode)
        if (!merchant) {
          return errorPage('Unknown Site Code', `No merchant is registered for SiteCode "${body.SiteCode}". Register one at /admin.`, 404)
        }

        if (!verifyRequestHash(body, merchant.privateKey)) {
          return errorPage('Hash Mismatch', 'HashCheck did not match the expected signature for this SiteCode’s private key.', 400)
        }

        const transaction: Transaction = {
          transactionId: newTransactionId(),
          siteCode: body.SiteCode,
          transactionReference: body.TransactionReference,
          bankReference: body.BankReference,
          amount: body.Amount,
          currencyCode: body.CurrencyCode,
          countryCode: body.CountryCode,
          status: 'Pending',
          statusMessage: 'Awaiting customer action',
          isTest: body.IsTest === 'true',
          optional1: body.Optional1 ?? '',
          optional2: body.Optional2 ?? '',
          optional3: body.Optional3 ?? '',
          optional4: body.Optional4 ?? '',
          optional5: body.Optional5 ?? '',
          customer: body.Customer ?? '',
          cancelUrl: body.CancelUrl ?? '',
          errorUrl: body.ErrorUrl ?? '',
          successUrl: body.SuccessUrl ?? '',
          notifyUrl: body.NotifyUrl ?? '',
          createdDate: new Date().toISOString(),
          paymentDate: null,
          bankSelected: null,
          lastNotifyAttempt: null,
        }
        saveTransaction(transaction)

        return new Response(null, {
          status: 303,
          headers: { Location: `/pay/${transaction.transactionId}` },
        })
      },
    },
  },
})

function Home() {
  return (
    <main className="landing">
      <span className="badge-mock">MOCK GATEWAY</span>
      <h1>Nozow</h1>
      <p>
        A drop-in stand-in for an Instant EFT payment gateway, for testing payments without moving real money. Point
        your VAS API's payment gateway base URL at this server and it behaves like the real thing's Post Payment
        Request, NotifyUrl, and transaction status APIs.
      </p>
      <ul>
        <li>
          <a href="/docs">API docs</a>
        </li>
        <li>
          <a href="/admin">Merchant admin &amp; recent transactions</a>
        </li>
      </ul>
    </main>
  )
}
