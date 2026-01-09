import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { tenants, payouts, transactions, disputes, orders } from '@madebuy/db'
import type { StripeConnectStatus, PayoutStatus, DisputeStatus, DisputeReason } from '@madebuy/shared'
import { sendPayoutFailedEmail, sendDisputeNotificationEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
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
        // The object is an Application, but we need the account ID from event.account
        await handleAccountDeauthorized(event.account!)
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
        await handleDisputeCreated(event.data.object as Stripe.Dispute, event.account!)
        break

      case 'charge.dispute.updated':
        await handleDisputeUpdated(event.data.object as Stripe.Dispute)
        break

      case 'charge.dispute.closed':
        await handleDisputeClosed(event.data.object as Stripe.Dispute)
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
async function handleAccountDeauthorized(accountId: string) {
  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  if (!tenant) {
    console.log(`No tenant found for deauthorized account ${accountId}`)
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
 * Updates payout status with failure details and sends notification email
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

  // Extract bank account last 4 digits if available
  let bankAccountLast4: string | null = null
  if (payout.destination) {
    try {
      // The destination is a bank account ID, we can try to get last4 from it
      const bankAccount = await stripe.accounts.retrieveExternalAccount(
        accountId,
        typeof payout.destination === 'string' ? payout.destination : payout.destination.id
      ) as Stripe.BankAccount
      bankAccountLast4 = bankAccount.last4 || null
    } catch (error) {
      // If we can't retrieve the bank account, continue without last4
      console.warn('Could not retrieve bank account details for payout notification:', error)
    }
  }

  // Send notification email to tenant
  try {
    await sendPayoutFailedEmail({
      tenant,
      payout,
      failureReason: payout.failure_message || null,
      bankAccountLast4,
    })
  } catch (emailError) {
    // Log but don't throw - we don't want email failures to affect webhook response
    console.error('Failed to send payout failed notification email:', emailError)
  }
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
 * Creates dispute record and sends notification to tenant
 */
async function handleDisputeCreated(dispute: Stripe.Dispute, accountId: string) {
  console.error(`DISPUTE CREATED: ${dispute.id} - Amount: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}`)
  console.error(`Reason: ${dispute.reason}`)

  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  if (!tenant) {
    console.error(`No tenant found for dispute account ${accountId}`)
    return
  }

  // Check if we already have this dispute (idempotency)
  const existing = await disputes.getDisputeByStripeId(dispute.id)
  if (existing) {
    console.log(`Dispute ${dispute.id} already exists, skipping`)
    return
  }

  // Try to find the associated order via the charge's payment intent
  let orderId: string | undefined
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
  if (chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId, {
        stripeAccount: accountId,
      })
      if (charge.payment_intent) {
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent.id
        const order = await orders.getOrderByPaymentIntent(paymentIntentId)
        if (order) {
          orderId = order.id
        }
      }
    } catch (err) {
      console.warn('Could not retrieve charge for dispute:', err)
    }
  }

  // Calculate evidence due date
  const evidenceDueBy = dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000)
    : undefined

  // Create dispute record
  await disputes.createDispute({
    tenantId: tenant.id,
    orderId,
    stripeDisputeId: dispute.id,
    stripeChargeId: chargeId,
    amount: dispute.amount,
    currency: dispute.currency.toUpperCase(),
    status: mapStripeDisputeStatus(dispute.status),
    reason: dispute.reason as DisputeReason,
    evidenceDueBy,
  })

  console.log(`Created dispute record ${dispute.id} for tenant ${tenant.id}: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}`)

  // Send notification email to tenant
  try {
    await sendDisputeNotificationEmail({
      tenant,
      dispute,
      evidenceDueBy: evidenceDueBy || null,
    })
  } catch (emailError) {
    console.error('Failed to send dispute notification email:', emailError)
  }
}

/**
 * Handle dispute updated
 * Updates dispute status when Stripe reports changes
 */
async function handleDisputeUpdated(dispute: Stripe.Dispute) {
  console.log(`DISPUTE UPDATED: ${dispute.id} - Status: ${dispute.status}`)

  const existing = await disputes.getDisputeByStripeId(dispute.id)
  if (!existing) {
    console.warn(`No dispute record found for ${dispute.id}`)
    return
  }

  await disputes.updateDispute(dispute.id, {
    status: mapStripeDisputeStatus(dispute.status),
  })

  console.log(`Updated dispute ${dispute.id} to status ${dispute.status}`)
}

/**
 * Handle dispute closed
 * Updates dispute status and sets resolved timestamp
 */
async function handleDisputeClosed(dispute: Stripe.Dispute) {
  console.log(`DISPUTE CLOSED: ${dispute.id} - Status: ${dispute.status}`)

  const existing = await disputes.getDisputeByStripeId(dispute.id)
  if (!existing) {
    console.warn(`No dispute record found for ${dispute.id}`)
    return
  }

  await disputes.updateDispute(dispute.id, {
    status: mapStripeDisputeStatus(dispute.status),
    resolvedAt: new Date(),
  })

  console.log(`Closed dispute ${dispute.id} with status ${dispute.status}`)
}

/**
 * Map Stripe dispute status to our DisputeStatus type
 */
function mapStripeDisputeStatus(status: string): DisputeStatus {
  switch (status) {
    case 'warning_needs_response':
    case 'needs_response':
      return 'needs_response'
    case 'warning_under_review':
    case 'under_review':
      return 'under_review'
    case 'won':
      return 'won'
    case 'lost':
      return 'lost'
    case 'charge_refunded':
      return 'charge_refunded'
    case 'warning_closed':
      return 'warning_closed'
    default:
      return 'needs_response'
  }
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
