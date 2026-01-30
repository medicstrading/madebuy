# @madebuy/db

MongoDB database layer for MadeBuy with multi-tenant isolation, repository pattern, and optimized aggregations.

## Overview

- **31 Repository Modules** with 316+ exported functions
- **Multi-tenant by design** - every query scoped by `tenantId`
- **Memory-safe pagination** - 500-item query limits
- **30+ indexed collections** - optimized for common queries
- **Aggregation pipelines** - complex analytics and reporting

## Installation

```bash
pnpm add @madebuy/db
```

## Quick Start

```typescript
import { pieces, orders, tenants } from '@madebuy/db'

// Always pass tenantId first for multi-tenant isolation
const allPieces = await pieces.listPieces(tenantId, { status: 'available' })
const order = await orders.createOrder(tenantId, orderData)
const tenant = await tenants.getTenantById(tenantId)
```

## Environment Variables

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=madebuy
```

## Architecture

### Multi-Tenant Isolation

**Every query starts with `{ tenantId }` filter.** This is enforced at the repository level - there are no collection-wide operations.

```typescript
// Correct - always pass tenantId
const pieces = await pieces.listPieces(tenantId, filters)

// The repository internally adds: { tenantId, ...filters }
```

### Pagination & Memory Safety

All list operations enforce a maximum of **500 items per query**:

```typescript
const results = await pieces.listPieces(tenantId, {
  limit: 50,    // Clamped to max 500
  offset: 0,
  status: 'available'
})
```

### Repository Pattern

Each domain has its own repository module:

```typescript
import {
  tenants,    // Seller accounts, plans, features
  pieces,     // Products/inventory
  orders,     // Order lifecycle
  customers,  // Customer management
  media,      // Images, videos, files
  // ... 26 more repositories
} from '@madebuy/db'
```

---

## Core Repositories

### tenants (34 functions)

Manages seller accounts, subscription plans, and platform features.

```typescript
import { tenants } from '@madebuy/db'

// Lookups
const tenant = await tenants.getTenantById(id)
const tenant = await tenants.getTenantBySlug('my-shop')
const tenant = await tenants.getTenantByEmail('seller@example.com')
const tenant = await tenants.getTenantByDomain('myshop.com')
const tenant = await tenants.getTenantByStripeAccountId('acct_xxx')

// CRUD
const newTenant = await tenants.createTenant(data)
await tenants.updateTenant(id, updates)
await tenants.deleteTenant(id)

// Features & Plans
// tenant.plan: 'free' | 'maker' | 'pro' | 'business'
// tenant.features: { socialPublishing, aiCaptions, unlimitedPieces, ... }

// Usage Tracking (monthly quotas)
await tenants.incrementAiCaptionUsage(id)
await tenants.incrementOrderCount(id)
await tenants.updateStorageUsage(id, bytesUsed)
await tenants.resetMonthlyUsage(id)

// Stripe Connect
await tenants.updateStripeConnectAccount(id, stripeAccountId)
await tenants.disconnectStripeConnect(id)

// Batch Operations
const tenantMap = await tenants.getTenantsByIds(ids) // Returns Map<string, Tenant>
```

### pieces (16 functions)

Products and inventory management.

```typescript
import { pieces } from '@madebuy/db'

// CRUD
const piece = await pieces.getPiece(tenantId, pieceId)
const all = await pieces.listPieces(tenantId, { status: 'available', limit: 20 })
const newPiece = await pieces.createPiece(tenantId, data)
await pieces.updatePiece(tenantId, pieceId, updates)
await pieces.deletePiece(tenantId, pieceId)

// Stock Management
const alerts = await pieces.getStockAlerts(tenantId, threshold)
// Returns pieces and variants below stock threshold

// Filtering Options
await pieces.listPieces(tenantId, {
  status: 'available' | 'draft' | 'archived',
  category: 'jewelry',
  featured: true,
  limit: 50,
  offset: 0
})
```

### orders (20 functions)

Complete order lifecycle management.

```typescript
import { orders } from '@madebuy/db'

