/**
 * Variants Repository
 * Manages product variant combinations with SKU, price, stock, and attributes
 *
 * Enhanced implementation with:
 * - Typed errors for better error handling
 * - Input validation
 * - Bulk operations
 * - Low stock alerts
 */

import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  EnhancedProductVariant,
  CreateVariantInput,
  UpdateVariantInput,
  BulkStockUpdateItem,
  ProductVariation,
  VariantCombination,
} from '@madebuy/shared'

const COLLECTION = 'variant_combinations'

// ============================================================================
// CUSTOM ERROR TYPES
// ============================================================================

/**
 * Base error class for variant-related errors
 */
export class VariantError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'VariantError'
  }
}

/**
 * Thrown when a variant is not found
 */
export class NotFoundError extends VariantError {
  constructor(identifier: string, identifierType: 'id' | 'sku' = 'id') {
    super(
      `Variant not found with ${identifierType}: ${identifier}`,
      'VARIANT_NOT_FOUND',
      { identifier, identifierType }
    )
    this.name = 'NotFoundError'
  }
}

/**
 * Thrown when a SKU already exists for another variant
 */
export class DuplicateSkuError extends VariantError {
  constructor(sku: string) {
    super(
      `SKU already exists: ${sku}`,
      'DUPLICATE_SKU',
      { sku }
    )
    this.name = 'DuplicateSkuError'
  }
}

/**
 * Thrown when input validation fails
 */
