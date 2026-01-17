import { type NextRequest, NextResponse } from 'next/server'

/**
 * DEPRECATED: This webhook handler has been consolidated into /api/webhooks/stripe
 *
 * This route is kept for backwards compatibility but redirects all requests
 * to the canonical webhook endpoint. Please update your Stripe webhook
 * configuration to use /api/webhooks/stripe instead.
 *
 * @deprecated Use /api/webhooks/stripe instead
 */
export async function POST(request: NextRequest) {
  // Log deprecation warning
  console.warn(
    '[DEPRECATED] /api/orders webhook endpoint is deprecated. ' +
      'Please update your Stripe webhook configuration to use /api/webhooks/stripe',
  )

  // Forward the request to the canonical endpoint
  const url = new URL('/api/webhooks/stripe', request.url)

  const forwardedResponse = await fetch(url.toString(), {
    method: 'POST',
    headers: request.headers,
    body: await request.text(),
  })

  const responseBody = await forwardedResponse.text()

  return new NextResponse(responseBody, {
    status: forwardedResponse.status,
    headers: {
      'Content-Type': 'application/json',
      'X-Deprecated': 'true',
      'X-Redirect-To': '/api/webhooks/stripe',
    },
  })
}
