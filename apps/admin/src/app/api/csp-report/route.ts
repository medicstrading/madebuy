import { type NextRequest, NextResponse } from 'next/server'

/**
 * CSP Violation Report Endpoint
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * In production, you could forward these to a logging service.
 */
export async function POST(request: NextRequest) {
  try {
    const report = await request.json()

    // Log the violation (in production, send to a monitoring service)
    if (process.env.NODE_ENV === 'production') {
      console.warn('[CSP Violation]', JSON.stringify(report, null, 2))
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 400 })
  }
}
