import paypal from '@paypal/checkout-server-sdk'

/**
 * PayPal SDK configuration
 * Returns null if PayPal is not configured (allows graceful degradation)
 */
export function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  const mode = process.env.PAYPAL_MODE || 'sandbox'

  // Return null if PayPal not configured - checkout will fall back to Stripe only
  if (!clientId || !clientSecret) {
    return null
  }

  const environment =
    mode === 'production'
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret)

  return new paypal.core.PayPalHttpClient(environment)
}

/**
 * Check if PayPal is configured and available
 */
export function isPayPalEnabled(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET,
  )
}
