# Xero API Integration Research for MadeBuy

**Date:** 2026-01-01
**Purpose:** Australian small business accounting integration for marketplace sales

---

## 1. Xero OAuth2 Authentication Flow

### Token Lifecycle
| Token Type | Expiration | Notes |
|------------|------------|-------|
| Access Token | 30 minutes | Must refresh before expiry |
| Refresh Token | 60 days (unused) | 30-minute grace period after use |
| Authorization | Indefinite | Until user revokes |

### OAuth2 Setup with xero-node SDK

```typescript
import { XeroClient, Invoice } from 'xero-node';

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: [`${process.env.APP_URL}/api/xero/callback`],
  scopes: [
    'openid',
    'profile',
    'email',
    'accounting.settings',
    'accounting.transactions',
    'accounting.contacts',
    'accounting.reports.read',
    'offline_access'  // Required for refresh tokens
  ].join(' ')
});

// Initialize client
await xero.initialize();
```

### Authorization Flow

```typescript
// Step 1: Generate consent URL and redirect user
app.get('/api/xero/connect', async (req, res) => {
  const consentUrl = await xero.buildConsentUrl();
  res.redirect(consentUrl);
});

// Step 2: Handle callback and exchange code for tokens
app.get('/api/xero/callback', async (req, res) => {
  const tokenSet = await xero.apiCallback(req.url);

  // Store tokens securely (encrypt in database)
  await storeTokens(req.user.id, {
    accessToken: tokenSet.access_token,
    refreshToken: tokenSet.refresh_token,
    expiresAt: tokenSet.expires_at,
    tenantId: xero.tenants[0]?.tenantId
  });

  res.redirect('/settings/accounting?connected=true');
});
```

### Token Refresh Pattern

```typescript
// Recommended: Check and refresh before API calls
async function getXeroClient(userId: string): Promise<XeroClient> {
  const tokens = await getStoredTokens(userId);

  await xero.setTokenSet(tokens);

  // Check if token expired or expiring soon (5 min buffer)
  const expiresIn = tokens.expiresAt - Date.now() / 1000;
  if (expiresIn < 300) {
    const newTokenSet = await xero.refreshToken();
    await storeTokens(userId, {
      accessToken: newTokenSet.access_token,
      refreshToken: newTokenSet.refresh_token,  // IMPORTANT: Store new refresh token
      expiresAt: newTokenSet.expires_at,
      tenantId: tokens.tenantId
    });
  }

  await xero.updateTenants();
  return xero;
}
```

### Token Refresh Error Handling

```typescript
async function refreshWithRetry(xero: XeroClient, maxRetries = 3): Promise<TokenSet> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await xero.refreshToken();
    } catch (error) {
      if (attempt === maxRetries) {
        // Refresh token may be expired (60 days) - user needs to re-authorize
        throw new XeroReauthorizationRequired();
      }
      // Wait before retry (30-minute grace period on failed refresh)
      await sleep(1000 * attempt);
    }
  }
}
```

---

## 2. Key API Endpoints for MadeBuy

### 2.1 Creating Invoices from Marketplace Sales

