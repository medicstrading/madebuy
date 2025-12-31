import { Collection, ObjectId } from 'mongodb'
import { getDatabase } from '../client'

export interface StockReservation {
  id: string
  tenantId: string
  pieceId: string
  variantId?: string // Optional variant ID for variant products
  quantity: number
  sessionId: string // Stripe checkout session ID
  expiresAt: Date
  createdAt: Date
}

interface StockReservationDoc extends Omit<StockReservation, 'id'> {
  _id: ObjectId
}

async function getCollection(): Promise<Collection<StockReservationDoc>> {
  const db = await getDatabase()
  return db.collection('stock_reservations')
}

/**
 * Reserve stock for a checkout session
 * Returns the reservation if successful, null if not enough stock
 * Supports both piece-level and variant-level stock
 */
export async function reserveStock(
  tenantId: string,
  pieceId: string,
  quantity: number,
  sessionId: string,
  expirationMinutes: number = 30,
  variantId?: string
): Promise<StockReservation | null> {
  const collection = await getCollection()
  const db = await getDatabase()
  const piecesCollection = db.collection('pieces')

  // Get the piece to check available stock (uses id field, not _id)
  const piece = await piecesCollection.findOne({
    id: pieceId,
    tenantId,
  })

  if (!piece) {
    return null
  }

  // Determine the stock to check (variant-level or piece-level)
  let stockToCheck: number | undefined = piece.stock

  if (piece.hasVariants && variantId && piece.variants) {
    const variant = piece.variants.find((v: any) => v.id === variantId)
    if (!variant) {
      return null // Variant not found
    }
    if (!variant.isAvailable) {
      return null // Variant not available
    }
    stockToCheck = variant.stock
  }

  // If stock is undefined, it means unlimited - allow reservation
  if (stockToCheck === undefined) {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000)

    const result = await collection.insertOne({
      _id: new ObjectId(),
      tenantId,
      pieceId,
      variantId,
      quantity,
      sessionId,
      expiresAt,
      createdAt: now,
    })

    return {
      id: result.insertedId.toHexString(),
      tenantId,
      pieceId,
      variantId,
      quantity,
      sessionId,
      expiresAt,
      createdAt: now,
    }
  }

  // Calculate currently reserved quantity for this piece/variant
  const matchQuery: any = {
    pieceId,
    expiresAt: { $gt: new Date() },
  }
  if (variantId) {
    matchQuery.variantId = variantId
  }

  const reservedAgg = await collection.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalReserved: { $sum: '$quantity' },
      },
    },
  ]).toArray()

  const currentlyReserved = reservedAgg[0]?.totalReserved || 0
  const availableStock = stockToCheck - currentlyReserved

  if (availableStock < quantity) {
    return null // Not enough stock
  }

  // Create reservation
  const now = new Date()
  const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000)

  const result = await collection.insertOne({
    _id: new ObjectId(),
    tenantId,
    pieceId,
    variantId,
    quantity,
    sessionId,
    expiresAt,
    createdAt: now,
  })

  return {
    id: result.insertedId.toHexString(),
    tenantId,
    pieceId,
    variantId,
    quantity,
    sessionId,
    expiresAt,
    createdAt: now,
  }
}

/**
 * Complete a reservation - removes it and decrements actual stock
 * Called when payment is successful
 * Supports both piece-level and variant-level stock
 */
export async function completeReservation(sessionId: string): Promise<boolean> {
  const collection = await getCollection()
  const db = await getDatabase()
  const piecesCollection = db.collection('pieces')

  // Find all reservations for this session
  const reservations = await collection.find({ sessionId }).toArray()

  if (reservations.length === 0) {
    return false
  }

  // Process each reservation
  for (const reservation of reservations) {
    // Get current piece (uses id field, not _id)
    const piece = await piecesCollection.findOne({
      id: reservation.pieceId,
      tenantId: reservation.tenantId,
    })

    if (piece) {
      // Check if this is a variant reservation
      if (reservation.variantId && piece.hasVariants && piece.variants) {
        // Find variant index and update its stock
        const variantIndex = piece.variants.findIndex((v: any) => v.id === reservation.variantId)
        if (variantIndex !== -1) {
          const variant = piece.variants[variantIndex]
          if (variant.stock !== undefined) {
            const newStock = Math.max(0, variant.stock - reservation.quantity)
            await piecesCollection.updateOne(
              { id: reservation.pieceId },
              {
                $set: {
                  [`variants.${variantIndex}.stock`]: newStock,
                  [`variants.${variantIndex}.isAvailable`]: newStock > 0,
                  updatedAt: new Date(),
                }
              }
            )
          }
        }
      } else if (piece.stock !== undefined) {
        // Piece-level stock decrement
        const newStock = Math.max(0, piece.stock - reservation.quantity)
        await piecesCollection.updateOne(
          { id: reservation.pieceId },
          { $set: { stock: newStock, updatedAt: new Date() } }
        )
      }
    }

    // Delete the reservation
    await collection.deleteOne({ _id: reservation._id })
  }

  return true
}

/**
 * Cancel/release a reservation
 * Called when checkout is abandoned or cancelled
 */
export async function cancelReservation(sessionId: string): Promise<boolean> {
  const collection = await getCollection()
  const result = await collection.deleteMany({ sessionId })
  return result.deletedCount > 0
}

/**
 * Clean up expired reservations
 * Should be called periodically (e.g., every 5 minutes)
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const collection = await getCollection()
  const result = await collection.deleteMany({
    expiresAt: { $lt: new Date() },
  })
  return result.deletedCount
}

/**
 * Get available stock for a piece or variant (actual stock minus reserved)
 */
export async function getAvailableStock(
  tenantId: string,
  pieceId: string,
  variantId?: string
): Promise<number | null> {
  const db = await getDatabase()
  const piecesCollection = db.collection('pieces')
  const collection = await getCollection()

  const piece = await piecesCollection.findOne({
    id: pieceId,
    tenantId,
  })

  if (!piece) {
    return null
  }

  // Determine the stock to check
  let stockToCheck: number | undefined = piece.stock

  if (piece.hasVariants && variantId && piece.variants) {
    const variant = piece.variants.find((v: any) => v.id === variantId)
    if (!variant) {
      return null
    }
    stockToCheck = variant.stock
  }

  // Unlimited stock
  if (stockToCheck === undefined) {
    return Infinity
  }

  // Calculate reserved quantity for this piece/variant
  const matchQuery: any = {
    pieceId,
    expiresAt: { $gt: new Date() },
  }
  if (variantId) {
    matchQuery.variantId = variantId
  }

  const reservedAgg = await collection.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalReserved: { $sum: '$quantity' },
      },
    },
  ]).toArray()

  const currentlyReserved = reservedAgg[0]?.totalReserved || 0
  return Math.max(0, stockToCheck - currentlyReserved)
}

/**
 * Check if a reservation exists for a session
 */
export async function getReservationsBySession(
  sessionId: string
): Promise<StockReservation[]> {
  const collection = await getCollection()
  const docs = await collection.find({ sessionId }).toArray()

  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    tenantId: doc.tenantId,
    pieceId: doc.pieceId,
    variantId: doc.variantId,
    quantity: doc.quantity,
    sessionId: doc.sessionId,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
  }))
}
