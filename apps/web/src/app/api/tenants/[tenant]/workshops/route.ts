import { workshops } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getTenantBySlug } from '@/lib/tenant'

type RouteContext = {
  params: Promise<{ tenant: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { tenant: tenantSlug } = await context.params
    const tenant = await getTenantBySlug(tenantSlug)

    if (!tenant) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Only return published workshops for public storefront
    const result = await workshops.listWorkshops(
      tenant.id,
      { status: 'published', isPublishedToWebsite: true },
      { limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching workshops:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
