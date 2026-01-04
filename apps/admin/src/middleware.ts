import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { rateLimiters, rateLimit } from '@/lib/rate-limit'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth']

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

  // Apply rate limiting based on route
  let rateLimitResponse: NextResponse | null = null

  if (pathname === '/api/auth/callback/credentials' || pathname === '/api/auth/signin') {
    // Strict rate limiting for login attempts only (5 requests per 15 minutes)
    rateLimitResponse = await rateLimit(request, rateLimiters.auth)
  } else if (pathname.startsWith('/api/auth')) {
    // Session checks use standard API rate limit (100/min)
    rateLimitResponse = await rateLimit(request, rateLimiters.api)
  } else if (pathname.startsWith('/api/media/upload') || pathname.startsWith('/api/upload')) {
    // Moderate rate limiting for uploads
    rateLimitResponse = await rateLimit(request, rateLimiters.upload)
  } else if (pathname.startsWith('/api')) {
    // Standard rate limiting for API routes
    rateLimitResponse = await rateLimit(request, rateLimiters.api)
  } else {
    // General rate limiting for page routes
    rateLimitResponse = await rateLimit(request, rateLimiters.general)
  }

  // Return rate limit response if exceeded
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Allow public routes (after rate limiting)
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow cron routes - they validate CRON_SECRET internally
  if (CRON_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Internal cron routes: allow if valid CRON_SECRET is provided
  // This lets cron jobs call internal endpoints without session auth
  if (INTERNAL_CRON_ROUTES.some((route) => pathname.startsWith(route))) {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return NextResponse.next()
    }
    // If no valid cron secret, fall through to normal session auth check
  }

  // Check JWT token with correct configuration for Auth.js v5
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
    cookieName: process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token',
  })

  // Debug logging disabled in production for security
  if (process.env.NODE_ENV === 'development') {
    console.log('[MIDDLEWARE]', { pathname, hasToken: !!token })
  }

  // Handle unauthenticated requests
  if (!token) {
    // API routes should return 401 JSON, not redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    // Page routes redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify token has required claims for all API routes
  if (pathname.startsWith('/api/') && !token.email) {
    return NextResponse.json(
      { error: 'Unauthorized - invalid token' },
      { status: 401 }
    )
  }

  return NextResponse.next()
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
