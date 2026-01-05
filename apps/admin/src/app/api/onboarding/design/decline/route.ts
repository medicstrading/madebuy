import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { tenants } from '@madebuy/db'

/**
 * POST /api/onboarding/design/decline
 * Declines the extracted design and redirects to fresh design
 */
export async function POST(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant
    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Mark design import as declined
    await tenants.updateTenant(user.id, {
      domainOnboarding: {
        status: tenant.domainOnboarding?.status || 'design_choice',
        ...tenant.domainOnboarding,
        designImport: {
          sourceUrl: tenant.domainOnboarding?.designImport?.sourceUrl || null,
          scannedAt: tenant.domainOnboarding?.designImport?.scannedAt || null,
          extractedDesign: null, // Clear extracted design
          importStatus: 'declined',
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Design import declined. You can now design from scratch.',
      redirectTo: '/dashboard/website-design',
    })
  } catch (error) {
    console.error('Decline design error:', error)
    return NextResponse.json(
      { error: 'Failed to decline design' },
      { status: 500 }
    )
  }
}
