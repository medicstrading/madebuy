import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { Piece, CreatePieceInput, UpdatePieceInput, PieceFilters, ProductVariant, PieceMaterialUsage, Material } from '@madebuy/shared'
import { calculateCOGS, calculateProfitMargin } from '@madebuy/shared'

// Maximum items to return in a single query (prevents memory issues)
const MAX_QUERY_LIMIT = 500

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

export async function createPiece(
  tenantId: string,
  data: CreatePieceInput,
  materialsCatalog?: Material[]
): Promise<Piece> {
  const db = await getDatabase()

  // Generate IDs for variants if provided
  const variants: ProductVariant[] | undefined = data.variants?.map(v => ({
    ...v,
    id: nanoid(),
  }))

  // Calculate COGS if materials are provided
  let calculatedCOGS: number | undefined
  let profitMargin: number | undefined

  if (data.materialsUsed && data.materialsUsed.length > 0 && materialsCatalog) {
    calculatedCOGS = calculateCOGS(data.materialsUsed, materialsCatalog)
    profitMargin = calculateProfitMargin(data.price, calculatedCOGS) ?? undefined
  }

  const piece: Piece = {
    id: nanoid(),
    tenantId,
    name: data.name,
    slug: generateSlug(data.name),
    description: data.description,
    // Generic materials (new field)
    materials: data.materials || [],
    techniques: data.techniques || [],
    // Legacy fields (kept for migration)
    stones: data.stones || [],
    metals: data.metals || [],
    dimensions: data.dimensions,
    weight: data.weight,
    chainLength: data.chainLength,
    // Shipping dimensions
    shippingWeight: data.shippingWeight,
    shippingLength: data.shippingLength,
    shippingWidth: data.shippingWidth,
    shippingHeight: data.shippingHeight,
    price: data.price,
    currency: data.currency || 'AUD',
    // COGS tracking
    materialsUsed: data.materialsUsed,
    calculatedCOGS,
    profitMargin,
    cogs: calculatedCOGS, // Keep legacy field in sync
    stock: data.stock,
    lowStockThreshold: data.lowStockThreshold,
    // Variants
    hasVariants: data.hasVariants || false,
    variantOptions: data.variantOptions,
    variants,
    status: data.status || 'draft',
    mediaIds: [],
    isFeatured: data.isFeatured || false,
    category: data.category || 'Uncategorized',
    tags: data.tags || [],
    isPublishedToWebsite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('pieces').insertOne(piece)
  return piece
}

export async function getPiece(tenantId: string, id: string): Promise<Piece | null> {
  const db = await getDatabase()
  return await db.collection('pieces').findOne({ tenantId, id }) as unknown as Piece | null
}

export async function getPieceBySlug(tenantId: string, slug: string): Promise<Piece | null> {
  const db = await getDatabase()
  return await db.collection('pieces').findOne({ tenantId, slug }) as unknown as Piece | null
}

/**
 * Get multiple pieces by their IDs in a single query (batch lookup)
 */
export async function getPiecesByIds(
  tenantId: string,
  pieceIds: string[]
): Promise<Map<string, Piece>> {
  if (pieceIds.length === 0) {
    return new Map()
  }
  const db = await getDatabase()
  const pieceList = await db.collection('pieces')
    .find({ tenantId, id: { $in: pieceIds } })
    .toArray() as unknown as Piece[]
  return new Map(pieceList.map(p => [p.id, p]))
}

export async function listPieces(
  tenantId: string,
  filters?: PieceFilters & { limit?: number; offset?: number }
): Promise<Piece[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }

  if (filters?.category) {
    query.category = filters.category
  }

  if (filters?.isFeatured !== undefined) {
    query.isFeatured = filters.isFeatured
  }

  if (filters?.isPublishedToWebsite !== undefined) {
    query.isPublishedToWebsite = filters.isPublishedToWebsite
  }

  // Apply pagination with maximum limit
  const limit = Math.min(filters?.limit || MAX_QUERY_LIMIT, MAX_QUERY_LIMIT)
  const offset = filters?.offset || 0

  const results = await db.collection('pieces')
    .find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()

  return results as unknown as Piece[]
}

