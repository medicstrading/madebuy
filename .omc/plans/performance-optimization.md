# Performance Optimization Plan - MadeBuy Next.js Monorepo

## Context

### Original Request
Fix all performance issues identified in the MadeBuy Next.js monorepo architect review, including:
- Static optimization blockers (`force-dynamic`)
- Waterfall data fetching patterns
- Missing React memoization
- Heavy component lazy loading opportunities

### Research Findings

**Current State Analysis:**

1. **Admin Root Layout** (`apps/admin/src/app/layout.tsx:7`):
   - `export const dynamic = 'force-dynamic'` at root level
   - Comment states: "prevent /_not-found prerendering issues"
   - This is a workaround, not a solution - disables ALL static optimization

2. **Admin Dashboard Layout** (`apps/admin/src/app/(dashboard)/layout.tsx:9`):
   - Already has `export const revalidate = 60` (GOOD)
   - Uses `unstable_cache` for marketplace connections (GOOD)
   - No changes needed here

3. **Tenant Layout** (`apps/web/src/app/[tenant]/layout.tsx:5`):
   - `export const dynamic = 'force-dynamic'`
   - Justified by "require database access" but ISR would be better
   - Already uses React `cache()` for tenant queries (good)

4. **Dashboard Widgets** (2 client components making 2 requests):
   - `FinanceWidgets.tsx` - fetches `/api/ledger/summary` via useEffect
   - `AnalyticsWidget.tsx` - fetches `/api/analytics/funnel` via useEffect
   - Dashboard page already does server-side data fetch with `unstable_cache` for stats
   - Note: `RevenueWidget.tsx` and `PayoutsWidget.tsx` exist but are NOT used on the dashboard

5. **Sidebar** (`apps/admin/src/components/dashboard/Sidebar.tsx`):
   - 470 lines, large component
   - Uses `usePathname()` and `useState` for settings expansion
   - No memoization - re-renders on every parent state change

6. **CartContext** (`apps/web/src/contexts/CartContext.tsx:206-213`):
   - `totalItems` and `totalAmount` computed on every render
   - Already uses `useMemo` for context value (good)
   - BUT the computed values passed TO useMemo are recalculated first

7. **KeyboardShortcuts** (`apps/admin/src/contexts/KeyboardShortcuts.tsx`):
   - `pendingKey` state causes re-renders (transitions from null -> 'g' -> null)
   - Context value includes `pendingKey`, triggering consumer re-renders
   - **Consumer:** `ShortcutsHint.tsx` uses `pendingKey` from `useKeyboardShortcuts()`

8. **Heavy Components Identified**:
   - `EbayMarketplacePage.tsx` - 1950+ lines, complex state management
   - `MediaGallery.tsx` - Uses @dnd-kit, 834 lines with drag-and-drop

---

## Work Objectives

### Core Objective
Eliminate performance bottlenecks to improve:
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Cache hit rates for tenant storefronts
- Perceived dashboard responsiveness

### Deliverables
1. Restored static optimization for admin app where possible
2. ISR-enabled tenant layouts with appropriate revalidation
3. Consolidated dashboard data fetching (single request)
4. Memoized heavy components (Sidebar)
5. Optimized React context patterns (Cart, Keyboard)
6. Lazy-loaded heavy components with loading states

### Definition of Done
- [ ] Admin app builds without `force-dynamic` at root (or scoped appropriately)
- [ ] Tenant pages show `revalidate` in build output, not `dynamic`
- [ ] Dashboard loads with 1 API request instead of 2
- [ ] Sidebar wrapped in React.memo with stable props
- [ ] CartContext totals wrapped in useMemo
- [ ] KeyboardShortcuts context split for transient state
- [ ] ShortcutsHint.tsx updated to use new hook
- [ ] eBay and MediaGallery components lazy loaded
- [ ] All changes verified with `pnpm build` (no errors)
- [ ] Docker sync verification on NUC

---

## Must Have / Must NOT Have

### Must Have
- All fixes must maintain existing functionality
- Changes must be backward compatible
- Must pass TypeScript strict mode
- Must work in Docker development environment

