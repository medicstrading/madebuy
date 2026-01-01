# MadeBuy Platform Enhancement Plan

## Mission: Match & Exceed Etsy

> "Shopify features + Etsy exposure, zero transaction fees"

**Created:** January 2026
**Status:** Working Plan
**Project:** MadeBuy Marketplace

---

## Executive Summary

This plan transforms MadeBuy from a basic marketplace into a full-featured platform that **meets or exceeds Etsy** in every dimension, while capitalizing on our unique differentiators:

1. **Zero transaction fees** (Etsy takes 10-25%)
2. **Native accounting integrations** (Etsy has none)
3. **Customer ownership** (Etsy blocks direct relationships)
4. **Transparent algorithm** (Etsy is a black box)
5. **IP protection** (Etsy has rampant design theft)

---

## Current State Assessment

### What We Have ✅
- Multi-tenant architecture (tenants, pieces, orders)
- Stripe checkout integration
- Basic analytics (views, traffic sources)
- Material cost tracking (COGS)
- Etsy sync (one-way OAuth)
- Social publishing (Late.dev integration)
- Custom storefronts with themes
- R2 media storage with variants

### Critical Gaps ❌
- No transaction/payout tracking
- No accounting integrations
- No shipping integrations
- No product variations/SKUs
- No customer profiles
- No reviews/ratings system
- No wishlist/favorites backend
- No marketing automation
- No API for third parties

---

## Phase Overview

| Phase | Focus | Priority |
|-------|-------|----------|
| **1** | Financial Foundation | 🔴 Critical |
| **2** | Financial Reporting | 🔴 Critical |
| **3** | Accounting Integrations | 🟡 High |
| **4** | Seller Experience | 🟡 High |
| **5** | Shipping & Fulfillment | 🟡 High |
| **6** | Buyer Experience | 🟢 Medium |
| **7** | Analytics & Marketing | 🟢 Medium |
| **8** | Platform Differentiators | 🟢 Medium |
| **9** | Developer Platform | ⚪ Future |

---

## PHASE 1: Financial Foundation

**Goal:** Build the data infrastructure for all financial features

### 1.1 Transaction Ledger System

Create new `transactions` collection to track every financial event:

```typescript
interface Transaction {
  _id: ObjectId;
  tenantId: ObjectId;
  orderId?: ObjectId;
  type: 'sale' | 'refund' | 'payout' | 'fee' | 'adjustment';

  gross: number;
  fees: {
    stripe: number;
    platform: number;  // Always 0 for MadeBuy
    total: number;
  };
  net: number;

  currency: 'AUD';
  status: 'pending' | 'completed' | 'failed';

  stripePaymentIntentId?: string;
  stripeBalanceTransactionId?: string;

  metadata: Record<string, any>;
  createdAt: Date;
}
```

### 1.2 Stripe Connect Integration

**Use Express accounts** (low effort, Stripe handles KYC):

- Seller onboarding flow with `accountLinks.create()`
- Destination charges with application fees
- Webhook handlers for `account.updated`, `payout.paid`, `charge.dispute.created`
- Store `stripeConnectAccountId` in tenant

**Australian-specific:**
- Domestic cards: 1.7% + A$0.30
- International: 3.5% + A$0.30
- Payout: 3 business days standard

### 1.3 Payout Tracking

Create new `payouts` collection:

```typescript
interface Payout {
  _id: ObjectId;
  tenantId: ObjectId;
  stripePayoutId: string;

  amount: number;
  currency: 'AUD';
  status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled';

  arrivalDate: Date;
  transactionIds: ObjectId[];  // Link to transactions

  createdAt: Date;
  updatedAt: Date;
}
```

### 1.4 Order Enhancement

Add to existing `orders` collection:
- `trafficSource`, `trafficMedium`, `trafficCampaign` (UTM attribution)
- `stripePaymentIntentId`, `stripeChargeId`
- `fees.stripe`, `fees.platform`, `fees.total`
- `netAmount` (what seller receives)

