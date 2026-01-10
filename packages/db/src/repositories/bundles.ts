import { nanoid } from 'nanoid'
import type { Filter, Document } from 'mongodb'
import { getDatabase, getMongoClient } from '../client'
import type {
  Bundle,
  BundleStatus,
  BundlePiece,
  BundleWithPieces,
  CreateBundleInput,
  UpdateBundleInput,
  BundleListOptions,
  Piece,
} from '@madebuy/shared'

// Database record type
interface BundleDbRecord extends Bundle {
  _id?: unknown
}

// Maximum items to return in a single query
const MAX_QUERY_LIMIT = 100

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Get multiple pieces by their IDs in a single query (fixes N+1)
 */
async function getPiecesByIds(
  tenantId: string,
  pieceIds: string[]
): Promise<Map<string, Piece>> {
  const db = await getDatabase()
  const pieceList = await db.collection('pieces')
    .find({ tenantId, id: { $in: pieceIds } })
    .toArray() as unknown as Piece[]
  return new Map(pieceList.map(p => [p.id, p]))
}

/**
 * Calculate the original price from pieces (optimized with batch query)
 */
async function calculateOriginalPrice(
  tenantId: string,
  bundlePieces: BundlePiece[]
): Promise<number> {
  if (bundlePieces.length === 0) return 0

  const pieceIds = bundlePieces.map(bp => bp.pieceId)
  const pieceMap = await getPiecesByIds(tenantId, pieceIds)

  let total = 0
  for (const bp of bundlePieces) {
    const piece = pieceMap.get(bp.pieceId)
    if (piece?.price) {
      total += piece.price * bp.quantity
    }
  }

  return total
}

/**
 * Calculate discount percentage
 */
function calculateDiscountPercent(originalPrice: number, bundlePrice: number): number {
  if (originalPrice <= 0) return 0
  const discount = ((originalPrice - bundlePrice) / originalPrice) * 100
  return Math.round(discount * 10) / 10 // Round to 1 decimal place
}

/**
 * Create a new bundle
 */
export async function createBundle(
  tenantId: string,
  input: CreateBundleInput
): Promise<Bundle> {
  const db = await getDatabase()

  const originalPrice = await calculateOriginalPrice(tenantId, input.pieces)
  const discountPercent = calculateDiscountPercent(originalPrice, input.bundlePrice)

  const now = new Date()
  const bundle: Bundle = {
    id: nanoid(),
    tenantId,
    name: input.name,
    description: input.description,
    slug: input.slug || generateSlug(input.name),
    pieces: input.pieces,
    bundlePrice: input.bundlePrice,
    originalPrice,
    discountPercent,
    status: input.status || 'draft',
    imageId: input.imageId,
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('bundles').insertOne(bundle)
  return bundle
}

/**
 * Get a bundle by ID
 */
export async function getBundle(
  tenantId: string,
  id: string
): Promise<Bundle | null> {
  const db = await getDatabase()
  const bundle = await db.collection('bundles').findOne({ tenantId, id })
  return bundle as unknown as Bundle | null
}

/**
 * Get a bundle by slug
 */
export async function getBundleBySlug(
  tenantId: string,
  slug: string
): Promise<Bundle | null> {
  const db = await getDatabase()
  const bundle = await db.collection('bundles').findOne({ tenantId, slug })
  return bundle as unknown as Bundle | null
}

/**
 * Update a bundle
 */
export async function updateBundle(
  tenantId: string,
  id: string,
  input: UpdateBundleInput
): Promise<Bundle | null> {
  const db = await getDatabase()

  // Get current bundle for recalculation if needed
  const current = await getBundle(tenantId, id)
  if (!current) return null

  const updateData: Partial<BundleDbRecord> = {
    ...input,
    updatedAt: new Date(),
  }

  // Regenerate slug if name changed and no custom slug provided
  if (input.name && !input.slug) {
    updateData.slug = generateSlug(input.name)
  }

  // Recalculate prices if pieces or bundlePrice changed
  if (input.pieces || input.bundlePrice !== undefined) {
    const bundlePieces = input.pieces || current.pieces
    const bundlePrice = input.bundlePrice ?? current.bundlePrice

    const originalPrice = await calculateOriginalPrice(tenantId, bundlePieces)
    updateData.originalPrice = originalPrice
    updateData.discountPercent = calculateDiscountPercent(originalPrice, bundlePrice)
  }

  const result = await db.collection('bundles').findOneAndUpdate(
    { tenantId, id },
    { $set: updateData },
    { returnDocument: 'after' }
  )

  return result as unknown as Bundle | null
}

/**
 * Delete a bundle
 */
export async function deleteBundle(
  tenantId: string,
  id: string
): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.collection('bundles').deleteOne({ tenantId, id })
  return result.deletedCount === 1
}

