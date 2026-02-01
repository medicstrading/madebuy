import {
  downloads,
  orders,
  pieces,
  stockReservations,
  tenants,
  transactions,
} from '@madebuy/db'
import type {
  CreateOrderInput,
  PersonalizationValue,
  Plan,
} from '@madebuy/shared'
import {
  calculateStripeFee,
  createLogger,
  ExternalServiceError,
  getFeaturesForPlan,
  isMadeBuyError,
  toErrorResponse,
  ValidationError,
} from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  sendDownloadEmail,
  sendLowStockAlertEmail,
  sendOrderConfirmation,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
} from '@/lib/email'

const log = createLogger({ module: 'stripe-webhook' })

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
    log.error('No stripe-signature header present')
    return NextResponse.json(
      { error: 'No signature', code: 'MISSING_SIGNATURE' },
      { status: 400 },
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    log.error({ err }, 'Webhook signature verification failed')
    return NextResponse.json(
      { error: 'Invalid signature', code: 'INVALID_SIGNATURE' },
      { status: 400 },
    )
  }

  try {
    // Idempotency: Check if we've already processed this event
    // Stripe may retry webhooks, so we check for existing order
    const eventId = event.id

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          eventId,
        )
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        )
        break

      case 'checkout.session.expired':
        await handleCheckoutExpired(
          event.data.object as Stripe.Checkout.Session,
        )
        break

      // Subscription lifecycle events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        )
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        )
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      default:
      // Silently ignore unhandled event types
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    if (isMadeBuyError(err)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(err)
      return NextResponse.json(
        { error: msg, code, details },
        { status: statusCode },
      )
    }

    // Log and return generic error for unexpected errors
    log.error(
      { err, eventType: event?.type, eventId: event?.id },
      'Unexpected webhook handler error',
    )
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}

