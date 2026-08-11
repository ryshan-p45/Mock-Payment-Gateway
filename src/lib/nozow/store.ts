import { randomBytes, randomUUID } from 'node:crypto'

import type { MerchantConfig, Transaction } from './types'

interface Store {
  merchants: Map<string, MerchantConfig>
  transactions: Map<string, Transaction>
}

// Survive Vite's dev-server HMR, which would otherwise re-run this module and wipe state.
const globalForStore = globalThis as unknown as { __nozowStore?: Store }

function createRandomKey(): string {
  return randomBytes(16).toString('hex')
}

function seedDefaultMerchant(store: Store) {
  const siteCode = process.env.SEED_SITE_CODE || 'TESTSITE01'
  const privateKey = process.env.SEED_PRIVATE_KEY || 'TestPrivateKey12345'
  const apiKey = process.env.SEED_API_KEY || 'TestApiKey12345'

  store.merchants.set(siteCode, {
    siteCode,
    name: 'Default Test Merchant',
    privateKey,
    apiKey,
    createdAt: new Date(0).toISOString(),
  })
}

function initStore(): Store {
  const store: Store = { merchants: new Map(), transactions: new Map() }
  seedDefaultMerchant(store)
  return store
}

export const store = globalForStore.__nozowStore ?? (globalForStore.__nozowStore = initStore())

export function getMerchant(siteCode: string): MerchantConfig | undefined {
  return store.merchants.get(siteCode)
}

export function listMerchants(): MerchantConfig[] {
  return Array.from(store.merchants.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function createMerchant(name: string): MerchantConfig {
  const siteCode = `SITE${createRandomKey().slice(0, 8).toUpperCase()}`
  const merchant: MerchantConfig = {
    siteCode,
    name: name || siteCode,
    privateKey: createRandomKey(),
    apiKey: createRandomKey(),
    createdAt: new Date().toISOString(),
  }
  store.merchants.set(siteCode, merchant)
  return merchant
}

export function saveTransaction(transaction: Transaction) {
  store.transactions.set(transaction.transactionId, transaction)
}

export function getTransaction(transactionId: string): Transaction | undefined {
  return store.transactions.get(transactionId)
}

export function findTransactionsByReference(siteCode: string, transactionReference: string): Transaction[] {
  return Array.from(store.transactions.values())
    .filter((t) => t.siteCode === siteCode && t.transactionReference === transactionReference)
    .sort((a, b) => b.createdDate.localeCompare(a.createdDate))
    .slice(0, 10)
}

export function listTransactions(limit = 50): Transaction[] {
  return Array.from(store.transactions.values())
    .sort((a, b) => b.createdDate.localeCompare(a.createdDate))
    .slice(0, limit)
}

export function resetStore() {
  store.transactions.clear()
  store.merchants.clear()
  seedDefaultMerchant(store)
}

export function newTransactionId(): string {
  return randomUUID()
}
