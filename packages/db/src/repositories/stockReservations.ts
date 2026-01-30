/**
 * Stock Reservations Repository
 * Handles atomic stock reservation for cart checkout flow
 *
 * Flow:
 * 1. reserveStock() - Atomically decrements piece stock and creates reservation
 * 2. completeReservation() - Marks reservation as completed after successful payment
 * 3. cancelReservation() - Restores stock and marks reservation as cancelled
 *
 * Reservations have TTL (default 15 minutes) and should be cleaned up via cron job
 */

import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

export interface StockReservation {
  id: string
  tenantId: string
  pieceId: string
  variantId?: string
  quantity: number
  sessionId: string
  expiresAt: Date
  status: 'active' | 'completed' | 'cancelled'
  createdAt: Date
}

/**
 * Reserve stock atomically - decrement piece/variant stock and create reservation
 * Uses findOneAndUpdate with $inc to atomically check and decrement stock
 *
 * @returns StockReservation if successful, null if insufficient stock
 */
export async function reserveStock(
  tenantId: string,
  pieceId: string,
  quantity: number,
  sessionId: string,
  variantId?: string,
  expirationMinutes: number = 15,
): Promise<StockReservation | null> {
  const db = await getDatabase()

  // For variant products, we need to use arrayFilters to update the specific variant
  if (variantId) {
    // First check if there's sufficient stock
    const piece = await db.collection('pieces').findOne({
      tenantId,
      id: pieceId,
      variants: {
        $elemMatch: {
          id: variantId,
          stock: { $gte: quantity },
        },
      },
    })

    if (!piece) return null // Insufficient stock or piece/variant not found

    // Atomically decrement variant stock
    const result = await db.collection('pieces').updateOne(
      {
        tenantId,
        id: pieceId,
        'variants.id': variantId,
        'variants.stock': { $gte: quantity },
      },
      {
        $inc: { 'variants.$[v].stock': -quantity },
        $set: { updatedAt: new Date() },
      },
      {
        arrayFilters: [{ 'v.id': variantId }],
      },
    )

    if (result.modifiedCount === 0) return null // Race condition - stock depleted
  } else {
    // Non-variant product - check piece-level stock
    const piece = await db.collection('pieces').findOne({
      tenantId,
      id: pieceId,
    })

    // Handle unlimited stock (null/undefined)
    if (!piece) return null

    // If stock is defined and insufficient, reject
    if (
      piece.stock !== null &&
      piece.stock !== undefined &&
      piece.stock < quantity
    ) {
      return null
    }

    // Only decrement if stock is tracked (not null/undefined)
    if (piece.stock !== null && piece.stock !== undefined) {
      const result = await db.collection('pieces').updateOne(
        {
          tenantId,
          id: pieceId,
          stock: { $gte: quantity },
        },
        {
          $inc: { stock: -quantity },
          $set: { updatedAt: new Date() },
        },
      )

      if (result.modifiedCount === 0) return null // Race condition - stock depleted
    }
    // If unlimited stock, we don't decrement but still create reservation
  }

  // Create reservation record
  const reservation: StockReservation = {
    id: nanoid(),
    tenantId,
    pieceId,
    variantId,
    quantity,
    sessionId,
    expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
    status: 'active',
    createdAt: new Date(),
  }

  await db.collection('stock_reservations').insertOne(reservation)
  return reservation
}

/**
 * Complete reservation - mark as completed (stock already decremented)
 * Called after successful payment
 */
export async function completeReservation(
  reservationId: string,
): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.collection('stock_reservations').updateOne(
    { id: reservationId, status: 'active' },
    { $set: { status: 'completed', completedAt: new Date() } },
  )
  return result.modifiedCount > 0
}

/**
 * Cancel reservation - restore stock atomically
 * Called when checkout is abandoned or cart is cleared
 */
