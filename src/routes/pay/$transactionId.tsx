import { createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { appendQuery, buildResultPayload } from '@/lib/nozow/format'
import { deliverNotify } from '@/lib/nozow/notify'
import { getMerchant, getTransaction } from '@/lib/nozow/store'
import type { PaymentOutcome } from '@/lib/nozow/types'

const FAKE_BANKS = ['ABC Bank', 'Mock National Bank', 'Cape Trust Bank', 'Southern Cross Savings', 'Ubuntu Community Bank'] as const

const getPayView = createServerFn({ method: 'GET' })
  .validator((transactionId: string) => transactionId)
  .handler(({ data: transactionId }) => {
    const transaction = getTransaction(transactionId)
    if (!transaction) return { transaction: null, merchantName: null }
    const merchant = getMerchant(transaction.siteCode)
    return { transaction, merchantName: merchant?.name ?? transaction.siteCode }
  })

const resolvePayment = createServerFn({ method: 'POST' })
  .validator((data: { transactionId: string; outcome: PaymentOutcome; bank: string }) => data)
  .handler(async ({ data }) => {
    const transaction = getTransaction(data.transactionId)
    if (!transaction) throw new Error('Transaction not found')
    const merchant = getMerchant(transaction.siteCode)
    if (!merchant) throw new Error('Merchant not found')

    if (transaction.status === 'Pending') {
      transaction.status = data.outcome
      transaction.bankSelected = data.bank
      transaction.statusMessage =
        data.outcome === 'Complete'
          ? 'Payment Successful'
          : data.outcome === 'Cancelled'
            ? 'Cancelled by customer'
            : 'An error occurred processing the payment'
      transaction.paymentDate = data.outcome === 'Complete' ? new Date().toISOString() : null
      await deliverNotify(transaction, merchant)
    }

    const payload = buildResultPayload(transaction, merchant)
    const redirectBase =
      transaction.status === 'Complete'
        ? transaction.successUrl
        : transaction.status === 'Cancelled'
          ? transaction.cancelUrl
          : transaction.errorUrl

    return { redirectUrl: redirectBase ? appendQuery(redirectBase, payload) : null, payload }
  })

export const Route = createFileRoute('/pay/$transactionId')({
  component: PayPage,
  loader: ({ params }) => getPayView({ data: params.transactionId }),
})

function PayPage() {
  const { transaction, merchantName } = Route.useLoaderData()
  const resolve = useServerFn(resolvePayment)
  const [bank, setBank] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof resolvePayment>> | null>(null)

  if (!transaction) {
    return (
      <main className="pay-page">
        <span className="badge-mock">MOCK GATEWAY</span>
        <h1>Payment Not Found</h1>
        <p>No transaction exists for this link. It may have expired if the server restarted.</p>
      </main>
    )
  }

  const status = result ? result.payload.Status : transaction.status

  async function chooseOutcome(outcome: PaymentOutcome) {
    if (!bank) return
    setSubmitting(true)
    const res = await resolve({ data: { transactionId: transaction.transactionId, outcome, bank } })
    setResult(res)
    if (res.redirectUrl) {
      window.location.href = res.redirectUrl
    } else {
      setSubmitting(false)
    }
  }

  if (status !== 'Pending') {
    return (
      <main className="pay-page">
        <span className="badge-mock">MOCK GATEWAY</span>
        <h1>Payment Already Resolved</h1>
        <p>
          This transaction is already <strong>{status}</strong>.
        </p>
        {result && !result.redirectUrl && <p>No redirect URL was configured for this outcome, so nothing to redirect to.</p>}
      </main>
    )
  }

  return (
    <main className="pay-page">
      <span className="badge-mock">MOCK GATEWAY &mdash; TEST MODE</span>
      <div className="pay-card">
        <h1>Pay {merchantName}</h1>
        <p className="pay-amount">R {transaction.amount}</p>
        <dl className="pay-meta">
          <dt>Reference</dt>
          <dd>{transaction.bankReference}</dd>
          <dt>Transaction Ref</dt>
          <dd>{transaction.transactionReference}</dd>
        </dl>

        {!bank ? (
          <>
            <h2>Select your bank</h2>
            <div className="bank-list">
              {FAKE_BANKS.map((b) => (
                <button key={b} className="bank-btn" onClick={() => setBank(b)}>
                  {b}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2>Simulate outcome</h2>
            <p>Simulating login to {bank}. Choose what should happen next:</p>
            <div className="outcome-buttons">
              <button className="btn btn-success" disabled={submitting} onClick={() => chooseOutcome('Complete')}>
                Simulate Successful Payment
              </button>
              <button className="btn btn-secondary" disabled={submitting} onClick={() => chooseOutcome('Cancelled')}>
                Simulate Cancelled Payment
              </button>
              <button className="btn btn-danger" disabled={submitting} onClick={() => chooseOutcome('Error')}>
                Simulate Failed Payment
              </button>
            </div>
            <button className="link-btn" disabled={submitting} onClick={() => setBank(null)}>
              &larr; Choose a different bank
            </button>
          </>
        )}
      </div>
    </main>
  )
}
