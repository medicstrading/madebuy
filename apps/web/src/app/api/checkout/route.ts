import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { pieces, media } from '@madebuy/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, items, customerInfo, shippingAddress, notes, successUrl, cancelUrl } = body

    if (!tenantId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify all pieces exist and are available
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    for (const item of items) {
      const piece = await pieces.getPiece(tenantId, item.pieceId)

      if (!piece) {
        return NextResponse.json(
          { error: `Piece ${item.pieceId} not found` },
          { status: 404 }
        )
      }

      if (piece.status !== 'available') {
        return NextResponse.json(
          { error: `${piece.name} is no longer available` },
          { status: 400 }
        )
      }

      if (piece.stock !== undefined && piece.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${piece.name}` },
          { status: 400 }
        )
      }

      // Fetch primary media if available
      let imageUrl: string | undefined
      if (piece.primaryMediaId) {
        const primaryMedia = await media.getMedia(tenantId, piece.primaryMediaId)
        if (primaryMedia) {
          imageUrl = primaryMedia.variants.large?.url || primaryMedia.variants.original.url
        }
      } else if (piece.mediaIds.length > 0) {
        const firstMedia = await media.getMedia(tenantId, piece.mediaIds[0])
        if (firstMedia) {
          imageUrl = firstMedia.variants.large?.url || firstMedia.variants.original.url
        }
      }

      // Create Stripe line item
      lineItems.push({
        price_data: {
          currency: (item.currency || piece.currency || 'aud').toLowerCase(),
          product_data: {
            name: piece.name,
            description: piece.description || undefined,
            images: imageUrl ? [imageUrl] : undefined,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerInfo.email,
      shipping_address_collection: {
        allowed_countries: ['AU', 'NZ', 'US', 'GB'],
      },
      metadata: {
        tenantId,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone || '',
        shippingAddressLine1: shippingAddress.line1,
        shippingAddressLine2: shippingAddress.line2 || '',
        shippingCity: shippingAddress.city,
        shippingState: shippingAddress.state,
        shippingPostalCode: shippingAddress.postalCode,
        shippingCountry: shippingAddress.country,
        notes: notes || '',
        items: JSON.stringify(items),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
