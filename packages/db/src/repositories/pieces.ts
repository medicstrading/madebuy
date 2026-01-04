import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { Piece, CreatePieceInput, UpdatePieceInput, PieceFilters, ProductVariant } from '@madebuy/shared'

// Maximum items to return in a single query (prevents memory issues)
const MAX_QUERY_LIMIT = 500

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

export async function createPiece(tenantId: string, data: CreatePieceInput): Promise<Piece> {
  const db = await getDatabase()

  // Generate IDs for variants if provided
  const variants: ProductVariant[] | undefined = data.variants?.map(v => ({
    ...v,
    id: nanoid(),
  }))

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
    price: data.price,
    currency: data.currency || 'AUD',
    cogs: undefined,
    stock: data.stock,
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
  return await db.collection('pieces').findOne({ tenantId, id }) as Piece | null
}

export async function getPieceBySlug(tenantId: string, slug: string): Promise<Piece | null> {
  const db = await getDatabase()
  return await db.collection('pieces').findOne({ tenantId, slug }) as Piece | null
}

export async function listPieces(
  tenantId: string,
  filters?: PieceFilters & { limit?: number; offset?: number }
): Promise<Piece[]> {
  const db = await getDatabase()

  const query: any = { tenantId }

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

  return results as any[]
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
    .toArray() as any[]
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
