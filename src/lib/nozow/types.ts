export type TransactionStatus = 'Pending' | 'Complete' | 'Cancelled' | 'Error'

export interface MerchantConfig {
  siteCode: string
  name: string
  privateKey: string
  apiKey: string
  createdAt: string
}

export interface Transaction {
  transactionId: string
  siteCode: string
  transactionReference: string
  bankReference: string
  amount: string
  currencyCode: string
  countryCode: string
  status: TransactionStatus
  statusMessage: string
  isTest: boolean
  optional1: string
  optional2: string
  optional3: string
  optional4: string
  optional5: string
  customer: string
  cancelUrl: string
  errorUrl: string
  successUrl: string
  notifyUrl: string
  createdDate: string
  paymentDate: string | null
  bankSelected: string | null
  lastNotifyAttempt: {
    at: string
    ok: boolean
    statusCode: number | null
    error: string | null
  } | null
}

/** Raw form fields as posted to the "Post Payment Request" endpoint (mirrors Ozow's contract). */
export interface PaymentRequestFields {
  SiteCode: string
  CountryCode: string
  CurrencyCode: string
  Amount: string
  TransactionReference: string
  BankReference: string
  Customer?: string
  Optional1?: string
  Optional2?: string
  Optional3?: string
  Optional4?: string
  Optional5?: string
  CancelUrl?: string
  ErrorUrl?: string
  SuccessUrl?: string
  NotifyUrl?: string
  IsTest: string
  HashCheck: string
}

export type PaymentOutcome = 'Complete' | 'Cancelled' | 'Error'
