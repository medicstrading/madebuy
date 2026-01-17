import type { CreateWishlistItemInput, WishlistItem } from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

/**
 * Add item to wishlist
 * Either customerEmail or sessionId must be provided
 */
export async function addToWishlist(
  tenantId: string,
  data: CreateWishlistItemInput,
): Promise<WishlistItem> {
  const db = await getDatabase()

  // Verify either email or session is provided
  if (!data.customerEmail && !data.sessionId) {
    throw new Error('Either customerEmail or sessionId is required')
  }

  // Check if item already exists
  const query: Record<string, unknown> = {
    tenantId,
    pieceId: data.pieceId,
  }

  if (data.customerEmail) {
    query.customerEmail = data.customerEmail.toLowerCase()
  } else {
    query.sessionId = data.sessionId
  }

  const existing = await db.collection('wishlist').findOne(query)
  if (existing) {
    return existing as unknown as WishlistItem
  }

  const item: WishlistItem = {
    id: nanoid(),
    tenantId,
    pieceId: data.pieceId,
    customerEmail: data.customerEmail?.toLowerCase(),
    sessionId: data.sessionId,
    variantId: data.variantId,
    addedAt: new Date(),
  }

  await db.collection('wishlist').insertOne(item)
  return item
}

/**
 * Remove item from wishlist
 * Returns true if item was removed
 */
export async function removeFromWishlist(
  tenantId: string,
  pieceId: string,
  customerEmail?: string,
  sessionId?: string,
): Promise<boolean> {
  const db = await getDatabase()

  const query: Record<string, unknown> = {
    tenantId,
    pieceId,
  }

  if (customerEmail) {
    query.customerEmail = customerEmail.toLowerCase()
  } else if (sessionId) {
    query.sessionId = sessionId
  } else {
    return false
  }

  const result = await db.collection('wishlist').deleteOne(query)
  return result.deletedCount > 0
}

/**
 * Get wishlist items for a customer
 */
export async function getWishlist(
  tenantId: string,
  customerEmail?: string,
  sessionId?: string,
): Promise<WishlistItem[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (customerEmail) {
    query.customerEmail = customerEmail.toLowerCase()
  } else if (sessionId) {
    query.sessionId = sessionId
  } else {
    return []
  }

  const items = await db
    .collection('wishlist')
    .find(query)
    .sort({ addedAt: -1 })
    .toArray()

  return items as unknown as WishlistItem[]
}

/**
 * Check if item is in wishlist
 */
export async function isInWishlist(
  tenantId: string,
  pieceId: string,
  customerEmail?: string,
  sessionId?: string,
): Promise<boolean> {
  const db = await getDatabase()

  const query: Record<string, unknown> = {
    tenantId,
    pieceId,
  }

  if (customerEmail) {
    query.customerEmail = customerEmail.toLowerCase()
  } else if (sessionId) {
    query.sessionId = sessionId
  } else {
    return false
  }

  const item = await db.collection('wishlist').findOne(query)
  return !!item
}

/**
 * Get wishlist count
 */
export async function getWishlistCount(
  tenantId: string,
  customerEmail?: string,
  sessionId?: string,
): Promise<number> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (customerEmail) {
    query.customerEmail = customerEmail.toLowerCase()
  } else if (sessionId) {
    query.sessionId = sessionId
  } else {
    return 0
  }

  return await db.collection('wishlist').countDocuments(query)
}

/**
 * Merge guest wishlist into customer wishlist after login
 */
export async function mergeWishlist(
  tenantId: string,
  sessionId: string,
  customerEmail: string,
): Promise<number> {
  const db = await getDatabase()

  // Get guest items
  const guestItems = await db
    .collection('wishlist')
    .find({
      tenantId,
      sessionId,
    })
    .toArray()

  let mergedCount = 0

  for (const item of guestItems) {
    // Check if customer already has this item
    const existing = await db.collection('wishlist').findOne({
      tenantId,
      pieceId: item.pieceId,
      customerEmail: customerEmail.toLowerCase(),
    })

    if (!existing) {
      // Move item to customer
      await db.collection('wishlist').insertOne({
        id: nanoid(),
        tenantId,
        pieceId: item.pieceId,
        customerEmail: customerEmail.toLowerCase(),
        variantId: item.variantId,
        addedAt: item.addedAt,
      })
      mergedCount++
    }
  }

  // Delete guest items
  await db.collection('wishlist').deleteMany({
    tenantId,
    sessionId,
  })

  return mergedCount
}

/**
 * Clear wishlist
 */
export async function clearWishlist(
  tenantId: string,
  customerEmail?: string,
  sessionId?: string,
): Promise<number> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (customerEmail) {
    query.customerEmail = customerEmail.toLowerCase()
  } else if (sessionId) {
    query.sessionId = sessionId
  } else {
    return 0
  }

  const result = await db.collection('wishlist').deleteMany(query)
  return result.deletedCount
}