export class ValidationError extends VariantError {
  constructor(message: string, field?: string, value?: unknown) {
    super(
      message,
      'VALIDATION_ERROR',
      { field, value }
    )
    this.name = 'ValidationError'
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * SKU format regex: alphanumeric characters, dashes, and underscores
 * Length: 3-50 characters
 */
const SKU_REGEX = /^[A-Za-z0-9_-]{3,50}$/

/**
 * Validates a SKU format
 * @throws ValidationError if SKU is invalid
 */
export function validateSku(sku: string): void {
  if (!sku || typeof sku !== 'string') {
    throw new ValidationError('SKU is required and must be a string', 'sku', sku)
  }

  if (!SKU_REGEX.test(sku)) {
    throw new ValidationError(
      'SKU must be 3-50 characters, alphanumeric with dashes and underscores only',
      'sku',
      sku
    )
  }
}

/**
 * Validates stock value
 * @throws ValidationError if stock is invalid
 */
export function validateStock(stock: number): void {
  if (typeof stock !== 'number' || !Number.isInteger(stock)) {
    throw new ValidationError('Stock must be an integer', 'stock', stock)
  }

  if (stock < 0) {
    throw new ValidationError('Stock cannot be negative', 'stock', stock)
  }
}

/**
 * Validates price value
 * @throws ValidationError if price is invalid
 */
export function validatePrice(price: number | null | undefined): void {
  if (price === null || price === undefined) {
    return // null/undefined means use base price
  }

  if (typeof price !== 'number') {
    throw new ValidationError('Price must be a number', 'price', price)
  }

  if (price < 0) {
    throw new ValidationError('Price cannot be negative', 'price', price)
  }
}

/**
 * Validates variant input for creation
 * @throws ValidationError if any field is invalid
 */
export function validateCreateInput(input: CreateVariantInput): void {
  validateSku(input.sku)
  validateStock(input.stock)
  validatePrice(input.price)
  validatePrice(input.compareAtPrice)

  if (!input.attributes || typeof input.attributes !== 'object') {
    throw new ValidationError('Attributes must be an object', 'attributes', input.attributes)
  }

  if (Object.keys(input.attributes).length === 0) {
    throw new ValidationError('Attributes cannot be empty', 'attributes', input.attributes)
  }

  if (input.weight !== undefined && input.weight !== null) {
    if (typeof input.weight !== 'number' || input.weight < 0) {
      throw new ValidationError('Weight must be a non-negative number', 'weight', input.weight)
    }
  }

  if (input.lowStockThreshold !== undefined && input.lowStockThreshold !== null) {
    if (typeof input.lowStockThreshold !== 'number' || input.lowStockThreshold < 0) {
      throw new ValidationError(
        'Low stock threshold must be a non-negative number',
        'lowStockThreshold',
        input.lowStockThreshold
      )
    }
  }
}

/**
 * Validates variant input for update (partial)
 * @throws ValidationError if any provided field is invalid
 */
export function validateUpdateInput(input: UpdateVariantInput): void {
  if (input.sku !== undefined) {
    validateSku(input.sku)
  }

  if (input.stock !== undefined) {
    validateStock(input.stock)
  }

  if (input.price !== undefined) {
    validatePrice(input.price)
  }

  if (input.compareAtPrice !== undefined) {
    validatePrice(input.compareAtPrice)
  }

  if (input.weight !== undefined && input.weight !== null) {
    if (typeof input.weight !== 'number' || input.weight < 0) {
      throw new ValidationError('Weight must be a non-negative number', 'weight', input.weight)
    }
  }

  if (input.lowStockThreshold !== undefined && input.lowStockThreshold !== null) {
    if (typeof input.lowStockThreshold !== 'number' || input.lowStockThreshold < 0) {
      throw new ValidationError(
        'Low stock threshold must be a non-negative number',
        'lowStockThreshold',
        input.lowStockThreshold
      )
    }
  }
}

/**
 * Type guard to check if input is a valid CreateVariantInput
 */
export function isValidVariantInput(data: unknown): data is CreateVariantInput {
  if (!data || typeof data !== 'object') return false

  const input = data as Record<string, unknown>

  // Required fields
  if (typeof input.sku !== 'string') return false
  if (typeof input.stock !== 'number') return false
  if (!input.attributes || typeof input.attributes !== 'object') return false

  // Validate SKU format
  if (!SKU_REGEX.test(input.sku)) return false

  // Validate stock
  if (!Number.isInteger(input.stock) || input.stock < 0) return false

  // Validate optional fields if present
  if (input.price !== undefined && input.price !== null) {
    if (typeof input.price !== 'number' || input.price < 0) return false
  }

  if (input.compareAtPrice !== undefined && input.compareAtPrice !== null) {
    if (typeof input.compareAtPrice !== 'number' || input.compareAtPrice < 0) return false
  }

  if (input.weight !== undefined && input.weight !== null) {
    if (typeof input.weight !== 'number' || input.weight < 0) return false
  }

  if (input.lowStockThreshold !== undefined && input.lowStockThreshold !== null) {
    if (typeof input.lowStockThreshold !== 'number' || input.lowStockThreshold < 0) return false
  }

  return true
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Database document shape for variant (includes tenantId and _id)
 */
interface VariantDocument extends Omit<EnhancedProductVariant, 'createdAt' | 'updatedAt'> {
  tenantId: string
  _id?: unknown
  createdAt: Date
  updatedAt: Date
}

/**
 * Strips internal fields from variant before returning
 */
function sanitizeVariant(doc: VariantDocument): EnhancedProductVariant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, tenantId, ...variant } = doc
  return variant
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all variants for a piece
 * @param tenantId - Tenant identifier
 * @param pieceId - Piece identifier
 * @param includeDeleted - Include soft-deleted variants (default: false)
 */
export async function getVariants(
  tenantId: string,
  pieceId: string,
  includeDeleted = false
): Promise<EnhancedProductVariant[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId, pieceId }
  if (!includeDeleted) {
    query.isDeleted = { $ne: true }
  }

  const results = await db
    .collection(COLLECTION)
    .find(query)
    .sort({ createdAt: 1 })
    .toArray()

  return results.map((doc) => sanitizeVariant(doc as VariantDocument))
}

/**
 * Get a single variant by ID
 * @param tenantId - Tenant identifier
 * @param pieceId - Piece identifier
 * @param variantId - Variant identifier
 * @throws NotFoundError if variant doesn't exist
 */
export async function getVariantById(
  tenantId: string,
  pieceId: string,
  variantId: string
): Promise<EnhancedProductVariant> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOne({
    tenantId,
    pieceId,
    id: variantId,
    isDeleted: { $ne: true },
  })

