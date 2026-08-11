import { createHash } from 'node:crypto'

// Point these at a deployed instance with NOZOW_BASE_URL etc. — defaults match local `npm run dev`.
const baseUrl = process.env.NOZOW_BASE_URL || 'http://localhost:3000'
const siteCode = process.env.NOZOW_SITE_CODE || 'TESTSITE01'
const privateKey = process.env.NOZOW_PRIVATE_KEY || 'TestPrivateKey12345'
// NotifyUrl in particular must be reachable FROM the gateway, not from your machine —
// localhost only works when the gateway itself is running locally too.
const callbackBase = process.env.NOZOW_CALLBACK_BASE || 'http://localhost:4000'

const fields = {
  SiteCode: siteCode, CountryCode: 'ZA', CurrencyCode: 'ZAR', Amount: '100.00',
  TransactionReference: 'REF-001', BankReference: 'BANKREF001',
  Optional1: '', Optional2: '', Optional3: '', Optional4: '', Optional5: '',
  Customer: 'Jane Doe',
  CancelUrl: `${callbackBase}/cancel`, ErrorUrl: `${callbackBase}/error`,
  SuccessUrl: `${callbackBase}/success`, NotifyUrl: `${callbackBase}/notify`,
  IsTest: 'true',
}
const order = ['SiteCode','CountryCode','CurrencyCode','Amount','TransactionReference','BankReference',
  'Optional1','Optional2','Optional3','Optional4','Optional5','Customer','CancelUrl','ErrorUrl',
  'SuccessUrl','NotifyUrl','IsTest']
const raw = order.map(k => fields[k] ?? '').join('') + privateKey
const HashCheck = createHash('sha512').update(raw.toLowerCase(), 'utf8').digest('hex')

console.log(JSON.stringify({ ...fields, HashCheck }))
console.error(`\n# POST to: ${baseUrl}/`)
