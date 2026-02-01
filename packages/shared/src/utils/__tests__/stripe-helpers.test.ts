import { describe, expect, it } from 'vitest'
import { isRetryableStripeError, stripeIdempotencyKey } from '../stripe-helpers'

describe('stripeIdempotencyKey', () => {
  it('generates Stripe-prefixed idempotency key', () => {
    const key = stripeIdempotencyKey('charge', 'cust_123')
    expect(key).toMatch(/^stripe_charge_cust_123_\d+$/)
  })
})

describe('isRetryableStripeError', () => {
  it('returns true for 429 rate limit errors', () => {
    const error = { statusCode: 429 }
    expect(isRetryableStripeError(error)).toBe(true)
  })

  it('returns true for 5xx server errors', () => {
    expect(isRetryableStripeError({ statusCode: 500 })).toBe(true)
    expect(isRetryableStripeError({ statusCode: 502 })).toBe(true)
    expect(isRetryableStripeError({ statusCode: 503 })).toBe(true)
  })

  it('returns false for 4xx client errors', () => {
    expect(isRetryableStripeError({ statusCode: 400 })).toBe(false)
    expect(isRetryableStripeError({ statusCode: 401 })).toBe(false)
    expect(isRetryableStripeError({ statusCode: 404 })).toBe(false)
  })

  it('returns false for non-error objects', () => {
    expect(isRetryableStripeError(null)).toBe(false)
    expect(isRetryableStripeError(undefined)).toBe(false)
    expect(isRetryableStripeError('string')).toBe(false)
    expect(isRetryableStripeError({})).toBe(false)
  })
})
