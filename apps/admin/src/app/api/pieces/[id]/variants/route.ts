/**
 * Variants API Route
 * GET /api/pieces/[id]/variants - List all variants for a piece
 * POST /api/pieces/[id]/variants - Create single variant or bulk create variants
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { pieces, variants } from '@madebuy/db'
import type { CreateVariantInput } from '@madebuy/shared'

// Import error classes and validators from the variants namespace
const {
  NotFoundError,
  DuplicateSkuError,
  ValidationError,
  isValidVariantInput,
} = variants

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
  details?: Record<string, unknown>
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

  if (error instanceof DuplicateSkuError) {
    return errorResponse(error.message, error.code, 409, error.details)
  }

  if (error instanceof ValidationError) {
    return errorResponse(error.message, error.code, 400, error.details)
  }

  // Unknown error
  console.error('[variants API] Unexpected error:', error)
  return errorResponse(
    'An unexpected error occurred',
    'INTERNAL_ERROR',
    500
  )
}

/**
 * Validates an array of variant inputs
 * @returns Array of validation errors, empty if all valid
 */
function validateVariantInputs(
  data: unknown[]
): { index: number; errors: string[] }[] {
  const results: { index: number; errors: string[] }[] = []

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const errors: string[] = []

    if (!item || typeof item !== 'object') {
      errors.push('Invalid variant data')
      results.push({ index: i, errors })
      continue
    }

    const v = item as Record<string, unknown>

    // Check required fields
    if (typeof v.sku !== 'string' || v.sku.length < 3 || v.sku.length > 50) {
      errors.push('SKU must be a string between 3-50 characters')
    } else if (!/^[A-Za-z0-9_-]+$/.test(v.sku)) {
      errors.push('SKU must contain only alphanumeric characters, dashes, and underscores')
    }

    if (typeof v.stock !== 'number' || !Number.isInteger(v.stock) || v.stock < 0) {
      errors.push('Stock must be a non-negative integer')
    }

    if (!v.attributes || typeof v.attributes !== 'object' || Object.keys(v.attributes).length === 0) {
      errors.push('Attributes must be a non-empty object')
    }

    // Check optional fields
    if (v.price !== undefined && v.price !== null) {
      if (typeof v.price !== 'number' || v.price < 0) {
        errors.push('Price must be a non-negative number')
      }
    }

    if (v.compareAtPrice !== undefined && v.compareAtPrice !== null) {
      if (typeof v.compareAtPrice !== 'number' || v.compareAtPrice < 0) {
        errors.push('Compare at price must be a non-negative number')
      }
    }

    if (v.weight !== undefined && v.weight !== null) {
      if (typeof v.weight !== 'number' || v.weight < 0) {
        errors.push('Weight must be a non-negative number')
      }
    }

    if (v.lowStockThreshold !== undefined && v.lowStockThreshold !== null) {
      if (typeof v.lowStockThreshold !== 'number' || v.lowStockThreshold < 0) {
        errors.push('Low stock threshold must be a non-negative number')
      }
    }

    if (errors.length > 0) {
      results.push({ index: i, errors })
    }
  }

  return results
}

/**
 * GET /api/pieces/[id]/variants
 * List all variants for a piece
 *
 * Query params:
 * - includeDeleted: 'true' to include soft-deleted variants
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    // Get variants
    const variantList = await variants.getVariants(tenant.id, pieceId, includeDeleted)

    // Also get total stock for convenience
    const totalStock = await variants.getTotalStock(tenant.id, pieceId)

    return NextResponse.json({
      variants: variantList,
      totalStock,
      count: variantList.length,
      pieceId,
    })
  } catch (error) {
    console.error('[variants GET] Error:', error)
    return handleVariantError(error)
  }
}

/**
 * POST /api/pieces/[id]/variants
 * Create single variant or bulk create variants
 *
 * Body formats:
 * 1. Single variant: { sku, attributes, stock, ... }
 * 2. Bulk variants: { variants: [{ sku, attributes, stock, ... }, ...] }
 * 3. Generate from variations: { generateFromVariations: true, basePrice, baseSku }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    // Verify piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return errorResponse('Piece not found', 'PIECE_NOT_FOUND', 404)
    }

    const body = await request.json()

    // Case 1: Generate variants from piece variations
    if (body.generateFromVariations === true) {
      if (!piece.variations || piece.variations.length === 0) {
        return errorResponse(
          'Piece has no variations defined',
          'NO_VARIATIONS',
          400
        )
      }

      const basePrice = typeof body.basePrice === 'number' ? body.basePrice : (piece.price || 0)
      const baseSku = typeof body.baseSku === 'string' ? body.baseSku : piece.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')

      // Delete existing variants first if requested
      if (body.replaceExisting === true) {
        await variants.deleteAllVariants(tenant.id, pieceId)
      }

      // Generate combinations
      const generated = variants.generateCombinations(
        piece.variations,
        basePrice,
        baseSku
      )

      if (generated.length === 0) {
        return errorResponse(
          'No variant combinations could be generated',
          'NO_COMBINATIONS',
          400
        )
      }

      // Bulk create
      const created = await variants.bulkCreateVariants(tenant.id, pieceId, generated)

      return NextResponse.json(
        {
          variants: created,
          count: created.length,
          message: `Generated ${created.length} variant combinations`,
        },
        { status: 201 }
      )
    }

    // Case 2: Bulk create from array
    if (Array.isArray(body.variants)) {
      const variantInputs = body.variants as unknown[]

      if (variantInputs.length === 0) {
        return errorResponse('Variants array cannot be empty', 'EMPTY_VARIANTS', 400)
      }

      // Validate all inputs
      const validationErrors = validateVariantInputs(variantInputs)
      if (validationErrors.length > 0) {
        return errorResponse(
          'Validation failed for some variants',
          'VALIDATION_ERROR',
          400,
          { validationErrors }
        )
      }

      // Delete existing variants first if requested
      if (body.replaceExisting === true) {
        await variants.deleteAllVariants(tenant.id, pieceId)
      }

      // Create variants
      const created = await variants.bulkCreateVariants(
        tenant.id,
        pieceId,
        variantInputs as CreateVariantInput[]
      )

      return NextResponse.json(
        {
          variants: created,
          count: created.length,
          message: `Created ${created.length} variants`,
        },
        { status: 201 }
      )
    }

    // Case 3: Single variant creation
    if (!isValidVariantInput(body)) {
      return errorResponse(
        'Invalid variant data. Required: sku (3-50 alphanumeric), stock (non-negative integer), attributes (non-empty object)',
        'VALIDATION_ERROR',
        400
      )
    }

    const created = await variants.createVariant(tenant.id, pieceId, body)

    return NextResponse.json(
      {
        variant: created,
        message: 'Variant created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[variants POST] Error:', error)
    return handleVariantError(error)
  }
}