// CRUD
const order = await orders.getOrder(tenantId, orderId)
const all = await orders.listOrders(tenantId, { status: 'pending', limit: 50 })
const newOrder = await orders.createOrder(tenantId, orderData)

// Status Updates
await orders.updateOrderStatus(tenantId, orderId, 'shipped')
await orders.bulkUpdateOrderStatus(tenantId, orderIds, 'shipped')

// Analytics
const stats = await orders.getOrderStats(tenantId)
// { pending: 5, processing: 3, shipped: 12, delivered: 45, ... }

// Accounting Integration
await orders.syncToAccounting(tenantId, orderId, { provider: 'xero', externalId: 'xxx' })
```

### customers (30 functions)

Customer accounts, authentication, and analytics.

```typescript
import { customers } from '@madebuy/db'

// Lookups
const customer = await customers.getCustomer(tenantId, customerId)
const customer = await customers.getCustomerByEmail(tenantId, email)
const all = await customers.listCustomers(tenantId, { limit: 50 })

// Registration & Auth (passwords hashed with bcryptjs, 12 rounds)
const customer = await customers.createCustomer(tenantId, { email, password, name })
const valid = await customers.verifyPassword(tenantId, email, password)

// Email Verification
await customers.sendVerificationEmail(tenantId, customerId)
await customers.verifyEmail(tenantId, token)

// Password Reset
await customers.initiatePasswordReset(tenantId, email)
await customers.resetPassword(tenantId, token, newPassword)

// Address Management
await customers.addAddress(tenantId, customerId, address)
await customers.updateAddress(tenantId, customerId, addressId, updates)
await customers.deleteAddress(tenantId, customerId, addressId)

// Analytics
await customers.getCustomerStats(tenantId, customerId)
// { totalOrders, totalSpent, averageOrderValue, firstOrder, lastOrder }

// Export
const csv = await customers.exportCustomers(tenantId, filters)
```

### media (16 functions)

Images, videos, and file management.

```typescript
import { media } from '@madebuy/db'

// CRUD
const item = await media.getMedia(tenantId, mediaId)
const all = await media.listMedia(tenantId, { type: 'image', limit: 100 })
const newMedia = await media.createMedia(tenantId, data)
await media.deleteMedia(tenantId, mediaId)

// Display Ordering (atomic bulk updates)
await media.updateDisplayOrder(tenantId, pieceId, [mediaId1, mediaId2, mediaId3])

// Video Processing Status
await media.updateVideoStatus(tenantId, mediaId, 'processing' | 'complete' | 'failed')

// Variants (different sizes/optimizations)
await media.addVariant(tenantId, mediaId, {
  key: 'thumbnail',
  url: 'https://...',
  width: 200,
  height: 200
})

// Metadata
await media.updateMetadata(tenantId, mediaId, {
  caption: 'Product photo',
  altText: 'Blue ceramic vase',
  hashtags: ['ceramics', 'handmade']
})
```

---

## Commerce Repositories

### discounts (10 functions)

Flexible discount code system.

```typescript
import { discounts } from '@madebuy/db'

// CRUD
const code = await discounts.getDiscount(tenantId, code)
const all = await discounts.listDiscounts(tenantId)
await discounts.createDiscount(tenantId, {
  code: 'SUMMER20',
  type: 'percentage',  // or 'fixed'
  value: 20,
  minOrderAmount: 50,
  maxUses: 100,
  perCustomerLimit: 1,
  startsAt: new Date(),
  endsAt: new Date('2024-12-31'),
  applicableTo: { categories: ['jewelry'] }  // or { pieceIds: [...] }
})

// Validation
const valid = await discounts.validateDiscount(tenantId, code, {
  customerId,
  cartTotal,
  items
})

// Usage Tracking
await discounts.incrementUsage(tenantId, code, customerId)
const stats = await discounts.getDiscountStats(tenantId, code)
```

### transactions (11 functions)

Payment transaction ledger.

```typescript
import { transactions } from '@madebuy/db'