### Tasks
- [ ] Create transactions repository
- [ ] Create payouts repository
- [ ] Set up Stripe Connect in dashboard
- [ ] Build seller onboarding flow
- [ ] Create Connect webhook handler
- [ ] Migrate existing orders to include fee data
- [ ] Add transaction logging to checkout webhook

---

## PHASE 2: Financial Reporting & Exports

**Goal:** Deliver immediate value with seller-facing financial tools

### 2.1 Dashboard Widgets

New dashboard cards in `/dashboard`:

| Widget | Data |
|--------|------|
| Today's Sales | Gross/net with comparison to yesterday |
| Pending Payout | Amount and next payout date |
| This Month | Revenue vs last month |
| Fee Tracker | Total fees YTD |

### 2.2 Transaction Ledger Page

New page `/dashboard/ledger`:
- Sortable/filterable table of all transactions
- Date range picker
- Type filter (sales, refunds, fees, payouts)
- Export button (CSV, PDF, JSON)

### 2.3 Monthly Statements

Automated PDF generation:
- Summary: revenue, fees, refunds, net
- Itemized transaction list
- GST breakdown (if registered)
- Branded with seller logo

### 2.4 Product Profitability

Enhance pieces list with:
- COGS already exists - show margin %
- Revenue per product (from orders)
- Profit ranking view
- Materials cost breakdown

### 2.5 GST/Tax Support

Add to tenant:
```typescript
{
  gstRegistered: boolean;
  abn?: string;
  gstInclusivePricing: boolean;
}
```

- Auto-calculate GST on applicable sales
- BAS-ready summary report
- ABN validation

### API Endpoints
```
GET  /api/ledger                 # List transactions
GET  /api/ledger/summary         # Aggregated stats
POST /api/reports/statement      # Generate PDF statement
GET  /api/reports/tax-summary    # GST/BAS report
```

### Tasks
- [ ] Build dashboard finance widgets
- [ ] Create ledger page with filters
- [ ] Implement CSV export
- [ ] Build PDF statement generator
- [ ] Add GST fields to tenant
- [ ] Create BAS summary endpoint
- [ ] Build product profitability view

---

## PHASE 3: Accounting Integrations

**Goal:** One-click sync with Xero/MYOB (Etsy has NONE)

### 3.1 Xero Integration (Priority)

**OAuth2 Setup:**
- Scopes: `accounting.transactions`, `accounting.contacts`, `offline_access`
- Store tokens with encryption
- Auto-refresh before 30-minute expiry

**Sync Features:**
- Create invoices for sales
- Record expenses for fees
- Apply payments to invoices
- Chart of accounts mapping UI

**GST Handling:**
- Use `OUTPUT` tax type for sales
- Use `INPUT` tax type for expenses (claimable)
- `lineAmountTypes: 'Inclusive'` for GST-inclusive pricing

### 3.2 MYOB Integration

Similar pattern to Xero:
- OAuth2 with 20-minute token expiry
- Different API structure (OData queries)
- Company file selection UI

### 3.3 Integration Management UI

New page `/dashboard/settings/accounting`:
- Connect/disconnect buttons
- Sync status indicator
- Last sync timestamp
- Manual sync trigger
- Account mapping configuration

### Database Schema
```typescript
interface AccountingConnection {
  tenantId: ObjectId;
  provider: 'xero' | 'myob' | 'quickbooks';
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiresAt: Date;
  externalTenantId: string;  // Xero org ID
  accountMappings: {
    productSales: string;
    shippingIncome: string;
    platformFees: string;
    paymentFees: string;
  };
  lastSyncAt: Date;
  status: 'connected' | 'needs_reauth' | 'error';
}
```

### Tasks
- [ ] Create accounting connections repository
- [ ] Build Xero OAuth flow
- [ ] Implement Xero invoice creation
- [ ] Build account mapping UI
- [ ] Add sync on order completion
- [ ] Create MYOB integration
- [ ] Build sync status dashboard

---

## PHASE 4: Seller Experience Enhancement

