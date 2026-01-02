# Performance Report: MadeBuy - Full Codebase

**Date:** 2026-01-01
**Agent:** Optimizer

## Summary
- **Overall Status:** CRITICAL - Bundle size severely bloated
- **Critical Issues:** 4
- **High Issues:** 3
- **Quick Wins:** 5

## Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| main-app.js (web) | 10.7MB | <200KB | ❌ CRITICAL |
| main-app.js (admin) | 10.7MB | <200KB | ❌ CRITICAL |
| Web app chunks | 4.0MB | <500KB | ❌ |
| Admin app chunks | 1.7MB | <500KB | ❌ |
| Images with blur | 0/32 | 32/32 | ❌ |
| Images with sizes | 5/32 | 32/32 | ❌ |
| Promise.all usage | 11 API routes | All parallel | ⚠️ |

---

## Top Issues

### 1. CRITICAL: main-app.js is 10.7MB
- **Impact:** Critical (every page load)
- **Effort:** Major (4-8hr)
- **Location:** Both apps
- **Problem:** The shared bundle is 53x larger than target. Likely caused by:
  - Heavy deps bundled at top level (tesseract.js, xero-node, tiptap)
  - No code splitting for heavy features
  - Sentry bundled incorrectly
- **Fix:**
  1. Dynamic import heavy libraries
  2. Configure Sentry to not bundle source maps
  3. Review all static imports in `_app` layouts
- **Expected:** -10MB bundle, 50x faster initial load

### 2. CRITICAL: tesseract.js static import
- **Impact:** Critical (+15MB bundle potential)
- **Effort:** Quick (<1hr)
- **Location:** `apps/admin/src/lib/services/invoice-ocr.ts:1`
- **Problem:** OCR library imported at top level, bundled into main chunk
- **Fix:** Dynamic import:
```typescript
// Before
import { createWorker } from 'tesseract.js'

// After
const { createWorker } = await import('tesseract.js')
```
- **Expected:** -15MB from main bundle

### 3. HIGH: No image blur placeholders
- **Impact:** High (CLS on every image load)
- **Effort:** Medium (2-4hr)
- **Location:** 32 files using `<Image>` component
- **Problem:** Images load without placeholder, causing layout shift
- **Files affected:**
  - `apps/web/src/components/marketplace/ProductImage.tsx`
  - `apps/web/src/components/marketplace/EtsyProductCard.tsx`
  - `apps/web/src/components/storefront/HeroBanner.tsx`
  - `apps/web/src/components/product/PersonalizationForm.tsx`
  - (28 more files)
- **Fix:** Add `placeholder="blur"` and `blurDataURL` or use dynamic blur generation
- **Expected:** CLS improvement, perceived faster load

### 4. HIGH: ProductImage.tsx missing optimizations
- **Impact:** High (every product image)
- **Effort:** Quick (<1hr)
- **Location:** `apps/web/src/components/marketplace/ProductImage.tsx:34`
- **Problem:** Missing `sizes` and `placeholder` props
- **Fix:** Add responsive sizes and blur placeholder:
```tsx
<Image
  src={src}
  alt={alt}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  // ... rest
/>
```
- **Expected:** Proper responsive images, reduced bandwidth

### 5. HIGH: Missing exports in @madebuy/shared
- **Impact:** High (build warnings, potential runtime errors)
- **Effort:** Medium (1-2hr)
- **Location:** `packages/shared/src/`
- **Problem:** Multiple exports referenced but not defined:
  - `validatePersonalizationValues`
  - `calculatePersonalizationTotal`
  - `Sendle`
  - `CARRIER_NAMES`
  - `SHIPMENT_STATUS_MESSAGES`
  - `SENDLE_STATUS_MAP`
  - `getDownloadPageUrl`
  - `getFileDownloadUrl`
  - `buildDownloadEmailHtml`
  - `buildDownloadEmailText`
- **Fix:** Add missing exports or remove imports
- **Expected:** Clean build, no runtime surprises

### 6. MEDIUM: CartContext recalculates value
- **Impact:** Medium (re-renders on cart changes)
- **Effort:** Quick (<30min)
- **Location:** `apps/web/src/contexts/CartContext.tsx:92-105`
- **Problem:** Object literal in Provider value creates new object every render
- **Fix:** Wrap value in useMemo:
```tsx
const value = useMemo(() => ({
  items, addItem, removeItem, updateQuantity,
  clearCart, totalItems, totalAmount,
}), [items, totalItems, totalAmount])

return <CartContext.Provider value={value}>
```
- **Expected:** Reduced re-renders in cart consumers

### 7. MEDIUM: DB queries without projection
- **Impact:** Medium (over-fetching data)
- **Effort:** Quick (<30min)
- **Location:** `packages/db/src/repositories/stockReservations.ts:157,298`
- **Problem:** `find().toArray()` without `.project()` fetches all fields
- **Fix:** Add projection for required fields only
- **Expected:** Reduced MongoDB bandwidth, faster queries

---

## Quick Wins

1. [ ] Dynamic import tesseract.js - `apps/admin/src/lib/services/invoice-ocr.ts:1`
2. [ ] Memoize CartContext value - `apps/web/src/contexts/CartContext.tsx:92`
3. [ ] Add projection to stockReservations queries - `packages/db/src/repositories/stockReservations.ts:157,298`
4. [ ] Add blur placeholder to ProductImage - `apps/web/src/components/marketplace/ProductImage.tsx`
5. [ ] Fix missing exports in @madebuy/shared - `packages/shared/src/index.ts`

---

## Recommendations for Deep Investigation

1. **Bundle analysis** - Run `ANALYZE=true pnpm build` with working build to see exact bundle composition
2. **Sentry config** - Check if source maps are being bundled into client
3. **TipTap** - Heavy editor library, check if it's in shared bundle
4. **xero-node** - SDK for accounting, should be server-only
5. **Lighthouse audit** - Run on deployed staging to get LCP/FID/CLS metrics

---

## Hand-off for Implementation

Priority order:
1. Fix build errors (missing exports) first
2. Dynamic import tesseract.js
3. Investigate 10.7MB bundle cause
4. Add image optimizations
5. Memoize contexts

---

*Report generated by Optimizer Agent - ANALYSIS ONLY, no code changes made*
