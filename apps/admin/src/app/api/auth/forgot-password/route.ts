import crypto from 'node:crypto'
import { passwordResets, tenants } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { sendPasswordResetEmail } from '@/lib/email'
import { rateLimit, rateLimiters } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 requests per 15 minutes (uses auth limiter)
    const rateLimitResponse = await rateLimit(request, rateLimiters.auth, 3)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      )
    }

    // Look up tenant by email
    const tenant = await tenants.getTenantByEmail(email.toLowerCase())

    // Always return success to prevent email enumeration
    // If tenant doesn't exist, we silently ignore the request
    if (!tenant) {
      console.log(`Password reset requested for non-existent email: ${email}`)
      return NextResponse.json({
        success: true,
        message:
          'If an account with that email exists, we sent a password reset link.',
      })
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex')

    // Store token in database (expires in 60 minutes)
    await passwordResets.createPasswordResetToken(
      tenant.email,
      tenant.id,
      resetToken,
      60,
    )

    // Send password reset email
    const emailResult = await sendPasswordResetEmail({
      to: tenant.email,
      resetToken,
      businessName: tenant.businessName,
    })

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      // Still return success to user for security reasons
    }

    return NextResponse.json({
      success: true,
      message:
        'If an account with that email exists, we sent a password reset link.',
    })
  } catch (error) {
    console.error('Password reset error:', error)
    // Generic error to prevent information leakage
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 },
    )
  }
}
