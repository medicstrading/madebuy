import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max requests per IP in the interval
}

interface RateLimitStore {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// Note: In production with multiple instances, use Redis or similar
const rateLimitStore = new Map<string, RateLimitStore>()

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

export class RateLimiter {
  private interval: number
  private uniqueTokenPerInterval: number

  constructor(config: RateLimitConfig) {
    this.interval = config.interval
    this.uniqueTokenPerInterval = config.uniqueTokenPerInterval
  }

  async check(request: NextRequest, limit?: number): Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }> {
    const token = this.getToken(request)
    const now = Date.now()
    const maxRequests = limit || this.uniqueTokenPerInterval

    let tokenData = rateLimitStore.get(token)

    if (!tokenData || now > tokenData.resetTime) {
      // Reset or initialize
      tokenData = {
        count: 0,
        resetTime: now + this.interval,
      }
      rateLimitStore.set(token, tokenData)
    }

    tokenData.count++

    const remaining = Math.max(0, maxRequests - tokenData.count)
    const success = tokenData.count <= maxRequests

    return {
      success,
      limit: maxRequests,
      remaining,
      reset: tokenData.resetTime,
    }
  }

  private getToken(request: NextRequest): string {
    // Get IP from various headers (handles proxies, load balancers)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || 'unknown'

    // Include pathname for route-specific limits
    const pathname = new URL(request.url).pathname

    return `${ip}:${pathname}`
  }
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // Strict limit for login attempts - 5 per 15 minutes per IP
  auth: new RateLimiter({
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 5,
  }),

  // API routes - 100 per minute per IP
  api: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100,
  }),

  // Upload routes - 20 per minute per IP
  upload: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 20,
  }),

  // General routes - 300 per minute per IP
  general: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 300,
  }),
}

/**
 * Rate limit middleware helper
 * Returns a response if rate limit exceeded, null otherwise
 */
export async function rateLimit(
  request: NextRequest,
  limiter: RateLimiter,
  limit?: number
): Promise<NextResponse | null> {
  const result = await limiter.check(request, limit)

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.reset).toISOString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  return null
}

/**
 * Apply rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: {
    limit: number
    remaining: number
    reset: number
  }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString())
  return response
}
