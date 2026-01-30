# MadeBuy 10-Critic Review: Comprehensive Fix Plan

## Context

### Original Request
Fix ALL 25+ issues identified in the 10-critic MadeBuy security and quality review.

### Research Findings
- **Stock reservations**: Currently stubbed in `packages/db/src/repositories/stubs.ts` - returns mock data, no actual stock management
- **Race conditions**: `updateVariantStock()` in `pieces.ts` does read-then-write, not atomic
- **Tenant isolation**: Several order functions query globally without tenantId filter
- **Bulk operations**: Cancel action in `orders/bulk/route.ts` doesn't restore stock
- **Discount limits**: `customerEmail` parameter accepted but not used in validation
- **Webhooks**: No `charge.refunded` handler in Stripe webhook
- **Build config**: `turbo.json` doesn't explicitly fail on TypeScript/ESLint errors
- **File validation**: R2 upload validates content type but not file size
- **Font loading**: Layout uses system fonts, no explicit font optimization
- **Cart validation**: No cart API exists - cart is client-side only

### Work Objectives
**Core Objective**: Make MadeBuy production-ready with robust security, performance, and user experience

**Deliverables**:
1. Working stock reservation system with atomic operations
2. Complete tenant isolation across all data access
3. Full Stripe webhook coverage including refunds
4. Performance optimizations (indexes, caching, N+1 fixes)
5. Improved error handling and user feedback
6. Build pipeline that catches errors

**Definition of Done**:
- All TypeScript/ESLint errors resolved
- All critical security issues fixed
- Stock management works atomically
- All webhooks handle their events properly
- Performance improvements measurable (< 200ms API response times)

---

## PHASE 1: CRITICAL - Security & Data Integrity (Must Complete First)

### Task 1.1: Implement Real Stock Reservation System
**Complexity**: HIGH
**Files**:
- `packages/db/src/repositories/stockReservations.ts` -> NEW FILE with real implementation
- `packages/db/src/repositories/stubs.ts` -> KEEP AS-IS (contains transaction stubs still needed)
- `packages/db/src/repositories/index.ts` -> Add stockReservations export, update stock functions to use new file

**NOTE**: The existing `stubs.ts` contains BOTH stock reservation stubs AND transaction stubs (`createTransaction`, `getTransactionsByOrder`, etc.). We CANNOT simply rename it. Instead:
1. Create a NEW `stockReservations.ts` with real implementations
2. Leave `stubs.ts` in place for the transaction stubs (still used for marketplace payouts)
3. Update `index.ts` to re-export stock functions from the new file

**Implementation Details**:
```typescript
// Collection: stock_reservations
// Fields: id, tenantId, pieceId, variantId?, quantity, sessionId, expiresAt, status
// Use MongoDB TTL index for automatic expiration

// reserveStock: Use findOneAndUpdate with $inc to atomically decrement
// completeReservation: Update piece stock atomically, delete reservation
// cancelReservation: Restore stock atomically, delete reservation
```

**Acceptance Criteria**:
- [ ] Reservations stored in MongoDB with TTL
- [ ] Atomic stock decrement on reservation
- [ ] Automatic cleanup of expired reservations
- [ ] Race conditions handled via MongoDB atomic ops
- [ ] Transaction stubs in stubs.ts remain functional

---

### Task 1.2: Fix Race Conditions in updateVariantStock()
**Complexity**: MEDIUM
**Files**:
- `packages/db/src/repositories/pieces.ts` (lines 332-367)

**Implementation Details**:
```typescript
// Current: Read piece, calculate new stock, write
// Fix: Use arrayFilters with $inc for atomic variant stock update

await db.collection('pieces').updateOne(
  { tenantId, id: pieceId },
  {
    $inc: { 'variants.$[v].stock': stockChange },
    $set: { updatedAt: new Date() }
  },
  { arrayFilters: [{ 'v.id': variantId }] }
)
```

**Acceptance Criteria**:
- [ ] No read-then-write pattern
- [ ] Uses MongoDB $inc with arrayFilters
- [ ] Handles negative stock prevention atomically

