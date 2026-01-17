import { previews, tenants } from '@madebuy/db'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

/**
 * POST /api/onboarding/design/preview
 * Creates a preview from the latest scan result
 */
export async function POST(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant
    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check if we have a scan result
    const designImport = tenant.domainOnboarding?.designImport
    if (!designImport?.extractedDesign || !designImport.sourceUrl) {
      return NextResponse.json(
        { error: 'No scan result available. Please scan a website first.' },
        { status: 400 },
      )
    }

    // Create preview
    const preview = await previews.createPreview(
      tenant.id,
      designImport.extractedDesign,
      designImport.sourceUrl,
    )

    // Build preview URL
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3301'
    const previewUrl = `${baseUrl}/preview/${preview.id}`

    return NextResponse.json({
      success: true,
      previewId: preview.id,
      previewUrl,
      expiresAt: preview.expiresAt,
    })
  } catch (error) {
    console.error('Preview generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/onboarding/design/preview
 * Gets the current preview status
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get latest preview for tenant
    const preview = await previews.getLatestPreviewForTenant(user.id)

    if (!preview) {
      return NextResponse.json({
        hasPreview: false,
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3301'
    const previewUrl = `${baseUrl}/preview/${preview.id}`

    return NextResponse.json({
      hasPreview: true,
      previewId: preview.id,
      previewUrl,
      sourceUrl: preview.sourceUrl,
      expiresAt: preview.expiresAt,
    })
  } catch (error) {
    console.error('Get preview error:', error)
    return NextResponse.json(
      { error: 'Failed to get preview' },
      { status: 500 },
    )
  }
}
