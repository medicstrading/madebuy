import { createRateLimiter } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Rate Limiting Implementation (Web App)
 *
 * This implementation uses the shared rate limiter from @madebuy/shared,
 * which supports Redis for multi-instance deployments with automatic
 * fallback to in-memory storage.
 *
 * To enable Redis (for multi-instance deployments):
 * 1. Set REDIS_URL environment variable in .env.local
 * 2. Rate limits will automatically be shared across all instances
 *
 * Without REDIS_URL, rate limiting works per-instance using in-memory storage.
 */

interface RateLimitOptions {
  limit: number // Max requests
  windowMs: number // Time window in milliseconds
  keyPrefix?: string // Prefix for the key
}

/**
 * Get client identifier from request
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from headers (behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to a header-based fingerprint
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return `ua-${userAgent.substring(0, 50)}`
}

/**
 * Check rate limit for a request
 * Returns null if allowed, or a NextResponse if rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const { limit, windowMs, keyPrefix = '' } = options
  const clientId = getClientId(request)
  const key = `${keyPrefix}:${clientId}`

  const limiter = createRateLimiter({
    interval: windowMs,
    uniqueTokenPerInterval: limit,
  })

  const result = await limiter.check(key, limit)

  if (!result.success) {
    // Rate limited
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
        },
      },
    )
  }

  return null
}

/**
 * Create a rate limiter middleware
 */
export function rateLimit(options: RateLimitOptions) {
  return (request: NextRequest) => checkRateLimit(request, options)
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // General API: 100 requests per minute
  api: rateLimit({ limit: 100, windowMs: 60000, keyPrefix: 'api' }),

  // Search: 30 requests per minute
  search: rateLimit({ limit: 30, windowMs: 60000, keyPrefix: 'search' }),

  // Checkout: 10 requests per minute
  checkout: rateLimit({ limit: 10, windowMs: 60000, keyPrefix: 'checkout' }),

  // Shipping quotes: 30 per minute (allows for address changes during checkout)
  shipping: rateLimit({ limit: 30, windowMs: 60000, keyPrefix: 'shipping' }),

  // Reviews: 5 per minute
  reviews: rateLimit({ limit: 5, windowMs: 60000, keyPrefix: 'reviews' }),

  // Auth attempts: 5 per minute
  auth: rateLimit({ limit: 5, windowMs: 60000, keyPrefix: 'auth' }),
}