  if (!result) {
    throw new NotFoundError(variantId, 'id')
  }

  return sanitizeVariant(result as VariantDocument)
}

/**
 * Get a variant by SKU (unique across tenant)
 * @param tenantId - Tenant identifier
 * @param sku - Stock Keeping Unit
 * @returns Variant or null if not found
 */
export async function getVariantBySku(
  tenantId: string,
  sku: string
): Promise<EnhancedProductVariant | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOne({
    tenantId,
    sku,
    isDeleted: { $ne: true },
  })

  if (!result) {
    return null
  }

  return sanitizeVariant(result as VariantDocument)
}

/**
 * Create a new variant
 * @param tenantId - Tenant identifier
 * @param pieceId - Piece identifier
 * @param data - Variant data
 * @throws DuplicateSkuError if SKU already exists
 * @throws ValidationError if input is invalid
 */
export async function createVariant(
  tenantId: string,
  pieceId: string,
  data: CreateVariantInput
): Promise<EnhancedProductVariant> {
  // Validate input
  validateCreateInput(data)

  // Check SKU uniqueness
  const existing = await getVariantBySku(tenantId, data.sku)
  if (existing) {
    throw new DuplicateSkuError(data.sku)
  }

  const db = await getDatabase()
  const now = new Date()

  const newVariant = {
    id: nanoid(),
    pieceId,
    tenantId,
    sku: data.sku,
    attributes: data.attributes,
    price: data.price ?? null,
    compareAtPrice: data.compareAtPrice ?? null,
    stock: data.stock,
    lowStockThreshold: data.lowStockThreshold ?? null,
    isAvailable: data.isAvailable ?? true,
    weight: data.weight ?? null,
    barcode: data.barcode ?? null,
    imageId: data.imageId ?? null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }

  await db.collection(COLLECTION).insertOne(newVariant)

  console.log(`[variants] Created variant ${newVariant.id} (SKU: ${data.sku}) for piece ${pieceId}`)

  return sanitizeVariant(newVariant as VariantDocument)
}

/**
 * Update a variant
 * @param tenantId - Tenant identifier
 * @param pieceId - Piece identifier
 * @param variantId - Variant identifier
 * @param data - Partial update data
 * @throws NotFoundError if variant doesn't exist
 * @throws DuplicateSkuError if new SKU already exists
 * @throws ValidationError if input is invalid
 */
export async function updateVariant(
  tenantId: string,
  pieceId: string,
  variantId: string,
  data: UpdateVariantInput
): Promise<EnhancedProductVariant> {
  // Validate input
  validateUpdateInput(data)

  // Check variant exists
  const existing = await getVariantById(tenantId, pieceId, variantId)

  // If updating SKU, check uniqueness
  if (data.sku && data.sku !== existing.sku) {
    const skuExists = await getVariantBySku(tenantId, data.sku)
    if (skuExists) {
      throw new DuplicateSkuError(data.sku)
    }
  }

  const db = await getDatabase()

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date(),
  }

  await db.collection(COLLECTION).updateOne(
    { tenantId, pieceId, id: variantId },
    { $set: updateData }
  )

  console.log(`[variants] Updated variant ${variantId} for piece ${pieceId}`)

  return getVariantById(tenantId, pieceId, variantId)
}

/**
 * Delete a variant (soft delete by default)
 * @param tenantId - Tenant identifier
 * @param pieceId - Piece identifier
 * @param variantId - Variant identifier
 * @param hardDelete - Permanently delete instead of soft delete
 * @throws NotFoundError if variant doesn't exist
 */
