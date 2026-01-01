// Stripe Connect configuration for Australian marketplace

export const STRIPE_CONFIG = {
  // AU domestic card rate
  DOMESTIC_RATE: 0.017,  // 1.7%
  DOMESTIC_FIXED: 30,     // 30 cents

  // International card rate
  INTERNATIONAL_RATE: 0.035,  // 3.5%
  INTERNATIONAL_FIXED: 30,     // 30 cents

  // Payout timing
  PAYOUT_DELAY_DAYS: 3,  // 3 business days for AU

  // MadeBuy takes 0% - this is our differentiator
  PLATFORM_FEE_PERCENT: 0,

  // Minimum payout (Stripe requirement)
  MINIMUM_PAYOUT_AUD: 100,  // $1 in cents
} as const;

export const STRIPE_CONNECT_CONFIG = {
  // Use Express accounts - Stripe handles onboarding/KYC
  ACCOUNT_TYPE: 'express' as const,

  // Required capabilities for AU sellers
  CAPABILITIES: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },

  // Business types we support
  BUSINESS_TYPES: ['individual', 'company'] as const,

  // Country
  COUNTRY: 'AU',
} as const;
