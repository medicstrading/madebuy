import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { Piece, CreatePieceInput, UpdatePieceInput, PieceFilters, ProductVariant } from '@madebuy/shared'

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

export async function listPieces(tenantId: string, filters?: PieceFilters): Promise<Piece[]> {
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

  const results = await db.collection('pieces')
    .find(query)
    .sort({ createdAt: -1 })
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
 * @param lowStockThreshold - Items with stock at or below this are considered low stock (default: 5)
 */
export async function getStockAlerts(
  tenantId: string,
  lowStockThreshold: number = 5
): Promise<StockAlert[]> {
  const db = await getDatabase()

  const alerts: StockAlert[] = []

  // Get all available pieces with stock tracking
  const pieces = await db.collection('pieces')
    .find({
      tenantId,
      status: 'available',
    })
    .toArray() as Piece[]

  for (const piece of pieces) {
    // Check variant-level stock
    if (piece.hasVariants && piece.variants) {
      for (const variant of piece.variants) {
        if (variant.stock !== undefined) {
          if (variant.stock === 0) {
            alerts.push({
              pieceId: piece.id,
              pieceName: piece.name,
              variantId: variant.id,
              variantOptions: variant.options,
              sku: variant.sku,
              stock: 0,
              alertType: 'out_of_stock',
            })
          } else if (variant.stock <= lowStockThreshold) {
            alerts.push({
              pieceId: piece.id,
              pieceName: piece.name,
              variantId: variant.id,
              variantOptions: variant.options,
              sku: variant.sku,
              stock: variant.stock,
              alertType: 'low_stock',
            })
          }
        }
      }
    } else {
      // Check piece-level stock
      if (piece.stock !== undefined) {
        if (piece.stock === 0) {
          alerts.push({
            pieceId: piece.id,
            pieceName: piece.name,
            stock: 0,
            alertType: 'out_of_stock',
          })
        } else if (piece.stock <= lowStockThreshold) {
          alerts.push({
            pieceId: piece.id,
            pieceName: piece.name,
            stock: piece.stock,
            alertType: 'low_stock',
          })
        }
      }
    }
  }

  // Sort: out of stock first, then by stock level ascending
  alerts.sort((a, b) => {
    if (a.alertType === 'out_of_stock' && b.alertType !== 'out_of_stock') return -1
    if (a.alertType !== 'out_of_stock' && b.alertType === 'out_of_stock') return 1
    return a.stock - b.stock
  })

  return alerts
}