const tx = await transactions.createTransaction(tenantId, {
  orderId,
  provider: 'stripe',  // or 'paypal', 'manual'
  externalId: 'pi_xxx',
  amount: 9999,  // cents
  currency: 'AUD',
  status: 'succeeded',
  fees: { platform: 299, stripe: 59 }
})

const all = await transactions.listTransactions(tenantId, { orderId })
const summary = await transactions.getTransactionSummary(tenantId, dateRange)
```

### payouts (8 functions)

Seller payout management via Stripe Connect.

```typescript
import { payouts } from '@madebuy/db'

const payout = await payouts.createPayout(tenantId, {
  stripePayoutId: 'po_xxx',
  amount: 50000,
  currency: 'AUD',
  arrivalDate: new Date(),
  status: 'pending'
})

await payouts.updatePayoutStatus(tenantId, payoutId, 'paid')
const all = await payouts.listPayouts(tenantId, { status: 'paid' })
```

---

## Content Repositories

### blog (10 functions)

Blog posts for storefronts.

```typescript
import { blog } from '@madebuy/db'

const post = await blog.getPost(tenantId, postId)
const post = await blog.getPostBySlug(tenantId, slug)
const all = await blog.listPosts(tenantId, { status: 'published' })

await blog.createPost(tenantId, {
  title: 'New Collection Launch',
  slug: 'new-collection-launch',
  content: '<p>...</p>',
  excerpt: 'Introducing our spring collection',
  status: 'draft'
})

await blog.publishPost(tenantId, postId)
await blog.incrementViews(tenantId, postId)
```

### collections (12 functions)

Curated product collections.

```typescript
import { collections } from '@madebuy/db'

const collection = await collections.getCollection(tenantId, collectionId)
const all = await collections.listCollections(tenantId, { status: 'published' })

await collections.createCollection(tenantId, {
  name: 'Summer Favorites',
  slug: 'summer-favorites',
  description: 'Our top picks for summer',
  pieceIds: [pieceId1, pieceId2],
  featured: true
})

await collections.addPiece(tenantId, collectionId, pieceId)
await collections.removePiece(tenantId, collectionId, pieceId)
```

### newsletters (10 functions)

Email newsletter campaigns.

```typescript
import { newsletters } from '@madebuy/db'

const campaign = await newsletters.createCampaign(tenantId, {
  name: 'Holiday Sale',
  subject: '50% Off Everything!',
  content: '<html>...</html>',
  segment: 'all'  // or 'repeat_customers', 'new_customers'
})

await newsletters.scheduleCampaign(tenantId, campaignId, sendAt)
await newsletters.sendCampaign(tenantId, campaignId)
const stats = await newsletters.getCampaignStats(tenantId, campaignId)
```

---

## Social & Publishing

### publish (8 functions)

Social media scheduling via Late API.

```typescript
import { publish } from '@madebuy/db'

const record = await publish.createPublishRecord(tenantId, {
  pieceId,
  platforms: ['instagram', 'facebook'],
  caption: 'Check out our new...',
  mediaIds: [mediaId1, mediaId2],
  scheduledAt: new Date(),
  status: 'scheduled'
})

await publish.updatePublishStatus(tenantId, recordId, 'published', {
  instagram: { postId: 'xxx', success: true },
  facebook: { postId: 'yyy', success: true }
})

const scheduled = await publish.listScheduledPosts(tenantId)
const history = await publish.listPublishHistory(tenantId, pieceId)
```

---

## Analytics & Tracking

### analytics (6 functions)

Conversion funnel tracking.

```typescript
import { analytics } from '@madebuy/db'

// Record events
await analytics.recordEvent(tenantId, {
  type: 'product_view',  // cart_add, checkout_start, purchase
  pieceId,
  customerId,
  sessionId
})

// Funnel analysis
const funnel = await analytics.getFunnel(tenantId, dateRange)
// { views: 1000, cartAdds: 200, checkouts: 100, purchases: 50 }