```typescript
import { Invoice, Contact, LineItem } from 'xero-node';

interface MarketplaceSale {
  orderId: string;
  customerEmail: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    gstIncluded: boolean;
  }>;
  shippingCost: number;
}

async function createSaleInvoice(
  xero: XeroClient,
  tenantId: string,
  sale: MarketplaceSale
): Promise<string> {
  // First, find or create contact
  const contact = await findOrCreateContact(xero, tenantId, {
    name: sale.customerName,
    email: sale.customerEmail
  });

  // Build line items
  const lineItems: LineItem[] = sale.items.map(item => ({
    description: item.name,
    quantity: item.quantity,
    unitAmount: item.unitPrice,
    accountCode: '200',  // Sales account - customize per your chart
    taxType: item.gstIncluded ? 'OUTPUT' : 'NONE',  // Australian GST
    lineAmount: item.quantity * item.unitPrice
  }));

  // Add shipping as line item if applicable
  if (sale.shippingCost > 0) {
    lineItems.push({
      description: 'Shipping',
      quantity: 1,
      unitAmount: sale.shippingCost,
      accountCode: '260',  // Shipping income account
      taxType: 'OUTPUT',   // GST on shipping in AU
      lineAmount: sale.shippingCost
    });
  }

  const invoices = {
    invoices: [{
      type: Invoice.TypeEnum.ACCREC,  // Accounts Receivable (sales)
      contact: { contactID: contact.contactID },
      lineItems,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],  // Due immediately for marketplace
      reference: `MadeBuy Order #${sale.orderId}`,
      status: Invoice.StatusEnum.AUTHORISED,
      lineAmountTypes: 'Inclusive'  // Prices include GST
    }]
  };

  const response = await xero.accountingApi.createInvoices(tenantId, invoices);
  return response.body.invoices[0].invoiceID;
}
```

### 2.2 Recording Expenses (Fees, Shipping Costs)

```typescript
// For recording marketplace fees, shipping costs as expenses
async function recordExpense(
  xero: XeroClient,
  tenantId: string,
  expense: {
    description: string;
    amount: number;
    accountCode: string;  // e.g., '404' for bank fees
    reference: string;
    bankAccountId: string;
  }
) {
  const bankTransactions = {
    bankTransactions: [{
      type: 'SPEND',  // Money going out
      contact: {
        name: 'MadeBuy Platform'  // Or specific supplier
      },
      bankAccount: {
        accountID: expense.bankAccountId
      },
      lineItems: [{
        description: expense.description,
        quantity: 1,
        unitAmount: expense.amount,
        accountCode: expense.accountCode,
        taxType: 'INPUT'  // GST on expenses (claimable)
      }],
      date: new Date().toISOString().split('T')[0],
      reference: expense.reference,
      isReconciled: false
    }]
  };

  return await xero.accountingApi.createBankTransactions(tenantId, bankTransactions);
}

// Example: Recording platform fee
await recordExpense(xero, tenantId, {
  description: 'MadeBuy Platform Fee - Order #12345',
  amount: 2.50,
  accountCode: '404',  // Bank fees or 'Merchant Fees'
  reference: 'MBFEE-12345',
  bankAccountId: userBankAccountId
});

// Example: Recording shipping cost
await recordExpense(xero, tenantId, {
  description: 'Australia Post Shipping - Order #12345',
  amount: 12.50,
  accountCode: '430',  // Freight/Shipping expense
  reference: 'SHIP-12345',
  bankAccountId: userBankAccountId
});
```

### 2.3 Bank Reconciliation / Bank Transactions

```typescript
// Record received payment (money coming in)
async function recordPaymentReceived(
  xero: XeroClient,
  tenantId: string,
  payment: {
    amount: number;
    reference: string;
    invoiceId?: string;
    bankAccountId: string;
  }
) {
  // Option 1: Create RECEIVE bank transaction
  const bankTransactions = {
    bankTransactions: [{
      type: 'RECEIVE',
      contact: { name: 'Stripe' },  // Payment processor
      bankAccount: { accountID: payment.bankAccountId },
      lineItems: [{
        description: `Payment received - ${payment.reference}`,
        quantity: 1,
        unitAmount: payment.amount,
        accountCode: '200'  // Sales/Revenue
      }],
      date: new Date().toISOString().split('T')[0],
      reference: payment.reference,
      isReconciled: false
    }]
  };

  return await xero.accountingApi.createBankTransactions(tenantId, bankTransactions);
}

// Option 2: Apply payment directly to invoice
async function applyPaymentToInvoice(
  xero: XeroClient,
  tenantId: string,
  invoiceId: string,
  amount: number,
  bankAccountCode: string
) {
  const payments = {
    payments: [{
      invoice: { invoiceID: invoiceId },
      account: { code: bankAccountCode },
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      isReconciled: true  // Mark as reconciled if from trusted source
    }]
  };

  return await xero.accountingApi.createPayments(tenantId, payments);
}
```

### 2.4 Chart of Accounts Mapping

```typescript
// Get all accounts for mapping UI
async function getChartOfAccounts(xero: XeroClient, tenantId: string) {
  const response = await xero.accountingApi.getAccounts(tenantId);

  // Filter to relevant account types
  return response.body.accounts.filter(acc =>
    ['REVENUE', 'EXPENSE', 'DIRECTCOSTS', 'BANK'].includes(acc.type)
  ).map(acc => ({
    accountId: acc.accountID,
    code: acc.code,
    name: acc.name,
    type: acc.type,
    taxType: acc.taxType,
    description: acc.description
  }));
}

