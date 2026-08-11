import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { createMerchant, listMerchants, listTransactions, resetStore } from '@/lib/nozow/store'

const getAdminData = createServerFn({ method: 'GET' }).handler(() => ({
  merchants: listMerchants(),
  transactions: listTransactions(),
}))

const createMerchantFn = createServerFn({ method: 'POST' })
  .validator((name: string) => name)
  .handler(({ data: name }) => createMerchant(name))

const resetStoreFn = createServerFn({ method: 'POST' }).handler(() => {
  resetStore()
  return { ok: true }
})

export const Route = createFileRoute('/admin')({
  component: AdminPage,
  loader: () => getAdminData(),
})

function AdminPage() {
  const { merchants, transactions } = Route.useLoaderData()
  const router = useRouter()
  const createMerchantCall = useServerFn(createMerchantFn)
  const resetStoreCall = useServerFn(resetStoreFn)
  const [name, setName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await createMerchantCall({ data: name })
    setName('')
    await router.invalidate()
  }

  async function handleReset() {
    if (!window.confirm('This clears all merchants and transactions (a fresh default merchant is reseeded). Continue?')) return
    await resetStoreCall()
    await router.invalidate()
  }

  return (
    <main className="admin-page">
      <span className="badge-mock">MOCK GATEWAY</span>
      <h1>Admin</h1>
      <p>
        <a href="/">&larr; Back</a>
      </p>

      <section>
        <h2>Merchants</h2>
        <p>Use a SiteCode/PrivateKey pair below to sign Post Payment Requests, and its ApiKey to call the status endpoints.</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Site Code</th>
                <th>Name</th>
                <th>Private Key</th>
                <th>Api Key</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => (
                <tr key={m.siteCode}>
                  <td>
                    <code>{m.siteCode}</code>
                  </td>
                  <td>{m.name}</td>
                  <td>
                    <code>{m.privateKey}</code>
                  </td>
                  <td>
                    <code>{m.apiKey}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleCreate} className="inline-form">
          <input
            type="text"
            placeholder="Merchant name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-secondary">
            Create Merchant
          </button>
        </form>
      </section>

      <section>
        <h2>Recent Transactions</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Transaction Id</th>
                <th>Site Code</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.transactionId}>
                  <td>
                    <code>{t.transactionId.slice(0, 8)}&hellip;</code>
                  </td>
                  <td>{t.siteCode}</td>
                  <td>{t.transactionReference}</td>
                  <td>R {t.amount}</td>
                  <td>{t.status}</td>
                  <td>{new Date(t.createdDate).toLocaleString()}</td>
                  <td>{t.status === 'Pending' && <a href={`/pay/${t.transactionId}`}>Open</a>}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7}>No transactions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <button className="btn btn-danger" onClick={handleReset}>
          Reset All Data
        </button>
      </section>
    </main>
  )
}
