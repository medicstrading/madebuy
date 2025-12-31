import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (use Redis in production for multi-instance deployments)
const store = new Map<string, RateLimitEntry>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 60000) // Clean every minute

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
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const { limit, windowMs, keyPrefix = '' } = options
  const clientId = getClientId(request)
  const key = `${keyPrefix}:${clientId}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    return null
  }

  if (entry.count >= limit) {
    // Rate limited
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
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
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    )
  }

  // Increment count
  entry.count++
  store.set(key, entry)

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

  // Reviews: 5 per minute
  reviews: rateLimit({ limit: 5, windowMs: 60000, keyPrefix: 'reviews' }),

  // Auth attempts: 5 per minute
  auth: rateLimit({ limit: 5, windowMs: 60000, keyPrefix: 'auth' }),
}