// Recommended default mappings for marketplace
const DEFAULT_ACCOUNT_MAPPINGS = {
  // Revenue accounts
  productSales: '200',      // Sales
  shippingIncome: '260',    // Other Revenue

  // Expense accounts
  platformFees: '404',      // Bank Fees / Merchant Fees
  shippingCosts: '430',     // Freight & Courier
  paymentFees: '404',       // Payment Processing Fees
  refunds: '481',           // Bad Debts / Refunds

  // Asset accounts
  bankAccount: '090',       // Business Bank Account
  clearingAccount: '092'    // Stripe/Payment Clearing
};
```

---

## 3. Australian GST Handling

### Tax Types for Australia

| Tax Type | Rate | Use Case | Account Types |
|----------|------|----------|---------------|
| `OUTPUT` | 10% | GST on Income (Sales) | REVENUE |
| `INPUT` | 10% | GST on Expenses (Claimable) | EXPENSE, DIRECTCOSTS |
| `NONE` | 0% | No GST | Any |
| `EXEMPTOUTPUT` | 0% | GST-free sales | REVENUE |
| `EXEMPTINPUT` | 0% | GST-free purchases | EXPENSE |

### GST Implementation

```typescript
// Determine GST treatment for line items
function getGstTaxType(
  isGstRegistered: boolean,
  itemType: 'sale' | 'expense',
  isGstApplicable: boolean
): string {
  if (!isGstRegistered) {
    return 'NONE';  // Not GST registered
  }

  if (!isGstApplicable) {
    return itemType === 'sale' ? 'EXEMPTOUTPUT' : 'EXEMPTINPUT';
  }

  return itemType === 'sale' ? 'OUTPUT' : 'INPUT';
}

// Create GST-compliant invoice
function createGstInvoice(
  items: Array<{ price: number; gstApplicable: boolean }>,
  lineAmountType: 'Inclusive' | 'Exclusive'
) {
  return items.map(item => ({
    unitAmount: item.price,
    taxType: item.gstApplicable ? 'OUTPUT' : 'EXEMPTOUTPUT',
    // Xero auto-calculates GST based on lineAmountType
  }));
}

// BAS Integration - Pull GST report data
async function getGstReport(
  xero: XeroClient,
  tenantId: string,
  fromDate: string,
  toDate: string
) {
  // Use Reports API for BAS data
  const response = await xero.accountingApi.getReportBASorGST(tenantId, {
    fromDate,
    toDate
  });

  return response.body;
}
```

### GST on Different Transaction Types

```typescript
// Sales (OUTPUT tax)
const saleLineItem = {
  description: 'Handmade Jewelry',
  unitAmount: 55.00,  // GST-inclusive
  taxType: 'OUTPUT',  // 10% GST
  accountCode: '200'
};

// Shipping income (usually GST applies)
const shippingLineItem = {
  description: 'Shipping',
  unitAmount: 12.00,
  taxType: 'OUTPUT',
  accountCode: '260'
};

// Platform fees (INPUT tax - claimable)
const feeExpense = {
  description: 'Platform Commission',
  unitAmount: 5.50,
  taxType: 'INPUT',  // Claim GST back
  accountCode: '404'
};
```

---

## 4. Rate Limits and Best Practices

### Xero API Limits

| Limit Type | Value | Scope |
|------------|-------|-------|
| Per Minute | 60 calls | Per tenant (organization) |
| Per Day | 5,000 calls | Per tenant per app |
| Concurrent | 5 requests | Per tenant |
| App-wide Minute | 10,000 calls | Across all tenants |
| Payload Size | 3.5 MB | Single POST request |
| Batch Size | 50 elements | Recommended per request |

### Rate Limit Handling

```typescript
import Bottleneck from 'bottleneck';

