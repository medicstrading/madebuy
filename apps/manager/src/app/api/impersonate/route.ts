import { auditLog, tenants } from '@madebuy/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createImpersonationToken } from '@/lib/impersonation'
import { getCurrentAdmin, requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Input validation schema
const impersonateSchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required').max(100),
})

// Allowed admin app domains for redirect URL validation
const ALLOWED_ADMIN_DOMAINS = [
  'localhost:3300',
  'localhost:3301',
  'admin.madebuy.com.au',
  'admin.madebuy.online',
]

function getValidatedAdminUrl(): string {
  const url = process.env.ADMIN_APP_URL || 'http://localhost:3300'
  try {
    const parsed = new URL(url)
    const hostPort = parsed.port ? `${parsed.host}` : parsed.host
    if (!ALLOWED_ADMIN_DOMAINS.some((d) => hostPort.includes(d))) {
      console.warn(`ADMIN_APP_URL "${url}" not in allowed domains, using default`)
      return 'http://localhost:3300'
    }
    return url
  } catch {
    return 'http://localhost:3300'
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()

    // RBAC: Only owner role can impersonate (support role cannot)
    if (admin.role !== 'owner') {
      await auditLog.logAuditEvent({
        eventType: 'admin.impersonate.start',
        actorId: admin.id,
        actorType: 'admin',
        metadata: {
          description: `Unauthorized impersonation attempt by ${admin.name} (role: ${admin.role})`,
          adminEmail: admin.email,
        },
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: false,
        errorMessage: 'Insufficient privileges',
      })
      return NextResponse.json(
        { error: 'Insufficient privileges to impersonate' },
        { status: 403 },
      )
    }

    // Parse and validate input
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      )
    }

    const parsed = impersonateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 },
      )
    }

    const { tenantId } = parsed.data

    // Verify tenant exists
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Create impersonation token
    const token = await createImpersonationToken({
      tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
    })

    // Log the impersonation attempt (use first IP from x-forwarded-for to avoid spoofing)
    await auditLog.logAuditEvent({
      eventType: 'admin.impersonate.start',
      actorId: admin.id,
      actorType: 'admin',
      tenantId,
      metadata: {
        description: `Admin ${admin.name} started impersonation of ${tenant.businessName}`,
        adminEmail: admin.email,
        tenantEmail: tenant.email,
        tenantSlug: tenant.slug,
      },
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    })

    // Return redirect URL with token (validated domain)
    const adminUrl = getValidatedAdminUrl()
    const redirectUrl = `${adminUrl}/impersonate?token=${encodeURIComponent(token)}`

    return NextResponse.json({
      success: true,
      redirectUrl,
      tenantId,
      businessName: tenant.businessName,
    })
  } catch (error) {
    console.error('Impersonation error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to create impersonation session' },
      { status: 500 },
    )
  }
}
