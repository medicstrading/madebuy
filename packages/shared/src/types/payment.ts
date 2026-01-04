/**
 * Payment Provider Types
 * For tenant payment provider integration (Stripe Connect, PayPal)
 */

// Payment providers and methods
export type PaymentProvider = 'stripe' | 'paypal'
export type PaymentMethod = 'stripe' | 'paypal' | 'bank_transfer'

// Stripe Connect Express account status
export interface StripeConnectStatus {
  connectAccountId: string
  status: 'pending' | 'active' | 'restricted' | 'disabled'
  chargesEnabled: boolean
  payoutsEnabled: boolean
  onboardingComplete: boolean
  detailsSubmitted: boolean
  businessType?: 'individual' | 'company'
  requirements?: StripeConnectRequirements
  createdAt: Date
  updatedAt: Date
}

export interface StripeConnectRequirements {
  currentlyDue: string[]
  eventuallyDue: string[]
  pastDue: string[]
  disabledReason?: string
}

// PayPal Commerce Platform merchant status
export interface PayPalConnectStatus {
  merchantId: string
  trackingId: string // Internal reference
  status: 'pending' | 'active' | 'restricted'
  paymentsEnabled: boolean
  primaryEmailConfirmed: boolean
  onboardingComplete: boolean
  createdAt: Date
  updatedAt: Date
}

// Tenant payment configuration
export interface TenantPaymentConfig {
  stripe?: StripeConnectStatus
  paypal?: PayPalConnectStatus
  enabledMethods: PaymentMethod[]
  defaultMethod?: PaymentMethod
  // Fallback message when no payment methods available
  noPaymentMessage?: string
}

// API request/response types

export interface CreateStripeConnectInput {
  businessType: 'individual' | 'company'
  email?: string // Optional, defaults to tenant email
}

export interface StripeOnboardingResponse {
  url: string
  expiresAt: Date
}

export interface StripeDashboardResponse {
  url: string
}

export interface CreatePayPalConnectInput {
  // PayPal partner referral fields
  returnUrl: string
}

export interface PayPalReferralResponse {
  referralUrl: string
  trackingId: string
}

// Checkout types (provider-agnostic)

export interface CheckoutPaymentInfo {
  availableMethods: PaymentMethod[]
  defaultMethod?: PaymentMethod
  hasPaymentProvider: boolean
  noPaymentMessage?: string
}

export interface CreateCheckoutInput {
  tenantId: string
  provider: PaymentProvider
  items: CheckoutItem[]
  customerEmail: string
  shippingAddress?: ShippingAddress
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export interface CheckoutItem {
  pieceId: string
  variantId?: string
  name: string
  description?: string
  quantity: number
  unitPrice: number // In cents
  currency: string
  imageUrl?: string
}

export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface CheckoutSession {
  id: string
  provider: PaymentProvider
  url: string
  expiresAt?: Date
}

// Webhook event types (normalized across providers)

export type PaymentWebhookEventType =
  | 'checkout.completed'
  | 'checkout.expired'
  | 'payment.failed'
  | 'account.updated'
  | 'payout.paid'
  | 'payout.failed'
  | 'dispute.created'

export interface PaymentWebhookEvent {
  provider: PaymentProvider
  type: PaymentWebhookEventType
  tenantId?: string
  accountId?: string // For Connect account events
  data: Record<string, unknown>
  rawEvent: unknown
}
