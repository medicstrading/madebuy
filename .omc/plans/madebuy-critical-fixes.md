# MadeBuy Critical Fixes Plan

**Generated:** 2026-02-01 (Revised: Iteration 1)
**Project:** MadeBuy - SaaS storefront builder for Australian makers
**Total Issues:** 14
**Estimated Total Effort:** 160-220 hours

---

## Executive Summary

This plan addresses 14 critical issues blocking MadeBuy's production launch. Issues are prioritized into three tiers:
- **P0 (Launch Blockers):** Must fix before any revenue can be generated
- **P1 (Core Experience):** Significant UX/security issues that affect daily operations
- **P2 (Important Features):** Features that enhance value proposition but aren't blocking

**Note:** Issue #6 (Etsy/eBay Sync) has been downgraded to P1 and should be addressed in a separate dedicated plan due to scope.

---

## Context

### Original Request
Fix 14 critical issues identified during pre-launch review, ranging from missing routes to security vulnerabilities.

### Architecture Summary
- **Monorepo:** pnpm workspaces with apps/admin, apps/web, packages/*
- **Framework:** Next.js 14 App Router
- **Database:** MongoDB with repository pattern in packages/db
- **Auth:** NextAuth.js with credentials provider
- **Payments:** Stripe Connect for seller payouts
- **Storage:** Cloudflare R2 for media

### Key Patterns Identified
1. **API Routes:** `/apps/*/src/app/api/[resource]/route.ts` with `getCurrentTenant()` auth
2. **Pages:** `/apps/*/src/app/(dashboard)/dashboard/[feature]/page.tsx`
3. **Repositories:** `/packages/db/src/repositories/[resource].ts` with `tenantId` isolation
4. **Types:** `/packages/shared/src/types/[resource].ts`
5. **Rate Limiting:** Already exists at `apps/*/src/lib/rate-limit.ts` with `rateLimiters.auth` = 5 per 15 minutes
6. **Sanitization:** Regex-based at `packages/shared/src/lib/sanitize.ts`
7. **Reserved Slugs:** `apps/web/src/app/[tenant]/[pageSlug]/page.tsx` has `RESERVED_SLUGS` including 'collections' - routes to reserved slugs return notFound(), allowing more specific routes to handle them

### Existing Components Referenced
- **Stripe Connect:** `/apps/admin/src/app/(dashboard)/dashboard/connections/page.tsx` with `ConnectionsPage` component
- **Shipping Labels:** `/apps/admin/src/app/(dashboard)/dashboard/orders/[id]/ShippingActions.tsx` handles Sendle shipping label generation

---

## Work Objectives

### Core Objective
Make MadeBuy production-ready by fixing all launch-blocking issues and addressing critical UX/security gaps.

### Deliverables
1. Collection pages that render products
2. Printable packing slips for orders (separate from shipping labels)
3. Buyer-seller messaging system
4. PayPal integration for checkout
5. Stripe Connect step in onboarding flow (linking to existing Connections page)
6. ~~Working Etsy/eBay sync endpoints~~ (Deferred to separate plan - P1)
7. Mobile-responsive inventory UI
8. WCAG 2.1 AA accessibility compliance
9. Fixed SEO links and sitemap
10. Security hardening (rate limiting using existing `rateLimiters.auth`, tenant isolation, DOMPurify)
11. Workshop/service booking system
12. POS mode for market sales
13. Onboarding checklist and help docs
14. Success celebration moments

### Definition of Done
- [ ] All 13 P0/P1/P2 issues have verified fixes (Etsy/eBay deferred)
- [ ] No TypeScript errors
- [ ] All existing tests pass
- [ ] Manual QA verification for each fix
- [ ] Security review for issues #4, #5, #10

---

## Guardrails

### Must Have
- Tenant isolation on ALL new endpoints
- Rate limiting on public endpoints
- Type safety with strict TypeScript
- Mobile-first responsive design
- Error handling with user-friendly messages

### Must NOT Have
- Direct MongoDB access outside repositories
- Hardcoded credentials or API keys
- Breaking changes to existing API contracts
- New dependencies without justification

---

## Task Flow and Dependencies

```
P0 Issues (Parallel, except #5 before #4):
  [1] Collections Route ─────────┐
  [2] Packing Slips ─────────────┤
  [3] Messaging System ──────────┼──> Can be done in parallel
  [5] Stripe in Onboarding ──────┤ (MUST complete before #4)
  [4] PayPal Integration ────────┘ (depends on #5 for payment settings page)

P1 Issues (After P0):
  [6] Etsy/eBay Sync ──────────> DEFERRED - Separate dedicated plan
  [7] Mobile Inventory ──────────┐
  [8] Accessibility ─────────────┼──> Can be done in parallel
  [9] SEO Fixes ─────────────────┤
  [10] Security Gaps ────────────┘

P2 Issues (After P1):
  [11] Workshop Booking ─────────┐
  [12] POS Mode ─────────────────┼──> Can be done in parallel
  [13] Onboarding Improvements ──┤
  [14] Celebrations ─────────────┘
```

---

## Detailed TODOs

### Issue #1: Collection Routes 404

**Priority:** P0 - Launch Blocker
**Effort:** 4-6 hours

**Problem:** UI links to `/{tenant}/collections/{slug}` but route doesn't exist.

**Clarification:** The `[pageSlug]/page.tsx` catch-all route already includes 'collections' in `RESERVED_SLUGS` (line 17-25). This means requests to `/[tenant]/collections` will call `notFound()` from the catch-all, and Next.js will then route to the more specific `/[tenant]/collections/page.tsx` IF it exists. **There is no conflict - we just need to create the route.**

**Files to Create:**
- `/apps/web/src/app/[tenant]/collections/page.tsx` - Collections listing
- `/apps/web/src/app/[tenant]/collections/[slug]/page.tsx` - Collection detail

**Implementation Steps:**
1. Create `/apps/web/src/app/[tenant]/collections/page.tsx`:
   - Fetch all published collections via `collections.listPublishedCollections(tenantId)`
   - Display grid of collection cards with cover images
   - Use same Header/Footer pattern as tenant homepage
   - Add ISR with `revalidate = 120`

2. Create `/apps/web/src/app/[tenant]/collections/[slug]/page.tsx`:
   - Fetch collection by slug via `collections.getCollectionBySlug(tenantId, slug)`
   - Fetch pieces in collection via `pieces.getPiecesByIds(tenantId, collection.pieceIds)`
   - Display collection hero with cover image and description
   - Grid of products with same card component as homepage
   - Add structured data (CollectionPage schema)
   - Add ISR with `revalidate = 120`

3. Update Footer.tsx to link to valid routes:
   - Change `/[tenant]/shop` to `/[tenant]` (homepage is the shop)
   - Verify `/[tenant]/collections` links to new collections page

**Acceptance Criteria:**
- [ ] `/{tenant}/collections` shows all published collections
- [ ] `/{tenant}/collections/{slug}` shows collection detail with products
- [ ] Links in footer work without 404
- [ ] Pages have proper meta tags and structured data
- [ ] ISR revalidation works (check `X-NextJS-Cache` header)

**Risks:**
- None significant - straightforward page creation following existing patterns. RESERVED_SLUGS already handles routing.

---

### Issue #2: No Packing Slips/Invoices

**Priority:** P0 - Launch Blocker
**Effort:** 8-10 hours

**Problem:** Orders need printable packing slips for fulfillment.

**Clarification:** Packing slips are DIFFERENT from shipping labels:
- **Shipping Labels:** Already implemented in `ShippingActions.tsx` - generates Sendle shipping labels with tracking
- **Packing Slips:** A printable document listing items to pack (name, quantity, personalization notes). Used by the seller during fulfillment.

Both are needed. This issue adds packing slips alongside the existing shipping label functionality.

**Files to Create:**
- `/apps/admin/src/app/(dashboard)/dashboard/orders/[id]/packing-slip/page.tsx` - Print view
- `/apps/admin/src/components/orders/PackingSlip.tsx` - Printable component

**Files to Modify:**
- `/apps/admin/src/app/(dashboard)/dashboard/orders/[id]/page.tsx` - Add "Print Packing Slip" button (separate from ShippingActions)

**Implementation Steps:**

1. Create `PackingSlip.tsx` component:
   ```tsx
   // Print-optimized layout with:
   // - Seller business info (from tenant)
   // - Order number, date
   // - Customer shipping address
   // - Items table: name, quantity, variant, personalization notes
   // - Handling notes (from order.adminNotes)
   // - @media print CSS for A4/Letter format
   // Note: This is NOT the shipping label - just a pick/pack list
   ```

2. Create packing slip page:
   - Server component that fetches order data
   - Renders `<PackingSlip />` in print-optimized layout
   - Auto-opens print dialog on mount (client component wrapper)

3. Add "Print Packing Slip" button to order detail page:
   - Add ABOVE or separate from ShippingActions (not inside it)
   - ShippingActions handles Sendle shipping labels
   - Packing slip is a different document for warehouse picking

4. Optional: PDF generation API for batch printing:
   - Use `@react-pdf/renderer` for PDF generation
   - Useful for printing multiple packing slips at once

**Acceptance Criteria:**
- [ ] "Print Packing Slip" button visible on order detail page
- [ ] Packing slip page renders all order details including personalization
- [ ] Print dialog opens automatically
- [ ] Printed document is properly formatted (no cut-off content)
- [ ] Packing slip is clearly distinct from shipping label functionality

**Risks:**
- Print CSS can be tricky across browsers - test Chrome, Safari, Firefox

---

### Issue #3: No Buyer-Seller Messaging

**Priority:** P0 - Launch Blocker
**Effort:** 16-20 hours

**Problem:** After order placed, no way to communicate about customization, shipping delays, etc.

**Files to Create:**
- `/packages/shared/src/types/message.ts` - Message types
- `/packages/db/src/repositories/messages.ts` - Message repository
- `/apps/admin/src/app/api/orders/[id]/messages/route.ts` - Admin API
- `/apps/web/src/app/api/orders/[orderId]/messages/route.ts` - Customer API
- `/apps/admin/src/app/(dashboard)/dashboard/orders/[id]/messages/page.tsx` - Admin UI
- `/apps/web/src/app/[tenant]/orders/[orderId]/page.tsx` - Customer order view
- `/apps/admin/src/components/orders/MessageThread.tsx` - Shared thread component

**Database Schema:**
```typescript
interface Message {
  id: string
  tenantId: string
  orderId: string
  senderId: string // tenant.id or customer email hash
  senderType: 'seller' | 'customer'
  senderName: string
  content: string
  attachments?: { name: string; url: string; type: string }[]
  isRead: boolean
  createdAt: Date
}
```

**Implementation Steps:**

1. Create message types and repository:
   - Standard CRUD operations with tenant isolation
   - `listMessagesByOrder(tenantId, orderId)` - get thread
   - `markAsRead(tenantId, messageId)` - mark read
   - `countUnreadByOrder(tenantId, orderId)` - unread count

2. Create admin API:
   - GET: List messages for order
   - POST: Send message as seller
   - Validate tenant owns the order

3. Create customer-facing API:
   - POST: Send message (verify email matches order)
   - GET: Get messages (verify email matches order)
   - Use order email + token for auth (no login required)
   - **Rate limit customer messages to prevent spam**

4. Create customer order view:
   - Show order status and tracking
   - Message thread with reply form
   - Access via link in order confirmation email

5. Create admin messages UI:
   - Tab in order detail page
   - Real-time-ish updates (poll every 30s or use SSE)
   - Unread indicator in orders list

6. Email notifications:
   - Notify seller when customer sends message
   - Notify customer when seller replies
   - Use existing email infrastructure (Resend)

**Acceptance Criteria:**
- [ ] Seller can view and reply to messages from order detail
- [ ] Customer can access order page via email link
- [ ] Customer can send messages without creating account
- [ ] Both parties receive email notifications
- [ ] Messages are properly tenant-isolated
- [ ] Unread count shows in orders list
- [ ] Customer message endpoint is rate limited

**Risks:**
- Email deliverability - may need to add message link to transactional emails
- Spam potential - add rate limiting to customer message endpoint

---

### Issue #4: No PayPal

**Priority:** P0 - Launch Blocker
**Effort:** 20-24 hours
**Depends on:** Issue #5 (Stripe onboarding) - share payment settings page structure

**Problem:** 30-40% of Etsy buyers use PayPal. Stripe-only loses conversions.

**Files to Create:**
- `/packages/shared/src/types/payment.ts` - Extended payment types
- `/apps/web/src/app/api/checkout/paypal/create/route.ts` - Create PayPal order
- `/apps/web/src/app/api/checkout/paypal/capture/route.ts` - Capture payment
- `/apps/web/src/app/api/webhooks/paypal/route.ts` - Webhook handler
- `/apps/admin/src/app/api/settings/paypal/route.ts` - Settings API
- `/apps/admin/src/app/(dashboard)/dashboard/settings/payments/page.tsx` - Payment settings UI
- `/apps/web/src/components/checkout/PayPalButton.tsx` - Checkout button

**Implementation Steps:**

1. Set up PayPal Commerce Platform:
   - Apply for partner approval (platform model)
   - Get sandbox and production credentials
   - Configure webhooks

2. Create PayPal service module:
   ```typescript
   // packages/shared/src/lib/paypal.ts
   // - getAccessToken() - OAuth flow
   // - createOrder(tenantId, orderData) - create PayPal order
   // - capturePayment(orderId) - capture after approval
   // - getSellerPayoutInfo() - for connected sellers
   ```

3. Add PayPal credentials to tenant:
   - Add `paypalMerchantId`, `paypalEmail` to Tenant type
   - Add PayPal section to payment settings page (created after #5)

4. Update checkout flow:
   - Show PayPal button alongside Stripe
   - Use PayPal JS SDK for smart buttons
   - Handle createOrder, onApprove, onError callbacks

5. Create webhook handler:
   - Handle PAYMENT.CAPTURE.COMPLETED
   - Handle PAYMENT.CAPTURE.REFUNDED
   - Update order status accordingly

6. Modify order creation:
   - Add `paymentMethod: 'paypal'` option
   - Store PayPal transaction ID
   - Calculate fees (PayPal fee structure)

**Acceptance Criteria:**
- [ ] Sellers can connect PayPal in settings
- [ ] PayPal button appears at checkout
- [ ] Payment completes successfully
- [ ] Order marked as paid with PayPal
- [ ] Webhooks update order status
- [ ] Refunds work through PayPal dashboard

**Risks:**
- PayPal partner approval can take time (2-4 weeks)
- PayPal Commerce Platform has complex requirements
- Mitigation: Start with PayPal Checkout first, upgrade to Commerce later

---

### Issue #5: Stripe Connect Not in Onboarding

**Priority:** P0 - Launch Blocker
**Effort:** 4-6 hours (reduced - leverages existing Connections page)

**Problem:** Sellers complete onboarding but can't receive payments because Stripe Connect setup is buried in Settings.

**Existing Infrastructure:**
- `/apps/admin/src/app/(dashboard)/dashboard/connections/page.tsx` - Already handles Stripe Connect
- `/apps/admin/src/components/connections/ConnectionsPage.tsx` - Existing component with full OAuth flow

**Approach:** Don't recreate Stripe Connect functionality. Add an onboarding step that links to the existing Connections page.

**Files to Modify:**
- `/apps/admin/src/app/(dashboard)/dashboard/onboarding/page.tsx` - Add Stripe step

**Files to Create:**
- `/apps/admin/src/app/(dashboard)/dashboard/onboarding/payments/page.tsx` - Onboarding step that links to Connections

**Implementation Steps:**

1. Add new onboarding step:
   ```typescript
   const STEPS = [
     { id: 'location', ... },
     { id: 'design', ... },
     { id: 'payments', // NEW STEP
       title: 'Set Up Payments',
       description: 'Connect your bank account to receive payments',
       icon: CreditCard,
       href: '/dashboard/onboarding/payments',
     },
   ]
   ```

2. Create payments onboarding page:
   - Explain why Stripe Connect is needed ("You need this to get paid")
   - Check current Stripe connection status from tenant
   - If not connected: "Connect with Stripe" button linking to `/dashboard/connections`
   - If connected: Show confirmation, "Continue" button
   - "Skip for now" option (can't receive payments)

3. Update onboarding flow:
   - Check Stripe connection status on dashboard
   - Show prominent warning if not connected
   - Block checkout if seller not connected (show "Coming Soon" on storefront)

4. Add dashboard warning banner:
   ```tsx
   {!tenant.stripeConnectAccountId && (
     <Alert variant="warning">
       <CreditCard />
       You can't receive payments yet.
       <Link href="/dashboard/connections">Connect Stripe</Link>
     </Alert>
   )}
   ```

**Acceptance Criteria:**
- [ ] Payments step appears in onboarding wizard
- [ ] Links to existing `/dashboard/connections` for Stripe Connect
- [ ] Connection status shows on onboarding page
- [ ] Warning banner shows on dashboard if not connected
- [ ] Skip option available but consequences clear

**Risks:**
- Forcing Stripe Connect might slow onboarding
- Mitigation: Allow skip but make consequences very clear

---

### Issue #6: Etsy/eBay Sync Returns 501

**Priority:** P1 - Core Experience (DOWNGRADED from P0)
**Effort:** 80-120 hours (REESTIMATED)
**Status:** DEFER TO SEPARATE DEDICATED PLAN

**Problem:** `/api/marketplace/etsy/listings` returns "coming soon". While important for value proposition, this is NOT a launch blocker.

**Why Deferred:**
1. **Scope is massive:** Full OAuth for 2 platforms, bi-directional sync (listings, inventory, orders), rate limit handling, queue processing, error recovery, token refresh
2. **40-60 hours was grossly underestimated** - realistic estimate is 80-120 hours
3. **Not blocking launch:** Sellers can manually list on external marketplaces initially
4. **Deserves focused attention:** Should be a dedicated project, not a side task

**Recommendation:**
- Create separate plan: `madebuy-marketplace-sync.md`
- Start with Etsy only (higher volume for handmade)
- Add eBay in phase 2
- Treat as a distinct feature initiative

**For This Plan:**
- Keep the 501 response but update message: "Etsy/eBay sync coming in Q2 2026. For now, manage your external listings manually."
- Ensure the endpoint doesn't error out

**Minimal Changes:**
- Update `/apps/admin/src/app/api/marketplace/etsy/listings/route.ts` to return proper 501 with timeline message
- Update `/apps/admin/src/app/api/marketplace/ebay/listings/route.ts` similarly

---

### Issue #7: Mobile Inventory Unusable

**Priority:** P1 - Core Experience
**Effort:** 8-12 hours

**Problem:** 11-column table horizontally scrolls on mobile.

**Files to Modify:**
- `/apps/admin/src/components/inventory/InventoryPageClient.tsx`

**Implementation Steps:**

1. Create card-based mobile view:
   ```tsx
   function InventoryCard({ piece }: { piece: PieceWithExtras }) {
     return (
       <div className="p-4 border rounded-lg">
         <div className="flex gap-3">
           <img src={piece.thumbnailUrl} className="w-16 h-16 rounded" />
           <div className="flex-1 min-w-0">
             <h3 className="font-medium truncate">{piece.name}</h3>
             <p className="text-sm text-gray-500">{piece.category}</p>
             <div className="flex items-center gap-2 mt-1">
               <StatusBadge status={piece.status} />
               <span className="text-sm">{formatCurrency(piece.price)}</span>
             </div>
           </div>
         </div>
         <div className="flex justify-between mt-3 pt-3 border-t">
           <StockBadge stock={piece.stock} threshold={piece.lowStockThreshold} />
           <Link href={`/dashboard/inventory/${piece.id}`}>Edit</Link>
         </div>
       </div>
     )
   }
   ```

2. Add responsive breakpoint:
   ```tsx
   const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

   // Auto-switch based on screen size
   useEffect(() => {
     const mq = window.matchMedia('(max-width: 768px)')
     setViewMode(mq.matches ? 'cards' : 'table')
     mq.addEventListener('change', e => setViewMode(e.matches ? 'cards' : 'table'))
   }, [])
   ```

3. Add view toggle button for manual override

4. Ensure touch-friendly interactions:
   - Larger tap targets (min 44x44px)
   - Swipe actions for quick status change
   - Pull-to-refresh

**Acceptance Criteria:**
- [ ] Card view displays on mobile by default
- [ ] All critical info visible without scrolling
- [ ] View toggle allows switching modes
- [ ] Touch interactions work smoothly
- [ ] Bulk selection still works in card view

**Risks:**
- Card view may need different bulk action UX
- Virtualization might need adjustment for cards

---

### Issue #8: Accessibility Failures

**Priority:** P1 - Core Experience
**Effort:** 12-16 hours

**Problem:** Missing ARIA, no focus traps, contrast issues.

**Files to Audit/Modify:**
- All dropdown components
- All modal components
- Status badges
- Form inputs

**Implementation Steps:**

1. Audit with axe-core:
   ```bash
   npm install -D @axe-core/react
   # Add to _app.tsx in dev mode
   ```

2. Fix dropdown accessibility:
   - Add `role="listbox"` to dropdown containers
   - Add `role="option"` to items
   - Add `aria-expanded` to triggers
   - Add keyboard navigation (arrow keys, enter, escape)

3. Fix modal accessibility:
   - Add focus trap using `react-focus-lock`
   - Add `aria-modal="true"`
   - Add `aria-labelledby` pointing to title
   - Return focus to trigger on close

4. Fix contrast issues:
   - Status badges: increase contrast ratio to 4.5:1 minimum
   - Gray text on white: minimum 4.5:1 for normal text
   - Use WCAG contrast checker

5. Fix form accessibility:
   - All inputs have associated labels
   - Error messages linked with `aria-describedby`
   - Required fields have `aria-required`

6. Add skip navigation link

**Acceptance Criteria:**
- [ ] axe-core reports 0 critical/serious violations
- [ ] Keyboard-only navigation works throughout
- [ ] Screen reader announces all interactive elements
- [ ] Focus visible on all interactive elements
- [ ] All text meets WCAG 2.1 AA contrast requirements

**Risks:**
- Some third-party components may need replacement
- Mitigation: Document any remaining issues for phase 2

---

### Issue #9: SEO Broken Links

**Priority:** P1 - Core Experience
**Effort:** 4-6 hours

**Problem:** Footer links to non-existent routes, sitemap missing blog posts.

**Clarification:** The `[pageSlug]/page.tsx` handles dynamic pages and uses `RESERVED_SLUGS` to avoid conflicts with dedicated routes like `/collections`, `/blog`, etc. Routes listed in RESERVED_SLUGS call `notFound()`, allowing Next.js to fall through to more specific route handlers. This is working as designed - we just need to create those specific routes (which Issue #1 addresses for collections).

**Files to Modify:**
- `/apps/web/src/components/storefront/shared/Footer.tsx`
- `/apps/web/src/app/[tenant]/sitemap.ts` - CREATE

**Implementation Steps:**

1. Fix Footer.tsx fallback links:
   ```tsx
   // Current broken links:
   // /{tenant}/shop -> change to /{tenant} (homepage)
   // /{tenant}/collections -> keep (after issue #1 creates the route)
   // /{tenant}/faq -> create page or remove
   // /{tenant}/contact -> verify exists
   ```

2. Create static pages for common routes (if needed):
   - `/apps/web/src/app/[tenant]/faq/page.tsx`
   - `/apps/web/src/app/[tenant]/shipping/page.tsx`
   - `/apps/web/src/app/[tenant]/returns/page.tsx`
   - `/apps/web/src/app/[tenant]/terms/page.tsx`
   - `/apps/web/src/app/[tenant]/privacy/page.tsx`
   - Pull content from tenant.websiteDesign.pages or show defaults

3. Create dynamic sitemap:
   ```typescript
   // /apps/web/src/app/[tenant]/sitemap.ts
   export default async function sitemap({ params }) {
     const tenant = await requireTenant(params.tenant)
     const pieces = await pieces.listPieces(tenant.id, { status: 'available' })
     const collections = await collections.listPublishedCollections(tenant.id)
     const blogPosts = await blog.listBlogPosts(tenant.id, { status: 'published' })

     return [
       { url: `/${tenant.slug}`, lastModified: new Date() },
       ...pieces.map(p => ({ url: `/${tenant.slug}/product/${p.slug}` })),
       ...collections.map(c => ({ url: `/${tenant.slug}/collections/${c.slug}` })),
       ...blogPosts.map(b => ({ url: `/${tenant.slug}/blog/${b.slug}` })),
     ]
   }
   ```

4. Add robots.txt:
   ```typescript
   // /apps/web/src/app/[tenant]/robots.ts
   export default function robots() {
     return {
       rules: { userAgent: '*', allow: '/' },
       sitemap: 'https://example.com/sitemap.xml',
     }
   }
   ```

**Acceptance Criteria:**
- [ ] All footer links resolve to valid pages
- [ ] Sitemap includes all products, collections, blog posts
- [ ] Sitemap accessible at /{tenant}/sitemap.xml
- [ ] robots.txt points to sitemap
- [ ] Google Search Console validates sitemap

**Risks:**
- None significant - RESERVED_SLUGS pattern already handles routing conflicts

---

### Issue #10: Security Gaps

**Priority:** P1 - Core Experience
**Effort:** 8-12 hours

**Problem:** Registration no rate limit, tenant isolation gaps, regex sanitizer.

**Clarification:** Use EXISTING rate limiter config for consistency. `rateLimiters.auth` is already configured as "5 per 15 minutes" in `apps/admin/src/lib/rate-limit.ts`. Apply this to the registration endpoint rather than creating custom values.

**Files to Modify:**
- `/apps/admin/src/app/api/auth/register/route.ts`
- `/packages/shared/src/lib/sanitize.ts`
- Various API routes

**Implementation Steps:**

1. Add rate limiting to registration using existing config:
   ```typescript
   // In /api/auth/register/route.ts
   import { rateLimit, rateLimiters } from '@/lib/rate-limit'

   export async function POST(request: NextRequest) {
     // Use existing rateLimiters.auth: 5 per 15 minutes per IP
     const rateLimitResult = await rateLimit(request, rateLimiters.auth)
     if (rateLimitResult) return rateLimitResult

     // ... existing registration logic
   }
   ```

2. Audit tenant isolation:
   - Search for all direct MongoDB queries
   - Ensure every query includes `tenantId` filter
   - Add integration tests for isolation
   - Key areas to check:
     - Order sync functions
     - Bulk operations
     - Cron jobs

3. Replace regex sanitizer with DOMPurify:
   ```typescript
   // packages/shared/src/lib/sanitize.ts
   import DOMPurify from 'isomorphic-dompurify'

   export function sanitizeHtml(html: string): string {
     return DOMPurify.sanitize(html, {
       ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', ...],
       ALLOWED_ATTR: ['href', 'src', 'alt', 'class'],
       ALLOW_DATA_ATTR: false,
     })
   }
   ```

4. Add security headers middleware:
   ```typescript
   // apps/web/src/middleware.ts - enhance existing
   response.headers.set('X-Content-Type-Options', 'nosniff')
   response.headers.set('X-Frame-Options', 'DENY')
   response.headers.set('X-XSS-Protection', '1; mode=block')
   ```

5. Add CSRF protection:
   - Verify origin header on state-changing requests
   - Use SameSite=Strict cookies

**Acceptance Criteria:**
- [ ] Registration rate limited to 5 per 15 minutes per IP (using existing `rateLimiters.auth`)
- [ ] All queries include tenantId (verified by audit)
- [ ] DOMPurify used for HTML sanitization
- [ ] Security headers present on all responses
- [ ] No XSS vulnerabilities (test with payloads)

**Risks:**
- isomorphic-dompurify adds ~50KB to bundle
- Mitigation: Only import server-side where used

---

### Issue #11: No Workshop/Service Booking

**Priority:** P2 - Important Feature
**Effort:** 32-40 hours (REESTIMATED - calendar complexity)

**Problem:** Makers run classes, need booking system.

**Note:** Original estimate of 24-32 hours may be optimistic given calendar/scheduling complexity. Buffer added.

**Files to Create:**
- `/packages/shared/src/types/workshop.ts`
- `/packages/db/src/repositories/workshops.ts`
- `/packages/db/src/repositories/bookings.ts`
- `/apps/admin/src/app/(dashboard)/dashboard/workshops/` - CRUD pages
- `/apps/admin/src/app/api/workshops/` - API routes
- `/apps/web/src/app/[tenant]/workshops/` - Public pages
- `/apps/web/src/app/api/workshops/` - Booking API

**Database Schema:**
```typescript
interface Workshop {
  id: string
  tenantId: string
  title: string
  description: string
  duration: number // minutes
  price: number
  deposit?: number
  capacity: number
  location: string | 'online'
  mediaIds: string[]
  isPublished: boolean
  schedule: WorkshopSchedule[]
  createdAt: Date
  updatedAt: Date
}

interface WorkshopSchedule {
  id: string
  workshopId: string
  startTime: Date
  endTime: Date
  availableSpots: number
  bookings: Booking[]
}

interface Booking {
  id: string
  tenantId: string
  workshopId: string
  scheduleId: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  attendees: number
  status: 'pending' | 'confirmed' | 'cancelled'
  depositPaid: boolean
  totalPaid: boolean
  paymentIntentId?: string
  createdAt: Date
}
```

**Implementation Steps:**
1. Create types and repositories
2. Create admin CRUD pages for workshops
3. Create calendar view for scheduling (complex - use library like react-big-calendar)
4. Create public workshop listing page
5. Create booking flow with deposits
6. Email confirmations and reminders
7. Integrate with existing Stripe setup

**Acceptance Criteria:**
- [ ] Seller can create workshop with schedule
- [ ] Calendar shows upcoming sessions
- [ ] Customer can book and pay deposit
- [ ] Confirmation emails sent
- [ ] Booking appears in seller dashboard
- [ ] Capacity enforced
- [ ] Timezone handling for online workshops

**Risks:**
- Timezone handling for online workshops
- Calendar conflicts need validation
- Calendar UI complexity - consider using established library

---

### Issue #12: No POS Mode

**Priority:** P2 - Important Feature
**Effort:** 16-20 hours

**Problem:** Makers sell at markets, need quick-sale interface.

**Files to Create:**
- `/apps/admin/src/app/(dashboard)/dashboard/pos/page.tsx`
- `/apps/admin/src/components/pos/POSInterface.tsx`
- `/apps/admin/src/components/pos/ProductGrid.tsx`
- `/apps/admin/src/components/pos/Cart.tsx`
- `/apps/admin/src/app/api/pos/sale/route.ts`

**Implementation Steps:**

1. Create POS page:
   - Full-screen mode option
   - Touch-optimized grid of products
   - Quick-add by tapping
   - Cart sidebar

2. Create cart functionality:
   - Add/remove items
   - Quantity adjustment
   - Apply discounts
   - Custom item (for non-inventory items)

3. Create payment processing:
   - Cash payment (mark as paid)
   - Card payment (Stripe Terminal or manual entry)
   - Record sale in orders

4. Inventory sync:
   - Reduce stock on sale
   - Real-time stock warnings

5. Receipt generation:
   - Thermal printer support (via browser print)
   - Email receipt option

**Acceptance Criteria:**
- [ ] POS interface loads with all available products
- [ ] Products can be added to cart
- [ ] Cash sales complete instantly
- [ ] Stock reduces after sale
- [ ] Receipt can be printed
- [ ] Works offline (PWA stretch goal)

**Risks:**
- Card reader hardware varies
- Offline mode is complex (defer to phase 2)

---

### Issue #13: Onboarding Gaps

**Priority:** P2 - Important Feature
**Effort:** 8-12 hours

**Problem:** No getting started checklist, no help docs, no milestones.

**Files to Create/Modify:**
- `/apps/admin/src/components/dashboard/GettingStartedChecklist.tsx`
- `/apps/admin/src/app/(dashboard)/dashboard/help/page.tsx`
- `/apps/admin/src/components/help/HelpArticle.tsx`

**Implementation Steps:**

1. Create getting started checklist:
   ```typescript
   const CHECKLIST_ITEMS = [
     { id: 'profile', label: 'Complete your profile', href: '/dashboard/settings' },
     { id: 'product', label: 'Add your first product', href: '/dashboard/inventory/new' },
     { id: 'payments', label: 'Connect payment method', href: '/dashboard/connections' },
     { id: 'shipping', label: 'Set up shipping', href: '/dashboard/settings/shipping' },
     { id: 'preview', label: 'Preview your store', href: '/preview' },
     { id: 'publish', label: 'Publish your store', href: '/dashboard/settings' },
   ]
   ```

2. Track completion in tenant:
   ```typescript
   tenant.onboardingChecklist: {
     profile: boolean
     product: boolean
     // ...
   }
   ```

3. Show checklist on dashboard (dismiss after complete):
   - Progress bar
   - Checkmarks for completed items
   - "Dismiss" option

4. Create help center:
   - Static markdown articles
   - Search functionality
   - Categories (Getting Started, Products, Orders, etc.)
   - Video embeds for tutorials

5. Contextual help:
   - "?" icons linking to relevant help articles
   - Tooltips on complex features

**Acceptance Criteria:**
- [ ] Checklist shows on new seller dashboard
- [ ] Items check off as completed
- [ ] Help center accessible from navigation
- [ ] At least 10 help articles covering basics
- [ ] Contextual help links work

**Risks:**
- Maintaining help content as features change
- Mitigation: Use MDX for easy editing

---

### Issue #14: No Success Celebrations

**Priority:** P2 - Important Feature
**Effort:** 4-6 hours

**Problem:** First product, first order, milestones are silent.

**Files to Create:**
- `/apps/admin/src/components/celebrations/Confetti.tsx`
- `/apps/admin/src/components/celebrations/MilestoneToast.tsx`
- `/apps/admin/src/hooks/useCelebration.ts`

**Implementation Steps:**

1. Create confetti component:
   ```typescript
   import confetti from 'canvas-confetti'

   export function triggerConfetti() {
     confetti({
       particleCount: 100,
       spread: 70,
       origin: { y: 0.6 }
     })
   }
   ```

2. Create milestone toast:
   ```tsx
   <Toast variant="celebration">
     <Sparkles className="text-yellow-500" />
     <div>
       <h3>Your first sale!</h3>
       <p>Congratulations on your first order!</p>
     </div>
   </Toast>
   ```

3. Define milestones:
   - First product added
   - First order received
   - 10 products
   - 10 orders
   - $1000 in sales
   - 100 orders
   - $10,000 in sales

4. Track milestones in tenant:
   ```typescript
   tenant.milestones: {
     firstProduct: Date | null
     firstOrder: Date | null
     // ...
   }
   ```

5. Trigger celebrations:
   - Check milestone on relevant actions
   - Only celebrate once per milestone
   - Store celebration shown flag

**Acceptance Criteria:**
- [ ] Confetti on first product
- [ ] Toast message explains achievement
- [ ] Milestones only trigger once
- [ ] Celebrations are delightful but not annoying
- [ ] Can be disabled in settings

**Risks:**
- Over-celebration can be annoying
- Mitigation: Keep celebrations brief, allow disable

---

## Commit Strategy

### Recommended Approach
One commit per issue, grouped by priority tier:

```
Phase 1 (P0):
  1. feat(web): add collection routes (#1)
  2. feat(admin): add packing slips (#2)
  3. feat: add buyer-seller messaging (#3)
  5. feat(onboarding): add Stripe Connect step (#5) -- DO BEFORE #4
  4. feat(checkout): add PayPal integration (#4)

Phase 2 (P1):
  6. chore(api): update Etsy/eBay endpoints with timeline (#6) -- minimal change
  7. feat(admin): add mobile inventory view (#7)
  8. fix(a11y): accessibility improvements (#8)
  9. fix(seo): broken links and sitemap (#9)
  10. security: rate limiting and sanitization (#10)

Phase 3 (P2):
  11. feat: add workshop booking system (#11)
  12. feat(admin): add POS mode (#12)
  13. feat(onboarding): checklist and help docs (#13)
  14. feat: add celebration moments (#14)
```

---

## Success Criteria

### Phase 1 Complete When:
- [ ] All P0 issues fixed and verified
- [ ] Sellers can receive payments (Stripe or PayPal)
- [ ] Customers can browse collections
- [ ] Orders can be fulfilled with packing slips
- [ ] Basic communication possible

### Phase 2 Complete When:
- [ ] All P1 issues fixed and verified
- [ ] Mobile experience is usable
- [ ] Accessibility audit passes
- [ ] Security audit passes
- [ ] SEO basics are correct

### Phase 3 Complete When:
- [ ] All P2 issues fixed and verified
- [ ] Workshop booking live
- [ ] POS mode functional
- [ ] Onboarding experience polished
- [ ] Celebration moments implemented

---

## Risk Summary

| Issue | Risk Level | Mitigation |
|-------|------------|------------|
| #4 PayPal | HIGH | Start with PayPal Checkout, upgrade later |
| #6 Etsy/eBay | HIGH | **DEFERRED** - Separate plan, 80-120h estimate |
| #10 Security | MEDIUM | Thorough audit before launch |
| #11 Workshop | MEDIUM | Keep MVP scope tight, use calendar library |
| #12 POS | MEDIUM | Defer offline mode |

---

## Notes for Executor

1. **Start with #1, #2, #5** - Quick wins that unblock other work
2. **#5 before #4** - Stripe onboarding creates payment settings page structure used by PayPal
3. **#6 is deferred** - Just update the 501 message, full implementation in separate plan
4. **#10 uses existing rate limiter** - `rateLimiters.auth` = 5 per 15 minutes, don't create custom values
5. **Collections route works** - RESERVED_SLUGS already handles catch-all, just create the specific route
6. **Packing slips != Shipping labels** - ShippingActions handles Sendle labels, packing slips are separate
7. **Test on mobile** - Many issues are mobile-specific
8. **Use existing patterns** - Repository pattern, rate limiting, existing Connections page

---

## Changes from Previous Iteration

1. **#1 Collections:** Clarified RESERVED_SLUGS already handles routing - no conflict, just create route
2. **#2 Packing Slips:** Clarified distinction from shipping labels (ShippingActions.tsx)
3. **#5 Stripe Onboarding:** Updated to link to existing `/dashboard/connections`, not recreate
4. **#6 Etsy/eBay:** Downgraded to P1, reestimated to 80-120h, deferred to separate plan
5. **#10 Rate Limiting:** Updated to use existing `rateLimiters.auth` (5 per 15 min), not custom values
6. **#9 SEO:** Added clarification about RESERVED_SLUGS handling conflicts
7. **#11 Workshop:** Reestimated to 32-40h due to calendar complexity
8. **Dependencies:** Added explicit dependency: #5 before #4

