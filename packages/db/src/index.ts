/**
 * @madebuy/db
 * Database client and repositories for MadeBuy platform
 *
 * ARCHIVED (2026-01-02): marketplace, transactions, shipments, payouts, reviews,
 * wishlists, promotions, analytics, accountingConnections, emailCampaigns,
 * stockReservations, shippingProfiles
 * See: archive/packages/db/src/repositories/
 */

// Export database client and utilities
export { getDatabase, serializeMongo, serializeMongoArray } from './client'
export * as abandonedCarts from './repositories/abandonedCarts'
export * as analytics from './repositories/analytics'
export * as auditLog from './repositories/auditLog'
export * as blog from './repositories/blog'
export * as bulk from './repositories/bulk'
export * as bundles from './repositories/bundles'
export * as captionStyles from './repositories/captionStyles'
export * as collections from './repositories/collections'
export * as customers from './repositories/customers'
export * as discounts from './repositories/discounts'
export * as disputes from './repositories/disputes'
export * as domains from './repositories/domains'
export * as downloads from './repositories/downloads'
export * as enquiries from './repositories/enquiries'
export * as imports from './repositories/imports'
export * as invoices from './repositories/invoices'
export * as keyDates from './repositories/keyDates'
export * as marketplace from './repositories/marketplace'
export * as materials from './repositories/materials'
export * as media from './repositories/media'
export * as newsletters from './repositories/newsletters'
export * as orders from './repositories/orders'
export * as passwordResets from './repositories/passwordResets'
export * as payouts from './repositories/payouts'
// Export types
export type { LowStockPiece } from './repositories/pieces'
export * as pieces from './repositories/pieces'
export * as previews from './repositories/previews'
export * as productionRuns from './repositories/productionRuns'
export * as publish from './repositories/publish'
export * as reconciliations from './repositories/reconciliations'
export * as reviews from './repositories/reviews'
// Export active repositories
export * as tenants from './repositories/tenants'
export * as tracking from './repositories/tracking'
export * as transactions from './repositories/transactions'
export * as variants from './repositories/variants'
export * as wishlist from './repositories/wishlist'

// =============================================================================
// ARCHIVED REPOSITORIES (removed 2026-01-02)
// =============================================================================
// marketplace - see archive/packages/db/src/repositories/
// shipments - see archive/packages/db/src/repositories/
// reviews - see archive/packages/db/src/repositories/
// wishlists - see archive/packages/db/src/repositories/
// promotions - see archive/packages/db/src/repositories/
// analytics - see archive/packages/db/src/repositories/
// accountingConnections - see archive/packages/db/src/repositories/
// emailCampaigns - see archive/packages/db/src/repositories/
// stockReservations - see archive/packages/db/src/repositories/
// shippingProfiles - see archive/packages/db/src/repositories/

// Stub repositories for backwards compatibility (no-op implementations)
export * as stockReservations from './repositories/stubs'