### Must NOT Have
- No breaking changes to public APIs
- No removal of features (only optimization)
- No new dependencies (use what's already installed)
- No changes to database queries (only how/when they're called)

---

## Risk Identification

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Removing force-dynamic breaks auth | Medium | High | Test auth flows after change; may need route-level dynamic |
| ISR causes stale tenant data | Low | Medium | Use appropriate revalidate time (60-120s) + on-demand revalidation |
| Memoization causes stale UI | Low | Low | Ensure dependency arrays are correct |
| Lazy loading causes flicker | Low | Low | Add proper loading skeletons |
| Consolidated API slower than parallel | Low | Medium | Use Promise.all for parallel DB queries |

### Breaking Change Assessment
- **Admin force-dynamic removal**: May need to move to specific routes that need cookies/headers
- **Tenant ISR**: Could show stale data for 60-120 seconds after tenant updates
- **Context changes**: Must maintain same public API shape

---

## Implementation Steps

### Task 1: Remove force-dynamic from Admin Root Layout [CRITICAL]

**File:** `apps/admin/src/app/layout.tsx`

**Current Code (line 7):**
```typescript
export const dynamic = 'force-dynamic'
```

**Change:**
Remove the `force-dynamic` export entirely from the ROOT layout. The dashboard layout already has `revalidate = 60` - no changes needed there.

**Verification:**
```bash
ssh nuc-dev "docker exec madebuy-admin-dev pnpm build"
# Check output for "Static" vs "Dynamic" route indicators
```

**Risk Mitigation:**
If auth breaks, identify which routes need session/cookies and add `force-dynamic` only to those specific route files (NOT the dashboard layout, which already uses ISR).

---

### Task 2: Replace force-dynamic with ISR in Tenant Layout [CRITICAL]

**File:** `apps/web/src/app/[tenant]/layout.tsx`

**Current Code:**
```typescript
// Force dynamic rendering for all tenant routes - they require database access
export const dynamic = 'force-dynamic'
```

**New Code:**
```typescript
// Enable ISR with 2-minute revalidation for tenant storefronts
// Tenant data rarely changes; cart/wishlist handled client-side
export const revalidate = 120
```

**Additional Context:**
The tenant lookup already uses React `cache()` for deduplication. ISR will cache the full page HTML and revalidate every 120 seconds.

**Verification:**
```bash
ssh nuc-dev "docker exec madebuy-web-dev pnpm build"
# Look for revalidate indicators in build output
```

---

### Task 3: Consolidate Dashboard Widget Data Fetching [CRITICAL]

**Problem:** 2 client components each firing independent useEffect fetches:
1. `FinanceWidgets.tsx` fetches `/api/ledger/summary`
2. `AnalyticsWidget.tsx` fetches `/api/analytics/funnel`

**Solution:** Create a unified server-side data fetch at the page level and pass data as props.

**Files to Modify:**
1. `apps/admin/src/app/(dashboard)/dashboard/page.tsx` - Add unified fetch
2. Create `apps/admin/src/app/api/dashboard/stats/route.ts` - Consolidated endpoint
3. Modify `FinanceWidgets.tsx` and `AnalyticsWidget.tsx` to accept initialData props

**Implementation:**

**Step 3.1: Create consolidated API endpoint**

Create `apps/admin/src/app/api/dashboard/stats/route.ts`:

```typescript
import { getDatabase, analytics, pieces, transactions } from '@madebuy/db'
import type { Order } from '@madebuy/shared'
import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

// Types for the consolidated response
interface LedgerSummary {
  todaySales: { gross: number; net: number; count: number }
  pendingPayout: { amount: number; inTransit: number; nextDate: string | null }
  thisMonth: { gross: number; net: number; count: number; fees: number; refunds: number }
  lastMonth: { gross: number; net: number; count: number }
  monthChange: number
  feesYTD: number
  profitability: {
    revenue: number
    materialCosts: number
    actualProfit: number
    profitMargin: number
    revenueChange: number
    profitChange: number
    marginChange: number
  }
}

interface FunnelData {
  viewProduct: number
  addToCart: number
  startCheckout: number
  completePurchase: number
  overallConversionRate: number
}

interface DashboardStats {
  ledgerSummary: LedgerSummary
  funnel: FunnelData
}

// Reuse the existing ledger summary logic inline (from /api/ledger/summary/route.ts)
async function getYtdFeesSummary(tenantId: string, startDate: Date, endDate: Date): Promise<number> {
  const db = await getDatabase()
  const pipeline = [
    { $match: { tenantId, status: 'completed', createdAt: { $gte: startDate, $lte: endDate }, stripeFee: { $exists: true, $gt: 0 } } },
    { $group: { _id: null, totalFees: { $sum: '$stripeFee' } } },
  ]
  const results = await db.collection('transactions').aggregate(pipeline).toArray()
  return results[0]?.totalFees || 0
}

async function getPaidOrdersInRange(tenantId: string, startDate: Date, endDate: Date): Promise<Order[]> {
  const db = await getDatabase()
  const results = await db.collection('orders').find({
    tenantId, paymentStatus: 'paid', paidAt: { $gte: startDate, $lte: endDate },
  }).toArray()
  return results as unknown as Order[]
}

async function calculateProfitability(tenantId: string, currentOrders: Order[], previousOrders: Order[]) {
  const pieceIds = new Set<string>()
  for (const order of [...currentOrders, ...previousOrders]) {
    for (const item of order.items || []) pieceIds.add(item.pieceId)
  }
  const piecesMap = await pieces.getPiecesByIds(tenantId, Array.from(pieceIds))

  let currentRevenue = 0, currentMaterialCosts = 0
  for (const order of currentOrders) {
    for (const item of order.items || []) {
      currentRevenue += item.price * item.quantity
      const piece = piecesMap.get(item.pieceId)
      if (piece?.cogs) currentMaterialCosts += piece.cogs * item.quantity
    }
  }

  let previousRevenue = 0, previousMaterialCosts = 0
  for (const order of previousOrders) {
    for (const item of order.items || []) {
      previousRevenue += item.price * item.quantity
      const piece = piecesMap.get(item.pieceId)
      if (piece?.cogs) previousMaterialCosts += piece.cogs * item.quantity
    }
  }

  const currentProfit = currentRevenue - currentMaterialCosts
  const previousProfit = previousRevenue - previousMaterialCosts
  const currentMargin = currentRevenue > 0 ? Math.round((currentProfit / currentRevenue) * 100) : 0
  const previousMargin = previousRevenue > 0 ? Math.round((previousProfit / previousRevenue) * 100) : 0

  return {
    revenue: currentRevenue,
    materialCosts: currentMaterialCosts,
    actualProfit: currentProfit,
    profitMargin: currentMargin,
    revenueChange: previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 0,
    profitChange: previousProfit > 0 ? Math.round(((currentProfit - previousProfit) / previousProfit) * 100) : 0,
    marginChange: previousMargin > 0 ? currentMargin - previousMargin : 0,
  }
}

const getCachedDashboardStats = unstable_cache(
  async (tenantId: string): Promise<DashboardStats> => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    // Fetch ALL data in parallel
    const [
      todayTransactions,
      thisMonthSummary,
      lastMonthSummary,
      balance,
      ytdFeesSummary,
      thisMonthOrders,
      lastMonthOrders,
      funnelData,
    ] = await Promise.all([
      transactions.listTransactions(tenantId, { filters: { startDate: todayStart, endDate: todayEnd, type: 'sale', status: 'completed' } }),
      transactions.getTransactionSummary(tenantId, thisMonthStart, thisMonthEnd),
      transactions.getTransactionSummary(tenantId, lastMonthStart, lastMonthEnd),
      transactions.getTenantBalance(tenantId),
      getYtdFeesSummary(tenantId, yearStart, now),
      getPaidOrdersInRange(tenantId, thisMonthStart, thisMonthEnd),
      getPaidOrdersInRange(tenantId, lastMonthStart, lastMonthEnd),
      analytics.getFunnelData(tenantId, thisMonthStart, thisMonthEnd),
    ])

    const todaySales = {
      gross: todayTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0),
      net: todayTransactions.reduce((sum, tx) => sum + tx.netAmount, 0),
      count: todayTransactions.length,
    }

    const lastMonthNet = lastMonthSummary.sales.net || 1
    const monthChange = lastMonthSummary.sales.net > 0
      ? Math.round(((thisMonthSummary.sales.net - lastMonthSummary.sales.net) / lastMonthNet) * 100)
      : 0

    const profitability = await calculateProfitability(tenantId, thisMonthOrders, lastMonthOrders)

    return {
      ledgerSummary: {
        todaySales,
        pendingPayout: { amount: balance.pendingBalance, inTransit: 0, nextDate: null },
        thisMonth: {
          gross: thisMonthSummary.sales.gross,
          net: thisMonthSummary.sales.net,
          count: thisMonthSummary.sales.count,
          fees: thisMonthSummary.sales.fees,
          refunds: thisMonthSummary.refunds.amount,
        },
        lastMonth: {
          gross: lastMonthSummary.sales.gross,
          net: lastMonthSummary.sales.net,
          count: lastMonthSummary.sales.count,
        },
        monthChange,
        feesYTD: ytdFeesSummary,
        profitability,
      },
      funnel: funnelData,
    }
  },
  ['dashboard-stats-consolidated'],
  { revalidate: 60, tags: ['dashboard', 'ledger'] },
)

export async function GET() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getCachedDashboardStats(tenant.id)
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
```

**Step 3.2: Modify FinanceWidgets.tsx to accept initialData**

```typescript
// Add initialData prop
interface FinanceWidgetsProps {
  initialData?: LedgerSummary
}

export function FinanceWidgets({ initialData }: FinanceWidgetsProps) {
  const [data, setData] = useState<LedgerSummary | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Skip fetch if we have initial data
    if (initialData) return

    async function fetchSummary() {
      try {
        const response = await fetch('/api/ledger/summary')
        if (!response.ok) throw new Error('Failed to fetch summary')
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [initialData])

  // ... rest unchanged
}
```

**Step 3.3: Modify AnalyticsWidget.tsx to accept initialData**

```typescript
interface AnalyticsWidgetProps {
  initialData?: FunnelData
}

export function AnalyticsWidget({ initialData }: AnalyticsWidgetProps) {
  const [data, setData] = useState<FunnelData | null>(initialData ?? null)
  const [isLoading, setIsLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) return

    async function fetchData() {
      try {
        const res = await fetch('/api/analytics/funnel')
        if (res.ok) {
          const json = await res.json()
          setData(json.funnel)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [initialData])

  // ... rest unchanged
}
```

**Step 3.4: Update dashboard page to fetch consolidated data**

In `apps/admin/src/app/(dashboard)/dashboard/page.tsx`, add:

```typescript
// Add to imports
import { unstable_cache } from 'next/cache'

// Add new cached fetch function
const getCachedWidgetData = unstable_cache(
  async (tenantId: string) => {
    // Call internal API (reuse logic)
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/dashboard/stats`, {
      headers: { 'x-tenant-id': tenantId },
    })
    if (!res.ok) return null
    return res.json()
  },
  ['dashboard-widget-data'],
  { revalidate: 60, tags: ['dashboard'] },
)

