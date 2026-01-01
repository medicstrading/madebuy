# Stripe Connect Research for MadeBuy Marketplace (Australia)

**Research Date:** January 2026
**Target Market:** Australia
**Use Case:** Etsy-alternative marketplace with zero transaction fees for sellers

---

## Table of Contents

1. [Account Types Comparison](#1-account-types-comparison)
2. [Australia-Specific Pricing & Fees](#2-australia-specific-pricing--fees)
3. [API Patterns & Code Examples](#3-api-patterns--code-examples)
4. [Australian Compliance Requirements](#4-australian-compliance-requirements)
5. [Marketplace Fee Structure Recommendations](#5-marketplace-fee-structure-recommendations)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Account Types Comparison

### Recommendation: Express Accounts

For MadeBuy, **Express accounts** are the recommended choice.

| Feature | Standard | Express | Custom |
|---------|----------|---------|--------|
| **Integration Effort** | Lowest | Low | Significantly Higher |
| **Onboarding** | Stripe-hosted | Stripe-hosted | Platform or Stripe |
| **Dashboard Access** | Full Stripe Dashboard | Express Dashboard (simplified) | None (platform-managed) |
| **Fraud/Dispute Liability** | Connected Account | **Platform** | **Platform** |
| **Payout Timing Control** | Yes (with Platform Controls) | **Yes** | Yes |
| **Branding Control** | Minimal | Moderate | Full |
| **Monthly Fee (AU)** | None | **A$2/active user** | A$2/active user |

### Why Express for MadeBuy

1. **Low integration effort** - Stripe handles KYC, identity verification, and onboarding UI
2. **Conversion-optimized onboarding** - Stripe's built-in flows have been optimized across thousands of marketplaces
3. **Seller access to Express Dashboard** - Sellers can manage basic settings, view payouts
4. **Platform controls payouts** - We can set payout schedules programmatically
5. **Fits "zero transaction fees" model** - We can absorb Stripe fees and charge subscription/listing fees instead

### Express Account Limitations to Consider

- Platform is liable for disputes and chargebacks
- Some Stripe branding in onboarding and dashboard
- A$2/month per active account (when platform handles pricing)

---

## 2. Australia-Specific Pricing & Fees

### Stripe Processing Fees (Australia)

| Fee Type | Rate |
|----------|------|
| **Domestic Card Transactions** | 1.7% + A$0.30 |
| **International Cards** | 3.5% + A$0.30 |
| **In-Person (Terminal)** | 1.7% + A$0.10 |
| **Currency Conversion** | +2% |
| **Instant Payouts** | 1% of payout volume |

### Connect Fees (Platform Handles Pricing)

| Fee Type | Rate (Australia) |
|----------|------------------|
| **Onboarding/Compliance** | A$2 per active user/month |
| **Payout Fee** | A$0.25 + 0.25% per payout |

### Dispute Fees (Australia)

| Fee Type | Rate |
|----------|------|
| **Dispute Fee** | A$25 |
| **Counter Fee** | A$25 (refunded if won) |

### Standard Payout Timing

- **Australia:** 3 business days standard
- **Instant payouts:** Available for 1% fee

---

## 3. API Patterns & Code Examples

### 3.1 Seller Onboarding (Account Creation)

```typescript
// packages/shared/stripe/connect.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface CreateSellerAccountParams {
  email: string;
  businessName?: string;
  businessUrl?: string;
}

export async function createSellerAccount(params: CreateSellerAccountParams) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'AU',
    email: params.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual', // or 'company'
    business_profile: {
      name: params.businessName,
      url: params.businessUrl,
    },
    settings: {
      payouts: {
        schedule: {
          interval: 'daily', // or 'weekly', 'monthly', 'manual'
        },
      },
    },
  });

  return account;
}

// Create onboarding link for seller to complete KYC
export async function createOnboardingLink(accountId: string, returnUrl: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    return_url: `${returnUrl}?onboarding=complete`,
    refresh_url: `${returnUrl}?onboarding=refresh`,
  });

  return accountLink.url;
}

// Check if account onboarding is complete
export async function getAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);

  return {
    id: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements,
  };
}
```


### 3.2 Processing Payments with Application Fees

```typescript
// packages/shared/stripe/payments.ts

interface CreatePaymentParams {
  amount: number; // in cents (e.g., 1000 = A$10.00)
  sellerAccountId: string;
  applicationFeeAmount: number; // platform fee in cents
  currency?: string;
  metadata?: Record<string, string>;
}

// OPTION 1: Destination Charges with Application Fee (RECOMMENDED)
// Charge appears on seller's Stripe account, platform collects fee
export async function createDestinationCharge(params: CreatePaymentParams) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency || 'aud',
    automatic_payment_methods: { enabled: true },
    application_fee_amount: params.applicationFeeAmount,
    transfer_data: {
      destination: params.sellerAccountId,
    },
    metadata: params.metadata,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

// OPTION 2: Destination Charges with Specific Transfer Amount
// More control: specify exact amount going to seller
export async function createDestinationChargeWithTransferAmount(
  params: CreatePaymentParams & { transferAmount: number }
) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency || 'aud',
    automatic_payment_methods: { enabled: true },
    transfer_data: {
      amount: params.transferAmount, // exact amount to seller
      destination: params.sellerAccountId,
    },
    metadata: params.metadata,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

// Using Checkout Sessions (if using Stripe hosted checkout)
export async function createCheckoutSession(params: {
  lineItems: Array<{
    name: string;
    amount: number;
    quantity: number;
  }>;
  sellerAccountId: string;
  applicationFeeAmount: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: params.lineItems.map((item) => ({
      price_data: {
        currency: 'aud',
        product_data: { name: item.name },
        unit_amount: item.amount,
      },
      quantity: item.quantity,
    })),
    payment_intent_data: {
      application_fee_amount: params.applicationFeeAmount,
      transfer_data: {
        destination: params.sellerAccountId,
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session;
}
```

### 3.3 Managing Payouts and Schedules

```typescript
// packages/shared/stripe/payouts.ts

// Set payout schedule for a connected account
export async function setPayoutSchedule(
  accountId: string,
  schedule: 'daily' | 'weekly' | 'monthly' | 'manual'
) {
  const account = await stripe.accounts.update(accountId, {
    settings: {
      payouts: {
        schedule: {
          interval: schedule,
          // weekly_anchor: 'monday', // for weekly
          // monthly_anchor: 1, // for monthly (1-31)
        },
      },
    },
  });

  return account;
}

// Set manual payouts (platform controls when funds are sent)
export async function enableManualPayouts(accountId: string) {
  await stripe.balanceSettings.update(
    {
      payments: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
    },
    { stripeAccount: accountId }
  );
}

// Trigger a manual payout
export async function createManualPayout(
  accountId: string,
  amount: number,
  currency: string = 'aud'
) {
  const payout = await stripe.payouts.create(
    {
      amount,
      currency,
    },
    { stripeAccount: accountId }
  );

  return payout;
}

// Get connected account balance
export async function getAccountBalance(accountId: string) {
  const balance = await stripe.balance.retrieve({
    stripeAccount: accountId,
  });

  return {
    available: balance.available,
    pending: balance.pending,
  };
}

// List payouts for a connected account
export async function listPayouts(accountId: string, limit: number = 10) {
  const payouts = await stripe.payouts.list(
    { limit },
    { stripeAccount: accountId }
  );

  return payouts.data;
}
```


### 3.4 Handling Refunds and Disputes

```typescript
// packages/shared/stripe/refunds.ts

interface RefundParams {
  chargeId?: string;
  paymentIntentId?: string;
  amount?: number; // partial refund amount in cents
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  reverseTransfer?: boolean; // pull funds back from seller
  refundApplicationFee?: boolean; // refund platform fee too
}

// Issue a refund (full or partial)
export async function createRefund(params: RefundParams) {
  const refundParams: Stripe.RefundCreateParams = {
    reason: params.reason,
    reverse_transfer: params.reverseTransfer ?? true, // default: pull from seller
    refund_application_fee: params.refundApplicationFee ?? false,
  };

  if (params.chargeId) {
    refundParams.charge = params.chargeId;
  } else if (params.paymentIntentId) {
    refundParams.payment_intent = params.paymentIntentId;
  }

  if (params.amount) {
    refundParams.amount = params.amount; // partial refund
  }

  const refund = await stripe.refunds.create(refundParams);
  return refund;
}

// Refund strategies for marketplace
export const RefundStrategies = {
  // Full refund, pull from seller, keep platform fee
  FULL_SELLER_PAYS: {
    reverseTransfer: true,
    refundApplicationFee: false,
  },

  // Full refund, pull from seller, refund platform fee
  FULL_BOTH_PAY: {
    reverseTransfer: true,
    refundApplicationFee: true,
  },

  // Full refund, platform covers (for disputes/goodwill)
  FULL_PLATFORM_PAYS: {
    reverseTransfer: false,
    refundApplicationFee: true,
  },
};
```

### 3.5 Transaction Fee Breakdown Retrieval

```typescript
// packages/shared/stripe/reporting.ts

// Get balance transaction with fee breakdown
export async function getTransactionDetails(balanceTransactionId: string) {
  const txn = await stripe.balanceTransactions.retrieve(balanceTransactionId);

  return {
    id: txn.id,
    amount: txn.amount,
    fee: txn.fee,
    net: txn.net,
    currency: txn.currency,
    feeDetails: txn.fee_details, // breakdown of fees
    created: new Date(txn.created * 1000),
    type: txn.type,
  };
}

// List transactions for a connected account's payout
export async function getPayoutTransactions(
  accountId: string,
  payoutId: string
) {
  const transactions = await stripe.balanceTransactions.list(
    {
      payout: payoutId,
      type: 'payment',
      expand: ['data.source.source_transfer.source_transaction'],
    },
    { stripeAccount: accountId }
  );

  return transactions.data.map((txn) => ({
    id: txn.id,
    amount: txn.amount,
    fee: txn.fee,
    net: txn.net,
    // Access original charge details for destination charges
    sourceCharge: (txn.source as any)?.source_transfer?.source_transaction,
  }));
}

// Get application fees collected by platform
export async function listApplicationFees(limit: number = 100) {
  const fees = await stripe.applicationFees.list({ limit });

  return fees.data.map((fee) => ({
    id: fee.id,
    amount: fee.amount,
    currency: fee.currency,
    chargeId: fee.charge,
    accountId: fee.account,
    created: new Date(fee.created * 1000),
  }));
}

// Calculate effective fees for a transaction
export function calculateEffectiveFees(
  amount: number, // in cents
  isInternational: boolean = false
) {
  const baseRate = isInternational ? 0.035 : 0.017; // 3.5% or 1.7%
  const fixedFee = 30; // A$0.30 in cents

  const processingFee = Math.round(amount * baseRate) + fixedFee;
  const netAfterStripe = amount - processingFee;

  return {
    grossAmount: amount,
    processingFee,
    netAfterStripe,
    effectiveRate: ((processingFee / amount) * 100).toFixed(2) + '%',
  };
}
```


### 3.6 Webhook Handling

```typescript
// apps/web/api/webhooks/stripe/route.ts

import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    // Try Connect webhook secret first (for connected account events)
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      connectWebhookSecret
    );
  } catch {
    try {
      // Fall back to regular webhook secret
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      return new Response('Webhook signature verification failed', { status: 400 });
    }
  }

  // Handle events
  switch (event.type) {
    // Account events
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      await handleAccountUpdated(account);
      break;
    }

    // Payment events
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSucceeded(paymentIntent);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailed(paymentIntent);
      break;
    }

    // Payout events
    case 'payout.paid': {
      const payout = event.data.object as Stripe.Payout;
      await handlePayoutPaid(payout, event.account);
      break;
    }

    case 'payout.failed': {
      const payout = event.data.object as Stripe.Payout;
      await handlePayoutFailed(payout, event.account);
      break;
    }

    // Dispute events (IMPORTANT for liability)
    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute;
      await handleDisputeCreated(dispute);
      break;
    }

    case 'charge.dispute.closed': {
      const dispute = event.data.object as Stripe.Dispute;
      await handleDisputeClosed(dispute);
      break;
    }

    // Refund events
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      await handleChargeRefunded(charge);
      break;
    }
  }

  return new Response('OK', { status: 200 });
}

// Handler implementations
async function handleAccountUpdated(account: Stripe.Account) {
  // Update seller status in database
  // Check if onboarding complete: account.charges_enabled && account.payouts_enabled
  console.log(`Account ${account.id} updated`, {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    requirements: account.requirements?.currently_due,
  });
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Update order status, send confirmation email, update inventory
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Update order status, notify customer
}

async function handlePayoutPaid(payout: Stripe.Payout, accountId?: string) {
  // Record payout in seller's transaction history, send notification
}

async function handlePayoutFailed(payout: Stripe.Payout, accountId?: string) {
  // Alert seller about failed payout, may need to update bank details
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  // CRITICAL: Platform is liable for disputes with Express accounts
  // Alert admin immediately, freeze related funds, start evidence collection
}

async function handleDisputeClosed(dispute: Stripe.Dispute) {
  // Update dispute status, if lost: handle the loss
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // Update order status, update seller balance records
}
```

---

## 4. Australian Compliance Requirements

### 4.1 ABN (Australian Business Number)

**When Required:**
- Annual turnover exceeds A$75,000 (before GST)
- Required for GST registration
- Receiving payments from other businesses that require ABN

**For MadeBuy Sellers:**
- Stripe will collect ABN during onboarding for Australian Express accounts
- Sellers without ABN can still sell (Stripe handles individual seller onboarding)
- Recommend sellers get ABN for professional appearance and tax benefits

### 4.2 GST (Goods & Services Tax)

**GST Registration Threshold:**
- Required when annual turnover reaches A$75,000

**GST Rate:**
- Standard rate: 10%
- Added to prices (most retail is GST-inclusive)

**Marketplace Operator Responsibilities:**
- EDP (Electronic Distribution Platform) operators may be required to collect GST on behalf of foreign sellers
- For Australian sellers: GST responsibility typically stays with the seller
- Stripe Tax can automate GST collection and reporting

**Implementation with Stripe Tax:**

```typescript
// Using Stripe Tax for GST
export async function createTaxEnabledPaymentIntent(params: {
  amount: number;
  sellerAccountId: string;
  customerAddress: Stripe.AddressParam;
}) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: 'aud',
    automatic_payment_methods: { enabled: true },
    transfer_data: {
      destination: params.sellerAccountId,
    },
    // Enable automatic tax calculation
    automatic_tax: { enabled: true },
    shipping: {
      address: params.customerAddress,
      name: 'Customer',
    },
  });

  return paymentIntent;
}
```

### 4.3 Tax Invoices

When GST-registered, sellers must issue tax invoices showing:
- ABN
- GST amount (or statement that total includes GST)
- Invoice date
- Seller details

**Stripe Tax Features:**
- Automatic ABN validation for B2B customers
- Tax ID collection during checkout
- Automatic reverse charge for eligible B2B transactions


---

## 5. Marketplace Fee Structure Recommendations

### 5.1 Competitor Analysis

| Platform | Listing Fee | Transaction Fee | Payment Processing | Total Effective |
|----------|-------------|-----------------|-------------------|-----------------|
| **Etsy** | A$0.27/listing | 6.5% | 3% + A$0.33 | ~10-11% |
| **Shopify** | $39+/month | 0% | 2.9% + A$0.30 | ~3-4% |
| **Amazon AU** | $49.95/month | 7-15% (category) | Included | 7-15% |
| **eBay AU** | Free (limits) | 12.9-13.9% | Included | 12-14% |

### 5.2 MadeBuy "Zero Transaction Fees" Model

**Recommended Structure:**

```typescript
// Fee configuration
const MADEBUY_FEES = {
  // Subscription tiers (monthly)
  subscriptions: {
    starter: {
      price: 0, // Free tier
      listingLimit: 10,
      features: ['basic_analytics'],
    },
    growth: {
      price: 2900, // A$29/month
      listingLimit: 100,
      features: ['analytics', 'promotion_tools', 'priority_support'],
    },
    professional: {
      price: 7900, // A$79/month
      listingLimit: 'unlimited',
      features: ['all_features', 'api_access', 'dedicated_support'],
    },
  },

  // Optional listing fees (for free tier after limit)
  listingFee: 20, // A$0.20 per listing (like Etsy)

  // No transaction percentage fees!
  transactionFee: 0,

  // Payment processing (passed through or absorbed)
  paymentProcessing: {
    domestic: { rate: 0.017, fixed: 30 }, // 1.7% + A$0.30
    international: { rate: 0.035, fixed: 30 }, // 3.5% + A$0.30
  },
};
```

**Revenue Model Options:**

1. **Absorb All Fees (True Zero Fees)**
   - Platform pays Stripe fees from subscription revenue
   - Clear differentiator: "Keep 100% of your sale"
   - Higher subscription prices needed

2. **Pass-Through Processing Fees Only**
   - Sellers pay Stripe's card processing fees
   - No platform transaction fee
   - Message: "No marketplace cut, just payment processing"

3. **Hybrid Model**
   - Free tier: Pass-through processing fees
   - Paid tiers: Platform absorbs processing fees
   - Incentivizes upgrades

### 5.3 Fee Calculation Helper

```typescript
// packages/shared/pricing/fees.ts

interface FeeCalculation {
  saleAmount: number;
  stripeFee: number;
  platformFee: number;
  sellerReceives: number;
  effectiveRate: string;
}

export function calculateSellerPayout(
  saleAmount: number, // in cents
  isInternational: boolean = false,
  subscriptionTier: 'starter' | 'growth' | 'professional' = 'starter'
): FeeCalculation {
  // Stripe processing fee
  const stripeRate = isInternational ? 0.035 : 0.017;
  const stripeFixed = 30;
  const stripeFee = Math.round(saleAmount * stripeRate) + stripeFixed;

  // Platform fee (zero for MadeBuy!)
  const platformFee = 0;

  // What seller receives
  let sellerReceives: number;

  if (subscriptionTier === 'starter') {
    // Free tier: seller pays processing
    sellerReceives = saleAmount - stripeFee;
  } else {
    // Paid tiers: platform absorbs processing
    sellerReceives = saleAmount;
  }

  return {
    saleAmount,
    stripeFee,
    platformFee,
    sellerReceives,
    effectiveRate: (((saleAmount - sellerReceives) / saleAmount) * 100).toFixed(2) + '%',
  };
}
```


---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- [ ] Set up Stripe Connect account with Express configuration
- [ ] Implement seller onboarding flow
- [ ] Create webhook handlers for account events
- [ ] Build seller dashboard with Stripe Express Dashboard link

### Phase 2: Payments (Week 3-4)

- [ ] Implement destination charges with application fees
- [ ] Build checkout flow with Stripe Elements/Payment Element
- [ ] Set up payment webhooks
- [ ] Implement order confirmation and receipts

### Phase 3: Payouts & Refunds (Week 5)

- [ ] Configure payout schedules
- [ ] Implement refund functionality
- [ ] Build seller payout history view
- [ ] Set up payout notifications

### Phase 4: Disputes & Compliance (Week 6)

- [ ] Implement dispute handling workflow
- [ ] Set up Stripe Tax for GST
- [ ] Build tax invoice generation
- [ ] Create dispute evidence collection system

### Phase 5: Reporting & Optimization (Week 7-8)

- [ ] Build transaction reporting for sellers
- [ ] Implement platform revenue reporting
- [ ] Create fee breakdown views
- [ ] Optimize payout batching to reduce fees

---

## Key API Endpoints Reference

| Operation | Endpoint | SDK Method |
|-----------|----------|------------|
| Create Account | POST /v1/accounts | `stripe.accounts.create()` |
| Create Account Link | POST /v1/account_links | `stripe.accountLinks.create()` |
| Create Payment Intent | POST /v1/payment_intents | `stripe.paymentIntents.create()` |
| Create Checkout Session | POST /v1/checkout/sessions | `stripe.checkout.sessions.create()` |
| Create Refund | POST /v1/refunds | `stripe.refunds.create()` |
| Create Payout | POST /v1/payouts | `stripe.payouts.create()` |
| Get Balance | GET /v1/balance | `stripe.balance.retrieve()` |
| List Balance Transactions | GET /v1/balance_transactions | `stripe.balanceTransactions.list()` |
| Update Account | POST /v1/accounts/:id | `stripe.accounts.update()` |
| Retrieve Account | GET /v1/accounts/:id | `stripe.accounts.retrieve()` |

---

## Environment Variables Needed

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_... # Separate endpoint for Connect events

# For production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Sources

- Stripe Connect Documentation: https://docs.stripe.com/connect
- Stripe Connect Account Types: https://docs.stripe.com/connect/accounts
- Stripe Connect Pricing (AU): https://stripe.com/au/connect/pricing
- Stripe Tax Australia Guide: https://stripe.com/guides/understanding-the-tax-obligations-of-marketplaces-in-australia
- ABN Registration: https://stripe.com/resources/more/how-to-apply-to-an-abn-a-guide-for-businesses
- GST Registration: https://stripe.com/resources/more/gst-registration-in-australia

---

**Last Updated:** January 2026
**Author:** Task Agent
**Status:** Ready for implementation