// Create rate limiter
const xeroLimiter = new Bottleneck({
  reservoir: 60,           // 60 requests
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60 * 1000,  // Per minute
  maxConcurrent: 5,        // Max concurrent
  minTime: 100             // Min 100ms between requests
});

// Wrap API calls
async function rateLimitedApiCall<T>(
  apiCall: () => Promise<T>
): Promise<T> {
  return xeroLimiter.schedule(async () => {
    try {
      return await apiCall();
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited - get retry-after header
        const retryAfter = error.response.headers['retry-after'] || 60;
        await sleep(retryAfter * 1000);
        return await apiCall();
      }
      throw error;
    }
  });
}

// Usage
const accounts = await rateLimitedApiCall(() =>
  xero.accountingApi.getAccounts(tenantId)
);
```

### Best Practices

```typescript
// 1. Batch operations (up to 50 per request)
async function batchCreateInvoices(invoices: Invoice[]) {
  const batches = chunk(invoices, 50);

  for (const batch of batches) {
    await rateLimitedApiCall(() =>
      xero.accountingApi.createInvoices(tenantId, { invoices: batch }, false)
    );
  }
}

// 2. Use ModifiedSince for sync
async function syncContacts(lastSyncDate: Date) {
  const response = await xero.accountingApi.getContacts(
    tenantId,
    lastSyncDate.toISOString(),  // If-Modified-Since header
    undefined,
    undefined,
    undefined,
    1  // Page 1
  );
  return response.body.contacts;
}

// 3. Use pagination for large datasets
async function getAllInvoices(tenantId: string) {
  const allInvoices = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await rateLimitedApiCall(() =>
      xero.accountingApi.getInvoices(
        tenantId,
        undefined,  // ifModifiedSince
        undefined,  // where
        undefined,  // order
        undefined,  // IDs
        undefined,  // invoiceNumbers
        undefined,  // contactIDs
        undefined,  // statuses
        page        // page number
      )
    );

    allInvoices.push(...response.body.invoices);
    hasMore = response.body.invoices.length === 100;  // Page size
    page++;
  }

  return allInvoices;
}

// 4. Use webhooks instead of polling
// Register webhook in Xero Developer portal
// Events: INVOICE.CREATE, PAYMENT.CREATE, CONTACT.UPDATE
```

---

## 5. E-commerce Integration Patterns

### Complete Order Sync Flow

```typescript
interface MadeBuyOrder {
  id: string;
  sellerId: string;
  buyer: { name: string; email: string };
  items: OrderItem[];
  shipping: number;
  platformFee: number;
  paymentFee: number;
  total: number;
  paidAt: Date;
}

