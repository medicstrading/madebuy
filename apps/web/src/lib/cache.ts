import { cache } from 'react'
import { NextResponse } from 'next/server'
import { tenants } from '@madebuy/db'
import type { Tenant } from '@madebuy/shared'

/**
 * Request-scoped tenant cache using React cache()
 * Prevents multiple database lookups for the same tenant within a single request
 */
export const getCachedTenantById = cache(async (tenantId: string): Promise<Tenant | null> => {
  return tenants.getTenantById(tenantId)
})

export const getCachedTenantBySlug = cache(async (slug: string): Promise<Tenant | null> => {
  return tenants.getTenantBySlug(slug)
})

export const getCachedTenantByDomain = cache(async (domain: string): Promise<Tenant | null> => {
  return tenants.getTenantByDomain(domain)
})

/**
 * Cache-Control header presets for different data types
 */
export const CachePresets = {
  /** No caching - for sensitive/dynamic data */
  noCache: 'no-store, no-cache, must-revalidate',

  /** Private data cached for 1 minute (user cart, session) */
  privateShort: 'private, max-age=60',

  /** Public data cached for 5 minutes (product listings) */
  publicShort: 'public, max-age=300, s-maxage=300',

  /** Public data cached for 10 minutes (collections) */
  publicMedium: 'public, max-age=600, s-maxage=600',

  /** Public data cached for 1 hour (blog posts) */
  publicLong: 'public, max-age=3600, s-maxage=3600',

  /** Immutable content (images, hashed assets) */
  immutable: 'public, max-age=31536000, immutable',
} as const

/**
 * Add cache control headers to a NextResponse
 */
export function withCacheHeaders(
  response: NextResponse,
  preset: keyof typeof CachePresets = 'publicShort'
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
  } = {}
): NextResponse {
  const response = NextResponse.json(data, { status: options.status || 200 })
  return withCacheHeaders(response, options.cache || 'publicShort')
}
