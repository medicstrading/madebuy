import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { transactions, orders, tenants, stockReservations } from '@madebuy/db'
import { calculateFees } from '@madebuy/shared/src/stripe'
import type { CreateTransactionInput } from '@madebuy/shared'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

/**
 * Stripe Payment Webhook Handler
 *
 * Handles payment events:
 * - checkout.session.completed: Create order and transaction
 * - payment_intent.succeeded: Update transaction status
 * - charge.refunded: Create refund transaction
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

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
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
 * Creates order and transaction records when payment succeeds
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId
  if (!tenantId) {
    console.error('No tenantId in checkout session metadata')
    return
  }

  // Check if we already processed this session (idempotency)
  const existingTransaction = await transactions.getTransactionByStripePaymentIntentId(
    session.payment_intent as string
  )
  if (existingTransaction) {
    console.log(`Session ${session.id} already processed`)
    return
  }

  // Get the payment intent for detailed fee information
  const paymentIntent = await stripe.paymentIntents.retrieve(
    session.payment_intent as string,
    { expand: ['latest_charge.balance_transaction'] }
  )

  // Extract charge and balance transaction for fee details
  const charge = paymentIntent.latest_charge as Stripe.Charge | null
  const balanceTransaction = charge?.balance_transaction as Stripe.BalanceTransaction | null

  // Calculate fees - use actual Stripe fees if available, otherwise calculate
  const amountCents = session.amount_total || 0
  let stripeFee = 0
  let netAmount = amountCents

  if (balanceTransaction) {
    stripeFee = balanceTransaction.fee
    netAmount = balanceTransaction.net
  } else {
    // Fallback calculation if balance transaction not available
    const isInternational = charge?.payment_method_details?.card?.country !== 'AU'
    const fees = calculateFees(amountCents, isInternational)
    stripeFee = fees.stripeFee
    netAmount = fees.netAmount
  }

  // Create transaction record
  const transactionInput: CreateTransactionInput = {
    type: 'sale',
    gross: amountCents,
    fees: {
      stripe: stripeFee,
      platform: 0, // MadeBuy's zero-fee differentiator
      total: stripeFee,
    },
    net: netAmount,
    currency: (session.currency || 'aud').toUpperCase(),
    status: 'completed',
    description: `Order from ${session.customer_details?.name || session.customer_email || 'customer'}`,
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId: charge?.id,
    stripeBalanceTransactionId: balanceTransaction?.id,
    stripeTransferId: paymentIntent.transfer_data?.destination
      ? (paymentIntent.latest_charge as Stripe.Charge)?.transfer as string
      : undefined,
    processedAt: new Date(),
    metadata: {
      sessionId: session.id,
      customerEmail: session.customer_email,
      customerName: session.customer_details?.name,
    },
  }

  const transaction = await transactions.createTransaction(tenantId, transactionInput)
  console.log(`Created transaction ${transaction.id} for session ${session.id}`)

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

  // Update transaction with order ID
  await transactions.updateTransactionStatus(tenantId, transaction.id, 'completed', {
    metadata: { ...transaction.metadata, orderId: order.id },
  })

  // Confirm stock reservations (convert from temporary to permanent)
  const reservationSessionId = session.metadata?.reservationSessionId
  if (reservationSessionId) {
    await stockReservations.completeReservation(reservationSessionId)
    console.log(`Completed stock reservation ${reservationSessionId}`)
  }
}

/**
 * Handle payment_intent.succeeded
 * Updates transaction status when payment succeeds
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const existingTransaction = await transactions.getTransactionByStripePaymentIntentId(
    paymentIntent.id
  )

  if (!existingTransaction) {
    // Transaction might be created by checkout.session.completed
    // This is not an error - just log and return
    console.log(`No transaction found for payment intent ${paymentIntent.id} - may be pending checkout webhook`)
    return
  }

  if (existingTransaction.status === 'completed') {
    console.log(`Transaction ${existingTransaction.id} already completed`)
    return
  }

  // Update status to completed
  await transactions.updateTransactionStatus(
    existingTransaction.tenantId,
    existingTransaction.id,
    'completed',
    { processedAt: new Date() }
  )

  console.log(`Updated transaction ${existingTransaction.id} to completed`)
}

/**
 * Handle payment_intent.payment_failed
 * Updates transaction status and cancels stock reservations
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const existingTransaction = await transactions.getTransactionByStripePaymentIntentId(
    paymentIntent.id
  )

  if (existingTransaction) {
    await transactions.updateTransactionStatus(
      existingTransaction.tenantId,
      existingTransaction.id,
      'failed',
      {
        metadata: {
          ...existingTransaction.metadata,
          failureCode: paymentIntent.last_payment_error?.code,
          failureMessage: paymentIntent.last_payment_error?.message,
        },
      }
    )
    console.log(`Updated transaction ${existingTransaction.id} to failed`)
  }

  // Cancel any stock reservations
  const reservationSessionId = paymentIntent.metadata?.reservationSessionId
  if (reservationSessionId) {
    await stockReservations.cancelReservation(reservationSessionId)
    console.log(`Cancelled stock reservation ${reservationSessionId}`)
  }
}

/**
 * Handle charge.refunded
 * Creates refund transaction record
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  // Find original transaction
  const paymentIntentId = charge.payment_intent as string
  const originalTransaction = await transactions.getTransactionByStripePaymentIntentId(paymentIntentId)

  if (!originalTransaction) {
    console.error(`No original transaction found for refunded charge ${charge.id}`)
    return
  }

  // Check for existing refund transaction (idempotency)
  const existingRefunds = await transactions.getTransactionsByOrder(
    originalTransaction.tenantId,
    originalTransaction.orderId || ''
  )
  const refundAlreadyRecorded = existingRefunds.some(
    (t) => t.type === 'refund' && t.stripeChargeId === charge.id
  )
  if (refundAlreadyRecorded) {
    console.log(`Refund for charge ${charge.id} already recorded`)
    return
  }

  // Get refund details
  const refund = charge.refunds?.data[0]
  if (!refund) {
    console.error(`No refund data found for charge ${charge.id}`)
    return
  }

  // Calculate refunded fees
  // When a refund happens, Stripe partially refunds their fee proportionally
  const refundAmount = refund.amount
  const originalAmount = charge.amount
  const feeRefundRatio = refundAmount / originalAmount
  const refundedStripeFee = Math.round(originalTransaction.fees.stripe * feeRefundRatio)

  // Create refund transaction (negative amounts)
  const refundTransactionInput: CreateTransactionInput = {
    type: 'refund',
    gross: -refundAmount,
    fees: {
      stripe: -refundedStripeFee,
      platform: 0,
      total: -refundedStripeFee,
    },
    net: -(refundAmount - refundedStripeFee),
    currency: originalTransaction.currency,
    status: 'completed',
    description: `Refund for order`,
    orderId: originalTransaction.orderId,
    stripePaymentIntentId: paymentIntentId,
    stripeChargeId: charge.id,
    stripeRefundId: refund.id,
    processedAt: new Date(),
    metadata: {
      reason: refund.reason || 'requested_by_customer',
      originalTransactionId: originalTransaction.id,
    },
  }

  const refundTransaction = await transactions.createTransaction(
    originalTransaction.tenantId,
    refundTransactionInput
  )

  console.log(`Created refund transaction ${refundTransaction.id} for charge ${charge.id}`)

  // Update order payment status if fully refunded
  if (charge.refunded && originalTransaction.orderId) {
    await orders.updateOrder(originalTransaction.tenantId, originalTransaction.orderId, {
      paymentStatus: 'refunded',
      status: 'cancelled', // Order is cancelled when fully refunded
    })
    console.log(`Updated order ${originalTransaction.orderId} to refunded`)
  }
}
