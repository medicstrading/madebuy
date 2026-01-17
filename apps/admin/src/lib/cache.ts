import { tenants } from '@madebuy/db'
import type { Tenant } from '@madebuy/shared'
import { NextResponse } from 'next/server'
import { cache } from 'react'

/**
 * Request-scoped tenant cache using React cache()
 * Prevents multiple database lookups for the same tenant within a single request
 */
export const getCachedTenantById = cache(
  async (tenantId: string): Promise<Tenant | null> => {
    return tenants.getTenantById(tenantId)
  },
)

export const getCachedTenantByEmail = cache(
  async (email: string): Promise<Tenant | null> => {
    return tenants.getTenantByEmail(email)
  },
)

export const getCachedTenantBySlug = cache(
  async (slug: string): Promise<Tenant | null> => {
    return tenants.getTenantBySlug(slug)
  },
)

/**
 * Cache-Control header presets for different data types
 */
export const CachePresets = {
  /** No caching - for sensitive/dynamic data */
  noCache: 'no-store, no-cache, must-revalidate',

  /** Private data cached for 1 minute (user-specific lists) */
  privateShort: 'private, max-age=60',

  /** Private data cached for 5 minutes (tenant settings) */
  privateMedium: 'private, max-age=300',

  /** Public data cached for 5 minutes (collections, products) */
  publicShort: 'public, max-age=300, s-maxage=300',

  /** Public data cached for 1 hour (static content) */
  publicLong: 'public, max-age=3600, s-maxage=3600',

  /** Immutable content (images, hashed assets) */
  immutable: 'public, max-age=31536000, immutable',
} as const

/**
 * Add cache control headers to a NextResponse
 */
export function withCacheHeaders(
  response: NextResponse,
  preset: keyof typeof CachePresets = 'privateShort',
): NextResponse {
  response.headers.set('Cache-Control', CachePresets[preset])
  return response
}

/**
 * Create a cached JSON response with appropriate headers
 */
export function cachedJsonResponse<T>(
  data: T,
  options: {
    status?: number
    cache?: keyof typeof CachePresets
  } = {},
): NextResponse {
  const response = NextResponse.json(data, { status: options.status || 200 })
  return withCacheHeaders(response, options.cache || 'privateShort')
}
