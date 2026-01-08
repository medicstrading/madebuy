import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { abandonedCarts, discounts, tenants, getDatabase } from '@madebuy/db'

/**
 * POST /api/carts/recover
 * Recover an abandoned cart from email link
 *
 * Body: { cartId: string, tenantId: string }
 *
 * Returns: { success: boolean, items?: CartItem[], discountCode?: string, discountPercentage?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cartId, tenantId } = body

    if (!cartId || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get the abandoned cart
    const database = await getDatabase()
    const cart = await database.collection('abandoned_carts').findOne({
      id: cartId,
      tenantId,
    })

    if (!cart) {
      return NextResponse.json(
        { success: false, error: 'Cart not found or expired' },
        { status: 404 }
      )
    }

    // Check if already recovered
    if (cart.recovered) {
      return NextResponse.json(
        { success: false, error: 'This cart has already been recovered' },
        { status: 400 }
      )
    }

    // Get tenant for discount settings
    const tenant = await tenants.getTenantById(tenantId)

    // Check if cart was abandoned more than 24 hours ago (eligible for discount)
    const abandonedAt = new Date(cart.abandonedAt)
    const hoursAbandoned = (Date.now() - abandonedAt.getTime()) / (1000 * 60 * 60)
    const eligibleForDiscount = hoursAbandoned >= 24

    let discountCode: string | undefined
    let discountPercentage: number | undefined

    // Create discount code for long-abandoned carts
    if (eligibleForDiscount && tenant) {
      try {
        // Generate unique recovery discount code
        const code = `COMEBACK${nanoid(6).toUpperCase()}`
        discountPercentage = 10 // 10% off for recovered carts

        // Calculate expiry (7 days from now)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        // Create the discount
        await discounts.createDiscountCode(tenantId, {
          code,
          description: 'Abandoned cart recovery discount',
          type: 'percentage',
          value: discountPercentage,
          minOrderAmount: 0,
          maxUses: 1, // Single use
          expiresAt,
        })

        discountCode = code
        console.log(`[CART RECOVERY] Created discount code ${code} for cart ${cartId}`)
      } catch (error) {
        // Don't fail recovery if discount creation fails
        console.error('Failed to create recovery discount:', error)
      }
    }

    // Mark cart as recovered
    await abandonedCarts.markCartRecovered(tenantId, cart.sessionId)

    console.log(`[CART RECOVERY] Cart ${cartId} recovered for tenant ${tenantId}`)

    return NextResponse.json({
      success: true,
      items: cart.items,
      discountCode,
      discountPercentage,
    })

  } catch (error) {
    console.error('Cart recovery error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
