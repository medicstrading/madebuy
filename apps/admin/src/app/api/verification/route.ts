import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'

/**
 * GET /api/verification
 * Get current seller's verification status
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await marketplace.getSellerProfile(tenant.id)

    if (!profile) {
      return NextResponse.json({
        status: 'unverified',
        message: 'Complete your seller profile to begin verification',
      })
    }

    return NextResponse.json({
      status: profile.verification?.status || 'unverified',
      verification: profile.verification,
      canListOnMarketplace: profile.verification?.status === 'verified',
    })
  } catch (error) {
    console.error('Error fetching verification status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch verification status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/verification
 * Submit verification request
 *
 * Body:
 * {
 *   businessName: string
 *   abn?: string (Australian Business Number)
 *   idDocumentId?: string (mediaId)
 *   proofOfAddressId?: string (mediaId)
 *   level: 'basic' | 'business'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessName, abn, idDocumentId, proofOfAddressId, level = 'basic' } = body

    if (!businessName) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }

    // For business verification, ABN is required
    if (level === 'business' && !abn) {
      return NextResponse.json(
        { error: 'ABN is required for business verification' },
        { status: 400 }
      )
    }

    // Get or create seller profile
    let profile = await marketplace.getSellerProfile(tenant.id)

    if (!profile) {
      // Create seller profile with verification
      profile = await marketplace.createSellerProfile({
        tenantId: tenant.id,
        displayName: tenant.businessName,
        bio: tenant.description,
        location: tenant.location,
        verification: {
          status: 'pending',
          submittedAt: new Date(),
          documents: {
            businessName,
            abn: abn || undefined,
            idDocument: idDocumentId,
            proofOfAddress: proofOfAddressId,
          },
          level,
        },
      })
    } else {
      // Update existing profile with verification request
      profile = await marketplace.updateSellerProfile(tenant.id, {
        verification: {
          status: 'pending',
          submittedAt: new Date(),
          documents: {
            businessName,
            abn: abn || undefined,
            idDocument: idDocumentId,
            proofOfAddress: proofOfAddressId,
          },
          level,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Verification request submitted. We will review within 1-2 business days.',
      verification: profile?.verification,
    })
  } catch (error) {
    console.error('Error submitting verification:', error)
    return NextResponse.json(
      { error: 'Failed to submit verification request' },
      { status: 500 }
    )
  }
}