export async function deleteVariant(
  tenantId: string,
  pieceId: string,
  variantId: string,
  hardDelete = false
): Promise<void> {
  const db = await getDatabase()

  // Check exists first
  const existing = await db.collection(COLLECTION).findOne({
    tenantId,
    pieceId,
    id: variantId,
    isDeleted: { $ne: true },
  })

  if (!existing) {
    throw new NotFoundError(variantId, 'id')
  }

  if (hardDelete) {
    await db.collection(COLLECTION).deleteOne({
      tenantId,
      pieceId,
      id: variantId,
    })
    console.log(`[variants] Hard deleted variant ${variantId} for piece ${pieceId}`)
  } else {
    await db.collection(COLLECTION).updateOne(
      { tenantId, pieceId, id: variantId },
      {
        $set: {
          isDeleted: true,
          isAvailable: false,
          updatedAt: new Date(),
        },
      }
    )
    console.log(`[variants] Soft deleted variant ${variantId} for piece ${pieceId}`)
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk create variants from an array of inputs
 * @param tenantId - Tenant identifier
 * @param pieceId - Piece identifier
 * @param variants - Array of variant inputs
 * @throws DuplicateSkuError if any SKU already exists
 * @throws ValidationError if any input is invalid
 */
export async function bulkCreateVariants(
  tenantId: string,
  pieceId: string,
  variants: CreateVariantInput[]
): Promise<EnhancedProductVariant[]> {
  if (variants.length === 0) return []

  // Validate all inputs first
  for (const variant of variants) {
    validateCreateInput(variant)
  }

  // Check for duplicate SKUs within the batch
  const skus = variants.map((v) => v.sku)
  const uniqueSkus = new Set(skus)
  if (uniqueSkus.size !== skus.length) {
    const duplicates = skus.filter((sku, index) => skus.indexOf(sku) !== index)
    throw new DuplicateSkuError(duplicates[0])
  }

  // Check for existing SKUs in database
  const db = await getDatabase()
  const existingSkus = await db
    .collection(COLLECTION)
    .find({
      tenantId,
      sku: { $in: skus },
      isDeleted: { $ne: true },
    })
    .project({ sku: 1 })
    .toArray()

  if (existingSkus.length > 0) {
    throw new DuplicateSkuError(existingSkus[0].sku)
  }

  const now = new Date()
  const newVariants = variants.map((data) => ({
    id: nanoid(),
    pieceId,
    tenantId,
    sku: data.sku,
    attributes: data.attributes,
    price: data.price ?? null,
    compareAtPrice: data.compareAtPrice ?? null,
    stock: data.stock,
    lowStockThreshold: data.lowStockThreshold ?? null,
    isAvailable: data.isAvailable ?? true,
    weight: data.weight ?? null,
    barcode: data.barcode ?? null,
    imageId: data.imageId ?? null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }))

  await db.collection(COLLECTION).insertMany(newVariants)

  console.log(`[variants] Bulk created ${newVariants.length} variants for piece ${pieceId}`)

  return newVariants.map((doc) => sanitizeVariant(doc as VariantDocument))
}

/**
 * Bulk update stock for multiple variants
 * @param tenantId - Tenant identifier
 * @param updates - Array of variant ID and stock pairs
 * @throws ValidationError if any stock value is invalid
 * @throws NotFoundError if any variant doesn't exist
 */
export async function bulkUpdateStock(
  tenantId: string,
  updates: BulkStockUpdateItem[]
): Promise<{ updated: number; failed: string[] }> {
  if (updates.length === 0) {
    return { updated: 0, failed: [] }
  }

  // Validate all stock values
  for (const update of updates) {
    validateStock(update.stock)
  }

  const db = await getDatabase()
  const now = new Date()

  // Use bulkWrite for efficient batch updates (O(1) instead of O(n) DB calls)
  const bulkOps = updates.map(update => ({
    updateOne: {
      filter: {
        tenantId,
        id: update.variantId,
        isDeleted: { $ne: true },
      },
      update: {
        $set: {
          stock: update.stock,
          isAvailable: update.stock > 0,
          updatedAt: now,
        },
      },
    },
  }))

  const result = await db.collection(COLLECTION).bulkWrite(bulkOps, { ordered: false })

  const updated = result.modifiedCount + result.upsertedCount
  const failed = updates
    .filter((_, i) => !result.modifiedCount)
    .map(u => u.variantId)
    .slice(0, updates.length - updated)

  console.log(`[variants] Bulk stock update: ${updated} updated via bulkWrite`)

  return { updated, failed }
}

/**
 * Delete all variants for a piece (hard delete)
 * @param tenantId - Tenant identifier
 * @param pieceId - Piece identifier
 * @returns Number of deleted variants
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

  console.log(`[variants] Deleted all ${result.deletedCount} variants for piece ${pieceId}`)

  return result.deletedCount
}

// ============================================================================
// INVENTORY QUERIES
// ============================================================================

/**
 * Get variants with low stock
 * @param tenantId - Tenant identifier
 * @param defaultThreshold - Default threshold if variant doesn't have one set
 * @returns Variants where stock <= threshold
 */
export async function getLowStockVariants(
  tenantId: string,
  defaultThreshold = 5
): Promise<EnhancedProductVariant[]> {
  const db = await getDatabase()

  // Match variants where:
  // 1. stock <= lowStockThreshold (if set), OR
  // 2. stock <= defaultThreshold (if lowStockThreshold not set)
  const results = await db
    .collection(COLLECTION)
    .find({
      tenantId,
      isDeleted: { $ne: true },
      $or: [
        // Has custom threshold and stock is at or below it
        {
          lowStockThreshold: { $ne: null },
          $expr: { $lte: ['$stock', '$lowStockThreshold'] },
        },
        // No custom threshold and stock is at or below default
        {
          lowStockThreshold: null,
          stock: { $lte: defaultThreshold },
        },
      ],
    })
    .sort({ stock: 1 })
    .toArray()

  return results.map((doc) => sanitizeVariant(doc as VariantDocument))
}

/**
 * Get out of stock variants
 * @param tenantId - Tenant identifier
 */
export async function getOutOfStockVariants(
  tenantId: string
): Promise<EnhancedProductVariant[]> {
  const db = await getDatabase()

  const results = await db
    .collection(COLLECTION)
    .find({
      tenantId,
      isDeleted: { $ne: true },
      stock: 0,
    })
    .toArray()

  return results.map((doc) => sanitizeVariant(doc as VariantDocument))
}

/**
 * Get total stock across all variants for a piece
 */
export async function getTotalStock(
  tenantId: string,
  pieceId: string
): Promise<number> {
  const db = await getDatabase()

  const result = await db
    .collection(COLLECTION)
    .aggregate([
      { $match: { tenantId, pieceId, isDeleted: { $ne: true } } },
      { $group: { _id: null, totalStock: { $sum: '$stock' } } },
    ])
    .toArray()

  return result[0]?.totalStock || 0
}

// ============================================================================
// SKU UTILITIES
// ============================================================================

/**
 * Check if a SKU is unique for a tenant
 * @param tenantId - Tenant identifier
 * @param sku - SKU to check
 * @param excludeVariantId - Exclude this variant from check (for updates)
 */
export async function isSkuUnique(
  tenantId: string,
  sku: string,
  excludeVariantId?: string
): Promise<boolean> {
  const db = await getDatabase()

  const query: Record<string, unknown> = {
    tenantId,
    sku,
    isDeleted: { $ne: true },
  }

  if (excludeVariantId) {
    query.id = { $ne: excludeVariantId }
  }

  const existing = await db.collection(COLLECTION).findOne(query)
  return !existing
}

/**
 * Update variant stock with increment/decrement
 * @param tenantId - Tenant identifier
 * @param variantId - Variant identifier
 * @param quantity - Quantity to add (positive) or subtract (negative)
 * @throws NotFoundError if variant doesn't exist
 * @throws ValidationError if resulting stock would be negative
 */
export async function updateVariantStock(
  tenantId: string,
  variantId: string,
  quantity: number
): Promise<boolean> {
  const db = await getDatabase()

  // Get current stock
  const current = await db.collection(COLLECTION).findOne({
    tenantId,
    id: variantId,
    isDeleted: { $ne: true },
  })

  if (!current) {
    throw new NotFoundError(variantId, 'id')
  }

  const newStock = (current.stock || 0) + quantity
  if (newStock < 0) {
    throw new ValidationError(
      'Resulting stock would be negative',
      'quantity',
      { currentStock: current.stock, change: quantity, resultingStock: newStock }
    )
  }

  const result = await db.collection(COLLECTION).updateOne(
    { tenantId, id: variantId },
    {
      $set: {
        stock: newStock,
        isAvailable: newStock > 0,
        updatedAt: new Date(),
      },
    }
  )

  return result.modifiedCount > 0
}

// ============================================================================
// VARIANT LOOKUP BY OPTIONS
// ============================================================================

/**
 * Get variant by attribute/option values
 * Used to find the specific variant when customer selects options
 */
export async function getVariantByOptions(
  tenantId: string,
  pieceId: string,
  options: Record<string, string>
): Promise<EnhancedProductVariant | null> {
  const db = await getDatabase()

  // Build a query that matches all option keys and values
  const optionQuery: Record<string, string> = {}
  for (const [key, value] of Object.entries(options)) {
    optionQuery[`attributes.${key}`] = value
  }

  const result = await db.collection(COLLECTION).findOne({
    tenantId,
    pieceId,
    isDeleted: { $ne: true },
    ...optionQuery,
  })

  if (!result) {
    return null
  }

  return sanitizeVariant(result as VariantDocument)
}

// ============================================================================
// COMBINATION GENERATION
// ============================================================================

/**
 * Generate all variant combinations from variation options
 * Used when setting up variations for a piece
 */
export function generateCombinations(
  variations: ProductVariation[],
  basePrice: number,
  baseSku: string
): CreateVariantInput[] {
  if (variations.length === 0) return []

  const combinations: CreateVariantInput[] = []

  function generate(
    index: number,
    currentAttributes: Record<string, string>,
    priceAdjustment: number,
    skuParts: string[]
  ) {
    if (index === variations.length) {
      const sku = [baseSku, ...skuParts].filter(Boolean).join('-')
      combinations.push({
        attributes: { ...currentAttributes },
        sku,
        price: basePrice + priceAdjustment,
        stock: 0, // Default to 0, seller must set stock
        isAvailable: false, // Not available until stock is set
      })
      return
    }

    const variation = variations[index]
    for (const option of variation.options) {
      generate(
        index + 1,
        { ...currentAttributes, [variation.name]: option.value },
        priceAdjustment + (option.priceAdjustment || 0),
        [...skuParts, option.sku || option.value.substring(0, 3).toUpperCase()]
      )
    }
  }

  generate(0, {}, 0, [])
  return combinations
}

// ============================================================================
// LEGACY COMPATIBILITY
// These functions maintain backward compatibility with VariantCombination type
// ============================================================================

/**
 * List variants (legacy compatibility)
 * @deprecated Use getVariants instead
 */
export async function listVariants(
  tenantId: string,
  pieceId: string
): Promise<VariantCombination[]> {
  const db = await getDatabase()

  const results = await db
    .collection(COLLECTION)
    .find({ tenantId, pieceId, isDeleted: { $ne: true } })
    .toArray()

  return results.map(({ tenantId: _, _id, ...variant }) => ({
    id: variant.id,
    pieceId: variant.pieceId,
    options: variant.attributes || variant.options || {},
    sku: variant.sku,
    price: variant.price || 0,
    stock: variant.stock || 0,
    mediaId: variant.imageId || variant.mediaId,
  }))
}

/**
 * Get variant (legacy compatibility)
 * @deprecated Use getVariantById instead
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
    isDeleted: { $ne: true },
  })

  if (!result) return null

  const { tenantId: _, _id, ...variant } = result as Record<string, unknown>
  return {
    id: variant.id as string,
    pieceId: variant.pieceId as string,
    options: (variant.attributes || variant.options || {}) as Record<string, string>,
    sku: variant.sku as string,
    price: (variant.price as number) || 0,
    stock: (variant.stock as number) || 0,
    mediaId: (variant.imageId || variant.mediaId) as string | undefined,
  }
}
