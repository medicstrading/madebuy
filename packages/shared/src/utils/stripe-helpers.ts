import { generateIdempotencyKey } from './retry'

export function stripeIdempotencyKey(
  operation: string,
  resourceId: string,
): string {
  return generateIdempotencyKey('stripe', operation, resourceId)
}

export function isRetryableStripeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const statusCode = (error as any).statusCode
  // Retry on rate limits (429) and server errors (5xx)
  return statusCode === 429 || (statusCode >= 500 && statusCode < 600)
}
