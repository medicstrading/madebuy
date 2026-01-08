import { NextResponse } from 'next/server'
import { abandonedCarts } from '@madebuy/db'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

// Get or create a session ID for cart tracking
function getSessionId(): string {
  const cookieStore = cookies()
  let sessionId = cookieStore.get('cart_session')?.value

  if (!sessionId) {
    sessionId = nanoid()
    // Note: In production this cookie would be set properly
  }

  return sessionId
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantId, items, total, currency, customerEmail } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    const sessionId = getSessionId()

    // If this is an email-only update (checkout form email capture)
    if (customerEmail && (!items || items.length === 0)) {
      // Check if we have an existing cart for this session
      const existingCart = await abandonedCarts.getAbandonedCartBySession(tenantId, sessionId)

      if (existingCart) {
        // Update existing cart with email
        await abandonedCarts.upsertAbandonedCart(tenantId, {
          sessionId,
          customerEmail,
          items: existingCart.items,
          total: existingCart.total,
          currency: existingCart.currency,
        })
        return NextResponse.json({ success: true, tracked: true, sessionId, emailUpdated: true })
      }

      // No existing cart to update
      return NextResponse.json({ success: true, tracked: false, reason: 'no_cart_to_update' })
    }

    // Don't track empty carts (without email update)
    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, tracked: false })
    }

    // Transform cart items to match our schema
    const cartItems = items.map((item: any) => ({
      productId: item.id || item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      imageUrl: item.imageUrl || item.primaryImage?.variants?.thumb?.url,
    }))

    await abandonedCarts.upsertAbandonedCart(tenantId, {
      sessionId,
      customerEmail,
      items: cartItems,
      total: total || 0,
      currency: currency || 'AUD',
    })

    return NextResponse.json({ success: true, tracked: true, sessionId })
  } catch (error) {
    console.error('Error tracking cart:', error)
    return NextResponse.json(
      { error: 'Failed to track cart' },
      { status: 500 }
    )
  }
}