**Goal:** Match Etsy's listing capabilities, then exceed them

### 4.1 Product Variations

Add to pieces:
```typescript
{
  hasVariants: true,  // Already exists
  variantAttributes: ['Size', 'Color'],
  variants: [{
    id: string;
    attributes: { Size: 'M', Color: 'Blue' };
    sku: string;
    price?: number;  // Override
    stock: number;
    isAvailable: boolean;
  }]
}
```

UI: Matrix builder for size/color combinations

### 4.2 Personalization

New `personalization` field on pieces:
```typescript
{
  enabled: boolean;
  fields: [{
    name: 'Engraving Text';
    type: 'text' | 'textarea' | 'select' | 'file';
    required: boolean;
    maxLength?: number;
    options?: string[];  // For select
    priceAdjustment?: number;
  }]
}
```

- Checkout captures personalization data
- Stored in order line items
- Real-time preview (stretch goal)

### 4.3 Digital Products

New fields on pieces:
```typescript
{
  isDigital: boolean;
  digitalFiles: [{
    name: string;
    r2Key: string;
    sizeBytes: number;
  }];
  downloadLimit?: number;
}
```

- Instant download after purchase
- Secure signed URLs
- Download tracking
- No shipping required

### 4.4 Enhanced Media

- Increase photo limit (currently ~10)
- Video upload support (R2 + transcoding)
- Drag-and-drop reordering
- AI-powered alt text generation

### 4.5 Listing Quality Tools

- Title/description AI suggestions
- SEO score with improvement tips
- Completeness checklist
- Visibility optimization tips

### Tasks
- [ ] Build variant matrix UI
- [ ] Update piece form for variants
- [ ] Add personalization fields
- [ ] Create digital product flow
- [ ] Implement download delivery
- [ ] Add video upload
- [ ] Build drag-drop reordering
- [ ] Integrate AI title suggestions

---

## PHASE 5: Shipping & Fulfillment

**Goal:** Integrated shipping with Australian carriers

### 5.1 Sendle Integration (MVP)

**Why Sendle First:**
- No minimum volume
- No contracts
- Simple API
- Carbon-neutral (marketing win)
- Perfect for small sellers

**Features:**
- Real-time quotes at checkout
- Label generation in dashboard
- Tracking webhooks
- Pickup scheduling

### 5.2 Shipping Profiles

Per-seller configuration:
```typescript
{
  shippingProfiles: [{
    name: 'Standard';
    method: 'calculated' | 'flat' | 'free';
    carrier?: 'sendle' | 'auspost';
    flatRate?: number;
    freeThreshold?: number;
    processingDays: number;
    zones: [{
      countries: ['AU'];
      additionalCharge?: number;
    }]
  }]
}
```

### 5.3 Fulfillment Workflow

New shipments collection:
```typescript
interface Shipment {
  orderId: ObjectId;
  carrier: 'sendle' | 'auspost';
  carrierReference: string;
  trackingNumber: string;
  status: 'pending' | 'booked' | 'in_transit' | 'delivered';
  labelUrl: string;
  trackingEvents: TrackingEvent[];
}
```

**Dashboard features:**
- Orders awaiting shipment
- Book & print label
- Batch label printing
- Tracking status sync

### 5.4 Australia Post (Phase 2)

For high-volume sellers (2000+ parcels/year):
- eParcel API integration
- Seller connects own account
- Better rates at volume

### API Endpoints
```
POST /api/shipping/quote          # Get shipping rates
POST /api/shipping/book           # Book shipment
GET  /api/shipping/:orderId       # Get shipment status
POST /api/shipping/webhook/sendle # Tracking updates
```

### Tasks
- [ ] Create Sendle account and API keys
- [ ] Build quote endpoint
- [ ] Build booking endpoint
- [ ] Create webhook handler
- [ ] Add shipping to checkout flow
- [ ] Build seller fulfillment dashboard
- [ ] Add label printing
- [ ] Create buyer tracking page

---

## PHASE 6: Buyer Experience

**Goal:** Match Etsy's buyer features with transparent algorithm

