import { domains } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/domain
 * Get current domain status
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = await domains.getDomainStatus(tenant.id)

    return NextResponse.json({
      ...status,
      hasCustomDomainFeature: tenant.features.customDomain,
      setupInstructions: {
        cname: {
          type: 'CNAME',
          host: status.domain || 'your-domain.com',
          value: 'shops.madebuy.com.au',
        },
        txt: {
          type: 'TXT',
          host: status.domain || 'your-domain.com',
          value: status.verificationToken,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching domain status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch domain status' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/domain
 * Set custom domain
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if tenant has custom domain feature
    if (!tenant.features.customDomain) {
      return NextResponse.json(
        { error: 'Custom domains require a Pro or higher plan' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { domain } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const result = await domains.setCustomDomain(tenant.id, domain)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    // Get updated status
    const status = await domains.getDomainStatus(tenant.id)

    return NextResponse.json({
      success: true,
      message: result.message,
      ...status,
      setupInstructions: {
        cname: {
          type: 'CNAME',
          host: domain,
          value: 'shops.madebuy.com.au',
        },
        txt: {
          type: 'TXT',
          host: domain,
          value: status.verificationToken,
        },
      },
    })
  } catch (error) {
    console.error('Error setting domain:', error)
    return NextResponse.json({ error: 'Failed to set domain' }, { status: 500 })
  }
}

/**
 * DELETE /api/domain
 * Remove custom domain
 */
export async function DELETE() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await domains.removeCustomDomain(tenant.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing domain:', error)
    return NextResponse.json(
      { error: 'Failed to remove domain' },
      { status: 500 },
    )
  }
}