export async function updatePiece(
  tenantId: string,
  id: string,
  updates: UpdatePieceInput
): Promise<void> {
  const db = await getDatabase()
  await db.collection('pieces').updateOne(
    { tenantId, id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    }
  )
}

export async function deletePiece(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('pieces').deleteOne({ tenantId, id })
}

export async function addMediaToPiece(tenantId: string, pieceId: string, mediaId: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $addToSet: { mediaIds: mediaId },
      $set: { updatedAt: new Date() }
    }
  )
}

export async function removeMediaFromPiece(tenantId: string, pieceId: string, mediaId: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $pull: { mediaIds: mediaId } as any,
      $set: { updatedAt: new Date() }
    }
  )
}

export async function countPieces(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection('pieces').countDocuments({ tenantId })
}

export async function findPiecesByEtsyListingId(listingId: string): Promise<Piece[]> {
  const db = await getDatabase()
  return await db.collection('pieces')
    .find({ 'integrations.etsy.listingId': listingId })
    .toArray() as unknown as Piece[]
}

// Variant-specific functions

/**
 * Get a specific variant from a piece
 */
export async function getVariant(
  tenantId: string,
  pieceId: string,
  variantId: string
): Promise<ProductVariant | null> {
  const piece = await getPiece(tenantId, pieceId)
  if (!piece?.variants) return null
  return piece.variants.find(v => v.id === variantId) || null
}

/**
 * Update a specific variant's stock
 */
export async function updateVariantStock(
  tenantId: string,
  pieceId: string,
  variantId: string,
  stockChange: number
): Promise<boolean> {
  const db = await getDatabase()

  // Find the piece and variant
  const piece = await getPiece(tenantId, pieceId)
  if (!piece?.variants) return false

  const variantIndex = piece.variants.findIndex(v => v.id === variantId)
  if (variantIndex === -1) return false

  const variant = piece.variants[variantIndex]
  const currentStock = variant.stock ?? 0
  const newStock = currentStock + stockChange

  // Don't allow negative stock
  if (newStock < 0) return false

  // Update the variant's stock
  const result = await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $set: {
        [`variants.${variantIndex}.stock`]: newStock,
        [`variants.${variantIndex}.isAvailable`]: newStock > 0,
        updatedAt: new Date(),
      }
    }
  )

  return result.modifiedCount > 0
}

/**
 * Get available stock for a piece or variant
 * Returns the effective stock considering variant-level stock
 */
export async function getAvailableStock(
  tenantId: string,
  pieceId: string,
  variantId?: string
): Promise<number | undefined> {
  const piece = await getPiece(tenantId, pieceId)
  if (!piece) return undefined

  // If it's a variant product with a specific variant requested
  if (piece.hasVariants && variantId && piece.variants) {
    const variant = piece.variants.find(v => v.id === variantId)
    return variant?.stock
  }

  // Otherwise return the piece-level stock
  return piece.stock
}

/**
 * Check if a piece/variant has sufficient stock
 */
export async function hasStock(
  tenantId: string,
  pieceId: string,
  quantity: number,
  variantId?: string
): Promise<boolean> {
  const stock = await getAvailableStock(tenantId, pieceId, variantId)

  // undefined stock means unlimited
  if (stock === undefined) return true

  return stock >= quantity
}

/**
 * Stock alert item for dashboard
 */
export interface StockAlert {
  pieceId: string
  pieceName: string
  variantId?: string
  variantOptions?: Record<string, string>
  sku?: string
  stock: number
  alertType: 'out_of_stock' | 'low_stock'
}

/**
 * Get stock alerts for low and out-of-stock items
 * Uses aggregation pipeline for efficient server-side filtering
 * @param lowStockThreshold - Items with stock at or below this are considered low stock (default: 5)
 */
