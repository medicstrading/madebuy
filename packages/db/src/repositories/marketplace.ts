/**
 * Marketplace Repository
 *
 * Database operations for marketplace integrations (eBay, Etsy, etc.)
 * Handles connections, listings, and order imports.
 */

import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import { encryptIfConfigured, decryptIfConfigured } from '../lib/crypto'
import type {
  MarketplacePlatform,
  MarketplaceConnection,
  MarketplaceListing,
  MarketplaceOrder,
  MarketplaceConnectionStatus,
  MarketplaceListingStatus,
  CreateMarketplaceConnectionInput,
  UpdateMarketplaceConnectionInput,
  CreateMarketplaceListingInput,
  UpdateMarketplaceListingInput,
  CreateMarketplaceOrderInput,
  MarketplaceListingFilters,
  MarketplaceOrderFilters,
  MarketplaceOAuthState,
} from '@madebuy/shared'

const CONNECTIONS_COLLECTION = 'marketplace_connections'
const LISTINGS_COLLECTION = 'marketplace_listings'
const ORDERS_COLLECTION = 'marketplace_orders'
const OAUTH_STATE_COLLECTION = 'marketplace_oauth_states'

// =============================================================================
// Connection Operations
// =============================================================================

/**
 * Create a new marketplace connection
 */