---

### Task 1.3: Add Tenant Isolation to Order Functions
**Complexity**: MEDIUM
**Files**:
- `packages/db/src/repositories/orders.ts` (lines 97-130)

**Functions Requiring Tenant Isolation** (verified to exist):
1. `getOrderByPaymentIntent(paymentIntentId)` at line 97 - queries globally without tenantId
2. `getOrderByOrderNumber(orderNumber)` at line 123 - queries globally without tenantId

**Implementation Details**:
```typescript
// getOrderByPaymentIntent - add tenantId parameter
export async function getOrderByPaymentIntent(
  tenantId: string,
  paymentIntentId: string
): Promise<Order | null>

// getOrderByOrderNumber - add tenantId parameter
export async function getOrderByOrderNumber(
  tenantId: string,
  orderNumber: string
): Promise<Order | null>

// createRefund - new function, requires tenantId
```

**Note**: `updateOrderPaymentStatus` at line 213 already requires tenantId - no change needed.

**Acceptance Criteria**:
- [ ] `getOrderByPaymentIntent` requires tenantId in query
- [ ] `getOrderByOrderNumber` requires tenantId in query
- [ ] Update all call sites to pass tenantId
- [ ] No cross-tenant data leakage possible

---

### Task 1.4: Restore Stock on Order Cancellation
**Complexity**: MEDIUM
**Files**:
- `apps/admin/src/app/api/orders/bulk/route.ts`
- `packages/db/src/repositories/pieces.ts` - **CREATE `incrementVariantStock()` function** (does not exist yet)

**Implementation Details**:
```typescript
// STEP 1: Create incrementVariantStock in pieces.ts (NEW FUNCTION)
export async function incrementVariantStock(
  tenantId: string,
  pieceId: string,
  variantId: string,
  quantity: number
): Promise<void> {
  const db = await getDatabase()
  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $inc: { 'variants.$[v].stock': quantity },
      $set: { updatedAt: new Date() }
    },
    { arrayFilters: [{ 'v.id': variantId }] }
  )
}

// STEP 2: In bulk/route.ts, when action === 'cancelled':
// 1. Fetch orders to get item details
// 2. For each item, increment stock (piece or variant)
// 3. Use transaction to ensure atomicity

for (const order of ordersToCancel) {
  for (const item of order.items) {
    if (item.variantId) {
      await pieces.incrementVariantStock(tenantId, item.pieceId, item.variantId, item.quantity)
    } else {
      await pieces.incrementStock(tenantId, item.pieceId, item.quantity)
    }
  }
}
```

**Acceptance Criteria**:
- [ ] `incrementVariantStock()` function CREATED in pieces.ts
- [ ] Cancellation restores stock for all items
- [ ] Handles both piece-level and variant-level stock
- [ ] Atomic operation prevents partial restoration

---

### Task 1.5: Enforce Per-Customer Discount Limits
**Complexity**: MEDIUM
**Files**:
- `packages/db/src/repositories/discounts.ts` (lines 198-298)
- Add new collection: `discount_usage`

**Implementation Details**:
```typescript
// Track usage per customer per discount code
// Collection: discount_usage { discountId, customerEmail, usageCount, lastUsedAt }

// In validateDiscountCode:
if (discount.maxUsesPerCustomer && customerEmail) {
  const usage = await getCustomerUsage(tenantId, discount.id, customerEmail)
  if (usage >= discount.maxUsesPerCustomer) {
    return { valid: false, error: 'You have reached the maximum uses for this code' }
  }
}

// In incrementDiscountUsage:
await incrementCustomerUsage(tenantId, discountId, customerEmail)
```

**Acceptance Criteria**:
- [ ] Per-customer usage tracked in separate collection
- [ ] Validation checks customer-specific limit
- [ ] Increment tracks both global and per-customer usage

---

### Task 1.6: Add Refund Webhook Handler
**Complexity**: MEDIUM
**Files**:
- `apps/web/src/app/api/webhooks/stripe/route.ts` - **Add charge.refunded handler HERE** (main webhook for payment events)
- `packages/db/src/repositories/orders.ts` (add updateRefundStatus)