export async function cancelReservation(
  reservationId: string,
): Promise<boolean> {
  const db = await getDatabase()

  // Get reservation details
  const reservation = (await db
    .collection('stock_reservations')
    .findOne({ id: reservationId, status: 'active' })) as StockReservation | null

  if (!reservation) return false

  // Restore stock
  if (reservation.variantId) {
    // Restore variant stock
    await db.collection('pieces').updateOne(
      {
        tenantId: reservation.tenantId,
        id: reservation.pieceId,
        'variants.id': reservation.variantId,
      },
      {
        $inc: { 'variants.$[v].stock': reservation.quantity },
        $set: { updatedAt: new Date() },
      },
      {
        arrayFilters: [{ 'v.id': reservation.variantId }],
      },
    )
  } else {
    // Check if piece has unlimited stock before restoring
    const piece = await db.collection('pieces').findOne({
      tenantId: reservation.tenantId,
      id: reservation.pieceId,
    })

    // Only restore if stock is tracked
    if (piece && piece.stock !== null && piece.stock !== undefined) {
      await db.collection('pieces').updateOne(
        { tenantId: reservation.tenantId, id: reservation.pieceId },
        {
          $inc: { stock: reservation.quantity },
          $set: { updatedAt: new Date() },
        },
      )
    }
  }

  // Mark reservation as cancelled
  await db.collection('stock_reservations').updateOne(
    { id: reservationId },
    { $set: { status: 'cancelled', cancelledAt: new Date() } },
  )

  return true
}

/**
 * Get available stock (current stock from piece/variant)
 * Stock reservations are already reflected in the decremented stock
 */
export async function getAvailableStock(
  tenantId: string,
  pieceId: string,
  variantId?: string,
): Promise<number> {
  const db = await getDatabase()

  const piece = await db.collection('pieces').findOne({ tenantId, id: pieceId })
  if (!piece) return 0

  if (variantId && piece.variants) {
    const variant = (piece.variants as Array<{ id: string; stock?: number }>).find(
      (v) => v.id === variantId,
    )
    return variant?.stock ?? 0
  }

  // Return 0 for unlimited stock indicator - caller should check for null/undefined
  return piece.stock ?? 0
}

/**
 * Get reservations by session
 */
export async function getReservationsBySession(
  sessionId: string,
): Promise<StockReservation[]> {
  const db = await getDatabase()
  return (await db
    .collection('stock_reservations')
    .find({ sessionId, status: 'active' })
    .toArray()) as unknown as StockReservation[]
}

/**
 * Get reservation by ID
 */
export async function getReservation(
  reservationId: string,
): Promise<StockReservation | null> {
  const db = await getDatabase()
  return (await db
    .collection('stock_reservations')
    .findOne({ id: reservationId })) as StockReservation | null
}

/**
 * Cancel all reservations for a session
 * Restores stock for each reservation
 */
export async function cancelSessionReservations(
  sessionId: string,
): Promise<number> {
  const reservations = await getReservationsBySession(sessionId)

  for (const reservation of reservations) {
    await cancelReservation(reservation.id)
  }

  return reservations.length
}

/**
 * Get expired reservations that need cleanup
 * Should be called by a cron job to release held stock
 */
export async function getExpiredReservations(): Promise<StockReservation[]> {
  const db = await getDatabase()
  return (await db
    .collection('stock_reservations')
    .find({
      status: 'active',
      expiresAt: { $lt: new Date() },
    })
    .toArray()) as unknown as StockReservation[]
}

/**
 * Clean up expired reservations - restore stock and mark as cancelled
 * Should be called by a cron job (e.g., every 5 minutes)
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const expired = await getExpiredReservations()

  for (const reservation of expired) {
    await cancelReservation(reservation.id)
  }

  return expired.length
}

/**
 * Commit reservation - alias for completeReservation for backwards compatibility
 */
export async function commitReservation(sessionId: string): Promise<boolean> {
  const reservations = await getReservationsBySession(sessionId)
  let allCompleted = true

  for (const reservation of reservations) {
    const completed = await completeReservation(reservation.id)
    if (!completed) allCompleted = false
  }

  return allCompleted
}
