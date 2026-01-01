import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { tenants, payouts } from '@madebuy/db'
import { getAccountStatus } from '@madebuy/shared/src/stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!

/**
 * Stripe Connect Webhook Handler
 *
 * Handles Connect-specific events for seller accounts:
 * - account.updated: Update tenant's Stripe Connect status
 * - payout.paid: Record successful payout
 * - payout.failed: Record failed payout
 * - charge.dispute.created: Alert on dispute
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
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout, event.account)
        break

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout, event.account)
        break

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute, event.account)
        break

      default:
        console.log(`Unhandled Connect event type: ${event.type}`)
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
 * Handle account.updated event
 * Updates tenant's Stripe Connect status when account changes
 */
async function handleAccountUpdated(account: Stripe.Account) {
  // Find tenant by Stripe account ID
  const tenant = await tenants.getTenantByStripeAccountId(account.id)
  if (!tenant) {
    console.log(`No tenant found for Stripe account ${account.id}`)
    return
  }

  // Get status using shared utility
  const status = getAccountStatus(account)

  // Update tenant's Stripe Connect status
  await tenants.updateTenant(tenant.id, {
    stripeConnectStatus: status,
    stripeConnectOnboardingComplete: account.details_submitted,
    stripeConnectChargesEnabled: account.charges_enabled,
    stripeConnectPayoutsEnabled: account.payouts_enabled,
  } as Parameters<typeof tenants.updateTenant>[1])

  console.log(`Updated tenant ${tenant.id} Stripe Connect status to ${status}`)
}

/**
 * Handle payout.paid event
 * Records successful payout to seller's bank account
 */
async function handlePayoutPaid(payout: Stripe.Payout, accountId?: string) {
  if (!accountId) {
    console.log('No account ID in payout event')
    return
  }

  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  if (!tenant) {
    console.log(`No tenant found for payout account ${accountId}`)
    return
  }

  // Check if we already recorded this payout (idempotency)
  const existing = await payouts.getPayoutByStripeId(payout.id)
  if (existing) {
    // Just update status
    await payouts.updatePayoutStatus(payout.id, 'paid', {
      arrivalDate: new Date(payout.arrival_date * 1000),
    })
    console.log(`Updated existing payout ${payout.id} to paid`)
    return
  }

  // Get bank account details if available
  let destinationLast4: string | undefined
  let destinationBankName: string | undefined

  if (payout.destination && typeof payout.destination === 'object') {
    const dest = payout.destination as Stripe.BankAccount
    destinationLast4 = dest.last4
    destinationBankName = dest.bank_name || undefined
  }

  // Create payout record
  await payouts.createPayout(tenant.id, {
    stripePayoutId: payout.id,
    amount: payout.amount,
    currency: (payout.currency || 'aud').toUpperCase(),
    status: 'paid',
    destinationLast4,
    destinationBankName,
    arrivalDate: new Date(payout.arrival_date * 1000),
    initiatedAt: new Date(payout.created * 1000),
    transactionIds: [], // Will be linked later via balance transactions
    method: payout.method === 'instant' ? 'instant' : 'standard',
    statementDescriptor: payout.statement_descriptor || undefined,
  })

  console.log(`Recorded payout ${payout.id} for tenant ${tenant.id}`)
}

/**
 * Handle payout.failed event
 * Updates payout record with failure information
 */
async function handlePayoutFailed(payout: Stripe.Payout, accountId?: string) {
  // Update payout status with failure details
  await payouts.updatePayoutStatus(payout.id, 'failed', {
    failureCode: payout.failure_code || undefined,
    failureMessage: payout.failure_message || undefined,
  })

  // Log for monitoring
  console.log(
    `Payout ${payout.id} failed: ${payout.failure_message || payout.failure_code || 'Unknown error'}`
  )

  // TODO: Send notification to seller about failed payout
  // This could be an email or in-app notification
  if (accountId) {
    const tenant = await tenants.getTenantByStripeAccountId(accountId)
    if (tenant) {
      console.log(`Should notify tenant ${tenant.id} about failed payout`)
      // await sendPayoutFailedNotification(tenant, payout)
    }
  }
}

/**
 * Handle charge.dispute.created event
 * Logs dispute for monitoring and future handling
 */
async function handleDisputeCreated(dispute: Stripe.Dispute, accountId?: string) {
  // Get the charge and payment intent info
  const charge = dispute.charge as Stripe.Charge | string
  const chargeId = typeof charge === 'string' ? charge : charge.id
  const paymentIntentId =
    typeof charge === 'object' ? (charge.payment_intent as string) : undefined

  // Log dispute for now
  console.log(
    `Dispute created: ${dispute.id}`,
    `Amount: ${dispute.amount}`,
    `Reason: ${dispute.reason}`,
    `Charge: ${chargeId}`,
    `Payment Intent: ${paymentIntentId || 'N/A'}`,
    `Account: ${accountId || 'N/A'}`
  )

  // TODO: Implement full dispute tracking:
  // 1. Create dispute record in database
  // 2. Notify seller about the dispute
  // 3. Hold funds if needed
  // 4. Provide dispute evidence submission UI

  if (accountId) {
    const tenant = await tenants.getTenantByStripeAccountId(accountId)
    if (tenant) {
      console.log(`Should notify tenant ${tenant.id} about dispute on charge ${chargeId}`)
      // await sendDisputeNotification(tenant, dispute)
    }
  }
}
