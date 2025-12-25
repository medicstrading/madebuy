import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl

  // Development: localhost with tenant subdomain
  // Example: acme.localhost:3002
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