async function syncOrderToXero(order: MadeBuyOrder) {
  const seller = await getSeller(order.sellerId);
  const xero = await getXeroClient(seller.id);
  const tenantId = seller.xeroTenantId;
  const mappings = seller.xeroAccountMappings;

  // 1. Create/find customer contact
  const contact = await findOrCreateContact(xero, tenantId, {
    name: order.buyer.name,
    email: order.buyer.email
  });

  // 2. Create sales invoice
  const invoiceId = await createInvoice(xero, tenantId, {
    contact,
    items: order.items,
    shipping: order.shipping,
    reference: `MB-${order.id}`,
    accountMappings: mappings
  });

  // 3. Record payment received
  await applyPaymentToInvoice(xero, tenantId, invoiceId, order.total, mappings.bankAccount);

  // 4. Record platform fee as expense
  await recordExpense(xero, tenantId, {
    description: `MadeBuy Fee - Order ${order.id}`,
    amount: order.platformFee,
    accountCode: mappings.platformFees,
    reference: `MBFEE-${order.id}`,
    bankAccountId: mappings.bankAccountId
  });

  // 5. Record payment processing fee
  if (order.paymentFee > 0) {
    await recordExpense(xero, tenantId, {
      description: `Stripe Fee - Order ${order.id}`,
      amount: order.paymentFee,
      accountCode: mappings.paymentFees,
      reference: `STRIPE-${order.id}`,
      bankAccountId: mappings.bankAccountId
    });
  }

  return { invoiceId, synced: true };
}
```

### Refund Handling

```typescript
async function processRefund(
  xero: XeroClient,
  tenantId: string,
  originalInvoiceId: string,
  refundAmount: number,
  reason: string
) {
  // Create credit note against original invoice
  const creditNotes = {
    creditNotes: [{
      type: 'ACCRECCREDIT',  // Accounts Receivable Credit
      contact: { contactID: /* original customer */ },
      lineItems: [{
        description: `Refund: ${reason}`,
        quantity: 1,
        unitAmount: refundAmount,
        accountCode: '200',  // Same as original sale
        taxType: 'OUTPUT'
      }],
      date: new Date().toISOString().split('T')[0],
      reference: `Refund for Invoice ${originalInvoiceId}`,
      status: 'AUTHORISED'
    }]
  };

  const response = await xero.accountingApi.createCreditNotes(tenantId, creditNotes);

  // Allocate credit note to invoice
  const creditNoteId = response.body.creditNotes[0].creditNoteID;
  await xero.accountingApi.createCreditNoteAllocation(tenantId, creditNoteId, {
    allocations: [{
      invoice: { invoiceID: originalInvoiceId },
      amount: refundAmount,
      date: new Date().toISOString().split('T')[0]
    }]
  });

  return creditNoteId;
}
```

### Periodic Settlement Sync (Stripe/PayPal)

```typescript
// For payment processors that batch payouts
async function syncPayout(
  xero: XeroClient,
  tenantId: string,
  payout: {
    amount: number;
    fees: number;
    reference: string;
    transactionIds: string[];
  }
) {
  // Record the net payout received
  await xero.accountingApi.createBankTransactions(tenantId, {
    bankTransactions: [{
      type: 'RECEIVE',
      contact: { name: 'Stripe' },
      bankAccount: { accountID: tenantId },
      lineItems: [{
        description: `Stripe Payout - ${payout.reference}`,
        quantity: 1,
        unitAmount: payout.amount,
        accountCode: '092',  // Clearing account
        taxType: 'NONE'
      }],
      reference: payout.reference,
      isReconciled: false
    }]
  });
}
```

---

## 6. MYOB API Comparison

### Key Differences from Xero

| Feature | Xero | MYOB |
|---------|------|------|
| Token Expiry | 30 min access, 60 day refresh | 20 min access |
| API Style | REST + specific endpoints | REST + OData queries |
| Rate Limits | 60/min, 5000/day | Less restrictive |
| Batch Size | 50 recommended | Varies by endpoint |
| Scopes | Granular (accounting.transactions) | Broader (sme-sales, sme-general-ledger) |
| Multi-tenancy | Via Xero-tenant-id header | Via company file URI |
| Auth Header | Authorization: Bearer | + x-myobapi-cftoken, x-myobapi-key |

### MYOB OAuth2 Flow

```typescript
// MYOB OAuth2 configuration
const myobConfig = {
  authUrl: 'https://secure.myob.com/oauth2/account/authorize',
  tokenUrl: 'https://secure.myob.com/oauth2/v1/authorize',
  clientId: process.env.MYOB_CLIENT_ID,
  clientSecret: process.env.MYOB_CLIENT_SECRET,
  redirectUri: process.env.MYOB_REDIRECT_URI,
  scopes: ['sme-company-file', 'sme-general-ledger', 'sme-sale']  // New scopes (March 2025+)
};

// Build auth URL
const authUrl = `${myobConfig.authUrl}?` +
  `client_id=${myobConfig.clientId}&` +
  `redirect_uri=${encodeURIComponent(myobConfig.redirectUri)}&` +
  `response_type=code&` +
  `scope=${myobConfig.scopes.join(' ')}`;

