import { createFileRoute } from '@tanstack/react-router'

import { getMerchant, getTransaction } from '@/lib/nozow/store'

export const Route = createFileRoute('/GetTransaction')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const siteCode = url.searchParams.get('siteCode')
        const transactionId = url.searchParams.get('transactionId')

        if (!siteCode || !transactionId) {
          return Response.json({ error: 'siteCode and transactionId query parameters are required.' }, { status: 400 })
        }

        const merchant = getMerchant(siteCode)
        if (!merchant) {
          return Response.json({ error: 'Unknown siteCode.' }, { status: 404 })
        }

        const apiKey = request.headers.get('ApiKey')
        if (apiKey !== merchant.apiKey) {
          return Response.json({ error: 'Invalid or missing ApiKey header.' }, { status: 401 })
        }

        const transaction = getTransaction(transactionId)
        if (!transaction || transaction.siteCode !== siteCode) {
          return Response.json({ error: 'Transaction not found.' }, { status: 404 })
        }

        return Response.json({
          TransactionId: transaction.transactionId,
          MerchantCode: transaction.siteCode,
          SiteCode: transaction.siteCode,
          TransactionReference: transaction.transactionReference,
          CurrencyCode: transaction.currencyCode,
          Amount: transaction.amount,
          Status: transaction.status,
          StatusMessage: transaction.statusMessage,
          CreatedDate: transaction.createdDate,
          PaymentDate: transaction.paymentDate,
        })
      },
    },
  },
})
