const paymentRequestSchema = {
  type: 'object',
  required: ['SiteCode', 'CountryCode', 'CurrencyCode', 'Amount', 'TransactionReference', 'BankReference', 'IsTest', 'HashCheck'],
  properties: {
    SiteCode: { type: 'string', description: 'Merchant site code, registered via /admin.', example: 'TESTSITE01' },
    CountryCode: { type: 'string', enum: ['ZA'], example: 'ZA' },
    CurrencyCode: { type: 'string', enum: ['ZAR'], example: 'ZAR' },
    Amount: { type: 'string', description: 'Decimal string, up to 2 decimal places.', example: '100.00' },
    TransactionReference: { type: 'string', description: "Merchant's own transaction id.", example: 'REF-001' },
    BankReference: { type: 'string', description: 'Shown to the customer during payment.', example: 'BANKREF001' },
    IsTest: { type: 'string', enum: ['true', 'false'], description: 'Echoed back; does not change mock behaviour.' },
    HashCheck: {
      type: 'string',
      description:
        'SHA512 hex digest of the lowercased concatenation of SiteCode, CountryCode, CurrencyCode, Amount, ' +
        'TransactionReference, BankReference, Optional1-5, Customer, CancelUrl, ErrorUrl, SuccessUrl, NotifyUrl, ' +
        'IsTest, and the merchant PrivateKey.',
    },
    Customer: { type: 'string', example: 'Jane Doe' },
    Optional1: { type: 'string' },
    Optional2: { type: 'string' },
    Optional3: { type: 'string' },
    Optional4: { type: 'string' },
    Optional5: { type: 'string' },
    CancelUrl: { type: 'string', format: 'uri', description: 'Where the customer is redirected on cancellation.' },
    ErrorUrl: { type: 'string', format: 'uri', description: 'Where the customer is redirected on failure.' },
    SuccessUrl: { type: 'string', format: 'uri', description: 'Where the customer is redirected on success.' },
    NotifyUrl: { type: 'string', format: 'uri', description: 'Server-to-server webhook, called regardless of outcome.' },
  },
} as const

const transactionSchema = {
  type: 'object',
  properties: {
    TransactionId: { type: 'string', format: 'uuid' },
    MerchantCode: { type: 'string', example: 'TESTSITE01' },
    SiteCode: { type: 'string', example: 'TESTSITE01' },
    TransactionReference: { type: 'string', example: 'REF-001' },
    CurrencyCode: { type: 'string', example: 'ZAR' },
    Amount: { type: 'string', example: '100.00' },
    Status: { type: 'string', enum: ['Pending', 'Complete', 'Cancelled', 'Error'] },
    StatusMessage: { type: 'string', example: 'Payment Successful' },
    CreatedDate: { type: 'string', format: 'date-time' },
    PaymentDate: { type: 'string', format: 'date-time', nullable: true },
  },
} as const

const errorSchema = {
  type: 'object',
  properties: { error: { type: 'string' } },
} as const

const notifyPayloadSchema = {
  type: 'object',
  description: "The field set POSTed to NotifyUrl, and appended as query params on the Success/Cancel/Error redirect.",
  properties: {
    SiteCode: { type: 'string' },
    TransactionId: { type: 'string', format: 'uuid' },
    TransactionReference: { type: 'string' },
    Amount: { type: 'string' },
    Status: { type: 'string', enum: ['Complete', 'Cancelled', 'Error'] },
    Optional1: { type: 'string' },
    Optional2: { type: 'string' },
    Optional3: { type: 'string' },
    Optional4: { type: 'string' },
    Optional5: { type: 'string' },
    CurrencyCode: { type: 'string' },
    IsTest: { type: 'string', enum: ['true', 'false'] },
    StatusMessage: { type: 'string' },
    Hash: {
      type: 'string',
      description:
        'SHA512 hex digest of the lowercased concatenation of SiteCode, TransactionId, TransactionReference, ' +
        'Amount, Status, Optional1-5, CurrencyCode, IsTest, StatusMessage, and the merchant PrivateKey. ' +
        'Recompute and compare before trusting this payload.',
    },
  },
} as const

const apiKeyHeader = {
  name: 'ApiKey',
  in: 'header',
  required: true,
  schema: { type: 'string' },
  description: "The merchant's ApiKey, shown in /admin.",
} as const

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Nozow',
    version: '1.0.0',
    description:
      'A mock Instant EFT payment gateway for testing, implementing the same Post Payment Request / HashCheck / ' +
      'NotifyUrl / transaction-status contract as a real EFT gateway. See /admin for merchant credentials.',
  },
  tags: [
    { name: 'Payment', description: 'Initiate and complete a payment.' },
    { name: 'Transaction Status', description: 'Look up a transaction after the fact.' },
  ],
  paths: {
    '/': {
      post: {
        tags: ['Payment'],
        summary: 'Post Payment Request',
        description:
          'Creates a transaction and redirects the browser to the hosted (fake) payment page. Typically ' +
          'submitted as a browser form POST, not called via fetch/XHR from a backend.',
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': { schema: paymentRequestSchema },
            'application/json': { schema: paymentRequestSchema },
          },
        },
        responses: {
          '303': {
            description: 'Payment request accepted; redirect to the hosted payment page.',
            headers: { Location: { schema: { type: 'string', example: '/pay/{transactionId}' } } },
          },
          '400': {
            description: 'Missing/invalid field, unsupported currency or country, or hash mismatch.',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
          '404': {
            description: 'Unknown SiteCode.',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/GetTransactionByReference': {
      get: {
        tags: ['Transaction Status'],
        summary: 'Get transactions by merchant reference',
        parameters: [
          { name: 'siteCode', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'transactionReference', in: 'query', required: true, schema: { type: 'string' } },
          apiKeyHeader,
        ],
        responses: {
          '200': {
            description: 'Up to 10 matching transactions, newest first.',
            content: { 'application/json': { schema: { type: 'array', items: transactionSchema } } },
          },
          '400': { description: 'Missing query parameters.', content: { 'application/json': { schema: errorSchema } } },
          '401': { description: 'Missing or incorrect ApiKey.', content: { 'application/json': { schema: errorSchema } } },
          '404': { description: 'Unknown siteCode.', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
    '/GetTransaction': {
      get: {
        tags: ['Transaction Status'],
        summary: 'Get a transaction by id',
        parameters: [
          { name: 'siteCode', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'transactionId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          apiKeyHeader,
        ],
        responses: {
          '200': {
            description: 'The matching transaction.',
            content: { 'application/json': { schema: transactionSchema } },
          },
          '400': { description: 'Missing query parameters.', content: { 'application/json': { schema: errorSchema } } },
          '401': { description: 'Missing or incorrect ApiKey.', content: { 'application/json': { schema: errorSchema } } },
          '404': { description: 'Unknown siteCode or transactionId.', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
  },
  webhooks: {
    NotifyUrl: {
      post: {
        tags: ['Payment'],
        summary: "Called by Nozow on the merchant's NotifyUrl once a payment is resolved",
        description:
          'Not an endpoint this server exposes — this documents the request Nozow sends TO the NotifyUrl you ' +
          'supplied in the Post Payment Request. Delivered once, with a 5s timeout, and not retried on failure.',
        requestBody: {
          content: { 'application/x-www-form-urlencoded': { schema: notifyPayloadSchema } },
        },
        responses: { '200': { description: 'Any response is accepted; the body is ignored.' } },
      },
    },
  },
} as const
