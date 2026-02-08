import { disputes, orders, payouts, tenants, transactions } from '@madebuy/db'
import type {
  DisputeReason,
  DisputeStatus,
  PayoutStatus,
  StripeConnectStatus,
} from '@madebuy/shared'
import { createLogger } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  sendDisputeNotificationEmail,
  sendPayoutFailedEmail,
} from '@/lib/email'

const logger = createLogger({ service: 'stripe-connect-webhook' })

// Validate Stripe secret key is configured
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

// Validate Stripe Connect webhook secret is configured
if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
  throw new Error('STRIPE_CONNECT_WEBHOOK_SECRET environment variable is not set')
}

const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

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
    logger.error('No stripe-signature header present')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.error({ err }, 'Connect webhook signature verification failed')
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
        await handlePayoutCreated(
          event.data.object as Stripe.Payout,
          event.account!,
        )
        break

      case 'payout.paid':
        await handlePayoutPaid(
          event.data.object as Stripe.Payout,
          event.account!,
        )
        break

      case 'payout.failed':
        await handlePayoutFailed(
          event.data.object as Stripe.Payout,
          event.account!,
        )
        break

      case 'charge.dispute.created':
        await handleDisputeCreated(
          event.data.object as Stripe.Dispute,
          event.account!,
        )
        break

      case 'charge.dispute.updated':
        await handleDisputeUpdated(event.data.object as Stripe.Dispute)
        break

      case 'charge.dispute.closed':
        await handleDisputeClosed(event.data.object as Stripe.Dispute)
        break

      default:
        // Log unhandled Connect events for debugging
        logger.info({ eventType: event.type }, 'Unhandled Connect event')
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error({ err }, 'Connect webhook handler error')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook handler failed' },
      { status: 500 },
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
    logger.error(
      { stripeAccountId: account.id },
      'No tenant found for Stripe account',
    )
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
    requirements: account.requirements
      ? {
          currentlyDue: account.requirements.currently_due ?? [],
          eventuallyDue: account.requirements.eventually_due ?? [],
          pastDue: account.requirements.past_due ?? [],
          disabledReason: account.requirements.disabled_reason ?? undefined,
        }
      : undefined,
    createdAt: tenant.paymentConfig?.stripe?.createdAt ?? new Date(),
    updatedAt: new Date(),
  }

  await tenants.updateStripeConnectStatus(tenant.id, status)

  // If account became active, enable Stripe as a payment method
  if (status.chargesEnabled && status.payoutsEnabled) {
    const currentMethods = tenant.paymentConfig?.enabledMethods ?? []
    if (!currentMethods.includes('stripe')) {
      await tenants.updateEnabledPaymentMethods(
        tenant.id,
        [...currentMethods, 'stripe'],
        'stripe',
      )
    }
  }

  logger.info(
    { tenantId: tenant.id, status: status.status, stripeAccountId: account.id },
    'Updated Stripe Connect status',
  )
}

/**
 * Handle account.application.deauthorized
 * Seller disconnected MadeBuy from their Stripe account
 */
async function handleAccountDeauthorized(accountId: string) {
  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  if (!tenant) {
    logger.warn(
      { stripeAccountId: accountId },
      'No tenant found for deauthorized account',
    )
    return
  }

  await tenants.removeStripeConnect(tenant.id)
  logger.info(
    { tenantId: tenant.id, stripeAccountId: accountId },
    'Tenant disconnected Stripe account',
  )

  // TODO: Send notification email to tenant about disconnection
}

/**
 * Handle payout.created
 * Records new payout in database when Stripe initiates bank transfer
 */
async function handlePayoutCreated(payout: Stripe.Payout, accountId: string) {
  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  if (!tenant) {
    logger.warn(
      { stripeAccountId: accountId },
      'No tenant found for payout account',
    )
    return
  }

  // Check if we already have this payout (idempotency)
  const existing = await payouts.getPayoutByStripeId(payout.id)
  if (existing) {
    logger.debug({ payoutId: payout.id }, 'Payout already exists, skipping')
    return
  }

  await payouts.createPayout({
    tenantId: tenant.id,
    stripePayoutId: payout.id,
    amount: payout.amount,
    currency: payout.currency.toUpperCase(),
    status: mapStripePayoutStatus(payout.status),
    arrivalDate: payout.arrival_date
      ? new Date(payout.arrival_date * 1000)
      : undefined,
    description: payout.description || undefined,
  })

  logger.info(
    {
      tenantId: tenant.id,
      payoutId: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency.toUpperCase(),
    },
    'Created payout record',
  )
}

/**
 * Handle payout.paid
 * Updates payout status and records transaction in ledger
 */
