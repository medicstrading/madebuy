/**
 * Bulk Stock Update API Route
 * PATCH /api/pieces/[id]/variants/stock - Bulk update stock for multiple variants
 */

import { pieces, variants } from '@madebuy/db'
import type { BulkStockUpdateItem } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'

// Import error classes from the variants namespace
const { NotFoundError, ValidationError } = variants

interface RouteParams {
  params: { id: string }
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string
  code: string
  details?: Record<string, unknown>
}

/**
 * Creates a standardized error response
 */
function errorResponse(
  message: string,
  code: string,
  status: number,
  details?: Record<string, unknown>,
): NextResponse<ErrorResponse> {
  return NextResponse.json({ error: message, code, details }, { status })
}

/**
 * Handles variant-specific errors and returns appropriate HTTP responses
 */
function handleVariantError(error: unknown): NextResponse<ErrorResponse> {
  if (error instanceof NotFoundError) {
    return errorResponse(error.message, error.code, 404, error.details)
  }

  if (error instanceof ValidationError) {
    return errorResponse(error.message, error.code, 400, error.details)
  }

  // Unknown error
  console.error('[stock API] Unexpected error:', error)
  return errorResponse('An unexpected error occurred', 'INTERNAL_ERROR', 500)
}

/**
 * Type guard for bulk stock update input
 */
function _isValidBulkStockInput(
  data: unknown,
): data is { updates: BulkStockUpdateItem[] } {
  if (!data || typeof data !== 'object') return false

  const input = data as Record<string, unknown>

  if (!Array.isArray(input.updates)) return false

  for (const item of input.updates) {
    if (!item || typeof item !== 'object') return false

    const update = item as Record<string, unknown>

    if (typeof update.variantId !== 'string' || update.variantId.length === 0) {
      return false
    }

    if (
      typeof update.stock !== 'number' ||
      !Number.isInteger(update.stock) ||
      update.stock < 0
    ) {
      return false
    }
  }

  return true
}

/**
 * Validates each update item and returns detailed errors
 */
function validateBulkStockUpdates(
  updates: unknown[],
): { index: number; errors: string[] }[] {
  const results: { index: number; errors: string[] }[] = []

  for (let i = 0; i < updates.length; i++) {
    const item = updates[i]
    const errors: string[] = []

    if (!item || typeof item !== 'object') {
      errors.push('Invalid update item')
      results.push({ index: i, errors })
      continue
    }

    const update = item as Record<string, unknown>

    if (typeof update.variantId !== 'string' || update.variantId.length === 0) {
      errors.push('variantId is required and must be a non-empty string')
    }

    if (typeof update.stock !== 'number') {
      errors.push('stock is required and must be a number')
    } else if (!Number.isInteger(update.stock)) {
      errors.push('stock must be an integer')
    } else if (update.stock < 0) {
      errors.push('stock cannot be negative')
    }

    if (errors.length > 0) {
      results.push({ index: i, errors })
    }
  }

  return results
}

/**
 * PATCH /api/pieces/[id]/variants/stock
 * Bulk update stock for multiple variants
 *
 * Body: {
 *   updates: [
 *     { variantId: string, stock: number },
 *     ...
 *   ]
 * }
 *
 * Note: Stock is set to the absolute value, not incremented/decremented
 *
 * Response: {
 *   updated: number,      // Count of successfully updated variants
 *   failed: string[],     // Array of variant IDs that failed (not found)
 *   totalStock: number    // New total stock for the piece
 * }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    // Verify piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return errorResponse('Piece not found', 'PIECE_NOT_FOUND', 404)
    }

    const body = await request.json()

    // Validate input structure
    if (!body.updates || !Array.isArray(body.updates)) {
      return errorResponse(
        'Request body must contain an "updates" array',
        'INVALID_FORMAT',
        400,
        {
          expected: {
            updates: [
              { variantId: 'string', stock: 'number (non-negative integer)' },
            ],
          },
        },
      )
    }

    if (body.updates.length === 0) {
      return errorResponse(
        'Updates array cannot be empty',
        'EMPTY_UPDATES',
        400,
      )
    }

    // Validate each update
    const validationErrors = validateBulkStockUpdates(body.updates)
    if (validationErrors.length > 0) {
      return errorResponse(
        'Validation failed for some updates',
        'VALIDATION_ERROR',
        400,
        { validationErrors },
      )
    }

    // Check for duplicate variant IDs
    const variantIds = body.updates.map((u: BulkStockUpdateItem) => u.variantId)
    const uniqueIds = new Set(variantIds)
    if (uniqueIds.size !== variantIds.length) {
      const duplicates = variantIds.filter(
        (id: string, index: number) => variantIds.indexOf(id) !== index,
      )
      return errorResponse(
        'Duplicate variant IDs in updates',
        'DUPLICATE_VARIANT_IDS',
        400,
        { duplicates: [...new Set(duplicates)] },
      )
    }

    // Perform bulk update
    const result = await variants.bulkUpdateStock(tenant.id, body.updates)

    // Get new total stock
    const totalStock = await variants.getTotalStock(tenant.id, pieceId)

    // Determine response status
    // - 200: All updates succeeded
    // - 207: Partial success (some updates failed)
    const status = result.failed.length === 0 ? 200 : 207

    return NextResponse.json(
      {
        updated: result.updated,
        failed: result.failed,
        totalStock,
        message:
          result.failed.length === 0
            ? `Successfully updated stock for ${result.updated} variants`
            : `Updated ${result.updated} variants, ${result.failed.length} not found`,
      },
      { status },
    )
  } catch (error) {
    console.error('[stock PATCH] Error:', error)
    return handleVariantError(error)
  }
}

/**
 * GET /api/pieces/[id]/variants/stock
 * Get stock summary for all variants of a piece
 *
 * Response: {
 *   pieceId: string,
 *   totalStock: number,
 *   variants: [{ id, sku, stock, isLowStock }],
 *   lowStockCount: number,
 *   outOfStockCount: number
 * }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    // Verify piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return errorResponse('Piece not found', 'PIECE_NOT_FOUND', 404)
    }

    // Get all variants
    const allVariants = await variants.getVariants(tenant.id, pieceId)

    // Parse optional threshold from query
    const { searchParams } = new URL(request.url)
    const thresholdParam = searchParams.get('threshold')
    const defaultThreshold = thresholdParam ? parseInt(thresholdParam, 10) : 5

    // Calculate stats
    const totalStock = allVariants.reduce((sum, v) => sum + v.stock, 0)
    let lowStockCount = 0
    let outOfStockCount = 0

    const variantSummary = allVariants.map((v) => {
      const threshold = v.lowStockThreshold ?? defaultThreshold
      const isLowStock = v.stock > 0 && v.stock <= threshold
      const isOutOfStock = v.stock === 0

      if (isLowStock) lowStockCount++
      if (isOutOfStock) outOfStockCount++

      return {
        id: v.id,
        sku: v.sku,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        isLowStock,
        isOutOfStock,
        isAvailable: v.isAvailable,
      }
    })

    return NextResponse.json({
      pieceId,
      totalStock,
      variants: variantSummary,
      count: allVariants.length,
      lowStockCount,
      outOfStockCount,
    })
  } catch (error) {
    console.error('[stock GET] Error:', error)
    return handleVariantError(error)
  }
}