// OR better: directly call the logic from the route file (shared module)
```

**Step 3.5: Pass data to widgets**

```typescript
// In DashboardPage component
const widgetData = await getCachedWidgetData(tenant.id)

// In JSX
<FinanceWidgets initialData={widgetData?.ledgerSummary} />
<AnalyticsWidget initialData={widgetData?.funnel} />
```

---

### Task 4: Memoize Sidebar Component [MEDIUM]

**File:** `apps/admin/src/components/dashboard/Sidebar.tsx`

**Problem:** 470-line component re-renders on every parent state change.

**Solution:** Extract navigation items rendering to memoized child, wrap entire component.

**Implementation:**

**Step 4.1: Extract NavItem as memoized component**
```typescript
const NavItem = memo(function NavItem({
  item,
  isActive,
  onClose,
}: {
  item: { name: string; href: string; icon: any }
  isActive: boolean
  onClose?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
      )}
    >
      <Icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600')} />
      <span className="flex-1">{item.name}</span>
      {isActive && <ChevronRight className="h-4 w-4 text-blue-400" />}
    </Link>
  )
})
```

**Step 4.2: Wrap main export**
```typescript
export const Sidebar = memo(function Sidebar({ tenant, isOpen, onClose, marketplaceConnections }: SidebarProps) {
  // ... existing implementation
})
```

---

### Task 5: Add useMemo to CartContext Totals [MEDIUM]

**File:** `apps/web/src/contexts/CartContext.tsx`

**Current Code (lines 206-213):**
```typescript
const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
const totalAmount = items.reduce(
  (sum, item) =>
    sum +
    ((item.product.price || 0) + (item.personalizationTotal || 0)) *
      item.quantity,
  0,
)
```

**New Code:**
```typescript
const totalItems = useMemo(
  () => items.reduce((sum, item) => sum + item.quantity, 0),
  [items]
)

