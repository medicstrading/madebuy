import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { orders, stockReservations } from '@madebuy/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

/**
 * Stripe Payment Webhook Handler (Simplified)
 *
 * Handles payment events for single-tenant checkout:
 * - checkout.session.completed: Create order
 * - payment_intent.payment_failed: Cancel reservations
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('No stripe-signature header present')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`Unhandled payment event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout.session.completed
 * Creates order when payment succeeds
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId
  if (!tenantId) {
    console.error('No tenantId in checkout session metadata')
    return
  }

  // Parse items from metadata
  const itemsJson = session.metadata?.items
  const items = itemsJson ? JSON.parse(itemsJson) : []

  // Create order record
  const shippingDetails = session.shipping_details || session.customer_details
  const orderData = {
    customerEmail: session.customer_email || '',
    customerName: session.customer_details?.name || session.metadata?.customerName || '',
    customerPhone: session.customer_details?.phone || session.metadata?.customerPhone || '',
    items: items.map((item: { pieceId: string; variantId?: string; quantity: number; price: number }) => ({
      pieceId: item.pieceId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.price,
    })),
    shippingAddress: {
      line1: shippingDetails?.address?.line1 || '',
      line2: shippingDetails?.address?.line2 || '',
      city: shippingDetails?.address?.city || '',
      state: shippingDetails?.address?.state || '',
      postcode: shippingDetails?.address?.postal_code || '',
      country: shippingDetails?.address?.country || 'AU',
    },
    shippingMethod: session.metadata?.shippingMethod || 'standard',
    shippingType: (session.metadata?.shippingType || 'domestic') as 'domestic' | 'international' | 'local_pickup',
    customerNotes: session.metadata?.notes || '',
  }

  // Calculate shipping and tax from session
  const shippingAmount = session.total_details?.amount_shipping
    ? session.total_details.amount_shipping / 100
    : 0
  const taxAmount = session.total_details?.amount_tax
    ? session.total_details.amount_tax / 100
    : 0

  const order = await orders.createOrder(tenantId, orderData, {
    shipping: shippingAmount,
    tax: taxAmount,
    discount: 0,
    currency: (session.currency || 'aud').toUpperCase(),
  })
  console.log(`Created order ${order.id} for session ${session.id}`)

  // Confirm stock reservations
  const reservationSessionId = session.metadata?.reservationSessionId
  if (reservationSessionId) {
    await stockReservations.completeReservation(reservationSessionId)
    console.log(`Completed stock reservation ${reservationSessionId}`)
  }
}

/**
 * Handle payment_intent.payment_failed
 * Cancels stock reservations
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const reservationSessionId = paymentIntent.metadata?.reservationSessionId
  if (reservationSessionId) {
    await stockReservations.cancelReservation(reservationSessionId)
    console.log(`Cancelled stock reservation ${reservationSessionId}`)
  }
}