**NOTE on webhook routing**:
- `stripe-connect/route.ts` handles Connect-specific events: `account.*`, `payout.*`, `charge.dispute.*`
- `stripe/route.ts` (main webhook) handles payment events: `checkout.session.*`, `payment_intent.*`, `charge.refunded`
- The `charge.refunded` event should go in the MAIN webhook (`stripe/route.ts`), NOT the Connect webhook

**Implementation Details**:
```typescript
// In apps/web/src/app/api/webhooks/stripe/route.ts
case 'charge.refunded':
  await handleChargeRefunded(event.data.object as Stripe.Charge)
  break

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string
  const tenantId = charge.metadata?.tenantId

  // Update order refund status
  await orders.updateRefundStatus(tenantId, paymentIntentId, {
    refundedAmount: charge.amount_refunded,
    refundedAt: new Date(),
    refundId: charge.refunds?.data[0]?.id
  })

  // Restore stock if full refund
  if (charge.amount_refunded === charge.amount) {
    // Restore stock for all items
  }
}
```

**Acceptance Criteria**:
- [ ] charge.refunded event handled in main stripe webhook
- [ ] Order refund status updated
- [ ] Stock restored on full refund
- [ ] Partial refunds recorded correctly

---

### Task 1.7: Fail Build on TypeScript/ESLint Errors
**Complexity**: LOW
**Files**:
- `turbo.json`
- `apps/admin/next.config.js`
- `apps/web/next.config.js`
- `package.json` (build scripts)

**Implementation Details**:
```json
// turbo.json - add lint to build dependencies
"build": {
  "dependsOn": ["^build", "lint"],
  "outputs": [".next/**", "!.next/cache/**", "dist/**"]
}

// next.config.js - ensure TypeScript errors fail build
typescript: {
  ignoreBuildErrors: false, // Ensure this is false!
}
eslint: {
  ignoreDuringBuilds: false, // Ensure this is false!
}
```

**Acceptance Criteria**:
- [ ] TypeScript errors fail the build
- [ ] ESLint errors fail the build
- [ ] CI/CD properly catches errors

---

### Task 1.8: Add File Size Validation to Storage
**Complexity**: LOW
**Files**:
- `packages/storage/src/r2.ts`

**Implementation Details**:
```typescript
// Add constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024 // 25MB

// In uploadToR2:
function getMaxSize(contentType: string): number {
  if (ALLOWED_IMAGE_TYPES.includes(contentType)) return MAX_IMAGE_SIZE
  if (ALLOWED_VIDEO_TYPES.includes(contentType)) return MAX_VIDEO_SIZE
  if (ALLOWED_DOCUMENT_TYPES.includes(contentType)) return MAX_DOCUMENT_SIZE
  return MAX_IMAGE_SIZE // default
}

if (buffer.length > getMaxSize(contentType)) {
  throw new Error(`File too large. Maximum size: ${getMaxSize(contentType) / 1024 / 1024}MB`)
}
```

**Acceptance Criteria**:
- [ ] Image uploads limited to 10MB
- [ ] Video uploads limited to 100MB
- [ ] Document uploads limited to 25MB
- [ ] Clear error message on oversized files

---

### Task 1.9: Add Stock Validation to Cart (Client-Side with Server Verification)
**Complexity**: MEDIUM
**Files**:
- Create: `apps/web/src/app/api/cart/validate/route.ts`
- Update: Cart component to call validation before checkout

**Implementation Details**:
```typescript
// POST /api/cart/validate
// Body: { tenantId, items: [{ pieceId, variantId?, quantity }] }
// Response: { valid: boolean, errors?: [{ pieceId, error, availableStock }] }

export async function POST(request: NextRequest) {
  const { tenantId, items } = await request.json()
  const errors = []

  for (const item of items) {
    const stock = await pieces.getAvailableStock(tenantId, item.pieceId, item.variantId)
    if (stock !== undefined && stock < item.quantity) {
      errors.push({
        pieceId: item.pieceId,
        variantId: item.variantId,
        error: 'Insufficient stock',
        availableStock: stock
      })
    }
  }

  return NextResponse.json({ valid: errors.length === 0, errors })
}
```

