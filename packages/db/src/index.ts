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
