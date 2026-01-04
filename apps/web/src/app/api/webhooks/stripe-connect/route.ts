import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { tenants, payouts, transactions } from '@madebuy/db'
import type { StripeConnectStatus, PayoutStatus } from '@madebuy/shared'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!

/**
 * Stripe Connect Webhook Handler
 *
 * Handles Connect-specific events:
 * - account.updated: Onboarding progress, capability changes
 * - account.application.deauthorized: Seller disconnected
 * - payout.paid / payout.failed: Payout status updates
 * - charge.dispute.created: Dispute notifications (platform liable)
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
    console.error('Connect webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object as Stripe.Account)
        break

      case 'payout.created':
        await handlePayoutCreated(event.data.object as Stripe.Payout, event.account!)
        break

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout, event.account!)
        break

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout, event.account!)
        break

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute)
        break

      default:
        // Log unhandled Connect events for debugging
        console.log(`Unhandled Connect event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Connect webhook handler error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle account.updated
 * Updates tenant's Stripe Connect status when onboarding progresses
 */
async function handleAccountUpdated(account: Stripe.Account) {
  // Find tenant by Connect account ID
  const tenant = await tenants.getTenantByStripeAccountId(account.id)
  if (!tenant) {
    console.error(`No tenant found for Stripe account ${account.id}`)
    return
  }

  const status: StripeConnectStatus = {
    connectAccountId: account.id,
    status: getAccountStatus(account),
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    onboardingComplete: account.details_submitted ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    businessType: account.business_type as 'individual' | 'company' | undefined,
    requirements: account.requirements ? {
      currentlyDue: account.requirements.currently_due ?? [],
      eventuallyDue: account.requirements.eventually_due ?? [],
      pastDue: account.requirements.past_due ?? [],
      disabledReason: account.requirements.disabled_reason ?? undefined,
    } : undefined,
    createdAt: tenant.paymentConfig?.stripe?.createdAt ?? new Date(),
    updatedAt: new Date(),
  }

  await tenants.updateStripeConnectStatus(tenant.id, status)

  // If account became active, enable Stripe as a payment method
  if (status.chargesEnabled && status.payoutsEnabled) {
    const currentMethods = tenant.paymentConfig?.enabledMethods ?? []
    if (!currentMethods.includes('stripe')) {
      await tenants.updateEnabledPaymentMethods(tenant.id, [...currentMethods, 'stripe'], 'stripe')
    }
  }

  console.log(`Updated Stripe Connect status for tenant ${tenant.id}: ${status.status}`)
}

/**
 * Handle account.application.deauthorized
 * Seller disconnected MadeBuy from their Stripe account
 */
async function handleAccountDeauthorized(account: Stripe.Account) {
  const tenant = await tenants.getTenantByStripeAccountId(account.id)
  if (!tenant) {
    console.log(`No tenant found for deauthorized account ${account.id}`)
    return
  }

  await tenants.removeStripeConnect(tenant.id)
  console.log(`Tenant ${tenant.id} disconnected Stripe account`)

  // TODO: Send notification email to tenant about disconnection
}

/**
 * Handle payout.created
 * Records new payout in database when Stripe initiates bank transfer
 */
async function handlePayoutCreated(payout: Stripe.Payout, accountId: string) {
  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  if (!tenant) {
    console.log(`No tenant found for payout account ${accountId}`)
    return
  }

  // Check if we already have this payout (idempotency)
  const existing = await payouts.getPayoutByStripeId(payout.id)
  if (existing) {
    console.log(`Payout ${payout.id} already exists, skipping`)
    return
  }

  await payouts.createPayout({
    tenantId: tenant.id,
    stripePayoutId: payout.id,
    amount: payout.amount,
    currency: payout.currency.toUpperCase(),
    status: mapStripePayoutStatus(payout.status),
    arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000) : undefined,
    description: payout.description || undefined,
  })

  console.log(`Created payout record ${payout.id} for tenant ${tenant.id}: ${payout.amount / 100} ${payout.currency.toUpperCase()}`)
}

/**
 * Handle payout.paid
 * Updates payout status and records transaction in ledger
 */
async function handlePayoutPaid(payout: Stripe.Payout, accountId: string) {
  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  if (!tenant) {
    console.log(`No tenant found for payout account ${accountId}`)
    return
  }

  // Update payout status
  await payouts.updatePayoutStatus(payout.id, 'paid', {
    paidAt: new Date(),
  })

  // Record payout in transaction ledger
  await transactions.createTransaction({
    tenantId: tenant.id,
    type: 'payout',
    grossAmount: payout.amount,
    stripeFee: 0,
    platformFee: 0,
    netAmount: payout.amount,
    currency: payout.currency.toUpperCase(),
    stripePayoutId: payout.id,
    status: 'completed',
    description: `Bank payout`,
    completedAt: new Date(),
  })

  console.log(`Payout ${payout.id} completed for tenant ${tenant.id}: ${payout.amount / 100} ${payout.currency.toUpperCase()}`)
}

/**
 * Handle payout.failed
 * Updates payout status with failure details
 */
async function handlePayoutFailed(payout: Stripe.Payout, accountId: string) {
  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  if (!tenant) {
    console.log(`No tenant found for payout account ${accountId}`)
    return
  }

  await payouts.updatePayoutStatus(payout.id, 'failed', {
    failedAt: new Date(),
    failureCode: payout.failure_code || undefined,
    failureMessage: payout.failure_message || undefined,
  })

  console.error(`Payout ${payout.id} failed for tenant ${tenant.id}: ${payout.failure_message}`)

  // TODO: Send notification email to tenant about failed payout
}

/**
 * Map Stripe payout status to our PayoutStatus type
 */
function mapStripePayoutStatus(status: string): PayoutStatus {
  switch (status) {
    case 'paid':
      return 'paid'
    case 'pending':
      return 'pending'
    case 'in_transit':
      return 'in_transit'
    case 'canceled':
      return 'canceled'
    case 'failed':
      return 'failed'
    default:
      return 'pending'
  }
}

/**
 * Handle dispute created
 * Platform is liable for disputes with Express accounts
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  console.error(`DISPUTE CREATED: ${dispute.id} - Amount: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}`)
  console.error(`Reason: ${dispute.reason}`)

  // TODO: Send alert to platform admins
  // TODO: Create internal dispute tracking record
  // TODO: Send notification to tenant

  // For now, just log the dispute details
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
  console.error(`Dispute for charge ${chargeId}, status: ${dispute.status}`)
}

/**
 * Determine account status from Stripe account object
 */
function getAccountStatus(account: Stripe.Account): StripeConnectStatus['status'] {
  if (account.requirements?.disabled_reason) {
    return 'disabled'
  }
  if (account.requirements?.currently_due?.length || account.requirements?.past_due?.length) {
    return 'restricted'
  }
  if (account.charges_enabled && account.payouts_enabled) {
    return 'active'
  }
  return 'pending'
}
