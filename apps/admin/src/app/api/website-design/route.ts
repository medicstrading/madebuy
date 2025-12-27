import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { tenants } from '@madebuy/db'
import { validateWebsiteDesignUpdate, canUseBlog } from '@/lib/website-design'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      primaryColor: tenant.primaryColor,
      accentColor: tenant.accentColor,
      websiteDesign: tenant.websiteDesign,
    })
  } catch (error) {
    console.error('Failed to get website design:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { primaryColor, accentColor, banner, typography, layout, layoutContent, blog } = body

    // Get current tenant to merge websiteDesign
    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Validate plan access for the requested features
    const validation = validateWebsiteDesignUpdate(tenant, {
      primaryColor,
      accentColor,
      banner,
      typography,
      layout,
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 403 }
      )
    }

    // Validate blog access separately
    if (blog !== undefined) {
      if (!canUseBlog(tenant)) {
        return NextResponse.json(
          { error: 'Blog feature requires Business plan or higher.' },
          { status: 403 }
        )
      }
    }

    // Build update object
    const updateData: any = {}

    if (primaryColor) {
      updateData.primaryColor = primaryColor
    }

    if (accentColor) {
      updateData.accentColor = accentColor
    }

    // Merge websiteDesign fields
    const currentDesign = tenant.websiteDesign || {}
    const updatedDesign: any = { ...currentDesign }

    if (banner !== undefined) {
      updatedDesign.banner = banner
    }

    if (typography !== undefined) {
      updatedDesign.typography = typography
    }

    if (layout !== undefined) {
      updatedDesign.layout = layout
    }

    if (layoutContent !== undefined) {
      updatedDesign.layoutContent = layoutContent
    }

    if (blog !== undefined) {
      updatedDesign.blog = blog
    }

    // Only update websiteDesign if any field changed
    if (banner !== undefined || typography !== undefined || layout !== undefined || layoutContent !== undefined || blog !== undefined) {
      updateData.websiteDesign = updatedDesign
    }

    // Update tenant
    await tenants.updateTenant(user.id, updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update website design:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
