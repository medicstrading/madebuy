import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth', '/api/health']

/**
 * Validate callback URL to prevent open redirect attacks
 */
function isValidCallbackUrl(url: string): boolean {
  if (!url.startsWith('/')) return false
  if (url.startsWith('//')) return false
  if (url.includes('://')) return false
  if (url.toLowerCase().includes('javascript:')) return false
  if (url.toLowerCase().includes('data:')) return false
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
    cookieName:
      process.env.NODE_ENV === 'production'
        ? '__Secure-madebuy-manager.session-token'
        : 'madebuy-manager.session-token',
  })

  // Authenticated - allow through
  if (token?.email) {
    return NextResponse.next()
  }

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[MANAGER MIDDLEWARE]', { pathname, hasToken: !!token })
  }

  // Unauthenticated API request
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Page routes redirect to login
  const loginUrl = new URL('/login', request.url)
  if (isValidCallbackUrl(pathname)) {
    loginUrl.searchParams.set('callbackUrl', pathname)
  }
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
