import { computeResponseHash } from './hash'
import type { MerchantConfig, Transaction } from './types'

/** The field set Ozow sends on both the NotifyUrl POST and the browser redirect query string. */
export function buildResultPayload(transaction: Transaction, merchant: MerchantConfig): Record<string, string> {
  return {
    SiteCode: transaction.siteCode,
    TransactionId: transaction.transactionId,
    TransactionReference: transaction.transactionReference,
    Amount: transaction.amount,
    Status: transaction.status,
    Optional1: transaction.optional1,
    Optional2: transaction.optional2,
    Optional3: transaction.optional3,
    Optional4: transaction.optional4,
    Optional5: transaction.optional5,
    CurrencyCode: transaction.currencyCode,
    IsTest: String(transaction.isTest),
    StatusMessage: transaction.statusMessage,
    Hash: computeResponseHash(transaction, merchant.privateKey),
  }
}

export function appendQuery(url: string, params: Record<string, string>): string {
  const separator = url.includes('?') ? '&' : '?'
  const query = new URLSearchParams(params).toString()
  return `${url}${separator}${query}`
}