**Acceptance Criteria**:
- [ ] API endpoint validates cart stock
- [ ] Returns specific errors per item
- [ ] Cart UI shows stock warnings before checkout

---

### Task 1.10: Optimize Font Loading
**Complexity**: LOW
**Files**:
- `apps/web/src/app/layout.tsx` - **ONLY this file needs changes**

**NOTE**: Admin app (`apps/admin/src/app/layout.tsx`) already has proper font loading:
```typescript
const inter = Inter({ subsets: ['latin'], display: 'swap' })
```
No changes needed for admin app.

**Implementation Details for web app**:
```typescript
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevents FOIT (Flash of Invisible Text)
  variable: '--font-inter',
})

// In body:
<body className={inter.variable}>
```

**Acceptance Criteria**:
- [ ] Web app fonts loaded with display: swap
- [ ] No render-blocking font requests in web app
- [ ] CSS variable for font family in web app
- [ ] Admin app already compliant (no changes needed)

---

## PHASE 2: HIGH PRIORITY - Performance & UX

**Dependencies**: Phase 1 must be complete

### Task 2.1: Fix N+1 Queries in Admin Routes
**Complexity**: MEDIUM
**Files**:
- `apps/admin/src/app/api/orders/route.ts`
- `apps/admin/src/app/api/pieces/route.ts`
- `packages/db/src/repositories/orders.ts`
- `packages/db/src/repositories/pieces.ts`

**Implementation Details**:
```typescript
// Already have getPiecesByIds - ensure it's used everywhere
// Add getOrdersWithPieces for order list views that need piece data

// Pattern: Collect all IDs first, batch fetch, then map
const orderList = await orders.listOrders(tenantId, filters)
const pieceIds = [...new Set(orderList.flatMap(o => o.items.map(i => i.pieceId)))]
const piecesMap = await pieces.getPiecesByIds(tenantId, pieceIds)
```

**Acceptance Criteria**:
- [ ] No loops with individual DB queries
- [ ] All batch operations use $in queries
- [ ] API response times < 200ms for list endpoints

---

### Task 2.2: Add Missing MongoDB Indexes
**Complexity**: LOW
**Files**:
- `packages/db/src/client.ts`

**Implementation Details**:
```typescript
// Add to ensureIndexes():

// Payment intent lookup (used in webhooks)
await db.collection('orders').createIndex({ paymentIntentId: 1 }, { sparse: true })

// Discount usage tracking (new collection)
await db.collection('discount_usage').createIndex(
  { tenantId: 1, discountId: 1, customerEmail: 1 },
  { unique: true }
)

// Stock reservations (new collection)
await db.collection('stock_reservations').createIndex({ sessionId: 1 })
await db.collection('stock_reservations').createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 } // TTL index
)
await db.collection('stock_reservations').createIndex({ tenantId: 1, pieceId: 1, variantId: 1 })
```

**Acceptance Criteria**:
- [ ] All frequently queried fields indexed
- [ ] Compound indexes for multi-field queries
- [ ] TTL indexes for automatic cleanup

---

### Task 2.3: Add Caching Layer
**Complexity**: HIGH
**Files**:
- Create: `packages/db/src/cache.ts`
- Update: `packages/db/src/repositories/tenants.ts`
- Update: `packages/db/src/repositories/pieces.ts`

**Implementation Details**:
```typescript
// Simple in-memory cache with TTL (can upgrade to Redis later)
// packages/db/src/cache.ts

const cache = new Map<string, { data: any; expiresAt: number }>()

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache<T>(key: string, data: T, ttlSeconds: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
}

// Usage in tenants.ts:
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const cacheKey = `tenant:slug:${slug}`
  const cached = getCached<Tenant>(cacheKey)
  if (cached) return cached

  const tenant = await db.collection('tenants').findOne({ slug })
  if (tenant) setCache(cacheKey, tenant, 300) // 5 min cache
  return tenant
}
```

