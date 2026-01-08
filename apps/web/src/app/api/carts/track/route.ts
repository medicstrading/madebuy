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

    // Don't track empty carts
    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, tracked: false })
    }

    const sessionId = getSessionId()

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
