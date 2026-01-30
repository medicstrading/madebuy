import { type NextRequest, NextResponse } from 'next/server'
import { createRateLimiter } from '@madebuy/shared'
import type { RateLimitConfig as SharedRateLimitConfig } from '@madebuy/shared'

/**
 * Rate Limiting Implementation (Admin App)
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

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max requests per IP in the interval
}

export class RateLimiter {
  private interval: number
  private uniqueTokenPerInterval: number
  private limiter: ReturnType<typeof createRateLimiter>

  constructor(config: RateLimitConfig) {
    this.interval = config.interval
    this.uniqueTokenPerInterval = config.uniqueTokenPerInterval
    this.limiter = createRateLimiter({
      interval: config.interval,
      uniqueTokenPerInterval: config.uniqueTokenPerInterval,
    })
  }

  async check(
    request: NextRequest,
    limit?: number,
  ): Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }> {
    const token = this.getToken(request)
    const maxRequests = limit || this.uniqueTokenPerInterval

    const result = await this.limiter.check(token, maxRequests)

    return {
      success: result.success,
      limit: maxRequests,
      remaining: result.remaining,
      reset: result.reset,
    }
  }

  private getToken(request: NextRequest): string {
    // Get IP from various headers (handles proxies, load balancers)
    // WARNING: x-forwarded-for can be spoofed by clients. This is safe because:
    // 1. In production, we're behind Caddy which sets the real client IP
    // 2. Rate limiting is defense-in-depth, not primary security control
    // 3. Authenticated users bypass rate limiting entirely
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

    return ip
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

  // Cron routes - 5 per minute per IP (should only be called by cron scheduler)
  cron: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 5,
  }),
}

/**
 * Rate limit middleware helper
 * Returns a response if rate limit exceeded, null otherwise
 */
export async function rateLimit(
  request: NextRequest,
  limiter: RateLimiter,
  limit?: number,
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
          'Retry-After': Math.ceil(
            (result.reset - Date.now()) / 1000,
          ).toString(),
        },
      },
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
  },
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set(
    'X-RateLimit-Reset',
    new Date(result.reset).toISOString(),
  )
  return response
}
