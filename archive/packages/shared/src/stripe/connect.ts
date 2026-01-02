import Stripe from 'stripe';
import { STRIPE_CONFIG, STRIPE_CONNECT_CONFIG } from './config';

// Initialize Stripe with API version
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
}

// Create Express Connect account for a seller
export async function createConnectAccount(
  stripe: Stripe,
  email: string,
  businessName: string,
  businessType: 'individual' | 'company' = 'individual'
): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: STRIPE_CONNECT_CONFIG.ACCOUNT_TYPE,
    country: STRIPE_CONNECT_CONFIG.COUNTRY,
    email,
    capabilities: STRIPE_CONNECT_CONFIG.CAPABILITIES,
    business_type: businessType,
    business_profile: {
      name: businessName,
      mcc: '5969',  // Direct Marketing - Other (suitable for handmade goods)
      product_description: 'Handmade goods and crafts',
    },
  });
}

// Create account link for onboarding
export async function createAccountLink(
  stripe: Stripe,
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
    collect: 'eventually_due',
  });
}

// Create login link for Express dashboard
export async function createLoginLink(
  stripe: Stripe,
  accountId: string
): Promise<Stripe.LoginLink> {
  return stripe.accounts.createLoginLink(accountId);
}

// Check if account is fully onboarded
export function isAccountActive(account: Stripe.Account): boolean {
  return (
    account.charges_enabled === true &&
    account.payouts_enabled === true &&
    account.details_submitted === true
  );
}

// Get account status for display
export function getAccountStatus(account: Stripe.Account): 'pending' | 'active' | 'restricted' | 'disabled' {
  if (!account.details_submitted) return 'pending';
  if (account.charges_enabled && account.payouts_enabled) return 'active';
  if (account.requirements?.disabled_reason) return 'disabled';
  return 'restricted';
}

// Calculate fees for a transaction
export function calculateFees(
  amountCents: number,
  isInternational: boolean = false
): { stripeFee: number; platformFee: number; netAmount: number } {
  const rate = isInternational ? STRIPE_CONFIG.INTERNATIONAL_RATE : STRIPE_CONFIG.DOMESTIC_RATE;
  const fixed = isInternational ? STRIPE_CONFIG.INTERNATIONAL_FIXED : STRIPE_CONFIG.DOMESTIC_FIXED;

  const stripeFee = Math.round(amountCents * rate + fixed);
  const platformFee = Math.round(amountCents * STRIPE_CONFIG.PLATFORM_FEE_PERCENT);
  const netAmount = amountCents - stripeFee - platformFee;

  return { stripeFee, platformFee, netAmount };
}

// Create a destination charge (customer pays, seller receives)
export async function createDestinationCharge(
  stripe: Stripe,
  options: {
    amount: number;  // in cents
    currency?: string;
    connectedAccountId: string;
    customerId?: string;
    paymentMethodId?: string;
    description?: string;
    metadata?: Record<string, string>;
    applicationFeeAmount?: number;  // 0 for MadeBuy
  }
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: options.amount,
    currency: options.currency || 'aud',
    customer: options.customerId,
    payment_method: options.paymentMethodId,
    description: options.description,
    metadata: options.metadata,
    application_fee_amount: options.applicationFeeAmount || 0,
    transfer_data: {
      destination: options.connectedAccountId,
    },
    confirm: options.paymentMethodId ? true : false,
  });
}

// Process a refund
export async function createRefund(
  stripe: Stripe,
  paymentIntentId: string,
  options?: {
    amount?: number;  // Partial refund amount in cents
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    refundApplicationFee?: boolean;
    reverseTransfer?: boolean;
  }
): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: options?.amount,
    reason: options?.reason,
    refund_application_fee: options?.refundApplicationFee ?? true,
    reverse_transfer: options?.reverseTransfer ?? true,
  });
}
