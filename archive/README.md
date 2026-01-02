# MadeBuy Archive

**Archived:** 2026-01-02
**Reason:** Architectural pivot from multi-vendor marketplace to inventory + social publishing app

## What Was Archived

This archive contains features that were removed during the pivot away from the marketplace ecosystem model:

### External Integrations
- **Etsy Marketplace** (`packages/marketplaces/`) - Product sync, OAuth, inventory management
- **Sendle Shipping** (`packages/shared/src/sendle/`) - Shipping quotes, labels, tracking
- **Xero Accounting** (`packages/shared/src/xero/`) - Invoice sync, expense tracking
- **Stripe Connect** (`packages/shared/src/stripe/connect.ts`) - Multi-vendor payouts

### Database Repositories
- `marketplace.ts` - Cross-tenant marketplace queries
- `transactions.ts` - Payment transaction ledger
- `shipments.ts` - Shipping tracking
- `payouts.ts` - Seller payouts
- `reviews.ts` - Product reviews
- `wishlists.ts` - Save for later
- `promotions.ts` - Discount codes
- `analytics.ts` - Dashboard analytics

### Admin Features
- Marketplace toggle & seller profile
- Order management (multi-vendor)
- Fulfillment & shipping labels
- Transaction ledger
- Payout management
- Promotions/discounts
- GST/BAS reports
- Analytics dashboard
- Etsy connection
- Xero/accounting connection
- Stripe Connect onboarding

### Web Features
- Unified marketplace browse/search
- Seller discovery
- Product reviews
- Wishlists
- Shipping tracking
- Multi-vendor cart

## Restoration

To restore any feature:
1. Move files back to original location
2. Update package exports in `index.ts` files
3. Run `pnpm build` to verify
4. Database collections are prefixed with `_archived_` - rename to restore

## Original Codebase Stats

| Metric | Before Pivot |
|--------|--------------|
| API Routes | 129 |
| DB Repositories | 28 |
| Type Files | 37 |
| External Integrations | 9 |
