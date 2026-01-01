/**
 * Variants Repository
 * Manages product variation combinations with SKU, price, and stock
 */

import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { VariantCombination, ProductVariation, VariationOption } from '@madebuy/shared'

const COLLECTION = 'variant_combinations'

/**
 * Create a new variant combination
 */
export async function createVariant(
  tenantId: string,
  pieceId: string,
  variant: Omit<VariantCombination, 'id' | 'pieceId'>
): Promise<VariantCombination> {
  const db = await getDatabase()

  const newVariant: VariantCombination & { tenantId: string } = {
    id: nanoid(),
    pieceId,
    tenantId,
    ...variant,
  }

  await db.collection(COLLECTION).insertOne(newVariant)

  // Return without tenantId for the public interface
  const { tenantId: _, ...result } = newVariant
  return result
}

/**
 * List all variant combinations for a piece
 */
export async function listVariants(
  tenantId: string,
  pieceId: string
): Promise<VariantCombination[]> {
  const db = await getDatabase()

  const results = await db
    .collection(COLLECTION)
    .find({ tenantId, pieceId })
    .toArray()

  return results.map(({ tenantId: _, ...variant }) => variant as VariantCombination)
}

/**
 * Get a specific variant combination by ID
 */
export async function getVariant(
  tenantId: string,
  pieceId: string,
  variantId: string
): Promise<VariantCombination | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOne({
    tenantId,
    pieceId,
    id: variantId,
  })

  if (!result) return null

  const { tenantId: _, ...variant } = result as any
  return variant as VariantCombination
}

/**
 * Update a variant combination
 */
export async function updateVariant(
  tenantId: string,
  pieceId: string,
  variantId: string,
  updates: Partial<Omit<VariantCombination, 'id' | 'pieceId'>>
): Promise<boolean> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).updateOne(
    { tenantId, pieceId, id: variantId },
    { $set: updates }
  )

  return result.modifiedCount > 0
}

/**
 * Delete a variant combination
 */
export async function deleteVariant(
  tenantId: string,
  pieceId: string,
  variantId: string
): Promise<boolean> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).deleteOne({
    tenantId,
    pieceId,
    id: variantId,
  })

  return result.deletedCount > 0
}

/**
 * Delete all variant combinations for a piece
 */
export async function deleteAllVariants(
  tenantId: string,
  pieceId: string
): Promise<number> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).deleteMany({
    tenantId,
    pieceId,
  })

  return result.deletedCount
}

/**
 * Get a variant combination by SKU
 */
export async function getVariantBySku(
  tenantId: string,
  sku: string
): Promise<VariantCombination | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOne({
    tenantId,
    sku,
  })

  if (!result) return null

  const { tenantId: _, ...variant } = result as any
  return variant as VariantCombination
}

/**
 * Update variant stock (increment/decrement)
 */
export async function updateVariantStock(
  tenantId: string,
  variantId: string,
  quantity: number
): Promise<boolean> {
  const db = await getDatabase()

  // First, check current stock to prevent negative
  const current = await db.collection(COLLECTION).findOne({
    tenantId,
    id: variantId,
  })

  if (!current) return false

  const newStock = (current.stock || 0) + quantity
  if (newStock < 0) return false

  const result = await db.collection(COLLECTION).updateOne(
    { tenantId, id: variantId },
    { $set: { stock: newStock } }
  )

  return result.modifiedCount > 0
}

/**
 * Get variant combination by option values
 * Used to find the specific variant when customer selects options
 */
export async function getVariantByOptions(
  tenantId: string,
  pieceId: string,
  options: Record<string, string>
): Promise<VariantCombination | null> {
  const db = await getDatabase()

  // Build a query that matches all option keys and values
  const optionQuery: Record<string, string> = {}
  for (const [key, value] of Object.entries(options)) {
    optionQuery[`options.${key}`] = value
  }

  const result = await db.collection(COLLECTION).findOne({
    tenantId,
    pieceId,
    ...optionQuery,
  })

  if (!result) return null

  const { tenantId: _, ...variant } = result as any
  return variant as VariantCombination
}

/**
 * Generate all variant combinations from variation options
 * Used when setting up variations for a piece
 */
export function generateCombinations(
  variations: ProductVariation[],
  basePrice: number,
  baseSku: string
): Array<Omit<VariantCombination, 'id' | 'pieceId'>> {
  if (variations.length === 0) return []

  // Generate cartesian product of all options
  const combinations: Array<Omit<VariantCombination, 'id' | 'pieceId'>> = []

  function generate(
    index: number,
    currentOptions: Record<string, string>,
    priceAdjustment: number,
    skuParts: string[]
  ) {
    if (index === variations.length) {
      const sku = [baseSku, ...skuParts].filter(Boolean).join('-')
      combinations.push({
        options: { ...currentOptions },
        sku,
        price: basePrice + priceAdjustment,
        stock: 0, // Default to 0, seller must set stock
      })
      return
    }

    const variation = variations[index]
    for (const option of variation.options) {
      generate(
        index + 1,
        { ...currentOptions, [variation.name]: option.value },
        priceAdjustment + (option.priceAdjustment || 0),
        [...skuParts, option.sku || option.value.substring(0, 3).toUpperCase()]
      )
    }
  }

  generate(0, {}, 0, [])
  return combinations
}

/**
 * Bulk create variant combinations
 */
export async function bulkCreateVariants(
  tenantId: string,
  pieceId: string,
  variants: Array<Omit<VariantCombination, 'id' | 'pieceId'>>
): Promise<VariantCombination[]> {
  if (variants.length === 0) return []

  const db = await getDatabase()

  const newVariants = variants.map((variant) => ({
    id: nanoid(),
    pieceId,
    tenantId,
    ...variant,
  }))

  await db.collection(COLLECTION).insertMany(newVariants)

  return newVariants.map(({ tenantId: _, ...variant }) => variant as VariantCombination)
}

/**
 * Check if a SKU is unique for a tenant
 */
export async function isSkuUnique(
  tenantId: string,
  sku: string,
  excludeVariantId?: string
): Promise<boolean> {
  const db = await getDatabase()

  const query: any = { tenantId, sku }
  if (excludeVariantId) {
    query.id = { $ne: excludeVariantId }
  }

  const existing = await db.collection(COLLECTION).findOne(query)
  return !existing
}

/**
 * Get total stock across all variants for a piece
 */
export async function getTotalStock(
  tenantId: string,
  pieceId: string
): Promise<number> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).aggregate([
    { $match: { tenantId, pieceId } },
    { $group: { _id: null, totalStock: { $sum: '$stock' } } },
  ]).toArray()

  return result[0]?.totalStock || 0
}
