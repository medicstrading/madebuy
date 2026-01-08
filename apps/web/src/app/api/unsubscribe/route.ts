import { NextRequest, NextResponse } from 'next/server'
import { tenants, customers } from '@madebuy/db'
import crypto from 'crypto'

/**
 * Verify unsubscribe token
 * Token is HMAC-SHA256 of email using tenant's unsubscribe secret
 */
function verifyUnsubscribeToken(email: string, token: string, secret: string): boolean {
  const expectedToken = crypto
    .createHmac('sha256', secret)
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 32)

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))
  } catch {
    return false
  }
}

/**
 * Generate unsubscribe token for an email
 * Export for use in email sending
 */
export function generateUnsubscribeToken(email: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 32)
}

/**
 * POST /api/unsubscribe
 * Process email unsubscribe request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token, tenant: tenantSlug } = body

    // Validate inputs
    if (!email || !token || !tenantSlug) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get tenant by slug
    const tenant = await tenants.getTenantBySlug(tenantSlug)
    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid store' },
        { status: 404 }
      )
    }

    // Get or generate unsubscribe secret for this tenant
    // In production, this should be stored in tenant settings
    const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET || tenant.id

    // Verify token
    if (!verifyUnsubscribeToken(email, token, unsubscribeSecret)) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe link' },
        { status: 403 }
      )
    }

    // Find customer by email
    const customer = await customers.getCustomerByEmail(tenant.id, email.toLowerCase())

    if (!customer) {
      // Customer doesn't exist - that's fine, they're not subscribed
      return NextResponse.json({ success: true, message: 'Email not found in our list' })
    }

    if (!customer.emailSubscribed) {
      // Already unsubscribed
      return NextResponse.json({ success: true, message: 'Already unsubscribed' })
    }

    // Unsubscribe the customer
    await customers.updateEmailSubscription(tenant.id, customer.id, false)

    console.log(`[UNSUBSCRIBE] Customer ${email} unsubscribed from tenant ${tenant.id}`)

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed'
    })

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
