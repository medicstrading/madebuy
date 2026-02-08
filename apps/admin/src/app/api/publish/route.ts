import { publish } from '@madebuy/db'
import type { CreatePublishInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allPublishRecords = await publish.listPublishRecords(tenant.id)

    return NextResponse.json({ publishRecords: allPublishRecords })
  } catch (error) {
    console.error('Error fetching publish records:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check feature gate for social publishing
    if (!tenant.features.socialPublishing) {
      return NextResponse.json(
        { error: 'Social publishing requires a Maker or higher plan' },
        { status: 403 },
      )
    }

    const data: CreatePublishInput = await request.json()

    // Check if tenant has social connections for the requested platforms
    const requestedPlatforms = data.platforms
    const connectedPlatforms =
      tenant.socialConnections?.map((c: any) => c.platform) || []

    // Add website-blog if enabled
    if (tenant.websiteDesign?.blog?.enabled) {
      connectedPlatforms.push('website-blog')
    }

    const missingPlatforms = requestedPlatforms.filter(
      (p) => !connectedPlatforms.includes(p),
    )

    if (missingPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Not connected to platforms: ${missingPlatforms.join(', ')}` },
        { status: 400 },
      )
    }

    const publishRecord = await publish.createPublishRecord(tenant.id, data)

    return NextResponse.json({ publishRecord }, { status: 201 })
  } catch (error) {
    console.error('Error creating publish record:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
