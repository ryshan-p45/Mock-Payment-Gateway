import { buildResultPayload } from './format'
import { saveTransaction } from './store'
import type { MerchantConfig, Transaction } from './types'

/** POSTs the result to the merchant's NotifyUrl, mirroring Ozow's server-to-server webhook. */
export async function deliverNotify(transaction: Transaction, merchant: MerchantConfig): Promise<void> {
  if (!transaction.notifyUrl) return

  const payload = buildResultPayload(transaction, merchant)
  const attempt: Transaction['lastNotifyAttempt'] = {
    at: new Date().toISOString(),
    ok: false,
    statusCode: null,
    error: null,
  }

  try {
    const response = await fetch(transaction.notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload).toString(),
      signal: AbortSignal.timeout(5000),
    })
    attempt.ok = response.ok
    attempt.statusCode = response.status
  } catch (error) {
    attempt.error = error instanceof Error ? error.message : String(error)
  }

  transaction.lastNotifyAttempt = attempt
  saveTransaction(transaction)
}