**Acceptance Criteria**:
- [ ] Tenant lookups cached (5 min TTL)
- [ ] Piece lookups cached for public views (1 min TTL)
- [ ] Cache invalidated on updates
- [ ] Memory bounded (max 1000 entries)

---

### Task 2.4: Standardize Loading States
**Complexity**: MEDIUM
**Files**:
- Create: `apps/admin/src/components/ui/LoadingStates.tsx`
- Create: `apps/web/src/components/ui/LoadingStates.tsx`
- Update: Various pages to use consistent loading

**Implementation Details**:
```typescript
// Skeleton loaders for common patterns
export function TableSkeleton({ rows = 5 }: { rows?: number }) { ... }
export function CardGridSkeleton({ cards = 6 }: { cards?: number }) { ... }
export function FormSkeleton() { ... }

// Loading indicator with message
export function LoadingSpinner({ message }: { message?: string }) { ... }

// Full page loading state
export function PageLoading({ title }: { title: string }) { ... }
```

**Acceptance Criteria**:
- [ ] Consistent skeleton loaders across all list views
- [ ] Loading spinners for form submissions
- [ ] No layout shift during loading
- [ ] Accessible loading announcements

---

### Task 2.5: Improve Error Messages
**Complexity**: MEDIUM
**Files**:
- `packages/shared/src/errors.ts`
- Various API routes that return errors

**Implementation Details**:
```typescript
// Extend error classes with user-friendly messages
// packages/shared/src/errors.ts

const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  'INSUFFICIENT_STOCK': 'Sorry, this item is no longer available in the requested quantity.',
  'VALIDATION_ERROR': 'Please check your information and try again.',
  'NOT_FOUND': 'The item you\'re looking for could not be found.',
  'UNAUTHORIZED': 'Please log in to continue.',
  'STRIPE_ERROR': 'There was a problem processing your payment. Please try again.',
  'RATE_LIMIT': 'Too many requests. Please wait a moment and try again.',
}

export function getUserFriendlyMessage(code: string, defaultMsg: string): string {
  return USER_FRIENDLY_MESSAGES[code] || defaultMsg
}
```

**Acceptance Criteria**:
- [ ] All error codes have user-friendly messages
- [ ] Technical details hidden from users
- [ ] Error codes still available for debugging
- [ ] Consistent error format across all APIs

---

### Task 2.6: Add Pagination to All List Endpoints
**Complexity**: MEDIUM
**Files**:
- Various API routes in `apps/admin/src/app/api/`
- Repository functions that return arrays

**Implementation Details**:
```typescript
// Standard pagination response format
interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Apply to: orders, pieces, materials, enquiries, newsletters, etc.
// Default pageSize: 20, Max pageSize: 100
```

**Acceptance Criteria**:
- [ ] All list endpoints support pagination
- [ ] Consistent pagination format
- [ ] Default and maximum page sizes enforced
- [ ] Total count included for UI pagination controls

---

### Task 2.7: Add Retry Logic for External APIs
**Complexity**: MEDIUM
**Files**:
- Create: `packages/shared/src/utils/retry.ts`
- Update: Stripe, Late, OpenAI API calls

**Implementation Details**:
```typescript
// Exponential backoff with jitter
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    baseDelayMs?: number
    maxDelayMs?: number
    retryOn?: (error: Error) => boolean
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 10000 } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      if (options.retryOn && !options.retryOn(error as Error)) throw error

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelayMs
      )
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Retry failed') // Unreachable
}
```

**Stripe Idempotency Keys** (IMPORTANT for payment retries):
```typescript
// When retrying Stripe payment operations, use idempotency keys to prevent duplicate charges
const paymentIntent = await stripe.paymentIntents.create(
  { amount, currency, ... },
  { idempotencyKey: `order_${orderId}_payment` }
)

// Stripe automatically returns the same result for duplicate idempotency keys
// This prevents double-charging customers when retries occur
```

