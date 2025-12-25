import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { orders, pieces, tenants } from '@madebuy/db'
import type { CreateOrderInput } from '@madebuy/shared'
import { sendOrderConfirmation } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Extract metadata
      const tenantId = session.metadata?.tenantId
      const itemsJson = session.metadata?.items
      const customerName = session.metadata?.customerName
      const customerPhone = session.metadata?.customerPhone
      const notes = session.metadata?.notes

      if (!tenantId || !itemsJson) {
        console.error('Missing required metadata in session')
        return NextResponse.json(
          { error: 'Missing metadata' },
          { status: 400 }
        )
      }

      const items = JSON.parse(itemsJson)

      // Build order items with full piece data
      const orderItems = []
      for (const item of items) {
        const piece = await pieces.getPiece(tenantId, item.pieceId)
        if (!piece) {
          console.error(`Piece ${item.pieceId} not found for order`)
          continue
        }

        orderItems.push({
          pieceId: piece.id,
          name: piece.name,
          price: item.price,
          quantity: item.quantity,
          category: piece.category,
          description: piece.description,
        })

        // Update stock if tracked
        if (piece.stock !== undefined) {
          const newStock = Math.max(0, piece.stock - item.quantity)
          await pieces.updatePiece(tenantId, piece.id, { stock: newStock })
        }
      }

      // Get shipping address from session
      const shippingDetails = session.shipping_details
      const shippingAddress = shippingDetails?.address
        ? {
            line1: shippingDetails.address.line1 || '',
            line2: shippingDetails.address.line2 || '',
            city: shippingDetails.address.city || '',
            state: shippingDetails.address.state || '',
            postalCode: shippingDetails.address.postal_code || '',
            country: shippingDetails.address.country || 'AU',
          }
        : {
            line1: session.metadata?.shippingAddressLine1 || '',
            line2: session.metadata?.shippingAddressLine2 || '',
            city: session.metadata?.shippingCity || '',
            state: session.metadata?.shippingState || '',
            postalCode: session.metadata?.shippingPostalCode || '',
            country: session.metadata?.shippingCountry || 'AU',
          }

      // Calculate pricing
      const shipping = session.total_details?.amount_shipping ? session.total_details.amount_shipping / 100 : 0
      const tax = session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0

      const pricing = {
        shipping,
        tax,
        discount: 0,
        currency: (session.currency || 'aud').toUpperCase(),
      }

      // Create order
      const orderData: CreateOrderInput = {
        customerEmail: session.customer_details?.email || session.customer_email || '',
        customerName: customerName || shippingDetails?.name || '',
        customerPhone: customerPhone || session.customer_details?.phone || '',
        items: orderItems,
        shippingAddress: {
          line1: shippingAddress.line1,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postcode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
        shippingMethod: 'standard',
        shippingType: shippingAddress.country === 'AU' ? 'domestic' : 'international',
        customerNotes: notes || undefined,
      }

      const order = await orders.createOrder(tenantId, orderData, pricing)

      console.log(`Order ${order.id} created for tenant ${tenantId}`)

      // Send confirmation email to customer
      try {
        const tenant = await tenants.getTenantById(tenantId)
        if (tenant && order.customerEmail) {
          await sendOrderConfirmation(order, tenant)
          console.log(`Confirmation email sent to ${order.customerEmail}`)
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
        // Don't fail the webhook if email fails
      }

      return NextResponse.json({ received: true, orderId: order.id })
    }

    // Handle other event types if needed
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