const totalAmount = useMemo(
  () => items.reduce(
    (sum, item) =>
      sum +
      ((item.product.price || 0) + (item.personalizationTotal || 0)) *
        item.quantity,
    0,
  ),
  [items]
)
```

**Note:** `useMemo` is already imported at line 10.

---

### Task 6: Split KeyboardShortcuts Context [MEDIUM]

**File:** `apps/admin/src/contexts/KeyboardShortcuts.tsx`

**Problem:** `pendingKey` state changes (null -> 'g' -> null within 1 second) cause all consumers to re-render.

**Consumer Affected:** `apps/admin/src/components/ui/ShortcutsHint.tsx` (line 6) uses `pendingKey` from `useKeyboardShortcuts()`.

**Solution:** Create separate context for transient key state.

**Implementation:**

**Step 6.1: Create split contexts in KeyboardShortcuts.tsx**

```typescript
// Stable context (rarely changes)
interface StableKeyboardContextType {
  showHelp: boolean
  setShowHelp: (show: boolean) => void
}

// Transient context (changes frequently during key sequences)
interface TransientKeyboardContextType {
  pendingKey: string | null
}

const StableKeyboardContext = createContext<StableKeyboardContextType | null>(null)
const TransientKeyboardContext = createContext<TransientKeyboardContextType | null>(null)