export async function getStockAlerts(
  tenantId: string,
  lowStockThreshold: number = 5
): Promise<StockAlert[]> {
  const db = await getDatabase()

  // Use aggregation pipeline to filter on server-side instead of fetching all pieces
  const pipeline = [
    // Match available pieces for this tenant
    { $match: { tenantId, status: 'available' } },
    // Project only needed fields
    {
      $project: {
        id: 1,
        name: 1,
        stock: 1,
        hasVariants: 1,
        variants: {
          $cond: {
            if: { $and: [{ $eq: ['$hasVariants', true] }, { $isArray: '$variants' }] },
            then: '$variants',
            else: []
          }
        }
      }
    },
    // Unwind variants (creates one doc per variant, or keeps original if no variants)
    {
      $facet: {
        // Pieces without variants - check piece-level stock
        pieceLevelAlerts: [
          { $match: { hasVariants: { $ne: true }, stock: { $exists: true, $lte: lowStockThreshold } } },
          {
            $project: {
              pieceId: '$id',
              pieceName: '$name',
              stock: 1,
              alertType: { $cond: { if: { $eq: ['$stock', 0] }, then: 'out_of_stock', else: 'low_stock' } }
            }
          }
        ],
        // Pieces with variants - check variant-level stock
        variantLevelAlerts: [
          { $match: { hasVariants: true } },
          { $unwind: '$variants' },
          { $match: { 'variants.stock': { $exists: true, $lte: lowStockThreshold } } },
          {
            $project: {
              pieceId: '$id',
              pieceName: '$name',
              variantId: '$variants.id',
              variantOptions: '$variants.options',
              sku: '$variants.sku',
              stock: '$variants.stock',
              alertType: { $cond: { if: { $eq: ['$variants.stock', 0] }, then: 'out_of_stock', else: 'low_stock' } }
            }
          }
        ]
      }
    },
    // Combine both result sets
    {
      $project: {
        alerts: { $concatArrays: ['$pieceLevelAlerts', '$variantLevelAlerts'] }
      }
    },
    { $unwind: '$alerts' },
    { $replaceRoot: { newRoot: '$alerts' } },
    // Sort: out of stock first, then by stock level ascending
    {
      $sort: {
        alertType: -1, // 'out_of_stock' > 'low_stock' alphabetically reversed
        stock: 1
      }
    }
  ]

  const results = await db.collection('pieces').aggregate(pipeline).toArray()

  return results as unknown as StockAlert[]
}

// ============================================================================
// COGS (Cost of Goods Sold) Functions
// ============================================================================

/**
 * Update piece's materialsUsed and recalculate COGS
 */
export async function updatePieceMaterialsUsed(
  tenantId: string,
  pieceId: string,
  materialsUsed: PieceMaterialUsage[],
  materialsCatalog: Material[]
): Promise<void> {
  const db = await getDatabase()

  // Get current piece for price
  const piece = await getPiece(tenantId, pieceId)
  if (!piece) {
    throw new Error(`Piece ${pieceId} not found`)
  }

  // Calculate new COGS
  const calculatedCOGS = calculateCOGS(materialsUsed, materialsCatalog)
  const profitMargin = calculateProfitMargin(piece.price, calculatedCOGS) ?? undefined

  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $set: {
        materialsUsed,
        calculatedCOGS,
        profitMargin,
        cogs: calculatedCOGS, // Keep legacy field in sync
        updatedAt: new Date(),
      }
    }
  )
}

/**
 * Recalculate COGS for a single piece using current material costs
 * Useful when material costs are updated
 */
export async function recalculatePieceCOGS(
  tenantId: string,
  pieceId: string,
  materialsCatalog: Material[]
): Promise<{ calculatedCOGS: number; profitMargin: number | undefined }> {
  const db = await getDatabase()

  const piece = await getPiece(tenantId, pieceId)
  if (!piece) {
    throw new Error(`Piece ${pieceId} not found`)
  }

  if (!piece.materialsUsed || piece.materialsUsed.length === 0) {
    return { calculatedCOGS: 0, profitMargin: undefined }
  }

  const calculatedCOGS = calculateCOGS(piece.materialsUsed, materialsCatalog)
  const profitMargin = calculateProfitMargin(piece.price, calculatedCOGS) ?? undefined

  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $set: {
        calculatedCOGS,
        profitMargin,
        cogs: calculatedCOGS, // Keep legacy field in sync
        updatedAt: new Date(),
      }
    }
  )

  return { calculatedCOGS, profitMargin }
}

/**
 * Recalculate COGS for all pieces that use a specific material
 * Call this when a material's costPerUnit is updated
 */