**Acceptance Criteria**:
- [ ] Stripe API calls use retry logic
- [ ] Stripe payment operations include idempotency keys
- [ ] Late API calls use retry logic
- [ ] OpenAI API calls use retry logic
- [ ] Exponential backoff with jitter implemented
- [ ] Max 3 retries, respects rate limits

---

### Task 2.8: Complete Webhook Coverage
**Complexity**: MEDIUM
**Files**:
- `apps/web/src/app/api/webhooks/stripe/route.ts`

**Implementation Details**:
```typescript
// Add handlers for:
case 'customer.subscription.paused':
  await handleSubscriptionPaused(event.data.object)
  break

case 'customer.subscription.resumed':
  await handleSubscriptionResumed(event.data.object)
  break

case 'invoice.paid':
  await handleInvoicePaid(event.data.object)
  break

case 'payment_intent.succeeded':
  // Log for reconciliation but order created in checkout.session.completed
  log.info({ paymentIntentId: event.data.object.id }, 'Payment intent succeeded')
  break

case 'charge.dispute.created':
  await handleDisputeCreated(event.data.object)
  break
```

**Acceptance Criteria**:
- [ ] All subscription lifecycle events handled
- [ ] Dispute events trigger alerts
- [ ] Invoice events logged for reconciliation
- [ ] Webhook handler is idempotent

---

## PHASE 3: MEDIUM PRIORITY - Quality & Polish

**Dependencies**: Phase 2 should be substantially complete

### Task 3.1: Improve 404 Pages
**Complexity**: LOW
**Files**:
- `apps/web/src/app/not-found.tsx`
- `apps/admin/src/app/not-found.tsx`
- `apps/web/src/app/[tenant]/not-found.tsx`

**Implementation Details**:
```typescript
// Helpful not-found page with:
// - Clear message about what wasn't found
// - Search box to find products
// - Links to popular categories
// - Link to home page
// - Contact support link
```

**Acceptance Criteria**:
- [ ] Custom 404 pages for both apps
- [ ] Helpful navigation options
- [ ] Consistent styling with rest of app
- [ ] Tenant-specific 404 for storefronts

---

### Task 3.2: Add Analytics Event Tracking
**Complexity**: MEDIUM
**Files**:
- Create: `packages/shared/src/analytics/events.ts`
- Update: Key user interaction points

**Implementation Details**:
```typescript
// Track key events:
// - Product views
// - Add to cart
// - Begin checkout
// - Complete purchase
// - Search queries
// - Filter usage

// Use existing analytics repository
export async function trackEvent(
  tenantId: string,
  event: string,
  data: Record<string, any>
) {
  await analytics.createEvent({ tenantId, event, ...data })
}
```

**Acceptance Criteria**:
- [ ] Product view tracking
- [ ] Cart interaction tracking
- [ ] Checkout funnel tracking
- [ ] Search and filter tracking
- [ ] No PII in analytics data

---

### Task 3.3: Implement Product Search
**Complexity**: MEDIUM
**Files**:
- `apps/web/src/app/api/[tenant]/search/route.ts`
- `packages/db/src/repositories/pieces.ts` (searchPieces already exists)

**Implementation Details**:
```typescript
// Search endpoint with:
// - Full-text search using existing MongoDB text index
// - Category filtering
// - Price range filtering
// - Sort options (relevance, price, newest)
// - Pagination

// GET /api/[tenant]/search?q=ring&category=Rings&minPrice=50&maxPrice=200&sort=relevance&page=1
```

**Acceptance Criteria**:
- [ ] Full-text search working
- [ ] Filters combinable
- [ ] Results sorted by relevance by default
- [ ] Search suggestions/autocomplete (stretch)

---

### Task 3.4: Add Missing Transactional Emails
**Complexity**: MEDIUM
**Files**:
- `apps/admin/src/lib/email/templates/`
- `apps/web/src/lib/email.ts`

**Implementation Details**:
```typescript
// Missing emails to add:
// - Order shipped notification (with tracking)
// - Order delivered notification
// - Stock back in notification (wishlist)
// - Account verification
// - Password reset
// - Review request (7 days after delivery)
```

