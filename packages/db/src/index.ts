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
export * as keyDates from './repositories/keyDates'

// =============================================================================
// ARCHIVED REPOSITORIES (removed 2026-01-02)
// =============================================================================
// marketplace - see archive/packages/db/src/repositories/
// transactions - see archive/packages/db/src/repositories/
// shipments - see archive/packages/db/src/repositories/
// payouts - see archive/packages/db/src/repositories/
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
export * as transactions from './repositories/stubs'