/**
 * List bundles with filtering and pagination
 */
export async function listBundles(
  tenantId: string,
  options: BundleListOptions = {}
): Promise<{ items: Bundle[]; total: number; hasMore: boolean }> {
  const db = await getDatabase()

  const filter: Filter<BundleDbRecord> = { tenantId }

  if (options.status) {
    if (Array.isArray(options.status)) {
      filter.status = { $in: options.status }
    } else {
      filter.status = options.status
    }
  }

  const limit = Math.min(options.limit || 50, MAX_QUERY_LIMIT)
  const offset = options.offset || 0
  const sortBy = options.sortBy || 'createdAt'
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1

  const [items, total] = await Promise.all([
    db.collection('bundles')
      .find(filter as Filter<Document>)
      .sort({ [sortBy]: sortOrder })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection('bundles').countDocuments(filter as Filter<Document>),
  ])

  return {
    items: items as unknown as Bundle[],
    total,
    hasMore: offset + items.length < total,
  }
}

/**
 * List active bundles (for storefront)
 */
export async function listActiveBundles(
  tenantId: string,
  limit = 20
): Promise<Bundle[]> {
  const result = await listBundles(tenantId, {
    status: 'active',
    limit,
    sortBy: 'discountPercent',
    sortOrder: 'desc', // Best deals first
  })
  return result.items
}

/**
 * Get bundle with populated piece details (optimized with batch query)
 */
export async function getBundleWithPieces(
  tenantId: string,
  id: string
): Promise<BundleWithPieces | null> {
  const bundle = await getBundle(tenantId, id)
  if (!bundle) return null

  // Batch fetch all pieces (fixes N+1 query)
  const pieceIds = bundle.pieces.map(bp => bp.pieceId)
  const pieceMap = await getPiecesByIds(tenantId, pieceIds)

  const pieceDetails: BundleWithPieces['pieceDetails'] = []
  let isAvailable = true

  for (const bp of bundle.pieces) {
    const piece = pieceMap.get(bp.pieceId)
    if (piece) {
      pieceDetails.push({
        id: piece.id,
        name: piece.name,
        price: piece.price,
        stock: piece.stock,
        thumbnailUrl: undefined, // Would need to join with media
        quantity: bp.quantity,
      })

      // Check stock availability
      if (piece.stock !== undefined && piece.stock < bp.quantity) {
        isAvailable = false
      }
    } else {
      // Piece not found, bundle is not available
      isAvailable = false
    }
  }

  return {
    ...bundle,
    pieceDetails,
    isAvailable,
  }
}

/**
 * Get bundle with pieces by slug (for storefront)
 */
export async function getBundleWithPiecesBySlug(
  tenantId: string,
  slug: string
): Promise<BundleWithPieces | null> {
  const bundle = await getBundleBySlug(tenantId, slug)
  if (!bundle) return null

  return getBundleWithPieces(tenantId, bundle.id)
}

/**
 * Check if all pieces in a bundle are available (in stock)
 * Optimized with batch query to avoid N+1
 */
