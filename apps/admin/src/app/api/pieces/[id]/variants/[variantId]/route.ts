/**
 * Single Variant API Route
 * GET /api/pieces/[id]/variants/[variantId] - Get single variant
 * PUT /api/pieces/[id]/variants/[variantId] - Update variant
 * DELETE /api/pieces/[id]/variants/[variantId] - Delete variant
 */

import { pieces, variants } from '@madebuy/db'
import type { UpdateVariantInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'

// Import error classes from the variants namespace
const { NotFoundError, DuplicateSkuError, ValidationError } = variants

interface RouteParams {
  params: { id: string; variantId: string }
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

  if (error instanceof DuplicateSkuError) {
    return errorResponse(error.message, error.code, 409, error.details)
  }

  if (error instanceof ValidationError) {
    return errorResponse(error.message, error.code, 400, error.details)
  }

  // Unknown error
  console.error('[variant API] Unexpected error:', error)
  return errorResponse('An unexpected error occurred', 'INTERNAL_ERROR', 500)
}

/**
 * Type guard for update input
 * Validates that provided fields have correct types
 */
function isValidUpdateInput(data: unknown): data is UpdateVariantInput {
  if (!data || typeof data !== 'object') return false

  const input = data as Record<string, unknown>

  // All fields are optional, but if provided must be correct type
  if (input.sku !== undefined) {
    if (typeof input.sku !== 'string') return false
    if (input.sku.length < 3 || input.sku.length > 50) return false
    if (!/^[A-Za-z0-9_-]+$/.test(input.sku)) return false
  }

  if (input.stock !== undefined) {
    if (
      typeof input.stock !== 'number' ||
      !Number.isInteger(input.stock) ||
      input.stock < 0
    ) {
      return false
    }
  }

  if (input.price !== undefined && input.price !== null) {
    if (typeof input.price !== 'number' || input.price < 0) return false
  }

  if (input.compareAtPrice !== undefined && input.compareAtPrice !== null) {
    if (typeof input.compareAtPrice !== 'number' || input.compareAtPrice < 0)
      return false
  }

  if (input.weight !== undefined && input.weight !== null) {
    if (typeof input.weight !== 'number' || input.weight < 0) return false
  }

  if (
    input.lowStockThreshold !== undefined &&
    input.lowStockThreshold !== null
  ) {
    if (
      typeof input.lowStockThreshold !== 'number' ||
      input.lowStockThreshold < 0
    )
      return false
  }

  if (input.isAvailable !== undefined) {
    if (typeof input.isAvailable !== 'boolean') return false
  }

  if (input.attributes !== undefined) {
    if (!input.attributes || typeof input.attributes !== 'object') return false
    if (Object.keys(input.attributes).length === 0) return false
  }

  return true
}

/**
 * GET /api/pieces/[id]/variants/[variantId]
 * Get a single variant by ID
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const { id: pieceId, variantId } = params

    // Verify piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return errorResponse('Piece not found', 'PIECE_NOT_FOUND', 404)
    }

    // Get variant (throws NotFoundError if not found)
    const variant = await variants.getVariantById(tenant.id, pieceId, variantId)

    return NextResponse.json({
      variant,
      pieceId,
    })
  } catch (error) {
    console.error('[variant GET] Error:', error)
    return handleVariantError(error)
  }
}

/**
 * PUT /api/pieces/[id]/variants/[variantId]
 * Update a variant (partial update)
 *
 * Body: UpdateVariantInput (all fields optional)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const { id: pieceId, variantId } = params

    // Verify piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return errorResponse('Piece not found', 'PIECE_NOT_FOUND', 404)
    }

    const body = await request.json()

    // Validate input
    if (!isValidUpdateInput(body)) {
      return errorResponse(
        'Invalid update data. Check field types and constraints.',
        'VALIDATION_ERROR',
        400,
        {
          constraints: {
            sku: '3-50 alphanumeric characters with dashes/underscores',
            stock: 'non-negative integer',
            price: 'non-negative number or null',
            compareAtPrice: 'non-negative number or null',
            weight: 'non-negative number or null (grams)',
            lowStockThreshold: 'non-negative number or null',
            isAvailable: 'boolean',
            attributes: 'non-empty object',
          },
        },
      )
    }

    // Check if there are any updates
    if (Object.keys(body).length === 0) {
      return errorResponse('No update fields provided', 'NO_UPDATES', 400)
    }

    // Update variant (throws NotFoundError or DuplicateSkuError if applicable)
    const updated = await variants.updateVariant(
      tenant.id,
      pieceId,
      variantId,
      body,
    )

    return NextResponse.json({
      variant: updated,
      message: 'Variant updated successfully',
    })
  } catch (error) {
    console.error('[variant PUT] Error:', error)
    return handleVariantError(error)
  }
}

/**
 * PATCH /api/pieces/[id]/variants/[variantId]
 * Partial update (alias for PUT for REST convention)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return PUT(request, { params })
}

/**
 * DELETE /api/pieces/[id]/variants/[variantId]
 * Delete a variant
 *
 * Query params:
 * - hard: 'true' to permanently delete instead of soft delete
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const { id: pieceId, variantId } = params

    // Verify piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return errorResponse('Piece not found', 'PIECE_NOT_FOUND', 404)
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    // Delete variant (throws NotFoundError if not found)
    await variants.deleteVariant(tenant.id, pieceId, variantId, hardDelete)

    return NextResponse.json({
      success: true,
      message: hardDelete
        ? 'Variant permanently deleted'
        : 'Variant soft deleted',
      variantId,
    })
  } catch (error) {
    console.error('[variant DELETE] Error:', error)
    return handleVariantError(error)
  }
}
