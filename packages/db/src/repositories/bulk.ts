import { getDatabase } from '../client'
import type { PieceStatus } from '@madebuy/shared'

/**
 * Bulk Operations Repository
 * Handles batch operations on pieces for efficiency
 */

export interface BulkOperationResult {
  success: boolean
  affected: number
  errors?: string[]
}

/**
 * Bulk update status for multiple pieces
 */
export async function bulkUpdateStatus(
  tenantId: string,
  pieceIds: string[],
  status: PieceStatus
): Promise<BulkOperationResult> {
  const db = await getDatabase()

  const result = await db.collection('pieces').updateMany(
    { tenantId, id: { $in: pieceIds } },
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    }
  )

  return {
    success: true,
    affected: result.modifiedCount,
  }
}

/**
 * Bulk delete pieces
 */
export async function bulkDelete(
  tenantId: string,
  pieceIds: string[]
): Promise<BulkOperationResult> {
  const db = await getDatabase()

  const result = await db.collection('pieces').deleteMany({
    tenantId,
    id: { $in: pieceIds },
  })

  return {
    success: true,
    affected: result.deletedCount,
  }
}

/**
 * Bulk update prices (apply percentage or fixed adjustment)
 */
export async function bulkUpdatePrices(
  tenantId: string,
  pieceIds: string[],
  adjustment: {
    type: 'percentage' | 'fixed'
    value: number // Percentage (e.g., 10 for 10%) or fixed amount
    direction: 'increase' | 'decrease'
  }
): Promise<BulkOperationResult> {
  const db = await getDatabase()

  // For complex updates, we need to update each piece individually
  const pieces = await db.collection('pieces')
    .find({ tenantId, id: { $in: pieceIds }, price: { $exists: true, $ne: null } })
    .toArray()

  let affected = 0
  const errors: string[] = []

  for (const piece of pieces) {
    let newPrice: number
    const currentPrice = piece.price as number

    if (adjustment.type === 'percentage') {
      const change = currentPrice * (adjustment.value / 100)
      newPrice = adjustment.direction === 'increase'
        ? currentPrice + change
        : currentPrice - change
    } else {
      newPrice = adjustment.direction === 'increase'
        ? currentPrice + adjustment.value
        : currentPrice - adjustment.value
    }

    // Ensure price doesn't go negative
    newPrice = Math.max(0, Math.round(newPrice * 100) / 100)

    try {
      await db.collection('pieces').updateOne(
        { tenantId, id: piece.id },
        { $set: { price: newPrice, updatedAt: new Date() } }
      )
      affected++
    } catch (error) {
      errors.push(`Failed to update piece ${piece.id}`)
    }
  }

  return {
    success: errors.length === 0,
    affected,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Bulk update stock
 */
export async function bulkUpdateStock(
  tenantId: string,
  pieceIds: string[],
  stock: number | 'unlimited'
): Promise<BulkOperationResult> {
  const db = await getDatabase()

  const updateValue = stock === 'unlimited' ? null : stock

  const result = await db.collection('pieces').updateMany(
    { tenantId, id: { $in: pieceIds } },
    {
      $set: {
        stock: updateValue,
        updatedAt: new Date(),
      },
    }
  )

  return {
    success: true,
    affected: result.modifiedCount,
  }
}

/**
 * Bulk update category
 */
export async function bulkUpdateCategory(
  tenantId: string,
  pieceIds: string[],
  category: string
): Promise<BulkOperationResult> {
  const db = await getDatabase()

  const result = await db.collection('pieces').updateMany(
    { tenantId, id: { $in: pieceIds } },
    {
      $set: {
        category,
        updatedAt: new Date(),
      },
    }
  )

  return {
    success: true,
    affected: result.modifiedCount,
  }
}

/**
 * Bulk add tags
 */
export async function bulkAddTags(
  tenantId: string,
  pieceIds: string[],
  tags: string[]
): Promise<BulkOperationResult> {
  const db = await getDatabase()

  const result = await db.collection('pieces').updateMany(
    { tenantId, id: { $in: pieceIds } },
    {
      $addToSet: { tags: { $each: tags } },
      $set: { updatedAt: new Date() },
    }
  )

  return {
    success: true,
    affected: result.modifiedCount,
  }
}

/**
 * Bulk remove tags
 */
export async function bulkRemoveTags(
  tenantId: string,
  pieceIds: string[],
  tags: string[]
): Promise<BulkOperationResult> {
  const db = await getDatabase()

  const result = await db.collection('pieces').updateMany(
    { tenantId, id: { $in: pieceIds } },
    {
      $pull: { tags: { $in: tags } } as any,
      $set: { updatedAt: new Date() },
    }
  )

  return {
    success: true,
    affected: result.modifiedCount,
  }
}

/**
 * Bulk toggle featured status
 */
export async function bulkSetFeatured(
  tenantId: string,
  pieceIds: string[],
  isFeatured: boolean
): Promise<BulkOperationResult> {
  const db = await getDatabase()

  const result = await db.collection('pieces').updateMany(
    { tenantId, id: { $in: pieceIds } },
    {
      $set: {
        isFeatured,
        updatedAt: new Date(),
      },
    }
  )

  return {
    success: true,
    affected: result.modifiedCount,
  }
}

/**
 * Bulk toggle website publish status
 */
export async function bulkSetPublished(
  tenantId: string,
  pieceIds: string[],
  isPublished: boolean
): Promise<BulkOperationResult> {
  const db = await getDatabase()

  const result = await db.collection('pieces').updateMany(
    { tenantId, id: { $in: pieceIds } },
    {
      $set: {
        isPublishedToWebsite: isPublished,
        updatedAt: new Date(),
      },
    }
  )

  return {
    success: true,
    affected: result.modifiedCount,
  }
}

/**
 * Export pieces as CSV-ready data
 */
export async function exportPieces(
  tenantId: string,
  pieceIds?: string[] // If not provided, export all
): Promise<any[]> {
  const db = await getDatabase()

  const query: any = { tenantId }
  if (pieceIds && pieceIds.length > 0) {
    query.id = { $in: pieceIds }
  }

  const pieces = await db.collection('pieces')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  // Transform to flat CSV-friendly format
  return pieces.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    price: p.price || '',
    currency: p.currency || 'AUD',
    stock: p.stock ?? 'unlimited',
    status: p.status,
    category: p.category || '',
    tags: (p.tags || []).join(', '),
    materials: (p.materials || []).join(', '),
    techniques: (p.techniques || []).join(', '),
    dimensions: p.dimensions || '',
    weight: p.weight || '',
    isFeatured: p.isFeatured ? 'Yes' : 'No',
    isPublished: p.isPublishedToWebsite ? 'Yes' : 'No',
    createdAt: p.createdAt?.toISOString() || '',
    updatedAt: p.updatedAt?.toISOString() || '',
  }))
}

/**
 * Get bulk operation stats
 */
export async function getBulkStats(
  tenantId: string,
  pieceIds: string[]
): Promise<{
  total: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
  priceRange: { min: number; max: number; avg: number }
}> {
  const db = await getDatabase()

  const pieces = await db.collection('pieces')
    .find({ tenantId, id: { $in: pieceIds } })
    .toArray()

  const byStatus: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  const prices: number[] = []

  for (const piece of pieces) {
    // Count by status
    byStatus[piece.status] = (byStatus[piece.status] || 0) + 1

    // Count by category
    const cat = piece.category || 'Uncategorized'
    byCategory[cat] = (byCategory[cat] || 0) + 1

    // Collect prices
    if (typeof piece.price === 'number') {
      prices.push(piece.price)
    }
  }

  return {
    total: pieces.length,
    byStatus,
    byCategory,
    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
      avg: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    },
  }
}
