# Work Plan: Fix MadeBuy Project Review Issues

## Context

**Original Request:** Fix all issues identified in the MadeBuy project review, covering critical payment validation, webhook testing, performance optimization, and code quality improvements.

**Project:** MadeBuy - Next.js 14 monorepo marketplace platform
**Stack:** Next.js 14, TypeScript, MongoDB, Tailwind CSS, pnpm workspaces
**Structure:** apps/admin, apps/web, apps/manager, packages/db, packages/shared, packages/storage, packages/social

## Work Objectives

### Core Objective
Improve code quality, security, and maintainability by addressing validation gaps, adding comprehensive tests for payment flows, optimizing database queries, and standardizing logging and error handling.

### Deliverables
1. Checkout route using Zod validation schema
2. Comprehensive Stripe webhook test suite
3. N+1 query fix in webhook handler
4. Redis-backed rate limiting implementation
5. Input sanitization applied consistently
6. Subscription cancellation email function
7. Pino structured logging throughout
8. Standardized error responses across routes
9. Turborepo configuration (turbo.json)

### Definition of Done
- All tests pass
- No TypeScript errors
- Docker containers build successfully
- Manual verification of checkout flow

---

## Must Have / Must NOT Have

### Must Have
- Backward compatibility with existing checkout flows
- All webhook events continue to work
- Rate limiting remains functional during Redis migration
- Type safety preserved throughout

### Must NOT Have
- Breaking changes to API contracts
- Removal of existing functionality
- Changes to environment variable names without migration path
- Direct MongoDB queries in route handlers (use repository pattern)

---

## Task Flow and Dependencies

```
Phase 1 (Foundation - No Dependencies)
├── Task 1: Wire up checkout validation (CRITICAL)
├── Task 9: Add turbo.json (MEDIUM)
└── Task 6: Subscription cancellation email (MEDIUM)

Phase 2 (Depends on Phase 1)
├── Task 2: Webhook tests (CRITICAL) [depends on validated checkout]
├── Task 7: Pino logger setup (MEDIUM)
└── Task 5: Add sanitizeInput consistently (HIGH)

Phase 3 (Can parallelize)
├── Task 3: Fix N+1 query (HIGH)
├── Task 4: Redis rate limiting (HIGH)
└── Task 8: Standardize error responses (MEDIUM)
```

---

## Detailed TODOs

### Task 1: Wire Up Checkout Validation (CRITICAL)

**Objective:** Use existing Zod schema to validate checkout requests before processing

**Files to Modify:**
- `apps/web/src/app/api/checkout/route.ts`

**Implementation:**
1. Import `safeValidateCheckoutRequest` from `@madebuy/shared`
2. Replace manual presence checks (lines 59-64) with Zod validation
3. Return detailed validation errors from Zod
4. Ensure proper error response format

**Code Changes:**
```typescript
// Add import at top
import { safeValidateCheckoutRequest } from '@madebuy/shared'

// Replace lines 47-64 with:
const body = await request.json()
const validation = safeValidateCheckoutRequest(body)
if (!validation.success) {
  return NextResponse.json(
    {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validation.error.flatten().fieldErrors
    },
    { status: 400 }
  )
}
const { tenantId, items, customerInfo, shippingAddress, notes, successUrl, cancelUrl } = validation.data
```

**Acceptance Criteria:**
- [ ] Zod schema validates all checkout requests
- [ ] Invalid requests return 400 with field-level errors
- [ ] Valid requests proceed to stock reservation
- [ ] TypeScript types are inferred from schema

**Verification:**
```bash
# Test invalid request
curl -X POST http://localhost:3301/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"tenantId": ""}'
# Should return 400 with VALIDATION_ERROR

# Test valid structure (will fail on tenant but pass validation)
curl -X POST http://localhost:3301/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "test", "items": [{"pieceId": "1", "quantity": 1, "price": 10}], "customerInfo": {"name": "Test", "email": "test@test.com"}, "successUrl": "http://localhost/success", "cancelUrl": "http://localhost/cancel"}'
```

---

### Task 2: Add Comprehensive Webhook Tests (CRITICAL)

**Objective:** Add test coverage for core Stripe webhook events

**Files to Create:**
- `apps/web/src/app/api/webhooks/stripe/__tests__/route.test.ts`

**Test Cases Required:**
1. `checkout.session.completed` - Creates order, updates stock, sends email
2. `checkout.session.completed` - Idempotency (duplicate events ignored)
3. `payment_intent.payment_failed` - Cancels stock reservations
4. `checkout.session.expired` - Releases reservations
5. `customer.subscription.created` - Updates tenant plan
6. `customer.subscription.deleted` - Downgrades to free
7. `invoice.payment_failed` - Sends notification email
8. Invalid signature - Returns 400
9. Missing tenantId in metadata - Logs error, returns 200

