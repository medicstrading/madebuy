# Performance Report: MadeBuy Admin App (DEEP ANALYSIS)

**Date:** 2026-01-02
**Analyzed by:** Optimizer Agent
**Status:** COMPREHENSIVE DEEP DIVE

---

## Executive Summary

| Category | Status | Priority |
|----------|--------|----------|
| Build | FAILS (OOM at 988MB) | CRITICAL |
| Data Fetching | N+1 queries, no caching | CRITICAL |
| Bundle Size | Heavy libs not lazy loaded | HIGH |
| React Patterns | Unnecessary client components | MEDIUM |

**Total Issues Found:** 11 Critical/High, 8 Quick Wins

---

## CRITICAL ISSUES

### 1. Build Fails - JavaScript Heap Out of Memory

**Impact:** BLOCKING - Cannot deploy
**Effort:** Medium (2-4hr)
**Location:** `apps/admin/next.config.js`, Docker build command

**Evidence:**
```
[103:0x7bae8380e660] 58548 ms: Mark-Compact (reduce) 988.7 (1031.3) -> 988.7 MB
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**Root Causes:**
1. Sentry sourcemap generation consuming excessive memory
2. Large dependencies (tesseract.js, xero-node, @tiptap) analyzed during build
3. No webpack memory optimizations configured

**Fix:**

```javascript
// next.config.js - Update with these additions
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@madebuy/shared', '@madebuy/db', '@madebuy/storage', '@madebuy/social', '@madebuy/marketplaces'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'pub-*.r2.dev' },
    ],
  },
  experimental: {
    webpackMemoryOptimizations: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          tiptap: {
            test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
            name: 'tiptap',
            chunks: 'async',
            priority: 30,
          },
        },
      }
    }
    return config
  },
}
```

**Docker/Build Command:**
```bash
# In docker-compose.dev.yml or package.json
NODE_OPTIONS="--max-old-space-size=2048" next build
```

---

### 2. N+1 Query on Inventory Page (CRITICAL)

**Impact:** O(n) database calls - 50 products = 50 queries
**Effort:** Quick (<1hr)
**Location:** `apps/admin/src/app/(dashboard)/dashboard/inventory/page.tsx:13-18`

**Current Code (BAD):**
```typescript
const piecesWithCOGS = await Promise.all(
  allPieces.map(async (piece) => {
    const cogs = await materials.calculatePieceCOGS(tenant.id, piece.id)
    return { ...piece, cogs }
  })
)
```

**Fix - Add to `packages/db/src/repositories/materials.ts`:**
```typescript
export async function calculateBatchCOGS(
  tenantId: string,
  pieceIds: string[]
): Promise<Map<string, number>> {
  if (pieceIds.length === 0) return new Map()

  const db = await getDatabase()
  const results = await db.collection('material_usages')
    .aggregate([
      { $match: { tenantId, pieceId: { $in: pieceIds } } },
      { $group: { _id: '$pieceId', total: { $sum: '$totalCost' } } }
    ])
    .toArray()

  return new Map(results.map(r => [r._id, r.total || 0]))
}
```

**Fix - Update inventory page:**
```typescript
const allPieces = await pieces.listPieces(tenant.id)
const pieceIds = allPieces.map(p => p.id)
const cogsMap = await materials.calculateBatchCOGS(tenant.id, pieceIds)
const piecesWithCOGS = allPieces.map(piece => ({
  ...piece,
  cogs: cogsMap.get(piece.id) || 0
}))
```

**Expected Improvement:** -200ms+ per page load with 50+ products

---

### 3. Zero Server-Side Caching

**Impact:** Every page load hits DB multiple times
**Effort:** Quick (<1hr)
**Location:** All page.tsx files

**Problem:** No use of `unstable_cache` anywhere in the codebase.

**Fix - Dashboard page example:**
```typescript
import { unstable_cache } from 'next/cache'

const getCachedDashboardStats = unstable_cache(
  async (tenantId: string) => {
    const [piecesCount, mediaCount, ordersCount, enquiriesCount, recentOrders] =
      await Promise.all([
        pieces.countPieces(tenantId),
        media.countMedia(tenantId),
        orders.countOrders(tenantId),
        enquiries.countEnquiries(tenantId),
        orders.listOrders(tenantId, { limit: 5 }),
      ])
    return { pieces: piecesCount, media: mediaCount, orders: ordersCount,
             enquiries: enquiriesCount, recentOrders }
  },
  ['dashboard-stats'],
  { revalidate: 60, tags: ['dashboard'] }
)

