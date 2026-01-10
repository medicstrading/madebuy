import { NextRequest, NextResponse } from 'next/server'
import { tenants } from '@madebuy/db'
import bcrypt from 'bcryptjs'

/**
 * ONE-TIME SEED ENDPOINT - DELETE AFTER USE
 *
 * GET /api/seed?secret=SEED_SECRET_2024
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')

  // Simple protection
  if (secret !== 'SEED_SECRET_2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if tenant exists
    const existing = await tenants.getTenantByEmail('admin@test.com')

    if (existing) {
      // Update password
      const passwordHash = await bcrypt.hash('Admin2024!Secure', 10)
      await tenants.updateTenant(existing.id, {
        passwordHash,
        updatedAt: new Date()
      })

      return NextResponse.json({
        success: true,
        action: 'updated',
        email: 'admin@test.com',
        id: existing.id
      })
    }

    // Create new tenant
    const passwordHash = await bcrypt.hash('Admin2024!Secure', 10)

    const tenant = await tenants.createTenant(
      'admin@test.com',
      passwordHash,
      'Test Shop'
    )

    // Update with full features
    await tenants.updateTenant(tenant.id, {
      slug: 'test-shop',
      description: 'A test handmade shop',
      primaryColor: '#2563eb',
      accentColor: '#10b981',
      features: {
        socialPublishing: true,
        aiCaptions: true,
        marketplaceSync: true,
        unlimitedPieces: true,
        customDomain: false,
        prioritySupport: false,
        apiAccess: false,
        advancedAnalytics: false,
      },
      plan: 'studio',
    })

    return NextResponse.json({
      success: true,
      action: 'created',
      email: 'admin@test.com',
      id: tenant.id
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Seed failed'
    }, { status: 500 })
  }
}
