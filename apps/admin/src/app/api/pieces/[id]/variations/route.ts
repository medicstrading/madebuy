/**
 * Piece Variations API
 * CRUD operations for product variations and variant combinations
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { pieces, variants } from '@madebuy/db'
import type { ProductVariation, VariantCombination } from '@madebuy/shared'
import { nanoid } from 'nanoid'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/pieces/[id]/variations
 * Get all variations and variant combinations for a piece
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    // Get the piece to retrieve variation definitions
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Get all variant combinations
    const combinations = await variants.listVariants(tenant.id, pieceId)

    return NextResponse.json({
      variations: piece.variations || [],
      combinations,
      hasVariations: piece.hasVariations || false,
    })
  } catch (error) {
    console.error('Get variations error:', error)
    return NextResponse.json(
      { error: 'Failed to get variations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pieces/[id]/variations
 * Create or update variations for a piece
 *
 * Body: {
 *   variations: ProductVariation[],
 *   generateCombinations?: boolean,  // Auto-generate all variant combinations
 *   combinations?: VariantCombination[]  // Manual combinations
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      variations = [],
      generateCombinations = false,
      combinations = [],
    } = body

    // Add IDs to variations and their options if not present
    const variationsWithIds: ProductVariation[] = variations.map(
      (v: Omit<ProductVariation, 'id'> & { id?: string }) => ({
        ...v,
        id: v.id || nanoid(),
        options: v.options.map((opt: any) => ({
          ...opt,
          id: opt.id || nanoid(),
        })),
      })
    )

    // Update piece with variations
    await pieces.updatePiece(tenant.id, pieceId, {
      variations: variationsWithIds,
      hasVariations: variationsWithIds.length > 0,
    })

    // Delete existing combinations
    await variants.deleteAllVariants(tenant.id, pieceId)

    let newCombinations: VariantCombination[] = []

    if (generateCombinations && variationsWithIds.length > 0) {
      // Auto-generate all possible combinations
      const baseSku = piece.name
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
      const generated = variants.generateCombinations(
        variationsWithIds,
        piece.price || 0,
        baseSku
      )
      newCombinations = await variants.bulkCreateVariants(
        tenant.id,
        pieceId,
        generated
      )
    } else if (combinations.length > 0) {
      // Use manually provided combinations
      newCombinations = await variants.bulkCreateVariants(
        tenant.id,
        pieceId,
        combinations.map((c: any) => ({
          options: c.options,
          sku: c.sku,
          price: c.price,
          stock: c.stock || 0,
          mediaId: c.mediaId,
        }))
      )
    }

    return NextResponse.json({
      variations: variationsWithIds,
      combinations: newCombinations,
    })
  } catch (error) {
    console.error('Create variations error:', error)
    return NextResponse.json(
      { error: 'Failed to create variations' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/pieces/[id]/variations
 * Update a specific variant combination
 *
 * Body: {
 *   variantId: string,
 *   updates: { sku?, price?, stock?, mediaId? }
 * }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    const { variantId, updates } = await request.json()

    if (!variantId) {
      return NextResponse.json(
        { error: 'variantId is required' },
        { status: 400 }
      )
    }

    // Validate SKU uniqueness if updating SKU
    if (updates.sku) {
      const isUnique = await variants.isSkuUnique(
        tenant.id,
        updates.sku,
        variantId
      )
      if (!isUnique) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        )
      }
    }

    const success = await variants.updateVariant(
      tenant.id,
      pieceId,
      variantId,
      updates
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      )
    }

    const updatedVariant = await variants.getVariant(
      tenant.id,
      pieceId,
      variantId
    )

    return NextResponse.json({ variant: updatedVariant })
  } catch (error) {
    console.error('Update variation error:', error)
    return NextResponse.json(
      { error: 'Failed to update variation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/pieces/[id]/variations
 * Delete all variations and combinations, or a specific combination
 *
 * Query params:
 * - variantId: Delete specific variant combination
 * - all: Delete all variations (set to 'true')
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id
    const { searchParams } = new URL(request.url)
    const variantId = searchParams.get('variantId')
    const deleteAll = searchParams.get('all') === 'true'

    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    if (deleteAll) {
      // Delete all variations from piece and all combinations
      await pieces.updatePiece(tenant.id, pieceId, {
        variations: [],
        hasVariations: false,
      })
      const deletedCount = await variants.deleteAllVariants(tenant.id, pieceId)
      return NextResponse.json({ success: true, deletedCount })
    }

    if (variantId) {
      // Delete specific variant combination
      const success = await variants.deleteVariant(
        tenant.id,
        pieceId,
        variantId
      )
      if (!success) {
        return NextResponse.json(
          { error: 'Variant not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Specify variantId or all=true' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Delete variations error:', error)
    return NextResponse.json(
      { error: 'Failed to delete variations' },
      { status: 500 }
    )
  }
}
