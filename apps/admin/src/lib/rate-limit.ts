import { type NextRequest, NextResponse } from 'next/server'

/**
 * Rate Limiting Implementation
 *
 * CURRENT STATE: In-memory rate limiting
 * This implementation uses an in-memory Map for rate limit tracking.
 * It works well for single-instance deployments but has limitations:
 *
 * LIMITATIONS:
 * - Rate limits are not shared across multiple server instances
 * - Memory usage grows with unique IPs (cleaned up every 10 minutes)
 * - Limits reset on server restart
 *
 * REDIS MIGRATION GUIDE:
 * For multi-instance deployments, migrate to Redis:
 *
 * 1. Add Redis client dependency:
 *    pnpm add ioredis
 *
 * 2. Create Redis connection:
 *    const redis = new Redis(process.env.REDIS_URL)
 *
 * 3. Replace the check() method implementation:
 *    ```typescript
 *    async check(request: NextRequest, limit?: number) {
 *      const token = this.getToken(request)
 *      const key = `ratelimit:${token}`
 *      const maxRequests = limit || this.uniqueTokenPerInterval
 *
 *      // Use Redis MULTI for atomic increment
 *      const multi = redis.multi()
 *      multi.incr(key)
 *      multi.pttl(key)
 *      const results = await multi.exec()
 *
 *      const count = results[0][1] as number
 *      let ttl = results[1][1] as number
 *
 *      // Set expiry on first request
 *      if (count === 1 || ttl === -1) {
 *        await redis.pexpire(key, this.interval)
 *        ttl = this.interval
 *      }
 *
 *      return {
 *        success: count <= maxRequests,
 *        limit: maxRequests,
 *        remaining: Math.max(0, maxRequests - count),
 *        reset: Date.now() + ttl,
 *      }
 *    }
 *    ```
 *
 * 4. Add REDIS_URL environment variable to .env.local
 *
 * 5. Consider using @upstash/ratelimit for serverless environments:
 *    https://github.com/upstash/ratelimit
 */

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max requests per IP in the interval
}

interface RateLimitStore {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// WARNING: Not suitable for multi-instance deployments - see REDIS MIGRATION GUIDE above
const rateLimitStore = new Map<string, RateLimitStore>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 10 * 60 * 1000 // 10 minutes

// Lazy cleanup: check on each request instead of setInterval (avoids memory leaks in serverless)
function cleanupExpiredEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

export class RateLimiter {
  private interval: number
  private uniqueTokenPerInterval: number

  constructor(config: RateLimitConfig) {
    this.interval = config.interval
    this.uniqueTokenPerInterval = config.uniqueTokenPerInterval
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
    // Lazy cleanup instead of setInterval (serverless-friendly)
    cleanupExpiredEntries()

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
