import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { rateLimit, rateLimiters } from '@/lib/rate-limit'

/**
 * Timing-safe comparison for secrets to prevent timing attacks
 */
function verifySecret(received: string | null, expected: string): boolean {
  if (!received) return false
  try {
    const receivedBuffer = Buffer.from(received)
    const expectedBuffer = Buffer.from(`Bearer ${expected}`)
    if (receivedBuffer.length !== expectedBuffer.length) {
      timingSafeEqual(expectedBuffer, expectedBuffer)
      return false
    }
    return timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch {
    return false
  }
}

/**
 * Validate callback URL to prevent open redirect attacks
 * Only allows relative paths starting with /
 */
function isValidCallbackUrl(url: string): boolean {
  // Must start with / and not contain protocol or double slashes
  if (!url.startsWith('/')) return false
  if (url.startsWith('//')) return false
  if (url.includes('://')) return false
  // Block javascript: and data: schemes
  if (url.toLowerCase().includes('javascript:')) return false
  if (url.toLowerCase().includes('data:')) return false
  return true
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/api/auth']

// Cron endpoints that use CRON_SECRET instead of session auth
const CRON_ROUTES = [
  '/api/cron/publish-scheduled',
  '/api/cron/publish-scheduled-blogs',
]

// Internal endpoints that accept either session auth OR CRON_SECRET
const INTERNAL_CRON_ROUTES = [
  '/api/publish/', // Execute endpoint called by cron
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes first (no auth or rate limit needed)
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    // Only rate limit login attempts (unauthenticated, critical path)
    if (
      pathname === '/api/auth/callback/credentials' ||
      pathname === '/api/auth/signin'
    ) {
      const rateLimitResponse = await rateLimit(request, rateLimiters.auth)
      if (rateLimitResponse) return rateLimitResponse
    }
    return NextResponse.next()
  }

  // Cron routes: rate limit to prevent abuse, then let through (they validate CRON_SECRET internally)
  if (CRON_ROUTES.some((route) => pathname.startsWith(route))) {
    const rateLimitResponse = await rateLimit(request, rateLimiters.cron)
    if (rateLimitResponse) return rateLimitResponse
    return NextResponse.next()
  }

  // Internal cron routes: allow if valid CRON_SECRET is provided (timing-safe)
  if (INTERNAL_CRON_ROUTES.some((route) => pathname.startsWith(route))) {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && verifySecret(authHeader, cronSecret)) {
      return NextResponse.next()
    }
    // If no valid cron secret, fall through to normal session auth check
  }

  // Check JWT token FIRST - authenticated users skip rate limiting
  // This is much faster than rate limiting every request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
    // Use admin-specific cookie name to prevent collision with web app
    cookieName:
      process.env.NODE_ENV === 'production'
        ? '__Secure-madebuy-admin.session-token'
        : 'madebuy-admin.session-token',
  })

  // If authenticated with valid token, skip rate limiting entirely
  // Rate limiting is primarily to prevent abuse from unauthenticated users
  if (token?.email) {
    return NextResponse.next()
  }

  // Debug logging disabled in production for security
  if (process.env.NODE_ENV === 'development') {
    console.log('[MIDDLEWARE]', { pathname, hasToken: !!token })
  }

  // Unauthenticated request - apply rate limiting before rejecting
  // This prevents brute force attacks on protected routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = await rateLimit(request, rateLimiters.api)
    if (rateLimitResponse) return rateLimitResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Page routes redirect to login with validated callback URL
  const loginUrl = new URL('/login', request.url)
  if (isValidCallbackUrl(pathname)) {
    loginUrl.searchParams.set('callbackUrl', pathname)
  }
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
