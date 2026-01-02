# QA Fix Plan - MadeBuy

**Created:** 2026-01-02
**Source:** qa-report-2026-01-02-2005.md
**Status:** Planning

---

## Phase 1: Critical - Tenant Resolution (BLOCKS CHECKOUT & AUTH)

**Root Cause:** `requireTenant()` in `src/lib/tenant.ts:31` throws "Shop not found" on marketplace-wide pages that don't have a specific shop context.

**Affected Pages:**
- `/marketplace/cart` - Users cannot view cart or checkout
- `/auth/signin` - Users cannot sign in to marketplace

**Solution:** Create optional tenant resolution for marketplace-wide pages. These pages should work without a specific shop tenant.

### Tasks

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1.1 | Analyze tenant resolution pattern | `src/lib/tenant.ts` | Pending |
| 1.2 | Create `getOptionalTenant()` or marketplace context | `src/lib/tenant.ts` | Pending |
| 1.3 | Fix cart page to use optional tenant | `apps/web/app/marketplace/cart/` | Pending |
| 1.4 | Fix signin page tenant resolution | `apps/web/app/auth/signin/` | Pending |
| 1.5 | Test both pages work | Manual test | Pending |

---

## Phase 2: Errors - Broken Resources

### 2.1 favicon.ico 500 Error

**Problem:** `/favicon.ico` returns 500 Internal Server Error
**Fix:** Add favicon.ico to `apps/web/public/`

### 2.2 Broken Unsplash Images

**Problem:** 2 seed images return 404 (photo-1596395463674, photo-1594422806768)
**Fix:** Update `scripts/seed-full-marketplace.ts` with working URLs

---

## Phase 3: Warnings (Low Priority - Skip for Now)

| Issue | Fix | Priority |
|-------|-----|----------|
| 26 CORB errors in Media | Review R2 CORS config | Low |
| Form fields missing id/name | Add attributes to inputs | Low |
| Image missing `sizes` prop | Add sizes to Next.js Image | Low |
| Next.js 14.2.35 outdated | Upgrade (separate PR) | Low |

---

## Implementation Order

1. **Phase 1** - Fix critical tenant issues first (blocks user flows)
2. **Phase 2** - Fix favicon and images (quick wins)
3. **Phase 3** - Optional, address if time permits

---

## Notes

- Cart should work across multiple shops (marketplace cart pattern)
- Auth should work at platform level, not per-shop
- Consider if marketplace needs a "platform tenant" concept
