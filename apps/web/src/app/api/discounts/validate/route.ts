import { discounts, tenants } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/discounts/validate
 * Validate a discount code for checkout
 */
export async function POST(request: NextRequest) {
  // Rate limit: 20 requests per minute per IP (prevent brute-force code guessing)
  const rateLimitResponse = await checkRateLimit(request, {
    limit: 20,
    windowMs: 60000, // 1 minute
    keyPrefix: 'discount-validate',
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const { tenantId, code, orderTotal, pieceIds, customerEmail } = body

    // Validate input types
    if (
      typeof tenantId !== 'string' ||
      typeof code !== 'string' ||
      typeof orderTotal !== 'number' ||
      (pieceIds !== undefined && !Array.isArray(pieceIds)) ||
      (customerEmail !== undefined && typeof customerEmail !== 'string')
    ) {
      return NextResponse.json({ error: 'Invalid input type' }, { status: 400 })
    }

    // Validate required fields
    if (!tenantId || !code || orderTotal === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, code, orderTotal' },
        { status: 400 },
      )
    }

    // Validate tenant exists
    const tenant =
      (await tenants.getTenantById(tenantId)) ||
      (await tenants.getTenantBySlug(tenantId))
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Validate the discount code
    const result = await discounts.validateDiscountCode(
      tenant.id,
      code,
      orderTotal,
      pieceIds || [],
      customerEmail,
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Discount validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate discount code' },
      { status: 500 },
    )
  }
}