export async function createConnection(
  tenantId: string,
  input: CreateMarketplaceConnectionInput
): Promise<MarketplaceConnection> {
  const db = await getDatabase()

  // Encrypt sensitive tokens before storage
  const encryptedAccessToken = encryptIfConfigured(input.accessToken)
  const encryptedRefreshToken = input.refreshToken
    ? encryptIfConfigured(input.refreshToken)
    : undefined

  const connection: MarketplaceConnection = {
    id: nanoid(),
    tenantId,
    marketplace: input.marketplace,
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    tokenExpiresAt: input.tokenExpiresAt,
    sellerId: input.sellerId,
    shopName: input.shopName,
    scopes: input.scopes,
    status: 'connected',
    enabled: false, // User must explicitly enable marketplace in sidebar
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection(CONNECTIONS_COLLECTION).insertOne(connection)

  // Return connection with decrypted tokens for immediate use
  return {
    ...connection,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  }
}

/**
 * Decrypt tokens in a connection object
 */
function decryptConnectionTokens(
  connection: MarketplaceConnection
): MarketplaceConnection {
  return {
    ...connection,
    accessToken: decryptIfConfigured(connection.accessToken),
    refreshToken: connection.refreshToken
      ? decryptIfConfigured(connection.refreshToken)
      : undefined,
  }
}

/**
 * Get a connection by ID
 */
export async function getConnection(
  tenantId: string,
  connectionId: string
): Promise<MarketplaceConnection | null> {
  const db = await getDatabase()
  const connection = (await db.collection(CONNECTIONS_COLLECTION).findOne({
    tenantId,
    id: connectionId,
  })) as MarketplaceConnection | null

  if (!connection) return null
  return decryptConnectionTokens(connection)
}

/**
 * Get a connection by marketplace
 */
export async function getConnectionByMarketplace(
  tenantId: string,
  marketplace: MarketplacePlatform
): Promise<MarketplaceConnection | null> {
  const db = await getDatabase()
  const connection = (await db.collection(CONNECTIONS_COLLECTION).findOne({
    tenantId,
    marketplace,
    status: { $ne: 'revoked' },
  })) as MarketplaceConnection | null

  if (!connection) return null
  return decryptConnectionTokens(connection)
}

/**
 * Get all connections for a tenant
 */
export async function listConnections(
  tenantId: string
): Promise<MarketplaceConnection[]> {
  const db = await getDatabase()
  const connections = (await db
    .collection(CONNECTIONS_COLLECTION)
    .find({ tenantId })
    .sort({ createdAt: -1 })
    .toArray()) as unknown as MarketplaceConnection[]

  return connections.map(decryptConnectionTokens)
}

/**
 * Update a connection
 */
export async function updateConnection(
  tenantId: string,
  connectionId: string,
  updates: UpdateMarketplaceConnectionInput
): Promise<void> {
  const db = await getDatabase()
  await db.collection(CONNECTIONS_COLLECTION).updateOne(
    { tenantId, id: connectionId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Update connection status
 */
export async function updateConnectionStatus(
  tenantId: string,
  connectionId: string,
  status: MarketplaceConnectionStatus,
  error?: string
): Promise<void> {
  const db = await getDatabase()
  await db.collection(CONNECTIONS_COLLECTION).updateOne(
    { tenantId, id: connectionId },
    {
      $set: {
        status,
        lastError: error,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Refresh tokens for a connection
 */
export async function updateConnectionTokens(
  tenantId: string,
  connectionId: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date
): Promise<void> {
  const db = await getDatabase()

  // Encrypt tokens before storage
  const encryptedAccessToken = encryptIfConfigured(accessToken)
  const encryptedRefreshToken = refreshToken
    ? encryptIfConfigured(refreshToken)
    : undefined

  await db.collection(CONNECTIONS_COLLECTION).updateOne(
    { tenantId, id: connectionId },
    {
      $set: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
        status: 'connected',
        lastError: undefined,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Delete a connection (revoke)
 */
export async function deleteConnection(
  tenantId: string,
  connectionId: string
): Promise<void> {
  const db = await getDatabase()
  // Soft delete by setting status to revoked
  await db.collection(CONNECTIONS_COLLECTION).updateOne(
    { tenantId, id: connectionId },
    {
      $set: {
        status: 'revoked',
        accessToken: '',
        refreshToken: '',
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Get connections with expiring tokens (for refresh job)
 */
export async function getConnectionsNeedingRefresh(
  withinMinutes: number = 30
): Promise<MarketplaceConnection[]> {
  const db = await getDatabase()
  const cutoff = new Date(Date.now() + withinMinutes * 60 * 1000)

  const connections = (await db
    .collection(CONNECTIONS_COLLECTION)
    .find({
      status: 'connected',
      tokenExpiresAt: { $lte: cutoff },
    })
    .toArray()) as unknown as MarketplaceConnection[]

  return connections.map(decryptConnectionTokens)
}

// =============================================================================
// OAuth State Operations (for CSRF protection)
// =============================================================================

/**
 * Save OAuth state for verification
 */
export async function saveOAuthState(state: MarketplaceOAuthState): Promise<void> {
  const db = await getDatabase()
  await db.collection(OAUTH_STATE_COLLECTION).insertOne({
    ...state,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  })
}

/**
 * Verify and consume OAuth state
 */
export async function verifyOAuthState(
  nonce: string
): Promise<MarketplaceOAuthState | null> {
  const db = await getDatabase()
  const state = await db.collection(OAUTH_STATE_COLLECTION).findOneAndDelete({
    nonce,
    expiresAt: { $gt: new Date() },
  })
  return state as unknown as MarketplaceOAuthState | null
}

/**
 * Clean up expired OAuth states
 */
export async function cleanupExpiredOAuthStates(): Promise<void> {
  const db = await getDatabase()
  await db.collection(OAUTH_STATE_COLLECTION).deleteMany({
    expiresAt: { $lt: new Date() },
  })
}

// =============================================================================
// Listing Operations
// =============================================================================

/**
 * Create a marketplace listing
 */
export async function createListing(
  tenantId: string,
  input: CreateMarketplaceListingInput
): Promise<MarketplaceListing> {
  const db = await getDatabase()

  const listing: MarketplaceListing = {
    id: nanoid(),
    tenantId,
    pieceId: input.pieceId,
    marketplace: input.marketplace,
    externalListingId: input.externalListingId,
    externalUrl: input.externalUrl,
    status: input.status || 'pending',
    marketplaceData: input.marketplaceData,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection(LISTINGS_COLLECTION).insertOne(listing)
  return listing
}

/**
 * Get a listing by ID
 */
export async function getListing(
  tenantId: string,
  listingId: string
): Promise<MarketplaceListing | null> {
  const db = await getDatabase()
  return (await db.collection(LISTINGS_COLLECTION).findOne({
    tenantId,
    id: listingId,
  })) as MarketplaceListing | null
}

/**
 * Get a listing by piece and marketplace
 */
export async function getListingByPiece(
  tenantId: string,
  pieceId: string,
  marketplace: MarketplacePlatform
): Promise<MarketplaceListing | null> {
  const db = await getDatabase()
  return (await db.collection(LISTINGS_COLLECTION).findOne({
    tenantId,
    pieceId,
    marketplace,
  })) as MarketplaceListing | null
}

/**
 * Get a listing by external ID
 */
export async function getListingByExternalId(
  tenantId: string,
  marketplace: MarketplacePlatform,
  externalListingId: string
): Promise<MarketplaceListing | null> {
  const db = await getDatabase()
  return (await db.collection(LISTINGS_COLLECTION).findOne({
    tenantId,
    marketplace,
    externalListingId,
  })) as MarketplaceListing | null
}

/**
 * List marketplace listings
 */
export async function listListings(
  tenantId: string,
  filters?: MarketplaceListingFilters
): Promise<MarketplaceListing[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (filters?.marketplace) {
    query.marketplace = filters.marketplace
  }
  if (filters?.pieceId) {
    query.pieceId = filters.pieceId
  }
  if (filters?.status) {
    query.status = Array.isArray(filters.status)
      ? { $in: filters.status }
      : filters.status
  }

  return (await db
    .collection(LISTINGS_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()) as unknown as MarketplaceListing[]
}

/**
 * Get all active listings for a piece (across all marketplaces)
 */
export async function getActiveListingsForPiece(
  tenantId: string,
  pieceId: string
): Promise<MarketplaceListing[]> {
  const db = await getDatabase()
  return (await db
    .collection(LISTINGS_COLLECTION)
    .find({
      tenantId,
      pieceId,
      status: { $in: ['active', 'pending'] },
    })
    .toArray()) as unknown as MarketplaceListing[]
}

/**
 * Update a listing
 */
export async function updateListing(
  tenantId: string,
  listingId: string,
  updates: UpdateMarketplaceListingInput
): Promise<void> {
  const db = await getDatabase()
  await db.collection(LISTINGS_COLLECTION).updateOne(
    { tenantId, id: listingId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Update listing status
 */
export async function updateListingStatus(
  tenantId: string,
  listingId: string,
  status: MarketplaceListingStatus,
  error?: string
): Promise<void> {
  const db = await getDatabase()
  await db.collection(LISTINGS_COLLECTION).updateOne(
    { tenantId, id: listingId },
    {
      $set: {
        status,
        syncError: error,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Mark listing as synced
 */
export async function markListingSynced(
  tenantId: string,
  listingId: string,
  price?: number,
  quantity?: number
): Promise<void> {
  const db = await getDatabase()
  await db.collection(LISTINGS_COLLECTION).updateOne(
    { tenantId, id: listingId },
    {
      $set: {
        lastSyncedAt: new Date(),
        lastSyncedPrice: price,
        lastSyncedQuantity: quantity,
        syncError: undefined,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Delete a listing
 */
export async function deleteListing(
  tenantId: string,
  listingId: string
): Promise<void> {
  const db = await getDatabase()
  await db.collection(LISTINGS_COLLECTION).deleteOne({
    tenantId,
    id: listingId,
  })
}

/**
 * Get listings needing sync (stale data)
 */
export async function getListingsNeedingSync(
  tenantId: string,
  marketplace: MarketplacePlatform,
  olderThanMinutes: number = 15
): Promise<MarketplaceListing[]> {
  const db = await getDatabase()
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000)

  return (await db
    .collection(LISTINGS_COLLECTION)
    .find({
      tenantId,
      marketplace,
      status: 'active',
      $or: [
        { lastSyncedAt: { $lt: cutoff } },
        { lastSyncedAt: { $exists: false } },
      ],
    })
    .toArray()) as unknown as MarketplaceListing[]
}

// =============================================================================
// Order Operations
// =============================================================================

/**
 * Create a marketplace order (import)
 */
export async function createOrder(
  tenantId: string,
  input: CreateMarketplaceOrderInput
): Promise<MarketplaceOrder> {
  const db = await getDatabase()

  const order: MarketplaceOrder = {
    id: nanoid(),
    tenantId,
    marketplace: input.marketplace,
    externalOrderId: input.externalOrderId,
    externalUrl: input.externalUrl,
    status: input.status,
    paymentStatus: input.paymentStatus,
    buyer: input.buyer,
    shippingAddress: input.shippingAddress,
    items: input.items.map((item) => ({ ...item, id: nanoid() })),
    subtotal: input.subtotal,
    shippingCost: input.shippingCost,
    tax: input.tax,
    total: input.total,
    currency: input.currency,
    marketplaceFees: input.marketplaceFees,
    orderDate: input.orderDate,
    paidAt: input.paidAt,
    rawData: input.rawData,
    importedAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection(ORDERS_COLLECTION).insertOne(order)
  return order
}

/**
 * Get an order by ID
 */
export async function getOrder(
  tenantId: string,
  orderId: string
): Promise<MarketplaceOrder | null> {
  const db = await getDatabase()
  return (await db.collection(ORDERS_COLLECTION).findOne({
    tenantId,
    id: orderId,
  })) as MarketplaceOrder | null
}

/**
 * Get an order by external ID
 */
export async function getOrderByExternalId(
  tenantId: string,
  marketplace: MarketplacePlatform,
  externalOrderId: string
): Promise<MarketplaceOrder | null> {
  const db = await getDatabase()
  return (await db.collection(ORDERS_COLLECTION).findOne({
    tenantId,
    marketplace,
    externalOrderId,
  })) as MarketplaceOrder | null
}

/**
 * Check if order already imported
 */
export async function isOrderImported(
  tenantId: string,
  marketplace: MarketplacePlatform,
  externalOrderId: string
): Promise<boolean> {
  const db = await getDatabase()
  const count = await db.collection(ORDERS_COLLECTION).countDocuments({
    tenantId,
    marketplace,
    externalOrderId,
  })
  return count > 0
}

/**
 * List marketplace orders
 */
export async function listOrders(
  tenantId: string,
  filters?: MarketplaceOrderFilters
): Promise<MarketplaceOrder[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (filters?.marketplace) {
    query.marketplace = filters.marketplace
  }
  if (filters?.status) {
    query.status = Array.isArray(filters.status)
      ? { $in: filters.status }
      : filters.status
  }
  if (filters?.fromDate || filters?.toDate) {
    query.orderDate = {}
    if (filters.fromDate) {
      (query.orderDate as Record<string, Date>).$gte = filters.fromDate
    }
    if (filters.toDate) {
      (query.orderDate as Record<string, Date>).$lte = filters.toDate
    }
  }

  return (await db
    .collection(ORDERS_COLLECTION)
    .find(query)
    .sort({ orderDate: -1 })
    .toArray()) as unknown as MarketplaceOrder[]
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  status: MarketplaceOrder['status'],
  shippedAt?: Date
): Promise<void> {
  const db = await getDatabase()
  const updates: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  }
  if (shippedAt) {
    updates.shippedAt = shippedAt
  }

  await db.collection(ORDERS_COLLECTION).updateOne(
    { tenantId, id: orderId },
    { $set: updates }
  )
}

/**
 * Link marketplace order to MadeBuy order
 */
export async function linkOrderToMadeBuyOrder(
  tenantId: string,
  marketplaceOrderId: string,
  madeBuyOrderId: string
): Promise<void> {
  const db = await getDatabase()
  await db.collection(ORDERS_COLLECTION).updateOne(
    { tenantId, id: marketplaceOrderId },
    {
      $set: {
        linkedOrderId: madeBuyOrderId,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Get recent orders for sync (to check for updates)
 */
export async function getRecentOrders(
  tenantId: string,
  marketplace: MarketplacePlatform,
  daysAgo: number = 7
): Promise<MarketplaceOrder[]> {
  const db = await getDatabase()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysAgo)

  return (await db
    .collection(ORDERS_COLLECTION)
    .find({
      tenantId,
      marketplace,
      orderDate: { $gte: cutoff },
    })
    .sort({ orderDate: -1 })
    .toArray()) as unknown as MarketplaceOrder[]
}

// =============================================================================
// Stats & Reporting
// =============================================================================

/**
 * Get marketplace stats for a tenant
 */
export async function getMarketplaceStats(
  tenantId: string,
  marketplace?: MarketplacePlatform
): Promise<{
  totalListings: number
  activeListings: number
  totalOrders: number
  pendingOrders: number
  totalRevenue: number
}> {
  const db = await getDatabase()

  const listingQuery: Record<string, unknown> = { tenantId }
  const orderQuery: Record<string, unknown> = { tenantId }

  if (marketplace) {
    listingQuery.marketplace = marketplace
    orderQuery.marketplace = marketplace
  }

  const [totalListings, activeListings, totalOrders, pendingOrders, revenueResult] =
    await Promise.all([
      db.collection(LISTINGS_COLLECTION).countDocuments(listingQuery),
      db
        .collection(LISTINGS_COLLECTION)
        .countDocuments({ ...listingQuery, status: 'active' }),
      db.collection(ORDERS_COLLECTION).countDocuments(orderQuery),
      db
        .collection(ORDERS_COLLECTION)
        .countDocuments({ ...orderQuery, status: 'pending' }),
      db
        .collection(ORDERS_COLLECTION)
        .aggregate([
          { $match: { ...orderQuery, paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ])
        .toArray(),
    ])

  return {
    totalListings,
    activeListings,
    totalOrders,
    pendingOrders,
    totalRevenue: revenueResult[0]?.total || 0,
  }
}
