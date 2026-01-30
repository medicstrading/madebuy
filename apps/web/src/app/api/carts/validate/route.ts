import { NextRequest, NextResponse } from 'next/server'
import { pieces, tenants } from '@madebuy/db'

interface CartItem {
  pieceId: string
  variantId?: string
  quantity: number
}

interface ValidationResult {
  valid: boolean
  items: Array<{
    pieceId: string
    variantId?: string
    requested: number
    available: number
    valid: boolean
  }>
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { tenantId, items } = body as { tenantId: string; items: CartItem[] }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 },
      )
    }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'items must be an array' },
        { status: 400 },
      )
    }

    // Get tenant to verify it exists
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const results: ValidationResult['items'] = []

    for (const item of items) {
      const piece = await pieces.getPiece(tenantId, item.pieceId)

      if (!piece) {
        results.push({
          pieceId: item.pieceId,
          variantId: item.variantId,
          requested: item.quantity,
          available: 0,
          valid: false,
        })
        continue
      }

      let availableStock: number | null | undefined = null

      if (item.variantId) {
        const variant = piece.variants?.find((v) => v.id === item.variantId)
        availableStock = variant?.stock ?? null
      } else {
        availableStock = piece.stock ?? null
      }

      // null/undefined stock means unlimited
      const isValid =
        availableStock === null ||
        availableStock === undefined ||
        availableStock >= item.quantity

      results.push({
        pieceId: item.pieceId,
        variantId: item.variantId,
        requested: item.quantity,
        available: availableStock ?? -1, // -1 indicates unlimited
        valid: isValid,
      })
    }

    const allValid = results.every((r) => r.valid)

    return NextResponse.json({
      valid: allValid,
      items: results,
    })
  } catch (error) {
    console.error('Error validating cart:', error)
    return NextResponse.json(
      { error: 'Failed to validate cart' },
      { status: 500 },
    )
  }
}