**Implementation:**
1. Create test file with Vitest setup
2. Mock Stripe SDK and database repositories
3. Create factory functions for test events
4. Test each handler function in isolation

**Acceptance Criteria:**
- [ ] All 9 test cases implemented
- [ ] Tests mock Stripe signature verification
- [ ] Tests verify database operations called correctly
- [ ] Tests verify email functions called
- [ ] 100% code path coverage for webhook handlers

**Verification:**
```bash
pnpm --filter web test:run -- stripe
```

---

### Task 3: Fix N+1 Query in Webhook Handler (HIGH)

**Objective:** Batch fetch pieces instead of fetching each one individually in a loop

**Files to Modify:**
- `apps/web/src/app/api/webhooks/stripe/route.ts` (lines 168-188)

**Current Code (N+1 pattern):**
```typescript
for (const item of items) {
  const piece = await pieces.getPiece(tenantId, item.pieceId)  // N queries!
  // ...
}
```

**New Code (Batch fetch):**
```typescript
// Batch fetch all pieces at once
const pieceIds = items.map(item => item.pieceId)
const piecesMap = await pieces.getPiecesByIds(tenantId, pieceIds)

// Build order items from pre-fetched map
const orderItems = []
for (const item of items) {
  const piece = piecesMap.get(item.pieceId)
  if (!piece) {
    console.error(`Piece ${item.pieceId} not found for order`)
    continue
  }
  orderItems.push({
    pieceId: piece.id,
    variantId: item.variantId,
    name: piece.name,
    price: item.price,
    quantity: item.quantity,
    category: piece.category,
    description: piece.description,
    personalizations: item.personalization,
    personalizationTotal: item.personalizationTotal || 0,
  })
}
```

**Also fix download email loop (lines 265-296):**
```typescript
// Second N+1 pattern exists for digital downloads
// Batch fetch pieces for downloads too
```

**Acceptance Criteria:**
- [ ] Only 1 database query for all pieces (instead of N)
- [ ] Order items contain all required fields
- [ ] Digital download processing still works
- [ ] Webhook processing time reduced

**Verification:**
```bash
# Add timing log before/after and compare
# Or check MongoDB profiler for query count
```

---

### Task 4: Implement Redis Rate Limiting (HIGH)

**Objective:** Replace in-memory rate limiting with Redis for multi-instance support

**Files to Modify:**
- `apps/admin/src/lib/rate-limit.ts`
- `apps/web/src/lib/rate-limit.ts`

**Files to Create:**
- `packages/shared/src/lib/rate-limit.ts` (shared implementation)

**Dependencies to Add:**
```bash
pnpm add ioredis --filter @madebuy/shared
pnpm add @types/ioredis -D --filter @madebuy/shared
```

**Implementation:**
1. Create shared rate limiter in packages/shared
2. Support both Redis and in-memory (fallback)
3. Use atomic INCR + EXPIRE pattern
4. Migrate apps/admin and apps/web to use shared

**New Rate Limiter Structure:**
```typescript
// packages/shared/src/lib/rate-limit.ts
import Redis from 'ioredis'

interface RateLimitConfig {
  redis?: Redis
  interval: number
  uniqueTokenPerInterval: number
}

export class RateLimiter {
  private redis: Redis | null
  private fallbackStore: Map<string, RateLimitStore> // In-memory fallback

  async check(identifier: string, limit?: number): Promise<RateLimitResult> {
    if (this.redis) {
      return this.checkRedis(identifier, limit)
    }
    return this.checkInMemory(identifier, limit)
  }

  private async checkRedis(identifier: string, limit?: number) {
    const key = `ratelimit:${identifier}`
    const multi = this.redis.multi()
    multi.incr(key)
    multi.pttl(key)
    // ... atomic Redis implementation
  }
}
```

**Environment Variables:**
```bash
REDIS_URL=redis://localhost:6379  # Optional, falls back to in-memory
```

**Acceptance Criteria:**
- [ ] Redis rate limiting works when REDIS_URL is set
- [ ] In-memory fallback works when REDIS_URL not set
- [ ] Rate limits shared across instances (verified with 2 instances)
- [ ] Existing rate limit behavior preserved
- [ ] No memory leaks in in-memory fallback

**Verification:**
```bash
# Run 2 instances, exceed limit on one, verify blocked on both
# With in-memory, limits are per-instance (expected fallback behavior)
```

---

### Task 5: Add sanitizeInput Consistently (HIGH)

**Objective:** Apply sanitizeInput to all routes accepting user text input

**Files to Audit and Modify:**

**apps/web routes (public input):**
- `apps/web/src/app/api/enquiry/route.ts` - name, email, message
- `apps/web/src/app/api/reviews/route.ts` - review content
- `apps/web/src/app/api/checkout/route.ts` - notes, customer info

