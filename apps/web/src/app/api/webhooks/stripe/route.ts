import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { orders, pieces, tenants, stockReservations, transactions } from '@madebuy/db'
import type { CreateOrderInput, Plan } from '@madebuy/shared'
import { calculateStripeFee, getFeaturesForPlan } from '@madebuy/shared'
import { sendOrderConfirmation, sendPaymentFailedEmail, sendLowStockAlertEmail } from '@/lib/email'

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

      // Subscription lifecycle events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
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

  // Record transaction in ledger
  const grossAmountCents = session.amount_total || 0
  const isInternational = shippingAddress.country !== 'AU'
  const stripeFee = calculateStripeFee(grossAmountCents, isInternational)
  const platformFee = 0 // Zero transaction fees - MadeBuy's differentiator

  await transactions.createTransaction({
    tenantId,
    orderId: order.id,
    type: 'sale',
    grossAmount: grossAmountCents,
    stripeFee,
    platformFee,
    netAmount: grossAmountCents - stripeFee - platformFee,
    currency: (session.currency || 'aud').toUpperCase(),
    stripePaymentIntentId: session.payment_intent as string,
    status: 'completed',
    description: `Order ${order.orderNumber}`,
    completedAt: new Date(),
  })
  console.log(`Transaction recorded for order ${order.id}`)

  // Send confirmation email to customer
  const tenant = await tenants.getTenantById(tenantId)
  try {
    if (tenant && order.customerEmail) {
      await sendOrderConfirmation(order, tenant)
      console.log(`Confirmation email sent to ${order.customerEmail}`)
    }
  } catch (emailError) {
    console.error('Failed to send confirmation email:', emailError)
    // Don't fail the webhook if email fails
  }

  // Check for low stock and send alert if needed
  try {
    const lowStockPieces = await pieces.getLowStockPieces(tenantId)
    if (lowStockPieces.length > 0 && tenant) {
      const adminBaseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.madebuy.com.au'
      await sendLowStockAlertEmail({
        tenant,
        pieces: lowStockPieces,
        dashboardUrl: `${adminBaseUrl}/dashboard/inventory/low-stock`,
      })
      console.log(`Low stock alert sent: ${lowStockPieces.length} items`)
    }
  } catch (stockAlertError) {
    console.error('Failed to send low stock alert:', stockAlertError)
    // Don't fail the webhook if alert fails
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

// =============================================================================
// SUBSCRIPTION HANDLERS
// =============================================================================

// Map Stripe Price IDs to plans (inverse of what's in billing/checkout)
const PRICE_ID_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_PRICE_MAKER_MONTHLY || '']: 'maker',
  [process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '']: 'professional',
  [process.env.STRIPE_PRICE_STUDIO_MONTHLY || '']: 'studio',
}

/**
 * Get plan from Stripe price ID
 */
function getPlanFromPriceId(priceId: string): Plan {
  return PRICE_ID_TO_PLAN[priceId] || 'free'
}

/**
 * Handle subscription created/updated
 * Updates tenant's plan and features
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId
  if (!tenantId) {
    console.error('No tenantId in subscription metadata')
    return
  }

  // Get plan from the subscription's price
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) {
    console.error('No price ID found in subscription')
    return
  }

  const plan = getPlanFromPriceId(priceId)
  const features = getFeaturesForPlan(plan)

  // Map Stripe status to our subscription status
  let subscriptionStatus: 'active' | 'cancelled' | 'past_due' = 'active'
  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    subscriptionStatus = 'cancelled'
  } else if (subscription.status === 'past_due') {
    subscriptionStatus = 'past_due'
  }

  // Update tenant
  await tenants.updateTenant(tenantId, {
    plan,
    subscriptionId: subscription.id,
    subscriptionStatus,
    features,
  })

  console.log(`Subscription updated for tenant ${tenantId}: plan=${plan}, status=${subscriptionStatus}`)
}

/**
 * Handle subscription deleted (cancelled)
 * Downgrades tenant to free plan
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId
  if (!tenantId) {
    console.error('No tenantId in subscription metadata')
    return
  }

  // Downgrade to free plan
  const features = getFeaturesForPlan('free')

  await tenants.updateTenant(tenantId, {
    plan: 'free',
    subscriptionId: undefined,
    subscriptionStatus: 'cancelled',
    features,
  })

  console.log(`Subscription cancelled for tenant ${tenantId}, downgraded to free plan`)

  // TODO: Send email notification about subscription cancellation
}

/**
 * Handle invoice payment failed
 * Notifies tenant about failed payment via email
 * Stripe automatically retries failed payments (typically 4 attempts over ~3 weeks)
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) {
    console.error('No customer ID in failed invoice')
    return
  }

  // Find tenant by Stripe customer ID
  const tenant = await tenants.getTenantByStripeCustomerId(customerId)
  if (!tenant) {
    console.error(`No tenant found for Stripe customer ${customerId}`)
    return
  }

  const attemptCount = invoice.attempt_count || 1

  // Calculate next retry date based on attempt count
  // Stripe's Smart Retries typically retry at ~3, 5, and 7 days after each attempt
  // We estimate conservatively for the email
  let nextRetryDate: Date | undefined
  if (attemptCount < 4) {
    const daysUntilRetry = attemptCount <= 1 ? 3 : attemptCount === 2 ? 5 : 7
    nextRetryDate = new Date()
    nextRetryDate.setDate(nextRetryDate.getDate() + daysUntilRetry)
  }

  console.error(`Invoice payment failed for tenant ${tenant.id}: ${invoice.id} (attempt ${attemptCount}/4)`)

  // Send email notification about failed payment
  try {
    await sendPaymentFailedEmail({
      tenant,
      invoice,
      attemptCount,
      nextRetryDate,
    })
    console.log(`Payment failed email sent to tenant ${tenant.id}`)
  } catch (emailError) {
    console.error('Failed to send payment failed email:', emailError)
    // Don't fail the webhook if email fails
  }
}
