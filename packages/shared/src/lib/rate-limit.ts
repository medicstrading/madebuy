import Redis from 'ioredis'

/**
 * Rate Limiting with Redis Support
 *
 * This implementation provides distributed rate limiting that works across
 * multiple server instances. It automatically falls back to in-memory
 * storage when Redis is unavailable.
 *
 * Features:
 * - Sliding window rate limiting using Redis sorted sets
 * - Automatic fallback to in-memory store
 * - Lazy Redis connection (only connects when needed)
 * - Periodic cleanup of expired in-memory entries
 *
 * Usage:
 * ```typescript
 * import { createRateLimiter } from '@madebuy/shared'
 *
 * const limiter = createRateLimiter({
 *   interval: 60000,  // 1 minute
 *   uniqueTokenPerInterval: 100  // 100 requests per minute
 * })
 *
 * const result = await limiter.check('user-identifier')
 * if (!result.success) {
 *   // Rate limit exceeded
 * }
 * ```
 */

export interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max requests per interval
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number // timestamp when limit resets
}

// In-memory fallback store
const inMemoryStore = new Map<string, { count: number; resetAt: number }>()

let redisClient: Redis | null = null
let redisInitialized = false

/**
 * Get or create Redis client (lazy initialization)
 */
function getRedisClient(): Redis | null {
  if (redisInitialized) return redisClient

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    redisInitialized = true
    return null
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    })

    redisClient.on('error', (err) => {
      console.error('[RateLimit] Redis error:', err.message)
    })

    redisInitialized = true
    return redisClient
  } catch (error) {
    console.error('[RateLimit] Failed to initialize Redis:', error)
    redisInitialized = true
    return null
  }
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { interval, uniqueTokenPerInterval } = config

  return {
    async check(
      identifier: string,
      limit: number = uniqueTokenPerInterval,
    ): Promise<RateLimitResult> {
      const redis = getRedisClient()

      if (redis) {
        try {
          return await checkRedis(redis, identifier, limit, interval)
        } catch (error) {
          console.error(
            '[RateLimit] Redis check failed, falling back to in-memory:',
            error,
          )
          return checkInMemory(identifier, limit, interval)
        }
      }

      return checkInMemory(identifier, limit, interval)
    },
  }
}

/**
 * Check rate limit using Redis (sliding window with sorted sets)
 */
async function checkRedis(
  redis: Redis,
  identifier: string,
  limit: number,
  interval: number,
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`
  const now = Date.now()
  const windowStart = now - interval

  // Use Redis pipeline for atomic operations
  const pipeline = redis.pipeline()
  // Remove expired entries (outside current window)
  pipeline.zremrangebyscore(key, 0, windowStart)
  // Add current request
  pipeline.zadd(key, now.toString(), `${now}-${Math.random()}`)
  // Count requests in window
  pipeline.zcard(key)
  // Set expiry on the key
  pipeline.pexpire(key, interval)

  const results = await pipeline.exec()

  if (!results) {
    throw new Error('Redis pipeline returned no results')
  }

  // Get count from ZCARD result
  const count = (results[2]?.[1] as number) || 0

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: now + interval,
  }
}

/**
 * Check rate limit using in-memory store (fallback)
 */
function checkInMemory(
  identifier: string,
  limit: number,
  interval: number,
): RateLimitResult {
  const now = Date.now()
  const record = inMemoryStore.get(identifier)

  if (!record || now > record.resetAt) {
    // First request or window expired
    inMemoryStore.set(identifier, { count: 1, resetAt: now + interval })
    return { success: true, remaining: limit - 1, reset: now + interval }
  }

  record.count++
  const success = record.count <= limit

  return {
    success,
    remaining: Math.max(0, limit - record.count),
    reset: record.resetAt,
  }
}

// Cleanup old in-memory entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of inMemoryStore.entries()) {
    if (now > value.resetAt) {
      inMemoryStore.delete(key)
    }
  }
}, 60000) // Clean every minute