**apps/admin routes (authenticated but still needs sanitization):**
- `apps/admin/src/app/api/pieces/route.ts` - name, description
- `apps/admin/src/app/api/blog/route.ts` - title, content
- `apps/admin/src/app/api/collections/route.ts` - name, description
- `apps/admin/src/app/api/customers/route.ts` - name, email
- `apps/admin/src/app/api/newsletters/route.ts` - subject, content

**Implementation Pattern:**
```typescript
import { sanitizeInput } from '@madebuy/shared'

// Before saving to database:
const sanitizedName = sanitizeInput(data.name)
const sanitizedMessage = sanitizeInput(data.message)
```

**Acceptance Criteria:**
- [ ] All user text inputs sanitized before database storage
- [ ] Control characters and null bytes removed
- [ ] Existing data not corrupted
- [ ] Performance not significantly impacted

**Verification:**
```bash
# Test with control characters
curl -X POST http://localhost:3301/api/enquiry \
  -d '{"name": "Test\u0000User", "message": "Hello\x00World"}'
# Verify stored values don't contain null bytes
```

---

### Task 6: Implement Subscription Cancellation Email (MEDIUM)

**Objective:** Send email notification when subscription is cancelled

**Files to Modify:**
- `apps/web/src/lib/email.ts` - Add sendSubscriptionCancelledEmail function
- `apps/web/src/app/api/webhooks/stripe/route.ts` - Call email function (line ~489)

**Implementation:**
```typescript
// apps/web/src/lib/email.ts
export interface SubscriptionCancelledEmailParams {
  tenant: Tenant
  lastDayOfService: Date
  reason?: string
}

export async function sendSubscriptionCancelledEmail(params: SubscriptionCancelledEmailParams) {
  // Email template informing:
  // - Subscription has ended
  // - Features now limited to free tier
  // - How to resubscribe
  // - Data retention period
}
```

**Acceptance Criteria:**
- [ ] Email sent when customer.subscription.deleted webhook received
- [ ] Email includes downgrade information
- [ ] Email includes resubscribe CTA
- [ ] Email follows existing template style

**Verification:**
- Manually trigger webhook in Stripe test mode
- Check email received in tenant inbox

---

### Task 7: Replace console.error with Pino (MEDIUM)

**Objective:** Implement structured logging throughout the codebase

**Files to Create:**
- `packages/shared/src/lib/logger.ts`

**Files to Modify:**
- All 278 files with console.error (prioritize critical paths first)

**Dependencies:**
```bash
pnpm add pino pino-pretty --filter @madebuy/shared
```

**Implementation:**
```typescript
// packages/shared/src/lib/logger.ts
import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev ? { target: 'pino-pretty' } : undefined,
})

// Named loggers for different contexts
export const createLogger = (name: string) => logger.child({ service: name })
```

**Usage:**
```typescript
import { createLogger } from '@madebuy/shared'
const log = createLogger('stripe-webhook')

// Instead of:
console.error('Webhook error:', err)

// Use:
log.error({ err, eventId: event.id }, 'Webhook processing failed')
```

**Priority Order for Migration:**
1. Payment/checkout routes (critical)
2. Webhook handlers (critical)
3. Auth routes (high)
4. API routes (medium)
5. Components (low - can use console.warn for client)

**Acceptance Criteria:**
- [ ] Pino logger exported from @madebuy/shared
- [ ] All webhook handlers use structured logging
- [ ] All checkout/payment routes use structured logging
- [ ] Log output is JSON in production
- [ ] Log output is pretty-printed in development

**Verification:**
```bash
# Run in production mode, verify JSON output
NODE_ENV=production pnpm --filter web dev
# Trigger an error, check log format
```

---

### Task 8: Standardize Error Responses (MEDIUM)

**Objective:** Ensure all routes use @madebuy/shared error classes and toErrorResponse

**Pattern to Apply:**
```typescript
import { isMadeBuyError, toErrorResponse, ValidationError, NotFoundError } from '@madebuy/shared'

export async function POST(request: NextRequest) {
  try {
    // ... route logic

    // Throw typed errors
    if (!tenant) throw new NotFoundError('Tenant', tenantId)
    if (!valid) throw new ValidationError('Invalid input', { field: ['error'] })

  } catch (error) {
    // Unified error handling
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json({ error: msg, code, details }, { status: statusCode })
    }

    // Log unexpected errors
    logger.error({ err: error }, 'Unexpected error')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
```

**Files to Update (priority):**
1. `apps/web/src/app/api/checkout/route.ts`
2. `apps/web/src/app/api/webhooks/stripe/route.ts`
3. `apps/admin/src/app/api/pieces/route.ts` (already partially done - use as template)
4. All other API routes