export function useKeyboardShortcuts() {
  const stable = useContext(StableKeyboardContext)
  if (!stable) throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider')
  return stable
}

// New hook for components that need pending key (rare)
export function useKeyboardPendingKey() {
  const transient = useContext(TransientKeyboardContext)
  return transient?.pendingKey ?? null
}

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [showHelp, setShowHelp] = useState(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const stableValue = useMemo(() => ({ showHelp, setShowHelp }), [showHelp])
  const transientValue = useMemo(() => ({ pendingKey }), [pendingKey])

  // ... existing keyboard logic

  return (
    <StableKeyboardContext.Provider value={stableValue}>
      <TransientKeyboardContext.Provider value={transientValue}>
        {children}
      </TransientKeyboardContext.Provider>
    </StableKeyboardContext.Provider>
  )
}
```

**Step 6.2: Update ShortcutsHint.tsx to use new hook**

**File:** `apps/admin/src/components/ui/ShortcutsHint.tsx`

**Current Code (line 6):**
```typescript
const { setShowHelp, pendingKey } = useKeyboardShortcuts()
```

**New Code:**
```typescript
import { useKeyboardShortcuts, useKeyboardPendingKey } from '@/contexts/KeyboardShortcuts'

export function ShortcutsHint() {
  const { setShowHelp } = useKeyboardShortcuts()
  const pendingKey = useKeyboardPendingKey()
  // ... rest unchanged
}
```

---

### Task 7: Lazy Load Heavy Components [LOWER]

**Files to Modify:**
1. `apps/admin/src/app/(dashboard)/dashboard/marketplace/ebay/page.tsx`
2. Any page importing `MediaGallery`

**Implementation:**

**Step 7.1: Lazy load EbayMarketplacePage**

In `apps/admin/src/app/(dashboard)/dashboard/marketplace/ebay/page.tsx`:
```typescript
import dynamic from 'next/dynamic'
import { EbayMarketplacePageSkeleton } from '@/components/marketplace/EbayMarketplacePageSkeleton'

const EbayMarketplacePage = dynamic(
  () => import('@/components/marketplace/EbayMarketplacePage').then(mod => ({ default: mod.EbayMarketplacePage })),
  {
    loading: () => <EbayMarketplacePageSkeleton />,
    ssr: false  // Complex client-side state, no SSR benefit
  }
)
```

**Step 7.2: Create skeleton component**

Create `apps/admin/src/components/marketplace/EbayMarketplacePageSkeleton.tsx`:
```typescript
export function EbayMarketplacePageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32" />
      <div className="h-24 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  )
}
```

**Step 7.3: Lazy load MediaGallery**

Pattern for any component importing MediaGallery:
```typescript
const MediaGallery = dynamic(
  () => import('@/components/media/MediaGallery'),
  {
    loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />,
  }
)
```

---

## Commit Strategy

### Commit 1: Static optimization (Tasks 1-2)
```
perf(rendering): remove force-dynamic, enable ISR for tenant pages