const productFunnel = await analytics.getProductFunnel(tenantId, pieceId, dateRange)
```

### tracking (8 functions)

User session and UTM tracking.

```typescript
import { tracking } from '@madebuy/db'

await tracking.createSession(tenantId, {
  sessionId: 'xxx',
  customerId,  // optional
  source: 'google',
  medium: 'cpc',
  campaign: 'summer_sale'
})

await tracking.recordPageView(tenantId, sessionId, '/products/vase')
const sessions = await tracking.getSessionsByCustomer(tenantId, customerId)
```

---

## Bulk Operations

### bulk (12 functions)

Batch operations for efficiency.

```typescript
import { bulk } from '@madebuy/db'

// Status Updates
await bulk.bulkUpdateStatus(tenantId, pieceIds, 'published')
await bulk.bulkUpdateStatus(tenantId, pieceIds, 'archived')

// Price Updates
await bulk.bulkUpdatePrices(tenantId, pieceIds, {
  type: 'percentage',  // or 'fixed'
  value: 10,           // 10% increase or $10 increase
  direction: 'increase'  // or 'decrease'
})

// Tagging
await bulk.bulkAddTag(tenantId, pieceIds, 'sale')
await bulk.bulkRemoveTag(tenantId, pieceIds, 'featured')

// Category
await bulk.bulkUpdateCategory(tenantId, pieceIds, 'jewelry')

// Deletion
await bulk.bulkDelete(tenantId, pieceIds)

// Export
const csv = await bulk.exportPieces(tenantId, filters)
```

---

## Security & Audit

### auditLog (7 functions)

Security audit trail for compliance.

```typescript
import { auditLog } from '@madebuy/db'

// Log events
await auditLog.logAuditEvent(tenantId, {
  action: 'login',  // logout, password_reset, settings_change, etc.
  actorId: customerId,
  actorType: 'customer',  // or 'tenant'
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  metadata: { /* additional context */ }
})

// Query logs
const logs = await auditLog.getAuditLogs(tenantId, {
  action: 'login',
  startDate,
  endDate
})

// Security: Failed login tracking
const attempts = await auditLog.getFailedLoginAttempts(email, windowMinutes)
// Block after 5 failed attempts
```

**Note:** Audit logs have 90-day retention via TTL index.

---

## Variants System

### variants (28 functions)

Advanced product variant management.

```typescript
import { variants } from '@madebuy/db'

// Create variants for a piece
await variants.createVariant(tenantId, pieceId, {
  sku: 'VASE-BLUE-SM',
  name: 'Small Blue',
  options: { color: 'blue', size: 'small' },
  price: 4999,  // optional price override
  stock: 10
})

// Stock Management
await variants.updateStock(tenantId, pieceId, variantId, 5)
await variants.bulkUpdateStock(tenantId, updates)

// Lookups
const variant = await variants.getVariantBySku(tenantId, sku)
const all = await variants.listVariants(tenantId, pieceId)

// Error Handling
// Throws: VariantError, DuplicateSkuError, ValidationError
```

---

## Other Repositories

| Repository | Functions | Purpose |
|------------|-----------|---------|
| `materials` | 10 | Supply chain, cost tracking |
| `downloads` | 14 | Digital product delivery with TTL |
| `reviews` | 14 | Customer reviews & moderation |
| `wishlist` | 7 | Customer wishlists |
| `abandonedCarts` | 13 | Cart recovery campaigns |
| `enquiries` | 9 | Contact form submissions |
| `keyDates` | 6 | Calendar events |
| `domains` | 8 | Custom domain management |
| `invoices` | 8 | Invoice generation |
| `previews` | 5 | Product preview links |

---

## Database Client

### Connection Management

```typescript
import { getDatabase, getMongoClient } from '@madebuy/db'

// Get database instance (auto-connects and ensures indexes)
const db = await getDatabase()

// Get raw MongoDB client for transactions
const client = await getMongoClient()
```

### Manual Index Creation

Indexes are automatically created on first database connection. To manually trigger index creation:

```typescript
import { ensureIndexes, getDatabase } from '@madebuy/db'

