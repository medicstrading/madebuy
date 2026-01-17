import { type NextRequest, NextResponse } from 'next/server'

/**
 * CSP Violation Report Endpoint
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * Reports are sent automatically when CSP violations occur.
 *
 * For now, we just log violations to the console for monitoring.
 * In production, you might want to send these to a logging service.
 */

interface CSPViolationReport {
  'csp-report': {
    'document-uri': string
    referrer: string
    'violated-directive': string
    'effective-directive': string
    'original-policy': string
    disposition: string
    'blocked-uri': string
    'line-number'?: number
    'column-number'?: number
    'source-file'?: string
    'status-code': number
    'script-sample'?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const report: CSPViolationReport = await request.json()

    // Log the CSP violation for monitoring
    console.warn('[CSP Violation]', {
      documentUri: report['csp-report']?.['document-uri'],
      violatedDirective: report['csp-report']?.['violated-directive'],
      blockedUri: report['csp-report']?.['blocked-uri'],
      sourceFile: report['csp-report']?.['source-file'],
      lineNumber: report['csp-report']?.['line-number'],
    })

    // Return 204 No Content as browsers expect this for report endpoints
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    // Even on error, return 204 to prevent browser retries
    console.error('[CSP Report Error]', error)
    return new NextResponse(null, { status: 204 })
  }
}
