import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { marketplace, getDatabase } from '@madebuy/db'
import type { VerificationStatus } from '@madebuy/shared'

// Note: In production, this should check for platform admin role
// For now, we'll assume only platform admins have access to this endpoint

/**
 * GET /api/verification/review
 * List pending verification requests (platform admin only)
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    // TODO: Add proper admin role check
    // For now, check if tenant is a platform admin (e.g., specific tenant IDs)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDatabase()

    // Get all profiles with pending verification
    const pendingProfiles = await db.collection('seller_profiles')
      .find({ 'verification.status': 'pending' })
      .sort({ 'verification.submittedAt': 1 })
      .toArray()

    return NextResponse.json({
      pendingCount: pendingProfiles.length,
      profiles: pendingProfiles.map(p => ({
        tenantId: p.tenantId,
        displayName: p.displayName,
        verification: p.verification,
        memberSince: p.memberSince,
      })),
    })
  } catch (error) {
    console.error('Error listing pending verifications:', error)
    return NextResponse.json(
      { error: 'Failed to list verifications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/verification/review
 * Approve or reject a verification request (platform admin only)
 *
 * Body:
 * {
 *   tenantId: string
 *   action: 'approve' | 'reject'
 *   rejectionReason?: string
 *   level?: 'basic' | 'business'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const adminTenant = await getCurrentTenant()

    // TODO: Add proper admin role check
    if (!adminTenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tenantId, action, rejectionReason, level } = body

    if (!tenantId || !action) {
      return NextResponse.json(
        { error: 'tenantId and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json(
        { error: 'rejectionReason is required when rejecting' },
        { status: 400 }
      )
    }

    const profile = await marketplace.getSellerProfile(tenantId)

    if (!profile) {
      return NextResponse.json(
        { error: 'Seller profile not found' },
        { status: 404 }
      )
    }

    if (profile.verification?.status !== 'pending') {
      return NextResponse.json(
        { error: 'Verification is not pending' },
        { status: 400 }
      )
    }

    const newStatus: VerificationStatus = action === 'approve' ? 'verified' : 'rejected'

    await marketplace.updateSellerProfile(tenantId, {
      verification: {
        ...profile.verification,
        status: newStatus,
        verifiedAt: action === 'approve' ? new Date() : undefined,
        rejectedAt: action === 'reject' ? new Date() : undefined,
        rejectionReason: action === 'reject' ? rejectionReason : undefined,
        level: action === 'approve' ? (level || profile.verification.level || 'basic') : undefined,
      },
      // Add verified badge if approved
      badges: action === 'approve'
        ? [...(profile.badges || []), 'verified']
        : profile.badges,
    })

    // TODO: Send notification email to seller about verification result

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? 'Verification approved successfully'
        : 'Verification rejected',
      newStatus,
    })
  } catch (error) {
    console.error('Error reviewing verification:', error)
    return NextResponse.json(
      { error: 'Failed to process verification review' },
      { status: 500 }
    )
  }
}