**Acceptance Criteria:**
- [ ] All error responses have consistent structure: `{ error, code, details? }`
- [ ] MadeBuyError subclasses used for typed errors
- [ ] toErrorResponse used in catch blocks
- [ ] No plain `{ error: 'message' }` responses without code

**Verification:**
- API returns consistent error format for all error types
- TypeScript validates error response structure

---

### Task 9: Add turbo.json (MEDIUM)

**Objective:** Configure Turborepo for proper caching and task orchestration

**Files to Create:**
- `turbo.json` (root)

**Implementation:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test:run": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:coverage": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

**Update package.json:**
```json
{
  "scripts": {
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test:run"
  }
}
```

**Dependencies:**
```bash
pnpm add turbo -D -w
```

**Acceptance Criteria:**
- [ ] turbo.json exists with proper pipeline config
- [ ] Build caching works (second build is faster)
- [ ] Dependencies between packages respected
- [ ] Dev command runs both apps in parallel

**Verification:**
```bash
pnpm build  # First build
pnpm build  # Second build should be faster (cached)
```

---

## Commit Strategy

**Commit 1:** Task 1 + Task 9 (Validation + Turbo)
```
feat(checkout): wire up Zod validation for checkout requests

- Import and use safeValidateCheckoutRequest from @madebuy/shared
- Return detailed field-level validation errors
- Add turbo.json for build orchestration
```

**Commit 2:** Task 6 (Email)
```
feat(email): add subscription cancellation notification

- Add sendSubscriptionCancelledEmail function
- Call from handleSubscriptionDeleted webhook handler
```

**Commit 3:** Task 7 (Logging - Phase 1)
```
feat(logging): add Pino structured logger

- Create shared logger in packages/shared
- Migrate webhook handlers to use Pino
- Migrate checkout route to use Pino
```

**Commit 4:** Task 3 (N+1 Fix)
```
perf(webhook): batch fetch pieces to eliminate N+1 query

- Use getPiecesByIds for single query
- Fix both order items and download processing
```

**Commit 5:** Task 5 (Sanitization)
```
security(input): add sanitizeInput to user-facing routes

- Sanitize text inputs in enquiry, reviews, checkout
- Sanitize admin route inputs
```

**Commit 6:** Task 4 (Redis Rate Limiting)
```
feat(rate-limit): add Redis-backed rate limiting

- Create shared rate limiter with Redis support
- Fall back to in-memory when Redis unavailable
- Migrate admin and web apps to shared implementation
```

**Commit 7:** Task 8 (Error Responses)
```
refactor(errors): standardize error responses across routes

- Use MadeBuyError classes consistently
- Apply toErrorResponse in all catch blocks
```

**Commit 8:** Task 2 (Tests)
```
test(webhook): add comprehensive Stripe webhook tests

- Test all webhook event types
- Test idempotency and error handling
- Achieve full code path coverage
```

---

## Success Criteria

### Functional
- [ ] Checkout validates all inputs before processing
- [ ] Webhook tests achieve 100% handler coverage
- [ ] N+1 query eliminated in webhook handler
- [ ] Rate limiting works across multiple instances (when Redis configured)
- [ ] All user inputs sanitized before storage
- [ ] Subscription cancellation triggers email

### Non-Functional
- [ ] Build time improved with Turborepo caching
- [ ] Logs are structured JSON in production
- [ ] Error responses are consistent across all routes
- [ ] No TypeScript errors
- [ ] All existing tests pass

### Verification Checklist
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes
- [ ] Docker containers build and run
- [ ] Manual checkout flow works end-to-end
- [ ] Stripe webhook events processed correctly

---

## Risks and Considerations

### Risk: Redis Dependency
**Mitigation:** In-memory fallback ensures app works without Redis. Rate limiting is defense-in-depth, not primary security.

### Risk: Breaking Changes to Checkout
**Mitigation:** Zod schema matches existing expected input format. Validation errors include field details for debugging.

### Risk: Logging Migration Scope
**Mitigation:** Prioritize critical paths (payments, webhooks). Full migration can be done incrementally.

### Risk: Test Maintenance
**Mitigation:** Use factory functions for test data. Mock at the right abstraction level.

---

## Estimated Effort

| Task | Complexity | Time Estimate |
|------|------------|---------------|
| Task 1: Checkout Validation | Low | 30 min |
| Task 2: Webhook Tests | High | 3-4 hours |
| Task 3: N+1 Fix | Low | 30 min |
| Task 4: Redis Rate Limiting | Medium | 2 hours |
| Task 5: Sanitization | Medium | 1 hour |
| Task 6: Cancellation Email | Low | 45 min |
| Task 7: Pino Logger | Medium | 2 hours |
| Task 8: Error Responses | Medium | 1.5 hours |
| Task 9: turbo.json | Low | 15 min |

**Total Estimate:** ~12 hours
