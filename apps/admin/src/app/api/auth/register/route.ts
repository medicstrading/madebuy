import { tenants } from '@madebuy/db'
import { ADMIN_PASSWORD_REQUIREMENTS, validatePassword } from '@madebuy/shared'
import bcrypt from 'bcryptjs'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, businessName } = body

    // Validate input
    if (!email || !password || !businessName) {
      return NextResponse.json(
        { error: 'Email, password, and business name are required' },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      )
    }

    // Validate password strength (12+ chars, uppercase, lowercase, numbers, special chars)
    const passwordValidation = validatePassword(
      password,
      ADMIN_PASSWORD_REQUIREMENTS,
    )
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error:
            passwordValidation.errors[0] ||
            'Password does not meet security requirements',
        },
        { status: 400 },
      )
    }

    // Validate business name length
    if (businessName.length < 2 || businessName.length > 100) {
      return NextResponse.json(
        { error: 'Business name must be between 2 and 100 characters' },
        { status: 400 },
      )
    }

    // Check if email already exists
    const existingTenant = await tenants.getTenantByEmail(email.toLowerCase())
    if (existingTenant) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      )
    }

    // Hash password (cost 10 for ~100ms, was 12 ~400ms)
    const passwordHash = await bcrypt.hash(password, 10)

    // Create tenant
    const tenant = await tenants.createTenant(
      email.toLowerCase(),
      passwordHash,
      businessName.trim(),
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
      { status: 500 },
    )
  }
}
