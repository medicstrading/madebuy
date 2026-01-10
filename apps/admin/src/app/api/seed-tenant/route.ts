import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { getDb } from '@madebuy/db'

// One-time seed endpoint - DELETE AFTER USE
// Protected by secret key in query param
const SEED_SECRET = 'madebuy-seed-2024'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = await getDb()
    const tenantsCollection = db.collection('tenants')

    // Check if tenant already exists
    const existing = await tenantsCollection.findOne({ email: 'admin@test.com' })

    if (existing) {
      // Update password hash in case it's wrong
      const passwordHash = await bcrypt.hash('admin123', 10)
      await tenantsCollection.updateOne(
        { email: 'admin@test.com' },
        { $set: { passwordHash, updatedAt: new Date() } }
      )

      return NextResponse.json({
        message: 'Test tenant exists - password reset to admin123',
        tenant: {
          id: existing.id,
          email: existing.email,
          businessName: existing.businessName,
        }
      })
    }

    // Create password hash
    const passwordHash = await bcrypt.hash('admin123', 10)
    const tenantId = nanoid()

    // Create tenant
    const tenant = {
      id: tenantId,
      slug: 'test-shop',
      email: 'admin@test.com',
      passwordHash,
      businessName: 'Test Shop',
      description: 'A test handmade shop for development',
      primaryColor: '#f59e0b',
      accentColor: '#10b981',
      domainStatus: 'none',
      features: {
        socialPublishing: true,
        aiCaptions: true,
        multiChannelOrders: true,
        advancedAnalytics: true,
        unlimitedPieces: true,
        customDomain: true,
      },
      plan: 'studio',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await tenantsCollection.insertOne(tenant as any)

    return NextResponse.json({
      message: 'Test tenant created successfully',
      tenant: {
        id: tenantId,
        email: 'admin@test.com',
        businessName: 'Test Shop',
        password: 'admin123',
      }
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
