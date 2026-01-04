import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { orders, pieces, tenants, stockReservations } from '@madebuy/db'
import type { CreateOrderInput } from '@madebuy/shared'
import { sendOrderConfirmation } from '@/lib/email'

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
    // Idempotency: Check if we've already processed this event
    // Stripe may retry webhooks, so we check for existing order
    const eventId = event.id

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, eventId)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
        break

      default:
        // Silently ignore unhandled event types
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
 * Creates order when payment succeeds, sends confirmation email
 * Includes idempotency check to prevent duplicate orders
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const tenantId = session.metadata?.tenantId
  if (!tenantId) {
    console.error('No tenantId in checkout session metadata')
    return
  }

  // Idempotency check: see if order already exists for this Stripe session
  const existingOrder = await orders.getOrderByStripeSessionId(tenantId, session.id)
  if (existingOrder) {
    console.log(`Order already exists for session ${session.id}, skipping duplicate`)
    return
  }

  // Parse items from metadata
  const itemsJson = session.metadata?.items
  const items = itemsJson ? JSON.parse(itemsJson) : []

  // Complete stock reservations first (decrements actual stock atomically)
  const reservationSessionId = session.metadata?.reservationSessionId
  if (reservationSessionId) {
    const completed = await stockReservations.completeReservation(reservationSessionId)
    if (!completed) {
      console.warn(`No reservations found for session ${reservationSessionId}`)
    }
  }

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
      variantId: item.variantId,
      name: piece.name,
      price: item.price,
      quantity: item.quantity,
      category: piece.category,
      description: piece.description,
    })
  }

  // Get shipping address from session
  const shippingDetails = session.shipping_details
  const shippingAddress = shippingDetails?.address
    ? {
        line1: shippingDetails.address.line1 || '',
        line2: shippingDetails.address.line2 || '',
        city: shippingDetails.address.city || '',
        state: shippingDetails.address.state || '',
        postcode: shippingDetails.address.postal_code || '',
        country: shippingDetails.address.country || 'AU',
      }
    : {
        line1: session.metadata?.shippingAddressLine1 || '',
        line2: session.metadata?.shippingAddressLine2 || '',
        city: session.metadata?.shippingCity || '',
        state: session.metadata?.shippingState || '',
        postcode: session.metadata?.shippingPostalCode || '',
        country: session.metadata?.shippingCountry || 'AU',
      }

  // Calculate pricing from session
  const shippingAmount = session.total_details?.amount_shipping
    ? session.total_details.amount_shipping / 100
    : 0
  const taxAmount = session.total_details?.amount_tax
    ? session.total_details.amount_tax / 100
    : 0

  // Create order
  const orderData: CreateOrderInput = {
    customerEmail: session.customer_details?.email || session.customer_email || '',
    customerName: session.metadata?.customerName || shippingDetails?.name || '',
    customerPhone: session.metadata?.customerPhone || session.customer_details?.phone || '',
    items: orderItems,
    shippingAddress,
    shippingMethod: session.metadata?.shippingMethod || 'standard',
    shippingType: shippingAddress.country === 'AU' ? 'domestic' : 'international',
    customerNotes: session.metadata?.notes || undefined,
  }

  const order = await orders.createOrder(tenantId, orderData, {
    shipping: shippingAmount,
    tax: taxAmount,
    discount: 0,
    currency: (session.currency || 'aud').toUpperCase(),
    stripeSessionId: session.id, // For idempotency
  })
  console.log(`Created order ${order.id} for session ${session.id}`)

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

/**
 * Handle checkout.session.expired
 * Releases stock reservations when checkout times out
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const reservationSessionId = session.metadata?.reservationSessionId
  if (reservationSessionId) {
    await stockReservations.cancelReservation(reservationSessionId)
    console.log(`Released stock reservations for expired session ${reservationSessionId}`)
  }
}
