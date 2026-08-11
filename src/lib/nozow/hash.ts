import { createHash } from 'node:crypto'

import type { PaymentRequestFields, Transaction } from './types'

/**
 * Ozow's HashCheck algorithm: concatenate field values in a fixed order,
 * append the merchant's private key, lowercase the entire string, then SHA512 it.
 * Both the request hash and the response/notify hash follow this same recipe,
 * just with different field orders.
 */
function sha512Lower(input: string): string {
  return createHash('sha512').update(input.toLowerCase(), 'utf8').digest('hex')
}

function buildHash(fields: Array<string | undefined>, privateKey: string): string {
  const concatenated = fields.map((f) => f ?? '').join('') + privateKey
  return sha512Lower(concatenated)
}

/** Field order for the Post Payment Request HashCheck. */
export function requestHashFields(p: PaymentRequestFields): Array<string | undefined> {
  return [
    p.SiteCode,
    p.CountryCode,
    p.CurrencyCode,
    p.Amount,
    p.TransactionReference,
    p.BankReference,
    p.Optional1,
    p.Optional2,
    p.Optional3,
    p.Optional4,
    p.Optional5,
    p.Customer,
    p.CancelUrl,
    p.ErrorUrl,
    p.SuccessUrl,
    p.NotifyUrl,
    p.IsTest,
  ]
}

export function computeRequestHash(p: PaymentRequestFields, privateKey: string): string {
  return buildHash(requestHashFields(p), privateKey)
}

export function verifyRequestHash(p: PaymentRequestFields, privateKey: string): boolean {
  return computeRequestHash(p, privateKey).toLowerCase() === (p.HashCheck ?? '').toLowerCase()
}

/** Field order for the NotifyUrl / redirect response Hash. */
export function responseHashFields(t: Transaction): Array<string | undefined> {
  return [
    t.siteCode,
    t.transactionId,
    t.transactionReference,
    t.amount,
    t.status,
    t.optional1,
    t.optional2,
    t.optional3,
    t.optional4,
    t.optional5,
    t.currencyCode,
    String(t.isTest),
    t.statusMessage,
  ]
}

export function computeResponseHash(t: Transaction, privateKey: string): string {
  return buildHash(responseHashFields(t), privateKey)
}
