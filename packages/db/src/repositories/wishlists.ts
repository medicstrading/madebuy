/**
 * Wishlist Repository
 * Guest wishlist functionality using cookie-based visitorId
 */

import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { WishlistItem, AddToWishlistInput } from '@madebuy/shared'

/**
 * Add a piece to wishlist
 */
export async function addToWishlist(input: AddToWishlistInput): Promise<WishlistItem> {
  const db = await getDatabase()

  // Check if already in wishlist
  const existing = await db.collection('wishlists').findOne({
    visitorId: input.visitorId,
    pieceId: input.pieceId,
  })

  if (existing) {
    return existing as unknown as WishlistItem
  }

  const wishlistItem: WishlistItem = {
    id: nanoid(),
    visitorId: input.visitorId,
    pieceId: input.pieceId,
    tenantId: input.tenantId,
    addedAt: new Date(),
  }

  await db.collection('wishlists').insertOne(wishlistItem)
  return wishlistItem
}

/**
 * Remove a piece from wishlist
 */
export async function removeFromWishlist(visitorId: string, pieceId: string): Promise<boolean> {
  const db = await getDatabase()

  const result = await db.collection('wishlists').deleteOne({
    visitorId,
    pieceId,
  })

  return result.deletedCount > 0
}

/**
 * Get all wishlist items for a visitor
 */
export async function getWishlist(visitorId: string): Promise<WishlistItem[]> {
  const db = await getDatabase()

  const items = await db.collection('wishlists')
    .find({ visitorId })
    .sort({ addedAt: -1 })
    .toArray()

  return items as unknown as WishlistItem[]
}

/**
 * Check if a piece is in the visitor's wishlist
 */
export async function isInWishlist(visitorId: string, pieceId: string): Promise<boolean> {
  const db = await getDatabase()

  const item = await db.collection('wishlists').findOne({
    visitorId,
    pieceId,
  })

  return !!item
}

/**
 * Get the wishlist count for a specific piece (how many people wishlisted it)
 */
export async function getWishlistCount(pieceId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection('wishlists').countDocuments({ pieceId })
}

/**
 * Get wishlist items for a specific tenant (seller analytics)
 */
export async function getWishlistByTenant(tenantId: string): Promise<WishlistItem[]> {
  const db = await getDatabase()

  const items = await db.collection('wishlists')
    .find({ tenantId })
    .sort({ addedAt: -1 })
    .toArray()

  return items as unknown as WishlistItem[]
}

/**
 * Count wishlist items for a tenant's products
 */
export async function countWishlistByTenant(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection('wishlists').countDocuments({ tenantId })
}

/**
 * Get most wishlisted pieces for a tenant
 */
export async function getMostWishlistedPieces(tenantId: string, limit: number = 10): Promise<{ pieceId: string; count: number }[]> {
  const db = await getDatabase()

  const result = await db.collection('wishlists').aggregate([
    { $match: { tenantId } },
    { $group: { _id: '$pieceId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { pieceId: '$_id', count: 1, _id: 0 } }
  ]).toArray()

  return result as unknown as { pieceId: string; count: number }[]
}

/**
 * Migrate wishlist from one visitorId to another (e.g., after login)
 */
export async function migrateWishlist(fromVisitorId: string, toVisitorId: string): Promise<number> {
  const db = await getDatabase()

  // Get items from old visitor
  const oldItems = await db.collection('wishlists')
    .find({ visitorId: fromVisitorId })
    .toArray()

  if (oldItems.length === 0) return 0

  let migrated = 0

  for (const item of oldItems) {
    // Check if already exists in new visitor's wishlist
    const existing = await db.collection('wishlists').findOne({
      visitorId: toVisitorId,
      pieceId: item.pieceId,
    })

    if (!existing) {
      // Add to new visitor's wishlist
      await db.collection('wishlists').insertOne({
        id: nanoid(),
        visitorId: toVisitorId,
        pieceId: item.pieceId,
        tenantId: item.tenantId,
        addedAt: new Date(),
      })
      migrated++
    }
  }

  // Remove old visitor's items
  await db.collection('wishlists').deleteMany({ visitorId: fromVisitorId })

  return migrated
}

/**
 * Ensure indexes exist (call on app startup)
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDatabase()

  await db.collection('wishlists').createIndex(
    { visitorId: 1, pieceId: 1 },
    { unique: true, background: true }
  )
  await db.collection('wishlists').createIndex(
    { visitorId: 1, addedAt: -1 },
    { background: true }
  )
  await db.collection('wishlists').createIndex(
    { pieceId: 1 },
    { background: true }
  )
  await db.collection('wishlists').createIndex(
    { tenantId: 1 },
    { background: true }
  )
}