**Acceptance Criteria**:
- [ ] Shipping notification with tracking link
- [ ] Delivery notification email
- [ ] All emails have unsubscribe option
- [ ] Consistent branding across emails

---

### Task 3.5: Add Zod Validation to Remaining Routes
**Complexity**: MEDIUM
**Files**:
- Various API routes missing validation

**Implementation Details**:
```typescript
// Audit all API routes, ensure:
// - Request body validated with Zod
// - Query params validated
// - Path params validated
// - Response typed correctly

// Use safeValidate pattern from checkout route
const validation = safeValidate(bodySchema, body)
if (!validation.success) {
  return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 })
}
```

**Acceptance Criteria**:
- [ ] All POST/PUT routes validate body
- [ ] All routes with query params validate them
- [ ] Consistent validation error format
- [ ] No unvalidated user input

---

### Task 3.6: Replace Console.log with Pino Logger
**Complexity**: LOW
**Files**:
- All files using console.log/error/warn
- Logger already exists in `packages/shared`

**Implementation Details**:
```typescript
// Replace patterns:
// console.log('Message') -> log.info({ ... }, 'Message')
// console.error('Error', err) -> log.error({ err }, 'Error')
// console.warn('Warning') -> log.warn({ ... }, 'Warning')

// Ensure structured logging with context
const log = createLogger('module-name')
log.info({ orderId, tenantId }, 'Order created')
```

**Acceptance Criteria**:
- [ ] No console.log in production code
- [ ] All logs use Pino logger
- [ ] Logs include structured context
- [ ] Log levels appropriate (info, warn, error)

---

### Task 3.7: Add Tests for Critical Paths
**Complexity**: HIGH
**Files**:
- Create: `packages/db/src/__tests__/`
- Create: `apps/web/src/__tests__/`
- Create: `apps/admin/src/__tests__/`

**Implementation Details**:
```typescript
// Priority test coverage:
// 1. Stock reservation system (unit tests)
// 2. Checkout flow (integration tests)
// 3. Webhook handlers (unit tests)
// 4. Discount validation (unit tests)
// 5. Order cancellation with stock restoration (integration)

// Use Vitest for unit tests
// Use Playwright for E2E tests (already configured)
```

**Acceptance Criteria**:
- [ ] Stock reservation tests with concurrency scenarios
- [ ] Checkout tests covering edge cases
- [ ] Webhook handler tests with mock Stripe events
- [ ] >70% coverage on critical paths

---

## Task Flow and Dependencies

```
PHASE 1 (Critical - Sequential where noted)
├── Task 1.1: Stock Reservations [FIRST - many depend on this]
├── Task 1.2: Race Conditions (can parallel with 1.3-1.5)
├── Task 1.3: Tenant Isolation (can parallel)
├── Task 1.4: Cancel Stock Restore [AFTER 1.1]
├── Task 1.5: Discount Limits (can parallel)
├── Task 1.6: Refund Webhook (can parallel)
├── Task 1.7: Build Config (can parallel)
├── Task 1.8: File Size Validation (can parallel)
├── Task 1.9: Cart Stock Validation [AFTER 1.1]
└── Task 1.10: Font Loading (can parallel)

PHASE 2 (High Priority - After Phase 1)
├── Task 2.1: N+1 Fixes (can parallel)
├── Task 2.2: MongoDB Indexes [AFTER 1.1, 1.5]
├── Task 2.3: Caching Layer (can parallel)
├── Task 2.4: Loading States (can parallel)
├── Task 2.5: Error Messages (can parallel)
├── Task 2.6: Pagination (can parallel)
├── Task 2.7: Retry Logic (can parallel)
└── Task 2.8: Webhook Coverage [AFTER 1.6]

PHASE 3 (Medium Priority - After Phase 2)
├── Task 3.1: 404 Pages (can parallel)
├── Task 3.2: Analytics Events (can parallel)
├── Task 3.3: Product Search (can parallel)
├── Task 3.4: Transactional Emails (can parallel)
├── Task 3.5: Zod Validation (can parallel)
├── Task 3.6: Logger Cleanup (can parallel)
└── Task 3.7: Tests [LAST - after all changes]
```

