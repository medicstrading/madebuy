import { NextResponse } from 'next/server'

// Re-export cached tenant functions from tenant.ts for backwards compatibility
export {
  getTenantByDomain as getCachedTenantByDomain,
  getTenantById as getCachedTenantById,
  getTenantBySlug as getCachedTenantBySlug,
} from './tenant'

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
  preset: keyof typeof CachePresets = 'publicShort',
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
  return withCacheHeaders(response, options.cache || 'publicShort')
}
