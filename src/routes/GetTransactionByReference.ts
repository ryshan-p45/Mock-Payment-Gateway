import { createFileRoute } from '@tanstack/react-router'

import { getMerchant, findTransactionsByReference } from '@/lib/nozow/store'
import type { Transaction } from '@/lib/nozow/types'

function toResponseObject(t: Transaction) {
  return {
    TransactionId: t.transactionId,
    MerchantCode: t.siteCode,
    SiteCode: t.siteCode,
    TransactionReference: t.transactionReference,
    CurrencyCode: t.currencyCode,
    Amount: t.amount,
    Status: t.status,
    StatusMessage: t.statusMessage,
    CreatedDate: t.createdDate,
    PaymentDate: t.paymentDate,
  }
}

export const Route = createFileRoute('/GetTransactionByReference')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const siteCode = url.searchParams.get('siteCode')
        const transactionReference = url.searchParams.get('transactionReference')

        if (!siteCode || !transactionReference) {
          return Response.json({ error: 'siteCode and transactionReference query parameters are required.' }, { status: 400 })
        }

        const merchant = getMerchant(siteCode)
        if (!merchant) {
          return Response.json({ error: 'Unknown siteCode.' }, { status: 404 })
        }

        const apiKey = request.headers.get('ApiKey')
        if (apiKey !== merchant.apiKey) {
          return Response.json({ error: 'Invalid or missing ApiKey header.' }, { status: 401 })
        }

        const results = findTransactionsByReference(siteCode, transactionReference).map(toResponseObject)
        return Response.json(results)
      },
    },
  },
})