- Remove force-dynamic from admin root layout
- Replace force-dynamic with revalidate=120 in tenant layout
- Enables static optimization and ISR caching
```

### Commit 2: Dashboard data fetching (Task 3)
```
perf(dashboard): consolidate widget data fetching

- Create unified /api/dashboard/stats endpoint
- Modify widgets to accept initialData props
- Reduces 2 parallel client requests to 1 server-side fetch
```

### Commit 3: React memoization (Tasks 4-6)
```
perf(react): add memoization to heavy components and contexts

- Wrap Sidebar in React.memo, extract NavItem
- Add useMemo to CartContext totals calculation
- Split KeyboardShortcuts into stable/transient contexts
- Update ShortcutsHint to use useKeyboardPendingKey hook
```

### Commit 4: Lazy loading (Task 7)
```
perf(bundle): lazy load heavy marketplace and media components

- Dynamic import EbayMarketplacePage with skeleton
- Dynamic import MediaGallery component
- Reduces initial bundle size
```

---

## Test Strategy

### Unit Tests (if applicable)
- CartContext: Verify totalItems/totalAmount values are correct
- KeyboardShortcuts: Verify both hooks return correct values

### Integration Tests
1. **Auth flow test:** After Task 1, verify login/logout still works
2. **Dashboard load test:** After Task 3, verify all widget data renders correctly
3. **Keyboard shortcuts test:** After Task 6, verify shortcuts still work

### Manual Verification
1. Navigate to dashboard, verify all widgets load
2. Test keyboard shortcuts (g+i for inventory, etc.)
3. Test cart operations on storefront
4. Visit eBay marketplace page, verify it loads

---

## Verification Steps

### After Each Task

1. **TypeScript Check:**
   ```bash
   ssh nuc-dev "docker exec madebuy-admin-dev pnpm tsc --noEmit"
   ssh nuc-dev "docker exec madebuy-web-dev pnpm tsc --noEmit"
   ```

2. **Build Verification:**
   ```bash
   ssh nuc-dev "docker exec madebuy-admin-dev pnpm build"
   ssh nuc-dev "docker exec madebuy-web-dev pnpm build"
   ```

3. **Docker Sync:**
   ```bash
   docker-sync-check madebuy-admin-dev apps/admin/src/app/layout.tsx
   docker-sync-check madebuy-web-dev apps/web/src/app/[tenant]/layout.tsx
   ```

### Final Verification

1. **Check Build Output for Route Types:**
   Look for these in build output:
   - Admin routes showing "Static" where possible
   - Tenant routes showing "ISR" or revalidate indicators

2. **Network Tab Verification:**
   - Dashboard: Should see 1 widget data request instead of 2
   - Tenant pages: Check for cache headers

3. **React DevTools Profiler:**
   - Sidebar should not re-render when unrelated state changes
   - Cart totals should not trigger re-renders when unchanged

---

## Success Criteria

| Metric | Before | Target | Verification |
|--------|--------|--------|--------------|
| Admin routes static | 0% | >50% | Build output |
| Tenant page cache | None | 120s ISR | Response headers |
| Dashboard API calls | 2 | 1 | Network tab |
| Sidebar re-renders | Every change | Stable props only | React Profiler |
| Initial JS bundle | Baseline | -15% (lazy loads) | Build output |

---

## Execution Order

1. **Task 1** (force-dynamic admin) - Highest impact, simplest change
2. **Task 2** (ISR tenant) - High impact for storefront performance
3. **Task 5** (CartContext useMemo) - Quick win, simple change
4. **Task 4** (Sidebar memo) - Medium effort, good impact
5. **Task 3** (Dashboard consolidation) - Most complex, multiple files
6. **Task 6** (Keyboard context split) - Lower priority, includes ShortcutsHint update
7. **Task 7** (Lazy loading) - Optional optimization, can be deferred

---

## Notes for Executor

- All file paths are relative to `/home/aaron/claude-project/madebuy/`
- Run builds via Docker exec, not on host
- Check Docker sync before verifying changes in browser
- If auth breaks after Task 1, add `force-dynamic` to specific auth routes only
- The dashboard layout already has `revalidate = 60` - do NOT change it
- Only 2 widgets on dashboard (FinanceWidgets, AnalyticsWidget), NOT 4
- `ledger` is NOT exported from @madebuy/db - use inline logic from existing route
- **CRITICAL:** Update ShortcutsHint.tsx when splitting keyboard context
