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

// Export types
export type { LowStockPiece } from './repositories/pieces'

// Export active repositories
export * as tenants from './repositories/tenants'
export * as pieces from './repositories/pieces'
export * as media from './repositories/media'
export * as materials from './repositories/materials'
export * as invoices from './repositories/invoices'
export * as orders from './repositories/orders'
export * as publish from './repositories/publish'
export * as enquiries from './repositories/enquiries'
export * as blog from './repositories/blog'
export * as bulk from './repositories/bulk'
export * as domains from './repositories/domains'
export * as tracking from './repositories/tracking'
export * as variants from './repositories/variants'
export * as customers from './repositories/customers'
export * as discounts from './repositories/discounts'
export * as downloads from './repositories/downloads'
export * as newsletters from './repositories/newsletters'
export * as collections from './repositories/collections'
export * as bundles from './repositories/bundles'
export * as keyDates from './repositories/keyDates'
export * as auditLog from './repositories/auditLog'
export * as transactions from './repositories/transactions'
export * as payouts from './repositories/payouts'
export * as previews from './repositories/previews'
export * as reviews from './repositories/reviews'
export * as wishlist from './repositories/wishlist'
export * as analytics from './repositories/analytics'
export * as abandonedCarts from './repositories/abandonedCarts'
export * as disputes from './repositories/disputes'
export * as captionStyles from './repositories/captionStyles'
export * as marketplace from './repositories/marketplace'
export * as imports from './repositories/imports'
export * as passwordResets from './repositories/passwordResets'

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
