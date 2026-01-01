import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Reserved paths that should NOT be treated as tenant slugs
const RESERVED_PATHS = [
  '/marketplace',
  '/api',
  '/test-turnstile',
  '/login',
  '/signup',
  '/register',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
]

// Attribution cookie name and settings
const ATTRIBUTION_COOKIE = 'mb_attribution'
const SESSION_COOKIE = 'mb_session'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

/**
 * Detect traffic source from UTM params or referrer
 */
function detectSource(utmSource?: string | null, referrer?: string | null): string {
  // 1. UTM params (most reliable)
  if (utmSource) {
    return utmSource
  }

  // 2. No referrer = direct
  if (!referrer) {
    return 'direct'
  }

  // 3. Internal marketplace referrer
  if (referrer.includes('madebuy.com.au/marketplace') ||
      referrer.includes('madebuy.com.au/browse') ||
      referrer.includes('madebuy.com.au/search')) {
    return 'marketplace'
  }

  // 4. Social platforms
  if (referrer.includes('facebook.com') || referrer.includes('fb.com')) {
    return 'facebook_organic'
  }
  if (referrer.includes('instagram.com')) {
    return 'instagram_organic'
  }
  if (referrer.includes('pinterest.com')) {
    return 'pinterest_organic'
  }
  if (referrer.includes('tiktok.com')) {
    return 'tiktok'
  }

  // 5. Search engines
  if (referrer.includes('google.com') || referrer.includes('google.com.au')) {
    return 'google'
  }

  // 6. Link aggregators
  if (referrer.includes('linktr.ee') || referrer.includes('linktree')) {
    return 'linktree'
  }

  // 7. Unknown referral
  return 'referral_other'
}

/**
 * Generate a session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl
  const pathname = url.pathname
  const referrer = request.headers.get('referer')

  // Check if this is a reserved path - don't process as tenant
  const isReservedPath = RESERVED_PATHS.some(
    (reserved) => pathname === reserved || pathname.startsWith(`${reserved}/`)
  )

  // Get or create session ID
  let sessionId = request.cookies.get(SESSION_COOKIE)?.value
  let isNewSession = false
  if (!sessionId) {
    sessionId = generateSessionId()
    isNewSession = true
  }

  // Extract UTM parameters
  const utmSource = url.searchParams.get('utm_source')
  const utmMedium = url.searchParams.get('utm_medium')
  const utmCampaign = url.searchParams.get('utm_campaign')

  // Detect traffic source
  const source = detectSource(utmSource, referrer)

  // Check existing attribution
  const existingAttribution = request.cookies.get(ATTRIBUTION_COOKIE)?.value

  // Build response (will be modified based on routing)
  let response: NextResponse

  if (isReservedPath) {
    response = NextResponse.next()
  } else {
    // Continue with tenant routing logic below
    response = handleTenantRouting(request, hostname, url, pathname)
  }

  // Set session cookie if new
  if (isNewSession) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })
  }

  // Set attribution cookie if:
  // 1. New session, OR
  // 2. Has UTM params (override existing)
  if (isNewSession || utmSource) {
    const attribution = JSON.stringify({
      source,
      medium: utmMedium || undefined,
      campaign: utmCampaign || undefined,
      landingPage: pathname,
      landedAt: new Date().toISOString(),
      sessionId,
    })

    response.cookies.set(ATTRIBUTION_COOKIE, attribution, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })
  }

  // Add tracking headers for downstream use
  response.headers.set('x-mb-session', sessionId)
  response.headers.set('x-mb-source', source)

  return response
}

/**
 * Handle tenant routing (subdomain and custom domain)
 */
function handleTenantRouting(
  request: NextRequest,
  hostname: string,
  url: URL,
  pathname: string
): NextResponse {

  // Development: localhost with tenant subdomain
  // Example: acme.localhost:3302
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.')
    if (parts.length > 1 && parts[0] !== 'localhost') {
      const tenant = parts[0]
      // Rewrite to /[tenant] route
      url.pathname = `/${tenant}${url.pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // Development: IP address access (e.g., 192.168.x.x:3301)
  // Allow path-based tenant routing (/tenant-slug/...)
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/
  if (ipPattern.test(hostname)) {
    // Let Next.js handle [tenant] route directly via path
    return NextResponse.next()
  }

  // Production: custom domains
  // Example: acme.madebuy.com.au OR custom.domain.com
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'madebuy.com.au'

  // If it's a subdomain of our base domain (tenant.madebuy.com.au)
  if (hostname.endsWith(`.${baseDomain}`)) {
    const tenant = hostname.replace(`.${baseDomain}`, '')
    url.pathname = `/${tenant}${url.pathname}`
    return NextResponse.rewrite(url)
  }

  // If it's a custom domain, look up the tenant from database
  // For now, we'll pass the hostname as the tenant identifier
  // The route handler will look it up in the database
  url.pathname = `/_domain/${hostname}${url.pathname}`
  return NextResponse.rewrite(url)
}

/**
 * Helper to get attribution data from cookies
 */
export function getAttributionFromCookies(cookieValue?: string): {
  source: string
  medium?: string
  campaign?: string
  landingPage?: string
  sessionId?: string
} | null {
  if (!cookieValue) return null
  try {
    return JSON.parse(cookieValue)
  } catch {
    return null
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