/**
 * Handle checkout.session.completed
 * Creates order when payment succeeds, sends confirmation email
 * Includes idempotency check to prevent duplicate orders
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  _eventId: string,
) {
  const tenantId = session.metadata?.tenantId
  if (!tenantId) {
    log.error(
      { sessionId: session.id },
      'No tenantId in checkout session metadata',
    )
    return
  }

  // Idempotency check: see if order already exists for this Stripe session
  const existingOrder = await orders.getOrderByStripeSessionId(
    tenantId,
    session.id,
  )
  if (existingOrder) {
    log.info(
      { sessionId: session.id, orderId: existingOrder.id },
      'Order already exists, skipping duplicate',
    )
    return
  }

  // Parse items from metadata (with error handling)
  const itemsJson = session.metadata?.items
  let items: Array<{
    pieceId: string
    variantId?: string
    price: number
    quantity: number
    personalization?: PersonalizationValue[]
    personalizationTotal?: number
  }> = []
  if (itemsJson) {
    try {
      items = JSON.parse(itemsJson)
    } catch (parseError) {
      log.error(
        { err: parseError, sessionId: session.id, itemsJson },
        'Failed to parse items from session metadata',
      )
      return // Can't create order without items
    }
  }

  // Complete stock reservations first (decrements actual stock atomically)
  const reservationSessionId = session.metadata?.reservationSessionId
  if (reservationSessionId) {
    const completed =
      await stockReservations.completeReservation(reservationSessionId)
    if (!completed) {
      log.warn(
        { reservationSessionId, sessionId: session.id },
        'No reservations found for session',
      )
    }
  }

  // Build order items with full piece data
  // Batch fetch all pieces to avoid N+1 query
  const pieceIds = items.map((item) => item.pieceId)
  const piecesMap = await pieces.getPiecesByIds(tenantId, pieceIds)

  const orderItems = []
  for (const item of items) {
    const piece = piecesMap.get(item.pieceId)
    if (!piece) {
      log.error(
        { pieceId: item.pieceId, tenantId, sessionId: session.id },
        'Piece not found for order',
      )
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
      personalizations: item.personalization, // Maps from cart personalization to order personalizations
      personalizationTotal: item.personalizationTotal || 0,
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
    customerEmail:
      session.customer_details?.email || session.customer_email || '',
    customerName: session.metadata?.customerName || shippingDetails?.name || '',
    customerPhone:
      session.metadata?.customerPhone || session.customer_details?.phone || '',
    items: orderItems,
    shippingAddress,
    shippingMethod: session.metadata?.shippingMethod || 'standard',
    shippingType:
      shippingAddress.country === 'AU' ? 'domestic' : 'international',
    customerNotes: session.metadata?.notes || undefined,
  }

  const order = await orders.createOrder(tenantId, orderData, {
    shipping: shippingAmount,
    tax: taxAmount,
    discount: 0,
    currency: (session.currency || 'aud').toUpperCase(),
    stripeSessionId: session.id, // For idempotency
  })
  log.info(
    {
      orderId: order.id,
      orderNumber: order.orderNumber,
      sessionId: session.id,
      tenantId,
    },
    'Order created from checkout session',
  )

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
  log.info(
    {
      orderId: order.id,
      transactionType: 'sale',
      netAmount: grossAmountCents - stripeFee - platformFee,
    },
    'Transaction recorded for order',
  )

  // Create download records for digital products
  // Reuse the piecesMap from earlier to avoid another N+1 query
  const downloadLinks: { pieceId: string; pieceName: string; token: string }[] =
    []
  for (const item of order.items) {
    const piece = piecesMap.get(item.pieceId)
    if (piece?.digital?.isDigital && piece.digital.files?.length > 0) {
      try {
        const downloadRecord = await downloads.createDownloadRecord(tenantId, {
          orderId: order.id,
          orderItemId: item.pieceId, // Using pieceId as orderItemId since we don't have separate item IDs
          pieceId: item.pieceId,
          customerEmail: order.customerEmail,
          customerName: order.customerName,
          maxDownloads: piece.digital.downloadLimit,
          expiryDays: piece.digital.downloadExpiryDays,
        })
        downloadLinks.push({
          pieceId: item.pieceId,
          pieceName: piece.name,
          token: downloadRecord.downloadToken,
        })
        log.info(
          {
            pieceId: item.pieceId,
            pieceName: piece.name,
            orderId: order.id,
            downloadToken: downloadRecord.downloadToken,
          },
          'Download record created for digital product',
        )
      } catch (downloadError) {
        log.error(
          { err: downloadError, pieceId: item.pieceId, orderId: order.id },
          'Failed to create download record for piece',
        )
        // Don't fail the webhook - continue with other items
      }
    }
  }

  // Send confirmation email to customer
  const tenant = await tenants.getTenantById(tenantId)
  try {
    if (tenant && order.customerEmail) {
      await sendOrderConfirmation(order, tenant)
      log.info(
        { orderId: order.id, customerEmail: order.customerEmail },
        'Order confirmation email sent',
      )

      // Send download emails for digital products
      // Reuse piecesMap to avoid N+1 query
      for (const download of downloadLinks) {
        try {
          const piece = piecesMap.get(download.pieceId)
          if (piece?.digital?.files) {
            const downloadRecord = await downloads.getDownloadRecordByToken(
              download.token,
            )
            if (downloadRecord) {
              await sendDownloadEmail({
                order,
                tenant,
                downloadRecord,
                productName: piece.name,
                files: piece.digital.files,
                downloadLimit: piece.digital.downloadLimit,
                expiryDate: downloadRecord.tokenExpiresAt
                  ? new Date(downloadRecord.tokenExpiresAt)
                  : undefined,
              })
              log.info(
                {
                  pieceId: download.pieceId,
                  pieceName: piece.name,
                  orderId: order.id,
                },
                'Download email sent for digital product',
              )
            }
          }
        } catch (downloadEmailError) {
          log.error(
            {
              err: downloadEmailError,
              pieceName: download.pieceName,
              orderId: order.id,
            },
            'Failed to send download email',
          )
        }
      }
    }
  } catch (emailError) {
    log.error(
      {
        err: emailError,
        orderId: order.id,
        customerEmail: order.customerEmail,
      },
      'Failed to send confirmation email',
    )
    // Don't fail the webhook if email fails
  }

  // Check for low stock and send alert if needed
  try {
    const lowStockPieces = await pieces.getLowStockPieces(tenantId)
    if (lowStockPieces.length > 0 && tenant) {
      const adminBaseUrl =
        process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.madebuy.com.au'
      await sendLowStockAlertEmail({
        tenant,
        pieces: lowStockPieces,
        dashboardUrl: `${adminBaseUrl}/dashboard/inventory/low-stock`,
      })
      log.info(
        { tenantId, lowStockCount: lowStockPieces.length },
        'Low stock alert sent',
      )
    }
  } catch (stockAlertError) {
    log.error(
      { err: stockAlertError, tenantId },
      'Failed to send low stock alert',
    )
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
    log.info(
      { reservationSessionId, paymentIntentId: paymentIntent.id },
      'Stock reservation cancelled after payment failure',
    )
  }
}

/**
 * Handle charge.refunded
 * Updates order refund status and restores stock for full refunds
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId = charge.payment_intent as string
  const tenantId = charge.metadata?.tenantId

  if (!tenantId) {
    log.warn(
      { chargeId: charge.id },
      'No tenantId in charge metadata for refund',
    )
    return
  }

  log.info(
    {
      chargeId: charge.id,
      tenantId,
      refundedAmount: charge.amount_refunded,
    },
    'Processing charge refund',
  )

  // Update order refund status
  await orders.updateRefundStatus(tenantId, paymentIntentId, {
    refundedAmount: charge.amount_refunded,
    refundedAt: new Date(),
    refundId: charge.refunds?.data[0]?.id,
    reason: charge.refunds?.data[0]?.reason || undefined,
  })

  // If full refund, restore stock
  if (charge.amount_refunded === charge.amount) {
    log.info({ chargeId: charge.id, tenantId }, 'Full refund - restoring stock')

    // Get the order to restore stock
    const order = await orders.getOrderByPaymentIntent(
      tenantId,
      paymentIntentId,
    )
    if (order && order.tenantId === tenantId) {
      // Verify order belongs to tenant for safety
      for (const item of order.items) {
        if (item.variantId) {
          await pieces.incrementVariantStock(
            tenantId,
            item.pieceId,
            item.variantId,
            item.quantity,
          )
        } else {
          await pieces.incrementStock(tenantId, item.pieceId, item.quantity)
        }
      }
      log.info(
        { orderId: order.id, itemCount: order.items.length },
        'Stock restored for refund',
      )
    }
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
    log.info(
      { reservationSessionId, sessionId: session.id },
      'Stock reservations released after checkout expiration',
    )
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
    log.error(
      { subscriptionId: subscription.id },
      'No tenantId in subscription metadata',
    )
    return
  }

  // Get plan from the subscription's price
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) {
    log.error(
      { subscriptionId: subscription.id, tenantId },
      'No price ID found in subscription',
    )
    return
  }

  const plan = getPlanFromPriceId(priceId)
  const features = getFeaturesForPlan(plan)

  // Map Stripe status to our subscription status
  // Stripe statuses: active, past_due, unpaid, canceled, incomplete, incomplete_expired, trialing, paused
  let subscriptionStatus: 'active' | 'cancelled' | 'past_due' = 'active'
  switch (subscription.status) {
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      subscriptionStatus = 'cancelled'
      break
    case 'past_due':
    case 'incomplete':
      subscriptionStatus = 'past_due'
      break
    case 'active':
    case 'trialing':
    case 'paused': // Paused still has access until resumed or cancelled
      subscriptionStatus = 'active'
      break
    default:
      // Unknown status - default to active but log warning
      log.warn(
        {
          subscriptionId: subscription.id,
          status: subscription.status,
          tenantId,
        },
        'Unknown Stripe subscription status, defaulting to active',
      )
      subscriptionStatus = 'active'
  }

  // Update tenant
  await tenants.updateTenant(tenantId, {
    plan,
    subscriptionId: subscription.id,
    subscriptionStatus,
    features,
  })

  log.info(
    {
      tenantId,
      subscriptionId: subscription.id,
      plan,
      status: subscriptionStatus,
      priceId,
    },
    'Subscription updated',
  )
}

/**
 * Handle subscription deleted (cancelled)
 * Downgrades tenant to free plan
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId
  if (!tenantId) {
    log.error(
      { subscriptionId: subscription.id },
      'No tenantId in subscription metadata',
    )
    return
  }

  // Get tenant before downgrading
  const tenant = await tenants.getTenantById(tenantId)
  if (!tenant) {
    log.error(
      { tenantId, subscriptionId: subscription.id },
      'No tenant found for subscription deletion',
    )
    return
  }

  // Get plan name from subscription
  const planName =
    (subscription.items.data[0]?.price.product as Stripe.Product)?.name ||
    subscription.items.data[0]?.price?.nickname ||
    'Premium'

  // Downgrade to free plan
  const features = getFeaturesForPlan('free')

  await tenants.updateTenant(tenantId, {
    plan: 'free',
    subscriptionId: undefined,
    subscriptionStatus: 'cancelled',
    features,
  })

  log.info(
    { tenantId, subscriptionId: subscription.id, planName },
    'Subscription cancelled, tenant downgraded to free plan',
  )

  // Send email notification about subscription cancellation
  try {
    await sendSubscriptionCancelledEmail({
      tenant: {
        email: tenant.email,
        businessName: tenant.businessName,
      },
      planName,
      lastDayOfService: new Date(),
    })
    log.info(
      { tenantId: tenant.id, email: tenant.email },
      'Subscription cancelled email sent',
    )
  } catch (emailError) {
    log.error(
      { err: emailError, tenantId },
      'Failed to send subscription cancelled email',
    )
    // Don't fail the webhook if email fails
  }
}

/**
 * Handle invoice payment failed
 * Notifies tenant about failed payment via email
 * Stripe automatically retries failed payments (typically 4 attempts over ~3 weeks)
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id

  if (!customerId) {
    log.error({ invoiceId: invoice.id }, 'No customer ID in failed invoice')
    return
  }

  // Find tenant by Stripe customer ID
  const tenant = await tenants.getTenantByStripeCustomerId(customerId)
  if (!tenant) {
    log.error(
      { customerId, invoiceId: invoice.id },
      'No tenant found for Stripe customer in failed invoice',
    )
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

  log.error(
    { tenantId: tenant.id, invoiceId: invoice.id, attemptCount, customerId },
    'Invoice payment failed',
  )

  // Send email notification about failed payment
  try {
    await sendPaymentFailedEmail({
      tenant,
      invoice,
      attemptCount,
      nextRetryDate,
    })
    log.info(
      { tenantId: tenant.id, invoiceId: invoice.id, attemptCount },
      'Payment failed email sent',
    )
  } catch (emailError) {
    log.error(
      { err: emailError, tenantId: tenant.id, invoiceId: invoice.id },
      'Failed to send payment failed email',
    )
    // Don't fail the webhook if email fails
  }
}

/**
 * Handle invoice paid
 * Logs successful subscription payment
 * Note: Subscription updates are handled by customer.subscription.updated event
 * This handler is mainly for logging and potential future features (receipts, usage resets, etc.)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id

  if (!customerId) {
    log.error({ invoiceId: invoice.id }, 'No customer ID in paid invoice')
    return
  }

  // Find tenant by Stripe customer ID
  const tenant = await tenants.getTenantByStripeCustomerId(customerId)
  if (!tenant) {
    log.error(
      { customerId, invoiceId: invoice.id },
      'No tenant found for Stripe customer in paid invoice',
    )
    return
  }

  const amountPaid = invoice.amount_paid / 100 // Convert from cents
  const currency = (invoice.currency || 'aud').toUpperCase()

  log.info(
    {
      tenantId: tenant.id,
      invoiceId: invoice.id,
      customerId,
      amountPaid,
      currency,
      subscriptionId: invoice.subscription,
    },
    'Invoice payment successful',
  )

  // Future enhancement: Send payment receipt email
  // Future enhancement: Reset usage counters for new billing period
  // Future enhancement: Record transaction in ledger
}
