# Performance Report: MadeBuy Admin - Navigation Slowness

## Summary
- **Overall Issue:** Pages recompile on every navigation (dev mode), no loading states, blocking data fetches
- **Critical Issues:** 3
- **Quick Wins:** 4

## Root Cause Analysis

The navigation slowness is caused by:

1. **Pages compile on-demand in dev mode** - Every menu click triggers webpack compilation (~120-450ms per page)
2. **Blocking server-side data fetches** - Each page awaits DB queries before rendering
3. **No loading.tsx files** - Users see no feedback during fetch/compile
4. **No Link prefetching** - Next.js prefetch disabled (no explicit `prefetch` prop)

## Evidence

From container logs:
```
 GET /dashboard?_rsc=aqk4e 200 in 451ms      # First visit - compile + fetch
 Compiling /dashboard/inventory ...
 GET /dashboard/inventory?_rsc=ie7kc 200 in 154ms
 Compiling /dashboard/orders ...
 GET /dashboard/orders?_rsc=1ua0z 200 in 123ms
```

Each page compiles on first visit, then data fetch blocks rendering.

## Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Menu click response | 120-450ms | <50ms | FAIL |
| Bundle build | OOM (982MB) | Completes | FAIL |
| Loading feedback | None | Skeleton | FAIL |
| Link prefetch | None | Enabled | FAIL |

---

## Top Issues

### 1. No loading.tsx Files (Streaming)
- **Impact:** Critical
- **Effort:** Quick (<1hr)
- **Location:** `apps/admin/src/app/(dashboard)/dashboard/`
- **Problem:** No loading states exist. Users see frozen UI during server component execution.
- **Fix:** Add `loading.tsx` to dashboard route group

### 2. Sidebar Links Missing Prefetch
- **Impact:** High
- **Effort:** Quick (<30min)
- **Location:** `apps/admin/src/components/dashboard/Sidebar.tsx:105-123`
- **Problem:** Links use default prefetch behavior which may not prefetch RSC payloads effectively

### 3. N+1 Query on Inventory Page
- **Impact:** High
- **Effort:** Medium (2hr)
- **Location:** `apps/admin/src/app/(dashboard)/dashboard/inventory/page.tsx:13-18`
- **Problem:** COGS calculated individually for each piece in a loop (N queries)

### 4. Dashboard Layout Re-fetches Auth on Every Nav
- **Impact:** Medium
- **Effort:** Medium (1hr)
- **Location:** `apps/admin/src/app/(dashboard)/layout.tsx:11-17`
- **Problem:** getCurrentUser() and getCurrentTenant() called on every navigation

---

## Quick Wins Checklist

1. [ ] Add `loading.tsx` to `apps/admin/src/app/(dashboard)/dashboard/loading.tsx`
2. [ ] Add page-specific loading.tsx for heavy pages (inventory, orders, ledger)
3. [ ] Fix N+1 COGS query in inventory page (batch calculation)
4. [ ] Add skeleton components for tables and stat cards

---

## Hand-off Tasks for Implementation

### Task 1: Add Loading States (Priority 1)

**File 1:** `apps/admin/src/app/(dashboard)/dashboard/loading.tsx`
```tsx
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Welcome banner skeleton */}
      <div className="h-40 bg-gray-200 rounded-2xl" />
      {/* Stats grid */}
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

**File 2:** `apps/admin/src/app/(dashboard)/dashboard/inventory/loading.tsx`
```tsx
export default function InventoryLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="h-12 bg-gray-100" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-b border-gray-100" />
        ))}
      </div>
    </div>
  )
}
```

### Task 2: Fix N+1 COGS Query (Priority 2)

In `packages/db/src/repositories/materials.ts`, add batch method:
```ts
export async function calculateBatchCOGS(
  tenantId: string,
  pieceIds: string[]
): Promise<Map<string, number>> {
  const db = await getDatabase()
  const result = await db.collection('piece_materials').aggregate([
    { $match: { tenantId, pieceId: { $in: pieceIds } } },
    { $group: { _id: '$pieceId', totalCOGS: { $sum: '$cost' } } }
  ]).toArray()
  return new Map(result.map(r => [r._id, r.totalCOGS]))
}
```

Update inventory page to use batch method instead of per-piece loop.

### Task 3: Verify Prefetch in Production
- Build and deploy to staging
- Use Chrome DevTools Network tab to verify RSC prefetch on link hover
- If not prefetching, add explicit `prefetch={true}` to Sidebar Links

---

## Dev vs Production Note

In development mode, Next.js compiles pages on-demand. This is normal but slow. In production:
- Pages are pre-compiled
- RSC payloads are prefetched on link hover
- Navigation should be near-instant

**Test in production build** to see actual performance:
```bash
ssh nuc-dev "docker exec madebuy-admin-dev sh -c 'NODE_OPTIONS=--max-old-space-size=2048 pnpm build && pnpm start'"
```

If production is still slow, data fetching is the bottleneck, not compilation.

---

## Bundle Build OOM Issue

Build runs out of memory at 982MB. Related fixes:
1. Increase Node memory: `NODE_OPTIONS=--max-old-space-size=2048`
2. Check for barrel imports from lucide-react (imports all icons)
3. Review Sentry config - may be adding significant overhead
