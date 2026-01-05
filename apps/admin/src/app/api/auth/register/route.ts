import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { tenants } from '@madebuy/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, businessName } = body

    // Validate input
    if (!email || !password || !businessName) {
      return NextResponse.json(
        { error: 'Email, password, and business name are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Validate business name length
    if (businessName.length < 2 || businessName.length > 100) {
      return NextResponse.json(
        { error: 'Business name must be between 2 and 100 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingTenant = await tenants.getTenantByEmail(email.toLowerCase())
    if (existingTenant) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create tenant
    const tenant = await tenants.createTenant(
      email.toLowerCase(),
      passwordHash,
      businessName.trim()
    )

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      tenant: {
        id: tenant.id,
        email: tenant.email,
        businessName: tenant.businessName,
        slug: tenant.slug,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