### 6.1 Wishlist/Favorites

New `wishlists` collection:
```typescript
{
  sessionId?: string;  // Before login
  customerId?: string; // After account
  pieces: ObjectId[];
  createdAt: Date;
}
```

- Heart button on product cards
- Wishlist page
- Move to cart
- Price drop notifications (stretch)

### 6.2 Reviews & Ratings

New `reviews` collection:
```typescript
{
  pieceId: ObjectId;
  orderId: ObjectId;
  rating: 1-5;
  title: string;
  body: string;
  photos?: string[];
  isVerifiedPurchase: boolean;
  sellerResponse?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}
```

- Post-purchase review request email
- Photo reviews
- Seller can respond
- Aggregate ratings on pieces

### 6.3 Enhanced Search

- Full-text search with relevance ranking
- Filters: price, category, rating, shipping
- "Ready to ship" filter
- Location-based results
- Clear ranking factors displayed

### 6.4 Customer Accounts

New `customers` collection:
```typescript
{
  email: string;
  name: string;
  orders: ObjectId[];
  reviews: ObjectId[];
  wishlist: ObjectId[];
  addresses: Address[];
  marketingConsent: boolean;
  totalSpent: number;
  orderCount: number;
  firstOrderAt: Date;
  lastOrderAt: Date;
}
```

### 6.5 Gift Features

- Gift message at checkout
- Gift wrapping option (seller-configured)
- Gift receipt (hide prices)

### Tasks
- [ ] Build wishlist backend
- [ ] Add heart button to cards
- [ ] Create wishlist page
- [ ] Build reviews system
- [ ] Add review request emails
- [ ] Create customer profiles
- [ ] Enhance search with filters
- [ ] Add gift options to checkout

---

## PHASE 7: Analytics & Marketing

**Goal:** Shopify-level analytics that exceed Etsy

### 7.1 Advanced Analytics Dashboard

Beyond current traffic sources:

| Metric | Description |
|--------|-------------|
| Customer LTV | Avg revenue per customer |
| CAC | Cost to acquire customer |
| Repeat Rate | % customers who return |
| Conversion Funnel | View → Cart → Checkout → Purchase |
| Cart Abandonment | % who abandon checkout |
| Cohort Retention | Customer retention by month |

### 7.2 Customer Intelligence

- RFM segmentation (Recency, Frequency, Monetary)
- VIP customer identification
- At-risk customer alerts
- Customer journey visualization

### 7.3 Marketing Automation

New `email_campaigns` collection:
```typescript
{
  tenantId: ObjectId;
  type: 'abandoned_cart' | 'post_purchase' | 'review_request' | 'winback';
  trigger: 'event' | 'schedule';
  triggerDelay?: number;  // Hours after trigger
  template: string;
  subject: string;
  enabled: boolean;
  stats: { sent: number; opened: number; clicked: number; converted: number };
}
```

**Automated sequences:**
- Abandoned cart (1hr, 24hr, 72hr)
- Post-purchase thank you
- Review request (7 days after delivery)
- Win-back (60 days no purchase)

### 7.4 Promotional Tools

Enhance existing promotions:
- First-time buyer discount
- Bulk discount tiers
- Influencer codes with tracking
- Time-limited flash sales
- Referral program (stretch)

### Tasks
- [ ] Build advanced analytics dashboard
- [ ] Create funnel visualization
- [ ] Add customer segmentation
- [ ] Build email automation system
- [ ] Create abandoned cart recovery
- [ ] Add review request emails
- [ ] Build referral tracking

---

## PHASE 8: Platform Differentiators

**Goal:** Features Etsy can't or won't match

### 8.1 Customer Ownership

**The Big One:** Sellers can build direct relationships

- Email list building (opt-in at checkout)
- Export customer emails
- Direct email marketing
- No restrictions on off-platform contact
- Loyalty program management

This is a fundamental philosophical difference from Etsy.

### 8.2 IP Protection

Leverage existing pHash in media:
- Similar image detection
- Takedown request workflow
- "Original Creator" verification badge
- Design registration (stretch)

