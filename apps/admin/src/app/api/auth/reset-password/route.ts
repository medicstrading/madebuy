import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { tenants, passwordResets, auditLog } from '@madebuy/db'
import { validatePassword, ADMIN_PASSWORD_REQUIREMENTS } from '@madebuy/shared'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    // Validate input
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePassword(password, ADMIN_PASSWORD_REQUIREMENTS)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] || 'Password does not meet security requirements' },
        { status: 400 }
      )
    }

    // Validate and consume the reset token
    const tenantId = await passwordResets.validateAndConsumeToken(token)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Get tenant
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10)

    // Update tenant password
    await tenants.updateTenant(tenantId, { passwordHash })

    // Log password reset event
    auditLog.logAuditEvent({
      tenantId: tenant.id,
      eventType: 'auth.password.reset',
      actorId: tenant.id,
      actorEmail: tenant.email,
      actorType: 'tenant',
      success: true,
    }).catch(e => console.error('Audit log failed (password reset):', e))

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