const db = await getDatabase()
await ensureIndexes(db)
```

**Indexes are created for:**
- Multi-tenant isolation (all collections have `tenantId` indexes)
- Common query patterns (status filters, date sorting, etc.)
- Unique constraints (emails, slugs, SKUs)
- Full-text search (pieces collection)
- TTL cleanup (expired tokens, old reservations)

**Performance-critical compound indexes:**
```typescript
// Pieces: tenant + slug lookup (unique)
{ tenantId: 1, slug: 1 }

// Orders: efficient payment intent lookup
{ tenantId: 1, paymentIntentId: 1 }

// Orders: order number lookup with tenant isolation
{ tenantId: 1, orderNumber: 1 }

// Media: efficient piece media retrieval
{ tenantId: 1, pieceId: 1 }

// Stock Reservations: session lookup
{ tenantId: 1, sessionId: 1 }

// Customers: email lookup with tenant isolation
{ tenantId: 1, email: 1 }
```

All indexes are defined in `packages/db/src/indexes.ts` and are idempotent - safe to call multiple times.

### Utilities

```typescript
import { serializeMongo, serializeMongoArray } from '@madebuy/db'

// Convert MongoDB documents for JSON serialization
// Handles ObjectId, Date, etc.
const serialized = serializeMongo(document)
const serializedArray = serializeMongoArray(documents)
```

---

## Aggregation Examples

### Order Statistics

```typescript
const stats = await orders.getOrderStats(tenantId)
// Uses: $match → $group by status → $project

// Result: { pending: 5, processing: 3, shipped: 12, delivered: 45 }
```

### Stock Alerts

```typescript
const alerts = await pieces.getStockAlerts(tenantId, 5)
// Uses: $facet for parallel pipelines
// - Piece-level stock check
// - Variant-level stock check

// Result: [{ pieceId, name, stock, threshold, variants: [...] }]
```

### Customer Cohorts

```typescript
const cohorts = await customers.getCohortAnalysis(tenantId)
// Uses: $group by acquisition source → $project stats

// Result: [{ source: 'google', count: 150, avgLtv: 250 }]
```

---

## Best Practices

### Always Pass tenantId

```typescript
// Correct
await pieces.listPieces(tenantId, filters)

// Wrong - will fail
await pieces.listPieces(filters)
```

### Use Pagination

```typescript
// Fetch in batches
let offset = 0
const limit = 100

while (true) {
  const batch = await pieces.listPieces(tenantId, { limit, offset })
  if (batch.length === 0) break

  // Process batch...

  offset += limit
}
```

### Handle Errors

```typescript
import { VariantError, DuplicateSkuError } from '@madebuy/db/variants'

try {
  await variants.createVariant(tenantId, pieceId, data)
} catch (error) {
  if (error instanceof DuplicateSkuError) {
    // Handle duplicate SKU
  } else if (error instanceof VariantError) {
    // Handle validation error
  }
  throw error
}
```

### Use Batch Operations

```typescript
// Prefer bulk operations over loops
await bulk.bulkUpdateStatus(tenantId, pieceIds, 'published')

// Instead of:
for (const id of pieceIds) {
  await pieces.updatePiece(tenantId, id, { status: 'published' })
}
```

---

## Performance Tips

1. **Use indexes** - All common queries have compound indexes
2. **Limit results** - Always use `limit` parameter
3. **Batch fetch** - Use `getTenantsByIds()` for multiple tenants
4. **Aggregation** - Use existing aggregation functions instead of fetching all
5. **Projection** - Repository functions already project only needed fields

---

## TypeScript Types

All types are imported from `@madebuy/shared`:

```typescript
import type {
  Tenant,
  Piece,
  Order,
  Customer,
  Media,
  // ... etc
} from '@madebuy/shared'
```

---

## Testing

```bash
cd packages/db
pnpm test
```

Tests use Vitest with MongoDB memory server.

---

## License

Private - MadeBuy Pty Ltd