async function handlePayoutPaid(payout: Stripe.Payout, accountId: string) {
  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  if (!tenant) {
    logger.warn(
      { stripeAccountId: accountId },
      'No tenant found for payout account',
    )
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

  logger.info(
    {
      tenantId: tenant.id,
      payoutId: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency.toUpperCase(),
    },
    'Payout completed',
  )
}

/**
 * Handle payout.failed
 * Updates payout status with failure details and sends notification email
 */
async function handlePayoutFailed(payout: Stripe.Payout, accountId: string) {
  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  if (!tenant) {
    logger.warn(
      { stripeAccountId: accountId },
      'No tenant found for payout account',
    )
    return
  }

  await payouts.updatePayoutStatus(payout.id, 'failed', {
    failedAt: new Date(),
    failureCode: payout.failure_code || undefined,
    failureMessage: payout.failure_message || undefined,
  })

  logger.error(
    {
      tenantId: tenant.id,
      payoutId: payout.id,
      failureMessage: payout.failure_message,
    },
    'Payout failed',
  )

  // Extract bank account last 4 digits if available
  let bankAccountLast4: string | null = null
  if (payout.destination) {
    try {
      // The destination is a bank account ID, we can try to get last4 from it
      const bankAccount = (await stripe.accounts.retrieveExternalAccount(
        accountId,
        typeof payout.destination === 'string'
          ? payout.destination
          : payout.destination.id,
      )) as Stripe.BankAccount
      bankAccountLast4 = bankAccount.last4 || null
    } catch (error) {
      // If we can't retrieve the bank account, continue without last4
      logger.warn(
        { error },
        'Could not retrieve bank account details for payout notification',
      )
    }
  }

  // WH-08: Add null check before sending email
  if (tenant) {
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
      logger.error(
        { emailError, tenantId: tenant.id },
        'Failed to send payout failed notification email',
      )
    }
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
async function handleDisputeCreated(
  dispute: Stripe.Dispute,
  accountId: string,
) {
  logger.error(
    {
      disputeId: dispute.id,
      amount: dispute.amount / 100,
      currency: dispute.currency.toUpperCase(),
      reason: dispute.reason,
    },
    'DISPUTE CREATED',
  )

  const tenant = await tenants.getTenantByStripeAccountId(accountId)
  // WH-07: Add proper null check for tenant
  if (!tenant) {
    logger.error(
      { stripeAccountId: accountId },
      'No tenant found for dispute account',
    )
    return
  }

  // Check if we already have this dispute (idempotency)
  const existing = await disputes.getDisputeByStripeId(dispute.id)
  if (existing) {
    logger.debug({ disputeId: dispute.id }, 'Dispute already exists, skipping')
    return
  }

  // Try to find the associated order via the charge's payment intent
  let orderId: string | undefined
  const chargeId =
    typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
  if (chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId, {
        stripeAccount: accountId,
      })
      if (charge.payment_intent) {
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent.id
        // WH-06: Validate payment intent belongs to tenant
        const order = await orders.getOrderByPaymentIntent(
          tenant.id,
          paymentIntentId,
        )
        if (order && order.tenantId === tenant.id) {
          orderId = order.id
        } else if (order && order.tenantId !== tenant.id) {
          logger.error(
            {
              disputeId: dispute.id,
              paymentIntentId,
              orderTenantId: order.tenantId,
              webhookTenantId: tenant.id,
            },
            'Payment intent belongs to different tenant - security violation',
          )
          return
        }
      }
    } catch (err) {
      logger.warn({ err, chargeId }, 'Could not retrieve charge for dispute')
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

  logger.info(
    {
      tenantId: tenant.id,
      disputeId: dispute.id,
      amount: dispute.amount / 100,
      currency: dispute.currency.toUpperCase(),
    },
    'Created dispute record',
  )

  // WH-07: Add null check before sending notification
  if (tenant) {
    // Send notification email to tenant
    try {
      await sendDisputeNotificationEmail({
        tenant,
        dispute,
        evidenceDueBy: evidenceDueBy || null,
      })
    } catch (emailError) {
      logger.error(
        { emailError, tenantId: tenant.id },
        'Failed to send dispute notification email',
      )
    }
  }
}

/**
 * Handle dispute updated
 * Updates dispute status when Stripe reports changes
 */
async function handleDisputeUpdated(dispute: Stripe.Dispute) {
  logger.info(
    { disputeId: dispute.id, status: dispute.status },
    'DISPUTE UPDATED',
  )

  const existing = await disputes.getDisputeByStripeId(dispute.id)
  if (!existing) {
    logger.warn({ disputeId: dispute.id }, 'No dispute record found')
    return
  }

  await disputes.updateDispute(dispute.id, {
    status: mapStripeDisputeStatus(dispute.status),
  })

  logger.info(
    { disputeId: dispute.id, status: dispute.status },
    'Updated dispute status',
  )
}

/**
 * Handle dispute closed
 * Updates dispute status and sets resolved timestamp
 */
async function handleDisputeClosed(dispute: Stripe.Dispute) {
  logger.info(
    { disputeId: dispute.id, status: dispute.status },
    'DISPUTE CLOSED',
  )

  const existing = await disputes.getDisputeByStripeId(dispute.id)
  if (!existing) {
    logger.warn({ disputeId: dispute.id }, 'No dispute record found')
    return
  }

  await disputes.updateDispute(dispute.id, {
    status: mapStripeDisputeStatus(dispute.status),
    resolvedAt: new Date(),
  })

  logger.info(
    { disputeId: dispute.id, status: dispute.status },
    'Closed dispute',
  )
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
function getAccountStatus(
  account: Stripe.Account,
): StripeConnectStatus['status'] {
  if (account.requirements?.disabled_reason) {
    return 'disabled'
  }
  if (
    account.requirements?.currently_due?.length ||
    account.requirements?.past_due?.length
  ) {
    return 'restricted'
  }
  if (account.charges_enabled && account.payouts_enabled) {
    return 'active'
  }
  return 'pending'
}