### 8.3 Transparent Algorithm

Tell sellers exactly how ranking works:
- Clear ranking factors list
- Improvement checklist with scores
- Real-time visibility tips
- No "black box" mystery

### 8.4 Fee Comparison Tool

Marketing feature:
- "What you'd pay on Etsy" calculator
- Side-by-side comparison
- Savings visualization
- Shareable results

### 8.5 Zero Transaction Fees Marketing

- Fee calculator widget
- "Keep 100% of your sale" messaging
- Etsy comparison in onboarding
- ROI calculator for switching

### Tasks
- [ ] Build email list export
- [ ] Create direct email feature
- [ ] Build IP protection workflow
- [ ] Create ranking transparency page
- [ ] Build fee comparison tool
- [ ] Add savings calculator

---

## PHASE 9: Developer Platform

**Goal:** Be developer-friendly where Etsy is hostile

### 9.1 Public API v1

REST API with simple auth:
```
Base: api.madebuy.com.au/v1
Auth: Bearer token (API key)

GET  /shop                    # Shop details
GET  /products                # List products
GET  /orders                  # List orders
POST /orders/:id/fulfill      # Mark shipped
GET  /analytics/summary       # Stats
```

### 9.2 Webhooks

Configurable webhooks for:
- `order.created`
- `order.paid`
- `order.shipped`
- `order.delivered`
- `review.created`
- `product.low_stock`
- `payout.completed`

### 9.3 Third-Party Integrations

Enable ecosystem:
- Print-on-demand (Printful, Printify)
- Inventory management
- Multi-channel sync
- Marketing platforms

### 9.4 Mobile App (Stretch)

Seller mobile app:
- Order notifications
- Quick responses to messages
- Photo capture → listing
- Stats at a glance

### Tasks
- [ ] Design API specification
- [ ] Build API key management
- [ ] Implement core endpoints
- [ ] Create webhook system
- [ ] Build documentation
- [ ] Create SDK (Node.js)

---

## Implementation Priority

### Now (Q1)
1. **Phase 1:** Financial Foundation
2. **Phase 2:** Financial Reporting

### Next (Q2)
3. **Phase 3:** Accounting Integrations (Xero)
4. **Phase 4:** Seller Experience (Variations, Personalization)

### Later (Q3)
5. **Phase 5:** Shipping (Sendle)
6. **Phase 6:** Buyer Experience (Reviews, Wishlist)

### Future (Q4+)
7. **Phase 7:** Analytics & Marketing
8. **Phase 8:** Platform Differentiators
9. **Phase 9:** Developer Platform

---

## Database Collections Summary

### New Collections Needed
- `transactions` - Financial ledger
- `payouts` - Payout tracking
- `accounting_connections` - Xero/MYOB
- `shipments` - Shipping records
- `wishlists` - Customer wishlists
- `reviews` - Product reviews
- `customers` - Customer profiles
- `email_campaigns` - Marketing automation

### Existing Collections to Enhance
- `tenants` - Add GST, Stripe Connect, shipping config
- `pieces` - Add variations, personalization, digital files
- `orders` - Add traffic source, fees, net amount
- `analytics_events` - Add funnel events

---

## Success Metrics

### Seller Value
- Time to first sale
- Average order value
- Seller retention rate
- Feature adoption rate

### Buyer Value
- Conversion rate
- Repeat purchase rate
- Review submission rate
- Search success rate

### Platform Health
- Active sellers
- Gross merchandise value (GMV)
- Transaction volume
- API adoption

---

## Research Documents

Detailed research is available in `.agents/hand-offs/`:

- `stripe-connect-research.md` - Payments & payouts
- `xero-integration-research.md` - Accounting sync
- `shipping-research.md` - Carrier integrations

---

## Next Steps

1. Review this plan
2. Prioritize based on seller feedback
3. Start Phase 1: Financial Foundation
4. Track progress in `.claude/session.json`

---

*This is a living document. Update as we progress.*