// In component:
const stats = await getCachedDashboardStats(tenant.id)
```

**Apply to:** Dashboard, Inventory count, Orders stats, Materials list

---

### 4. FinanceWidgets Uses Client-Side Fetch

**Impact:** Extra round-trip, loading spinner, waterfall
**Effort:** Medium (1-2hr)
**Location:** `apps/admin/src/components/dashboard/FinanceWidgets.tsx`

**Current:** Uses `'use client'` with `useEffect` + `fetch('/api/ledger/summary')`

**Fix:** Convert to server component:

```typescript
// NEW: apps/admin/src/components/dashboard/FinanceWidgetsServer.tsx
import { getCurrentTenant } from '@/lib/session'
import { transactions, payouts } from '@madebuy/db'

async function getLedgerSummary(tenantId: string) {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  // ... same logic as API route
  const [todaySummary, thisMonthSummary, ...] = await Promise.all([...])
  return { todaySales: {...}, pendingPayout: {...}, ... }
}

export async function FinanceWidgetsServer() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null
  const data = await getLedgerSummary(tenant.id)
  return <FinanceWidgetsUI data={data} /> // Keep UI as client for hover effects
}
```

**Expected:** Eliminates client-side fetch waterfall (-200ms+)

---

## HIGH PRIORITY ISSUES

### 5. TipTap Editor Not Lazy Loaded

**Impact:** ~200KB+ added to initial bundle on ALL pages
**Effort:** Quick (<30min)
**Location:** `apps/admin/src/components/blog/RichTextEditor.tsx`

**Fix - Lazy load where used:**
```typescript
// In apps/admin/src/app/(dashboard)/dashboard/blog/[id]/page.tsx
// and apps/admin/src/app/(dashboard)/dashboard/blog/new/page.tsx
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(
  () => import('@/components/blog/RichTextEditor').then(mod => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="h-[400px] bg-gray-100 animate-pulse rounded-lg" />
  }
)
```

---

### 6. Missing MongoDB Projections

**Impact:** Over-fetching all document fields
**Effort:** Medium (2-4hr)
**Location:** `packages/db/src/repositories/pieces.ts:89-94`

**Current:** `listPieces()` returns FULL documents including variants, all integrations, etc.

**Fix:**
```typescript
export async function listPieces(
  tenantId: string,
  filters?: PieceFilters,
  options?: { projection?: Record<string, 1> }
): Promise<Piece[]> {
  const db = await getDatabase()
  const query: any = { tenantId }
  // ... filters ...

  const defaultProjection = {
    id: 1, name: 1, slug: 1, status: 1, price: 1, currency: 1,
    category: 1, createdAt: 1, description: 1, cogs: 1,
    'integrations.etsy.listingId': 1,
    'integrations.etsy.listingUrl': 1
  }

  const results = await db.collection('pieces')
    .find(query)
    .project(options?.projection || defaultProjection)
    .sort({ createdAt: -1 })
    .toArray()

  return results as any[]
}
```

**Expected:** -50ms per list query

---

### 7. Session Fetched Twice Per Page

**Impact:** 2 unnecessary DB calls per navigation
**Effort:** Quick (<30min)
**Location:** `apps/admin/src/app/(dashboard)/layout.tsx:11-17`

**Current:**
```typescript
const user = await getCurrentUser()     // DB call 1
const tenant = await getCurrentTenant() // Calls getCurrentUser() again = DB call 2
```

**Fix:**
```typescript
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant()
  if (!tenant) redirect('/login')

  // Derive user from tenant instead of separate call
  const user = { name: tenant.businessName, email: tenant.email, id: tenant.id }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar tenant={tenant} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} tenant={tenant} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  )
}
```

---

### 8. Orders Page Stats Computed Client-Side

**Impact:** Fetches ALL orders, filters in JS
**Effort:** Quick (<1hr)
**Location:** `apps/admin/src/app/(dashboard)/dashboard/orders/page.tsx:10-15`

**Current:**
```typescript
const allOrders = await orders.listOrders(tenant.id)
const stats = {
  pending: allOrders.filter(o => o.status === 'pending').length,
  // ... filters all in memory
}
```

**Fix - Add to `packages/db/src/repositories/orders.ts`:**
```typescript
export async function getOrderStats(tenantId: string) {
  const db = await getDatabase()
  const result = await db.collection('orders').aggregate([
    { $match: { tenantId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).toArray()

  const statusMap = new Map(result.map(r => [r._id, r.count]))
  return {
    pending: statusMap.get('pending') || 0,
    processing: statusMap.get('processing') || 0,
    shipped: statusMap.get('shipped') || 0,
    delivered: statusMap.get('delivered') || 0,
    total: result.reduce((sum, r) => sum + r.count, 0)
  }
}
```

---

### 9. No Loading States (Streaming)

**Impact:** Frozen UI during server component execution
**Effort:** Quick (<1hr)
**Location:** `apps/admin/src/app/(dashboard)/dashboard/`

**Fix - Create loading.tsx files:**

**`apps/admin/src/app/(dashboard)/dashboard/loading.tsx`:**
```tsx
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-40 bg-gray-200 rounded-2xl" />
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Also create for:** `/inventory/loading.tsx`, `/orders/loading.tsx`, `/ledger/loading.tsx`

---

### 10. Sidebar and Header Are Client Components

**Impact:** Larger client bundle, re-renders on state changes
**Effort:** Medium (1-2hr)
**Location:** `apps/admin/src/components/dashboard/Sidebar.tsx`, `Header.tsx`

**Analysis:**
- `Sidebar.tsx` uses `'use client'` only for `usePathname()`
- `Header.tsx` uses `'use client'` only for `signOut()`

**Fix Options:**
1. Pass `pathname` as prop from layout (server component)
2. Split into `SidebarNav` (server) + `SidebarActiveIndicator` (client)

---

### 11. Analytics Page is Full Client Component

**Impact:** No SSR, shows loading spinner
**Effort:** Medium (2hr)
**Location:** `apps/admin/src/app/(dashboard)/dashboard/analytics/page.tsx`

**Problem:** Entire page is `'use client'` with `useEffect` data fetching

**Fix:** Convert to server component with client-only period selector

---

## MISSING DATABASE INDEXES

Add these indexes via MongoDB shell:
```javascript
db.pieces.createIndex({ tenantId: 1, status: 1 })
db.pieces.createIndex({ tenantId: 1, category: 1 })
db.material_usages.createIndex({ tenantId: 1, pieceId: 1 })
db.orders.createIndex({ tenantId: 1, status: 1 })
db.orders.createIndex({ tenantId: 1, createdAt: -1 })
db.transactions.createIndex({ tenantId: 1, createdAt: -1 })
```

---

## QUICK WINS CHECKLIST

1. [ ] Add `NODE_OPTIONS="--max-old-space-size=2048"` to build command
2. [ ] Create `calculateBatchCOGS()` function
3. [ ] Add `unstable_cache` to dashboard stats
4. [ ] Create `loading.tsx` for dashboard routes
5. [ ] Dynamic import RichTextEditor
6. [ ] Remove duplicate session call in layout
7. [ ] Add projection to `listPieces()`
8. [ ] Create `getOrderStats()` aggregation

---

## IMPLEMENTATION PRIORITY ORDER

1. **Fix build** (Nothing else matters if it won't deploy)
2. **N+1 query fix** (Biggest immediate performance win)
3. **Add caching** (Quick win for all pages)
4. **Loading states** (Better UX during loads)
5. **Lazy load TipTap** (Bundle size reduction)
6. **Convert FinanceWidgets** (Eliminates waterfall)
7. **Add projections** (Database efficiency)
8. **Convert Analytics page** (SSR benefits)

---

## TARGETS vs ESTIMATED CURRENT

| Metric | Current* | Target | Priority |
|--------|----------|--------|----------|
| Build | FAIL (OOM) | SUCCESS | CRITICAL |
| Dashboard LCP | ~2.5s | <2.0s | HIGH |
| Inventory Load | ~1.5s | <0.5s | HIGH |
| Initial JS Bundle | ~400KB | <200KB | MEDIUM |
| API p95 | ~300ms | <100ms | MEDIUM |

*Estimates based on code analysis (actual measurements blocked by build failure)