export async function recalculateCOGSForMaterial(
  tenantId: string,
  materialId: string,
  materialsCatalog: Material[]
): Promise<number> {
  const db = await getDatabase()

  // Find all pieces that use this material
  const piecesUsingMaterial = await db.collection('pieces')
    .find({
      tenantId,
      'materialsUsed.materialId': materialId
    })
    .toArray() as unknown as Piece[]

  let updatedCount = 0

  for (const piece of piecesUsingMaterial) {
    if (!piece.materialsUsed) continue

    const calculatedCOGS = calculateCOGS(piece.materialsUsed, materialsCatalog)
    const profitMargin = calculateProfitMargin(piece.price, calculatedCOGS) ?? undefined

    await db.collection('pieces').updateOne(
      { tenantId, id: piece.id },
      {
        $set: {
          calculatedCOGS,
          profitMargin,
          cogs: calculatedCOGS,
          updatedAt: new Date(),
        }
      }
    )
    updatedCount++
  }

  return updatedCount
}

/**
 * Get pieces with low profit margin
 * Useful for dashboard alerts
 */
export async function getLowMarginPieces(
  tenantId: string,
  marginThreshold: number = 30
): Promise<Piece[]> {
  const db = await getDatabase()

  const pieces = await db.collection('pieces')
    .find({
      tenantId,
      status: 'available',
      profitMargin: { $exists: true, $lt: marginThreshold, $ne: null }
    })
    .sort({ profitMargin: 1 })
    .toArray() as unknown as Piece[]

  return pieces
}

/**
 * Get pieces without COGS data (no materials tracked)
 */
export async function getPiecesWithoutCOGS(tenantId: string): Promise<Piece[]> {
  const db = await getDatabase()

  const pieces = await db.collection('pieces')
    .find({
      tenantId,
      $or: [
        { materialsUsed: { $exists: false } },
        { materialsUsed: { $size: 0 } },
        { materialsUsed: null }
      ]
    })
    .toArray() as unknown as Piece[]

  return pieces
}

// ============================================================================
// LOW STOCK ALERTS
// ============================================================================

/**
 * Low stock piece with threshold info for alerts
 */
export interface LowStockPiece {
  id: string
  name: string
  slug: string
  stock: number
  lowStockThreshold: number
  status: string
  category: string
  price?: number
  currency: string
}

/**
 * Get pieces that are at or below their low stock threshold
 * Only returns pieces that have an explicitly set threshold
 * @param tenantId - The tenant ID
 * @returns Array of pieces with low stock
 */
export async function getLowStockPieces(tenantId: string): Promise<LowStockPiece[]> {
  const db = await getDatabase()

  // Use aggregation to compare stock against each piece's threshold
  const pipeline = [
    // Match pieces for this tenant that have a threshold set and have finite stock
    {
      $match: {
        tenantId,
        lowStockThreshold: { $exists: true, $ne: null, $gt: 0 },
        stock: { $exists: true, $ne: null }
      }
    },
    // Add a field to check if stock is at or below threshold
    {
      $addFields: {
        isLowStock: { $lte: ['$stock', '$lowStockThreshold'] }
      }
    },
    // Only include pieces that are actually low on stock
    {
      $match: {
        isLowStock: true
      }
    },
    // Project only the fields we need
    {
      $project: {
        id: 1,
        name: 1,
        slug: 1,
        stock: 1,
        lowStockThreshold: 1,
        status: 1,
        category: 1,
        price: 1,
        currency: 1
      }
    },
    // Sort by stock level ascending (most urgent first)
    {
      $sort: { stock: 1 }
    }
  ]

  const results = await db.collection('pieces').aggregate(pipeline).toArray()

  return results as unknown as LowStockPiece[]
}

/**
 * Get pieces that need restocking, optionally filtered by status
 * Includes pieces below threshold or out of stock
 */
