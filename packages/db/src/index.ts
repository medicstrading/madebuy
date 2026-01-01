/**
 * @madebuy/db
 * Database client and repositories for MadeBuy platform
 */

// Export database client and utilities
export { getDatabase, serializeMongo, serializeMongoArray } from './client'

// Export all repositories
export * as tenants from './repositories/tenants'
export * as pieces from './repositories/pieces'
export * as media from './repositories/media'
export * as materials from './repositories/materials'
export * as invoices from './repositories/invoices'
export * as orders from './repositories/orders'
export * as promotions from './repositories/promotions'
export * as publish from './repositories/publish'
export * as enquiries from './repositories/enquiries'
export * as marketplace from './repositories/marketplace'
export * as blog from './repositories/blog'
export * as stockReservations from './repositories/stockReservations'
export * as analytics from './repositories/analytics'
export * as bulk from './repositories/bulk'
export * as domains from './repositories/domains'
export * as tracking from './repositories/tracking'
export * as transactions from './repositories/transactions'
export * as payouts from './repositories/payouts'
export * as variants from './repositories/variants'
export * as customers from './repositories/customers'
export * as emailCampaigns from './repositories/emailCampaigns'
export * as shippingProfiles from './repositories/shippingProfiles'
export * as shipments from './repositories/shipments'
export * as wishlists from './repositories/wishlists'
export * as reviews from './repositories/reviews'
export * as accountingConnections from './repositories/accountingConnections'