export async function getBundleAvailability(
  tenantId: string,
  id: string,
  quantity: number = 1
): Promise<{
  available: boolean
  unavailablePieces: { pieceId: string; required: number; available: number }[]
}> {
  const bundle = await getBundle(tenantId, id)
  if (!bundle) {
    return { available: false, unavailablePieces: [] }
  }

  // Batch fetch all pieces (fixes N+1)
  const pieceIds = bundle.pieces.map(bp => bp.pieceId)
  const pieceMap = await getPiecesByIds(tenantId, pieceIds)

  const unavailablePieces: { pieceId: string; required: number; available: number }[] = []

  for (const bp of bundle.pieces) {
    const piece = pieceMap.get(bp.pieceId)
    const required = bp.quantity * quantity

    if (!piece) {
      unavailablePieces.push({ pieceId: bp.pieceId, required, available: 0 })
    } else if (piece.stock !== undefined && piece.stock < required) {
      unavailablePieces.push({
        pieceId: bp.pieceId,
        required,
        available: piece.stock,
      })
    }
  }

  return {
    available: unavailablePieces.length === 0,
    unavailablePieces,
  }
}

/**
 * Decrement stock for all pieces in a bundle atomically
 * Uses MongoDB transactions to prevent race conditions and overselling
 * Called when bundle is purchased
 */
export async function decrementBundleStock(
  tenantId: string,
  bundleId: string,
  quantity: number = 1
): Promise<boolean> {
  const client = await getMongoClient()
  const db = await getDatabase()
  const bundle = await getBundle(tenantId, bundleId)
  if (!bundle) return false

  // Use a transaction to atomically decrement all pieces
  const session = client.startSession()

  try {
    let success = true

    await session.withTransaction(async () => {
      // Atomically update each piece's stock within the transaction
      // The stock check is part of the update query to prevent overselling
      for (const bp of bundle.pieces) {
        const decrementAmount = bp.quantity * quantity

        const result = await db.collection('pieces').updateOne(
          {
            tenantId,
            id: bp.pieceId,
            // Only decrement if there's enough stock
            $or: [
              { stock: { $gte: decrementAmount } },
              { stock: { $exists: false } }, // Unlimited stock
            ]
          },
          {
            $inc: { stock: -decrementAmount },
            $set: { updatedAt: new Date() },
          },
          { session }
        )

        // If a piece couldn't be decremented, mark as failed
        // The transaction will be aborted
        if (result.matchedCount === 0) {
          success = false
          throw new Error(`Insufficient stock for piece ${bp.pieceId}`)
        }
      }
    })

    return success
  } catch (error) {
    // Transaction was aborted due to insufficient stock
    console.error('Bundle stock decrement failed:', error)
    return false
  } finally {
    await session.endSession()
  }
}

/**
 * Count bundles for a tenant
 */
export async function countBundles(
  tenantId: string,
  status?: BundleStatus
): Promise<number> {
  const db = await getDatabase()
  const filter: Filter<BundleDbRecord> = { tenantId }
  if (status) filter.status = status
  return db.collection('bundles').countDocuments(filter as Filter<Document>)
}

/**
 * Get bundles containing a specific piece
 */
export async function getBundlesContainingPiece(
  tenantId: string,
  pieceId: string
): Promise<Bundle[]> {
  const db = await getDatabase()
  const bundles = await db.collection('bundles')
    .find({
      tenantId,
      'pieces.pieceId': pieceId,
    })
    .toArray()
  return bundles as unknown as Bundle[]
}

/**
 * Recalculate prices for bundles containing a piece
 * Call this when a piece's price changes
 */
export async function recalculateBundlesForPiece(
  tenantId: string,
  pieceId: string
): Promise<number> {
  const bundles = await getBundlesContainingPiece(tenantId, pieceId)
  let updated = 0

  for (const bundle of bundles) {
    const originalPrice = await calculateOriginalPrice(tenantId, bundle.pieces)
    const discountPercent = calculateDiscountPercent(originalPrice, bundle.bundlePrice)

    const db = await getDatabase()
    await db.collection('bundles').updateOne(
      { id: bundle.id },
      {
        $set: {
          originalPrice,
          discountPercent,
          updatedAt: new Date(),
        },
      }
    )
    updated++
  }

  return updated
}