export async function getPiecesNeedingRestock(
  tenantId: string,
  options?: { status?: string; includeOutOfStock?: boolean }
): Promise<LowStockPiece[]> {
  const db = await getDatabase()

  const statusFilter = options?.status ? { status: options.status } : {}
  const includeOutOfStock = options?.includeOutOfStock ?? true

  const conditions: Record<string, unknown>[] = [
    // Pieces with threshold that are at or below it
    {
      lowStockThreshold: { $exists: true, $ne: undefined, $gt: 0 },
      stock: { $exists: true, $ne: undefined },
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }
  ]

  // Optionally include completely out of stock items (stock = 0)
  if (includeOutOfStock) {
    conditions.push({
      stock: 0
    })
  }

  const pipeline = [
    {
      $match: {
        tenantId,
        ...statusFilter,
        $or: conditions
      }
    },
    {
      $project: {
        id: 1,
        name: 1,
        slug: 1,
        stock: 1,
        lowStockThreshold: 1,
        status: 1,
        category: 1,
        price: 1,
        currency: 1
      }
    },
    { $sort: { stock: 1 } }
  ]

  const results = await db.collection('pieces').aggregate(pipeline).toArray()

  return results as unknown as LowStockPiece[]
}

/**
 * Check if a specific piece is below its low stock threshold
 * Returns null if no threshold is set
 */
export async function checkLowStock(
  tenantId: string,
  pieceId: string
): Promise<{ isLowStock: boolean; stock: number; threshold: number } | null> {
  const piece = await getPiece(tenantId, pieceId)

  if (!piece) return null

  // If no threshold set, return null (not tracking)
  if (piece.lowStockThreshold === undefined || piece.lowStockThreshold === null) {
    return null
  }

  // If stock is undefined (unlimited), it's not low
  if (piece.stock === undefined || piece.stock === null) {
    return { isLowStock: false, stock: -1, threshold: piece.lowStockThreshold }
  }

  return {
    isLowStock: piece.stock <= piece.lowStockThreshold,
    stock: piece.stock,
    threshold: piece.lowStockThreshold
  }
}

/**
 * Update low stock threshold for a piece
 */
export async function updateLowStockThreshold(
  tenantId: string,
  pieceId: string,
  threshold: number | null
): Promise<void> {
  const db = await getDatabase()

  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $set: {
        lowStockThreshold: threshold,
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Bulk update low stock thresholds for multiple pieces
 */
export async function bulkUpdateLowStockThresholds(
  tenantId: string,
  updates: Array<{ pieceId: string; threshold: number | null }>
): Promise<number> {
  const db = await getDatabase()

  const operations = updates.map(({ pieceId, threshold }) => ({
    updateOne: {
      filter: { tenantId, id: pieceId },
      update: {
        $set: {
          lowStockThreshold: threshold,
          updatedAt: new Date()
        }
      }
    }
  }))

  const result = await db.collection('pieces').bulkWrite(operations)
  return result.modifiedCount
}

/**
 * Decrement stock for a piece atomically
 * Returns true if successful, false if insufficient stock
 *
 * For unlimited stock (null/undefined), returns true without decrementing
 * to avoid setting stock to negative values.
 */
export async function decrementStock(
  tenantId: string,
  pieceId: string,
  quantity: number = 1
): Promise<boolean> {
  const db = await getDatabase()

  // First, check if the piece has unlimited stock (null/undefined)
  const piece = await db.collection('pieces').findOne(
    { tenantId, id: pieceId },
    { projection: { stock: 1 } }
  )

  if (!piece) {
    return false // Piece not found
  }

  // If stock is null or undefined (unlimited), don't decrement - just return success
  if (piece.stock === null || piece.stock === undefined) {
    return true
  }

  // Check if there's enough stock
  if (typeof piece.stock === 'number' && piece.stock < quantity) {
    return false // Insufficient stock
  }

  // Atomically decrement stock only if there's enough
  const result = await db.collection('pieces').updateOne(
    {
      tenantId,
      id: pieceId,
      stock: { $gte: quantity },
    },
    {
      $inc: { stock: -quantity },
      $set: { updatedAt: new Date() },
    }
  )

  return result.modifiedCount > 0
}

/**
 * Increment stock for a piece (e.g., for restocking or order cancellations)
 */
export async function incrementStock(
  tenantId: string,
  pieceId: string,
  quantity: number = 1
): Promise<void> {
  const db = await getDatabase()

  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $inc: { stock: quantity },
      $set: { updatedAt: new Date() },
    }
  )
}