// Exchange code for tokens
async function exchangeCodeForTokens(code: string) {
  const response = await fetch(myobConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: myobConfig.clientId,
      client_secret: myobConfig.clientSecret,
      code,
      redirect_uri: myobConfig.redirectUri,
      grant_type: 'authorization_code',
      scope: myobConfig.scopes.join(' ')
    })
  });

  return await response.json();
}

// Refresh token (20 min expiry)
async function refreshMyobToken(refreshToken: string) {
  const response = await fetch(myobConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: myobConfig.clientId,
      client_secret: myobConfig.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  return await response.json();
}
```

### MYOB API Calls

```typescript
// MYOB requires additional headers
const myobHeaders = {
  'Authorization': `Bearer ${accessToken}`,
  'x-myobapi-key': process.env.MYOB_API_KEY,
  'x-myobapi-cftoken': Buffer.from(`${username}:${password}`).toString('base64'),
  'x-myobapi-version': 'v2',
  'Accept-Encoding': 'gzip,deflate'
};

// Get company files
const companyFiles = await fetch(
  'https://api.myob.com/accountright/',
  { headers: myobHeaders }
);

// Create invoice in MYOB
const createInvoice = await fetch(
  `https://api.myob.com/accountright/${companyFileId}/Sale/Invoice/Item`,
  {
    method: 'POST',
    headers: { ...myobHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Customer: { UID: customerUid },
      Date: new Date().toISOString(),
      InvoiceDelivery: 'Print',
      Lines: [{
        Type: 'Transaction',
        Description: 'Product Sale',
        UnitOfMeasure: 'Qty',
        UnitCount: 1,
        UnitPrice: 55.00,
        Total: 55.00,
        Account: { UID: revenueAccountUid },
        TaxCode: { UID: gstTaxCodeUid }
      }]
    })
  }
);
```

### MYOB Endpoint Structure

```
Base URL: https://api.myob.com/accountright/{CompanyFileUID}/

Endpoints:
- /Contact/Customer          - Customer contacts
- /Contact/Supplier          - Supplier contacts
- /Sale/Invoice/Item         - Item-based invoices
- /Sale/Invoice/Service      - Service invoices
- /Purchase/Bill/Item        - Item-based bills
- /GeneralLedger/Account     - Chart of accounts
- /GeneralLedger/TaxCode     - Tax codes (GST)
- /Banking/SpendMoneyTxn     - Expenses/spend money
- /Banking/ReceiveMoneyTxn   - Receive money
```

---

## 7. Implementation Recommendations for MadeBuy

### Phase 1: Basic Integration
1. OAuth2 connection flow with token storage
2. Account mapping UI for sellers
3. Invoice creation on order completion
4. Manual sync trigger

### Phase 2: Automated Sync
1. Automatic invoice creation on payment
2. Expense recording for platform fees
3. Background job for sync (avoid blocking)
4. Error handling and retry logic

### Phase 3: Advanced Features
1. Webhook integration for real-time sync
2. Bank feed integration (if certified)
3. MYOB support as alternative
4. Bulk sync for historical orders

### Database Schema Additions

```sql
-- Xero connection storage
CREATE TABLE seller_xero_connections (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES sellers(id),
  xero_tenant_id VARCHAR(255),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP,
  account_mappings JSONB,  -- { productSales: '200', platformFees: '404', ... }
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sync log for debugging
CREATE TABLE xero_sync_logs (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES sellers(id),
  order_id UUID,
  xero_invoice_id VARCHAR(255),
  sync_type VARCHAR(50),  -- 'invoice', 'expense', 'payment'
  status VARCHAR(50),     -- 'success', 'failed', 'pending'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Sources

- Xero Developer Documentation: https://developer.xero.com/documentation/
- Xero Node SDK: https://github.com/xeroapi/xero-node
- Xero OAuth2 FAQs: https://developer.xero.com/faq/oauth2
- Xero Rate Limits: https://developer.xero.com/faq/limits
- MYOB API Documentation: https://developer.myob.com/api/myob-business-api/
- MYOB OAuth2 Guide: https://apisupport.myob.com/hc/en-us/articles/360001459455