---

## Commit Strategy

### Phase 1 Commits
1. `feat(db): implement real stock reservation system`
2. `fix(db): use atomic operations for variant stock updates`
3. `fix(db): enforce tenant isolation in order queries`
4. `fix(admin): restore stock on order cancellation`
5. `feat(db): enforce per-customer discount limits`
6. `feat(webhooks): handle charge.refunded events`
7. `fix(build): fail on TypeScript and ESLint errors`
8. `feat(storage): add file size validation`
9. `feat(api): add cart stock validation endpoint`
10. `perf(web): optimize font loading`

### Phase 2 Commits
1. `perf(api): batch fetch to eliminate N+1 queries`
2. `perf(db): add missing MongoDB indexes`
3. `perf(db): add in-memory caching layer`
4. `feat(ui): standardize loading states`
5. `fix(api): improve error messages for users`
6. `feat(api): add pagination to all list endpoints`
7. `feat(shared): add retry logic for external APIs`
8. `feat(webhooks): complete subscription lifecycle coverage`

### Phase 3 Commits
1. `feat(web): improve 404 pages with navigation`
2. `feat(analytics): add event tracking`
3. `feat(api): implement product search endpoint`
4. `feat(email): add missing transactional emails`
5. `fix(api): add Zod validation to remaining routes`
6. `refactor: replace console.log with Pino logger`
7. `test: add tests for critical paths`

---

## Success Criteria

### Security
- [ ] No cross-tenant data access possible
- [ ] All user input validated
- [ ] File uploads size-limited
- [ ] Stock operations atomic

### Performance
- [ ] API responses < 200ms (P95)
- [ ] No N+1 queries
- [ ] Critical paths cached
- [ ] Fonts don't block render

### Reliability
- [ ] Build fails on errors
- [ ] External API calls retry
- [ ] Webhooks idempotent
- [ ] Stock never goes negative

### User Experience
- [ ] Clear error messages
- [ ] Consistent loading states
- [ ] Helpful 404 pages
- [ ] Complete email notifications

---

## Verification Steps

### After Phase 1
```bash
# Run build to verify no errors
pnpm build

# Test stock reservation manually
# 1. Add item to cart
# 2. Begin checkout
# 3. In another session, try to checkout same item
# 4. Verify reservation blocks second checkout

# Test order cancellation
# 1. Create order
# 2. Cancel order via bulk action
# 3. Verify stock restored
```

### After Phase 2
```bash
# Measure API response times
# Use browser DevTools or load testing tool

# Verify caching
# 1. Load tenant page
# 2. Check logs for cache hit on second load

# Test retry logic
# 1. Temporarily break Stripe connection
# 2. Attempt checkout
# 3. Verify retries in logs
```

### After Phase 3
```bash
# Run test suite
pnpm test:run

# Check coverage
pnpm test:coverage

# Verify no console.log
grep -r "console\." apps/ packages/ --include="*.ts" --include="*.tsx"
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Stock reservation breaks checkout | Implement with feature flag, test extensively |
| Cache invalidation bugs | Start with short TTLs, monitor cache hit rates |
| Retry logic causes duplicate operations | Ensure idempotency in all retried operations |
| Migration breaks existing orders | Stock restoration only for new cancellations |
| Performance regression | Benchmark before/after each phase |

---

## Estimated Effort

| Phase | Tasks | Complexity | Estimated Time |
|-------|-------|------------|----------------|
| Phase 1 | 10 | 5 HIGH, 4 MED, 1 LOW | 16-20 hours |
| Phase 2 | 8 | 2 HIGH, 5 MED, 1 LOW | 12-16 hours |
| Phase 3 | 7 | 1 HIGH, 5 MED, 1 LOW | 10-14 hours |
| **Total** | **25** | | **38-50 hours** |

---

*Plan generated by Prometheus Strategic Planner*
