import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { publish } from '@madebuy/db'
import type { PublishRecord } from '@madebuy/shared'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const publishRecord = await publish.getPublishRecord(tenant.id, params.id)

    if (!publishRecord) {
      return NextResponse.json({ error: 'Publish record not found' }, { status: 404 })
    }

    return NextResponse.json({ publishRecord })
  } catch (error) {
    console.error('Error fetching publish record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: Partial<Omit<PublishRecord, 'id' | 'tenantId' | 'createdAt'>> = await request.json()

    // Check if publish record exists
    const existing = await publish.getPublishRecord(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Publish record not found' }, { status: 404 })
    }

    // Update the publish record
    await publish.updatePublishRecord(tenant.id, params.id, data)

    // Fetch updated publish record
    const publishRecord = await publish.getPublishRecord(tenant.id, params.id)

    return NextResponse.json({ publishRecord })
  } catch (error) {
    console.error('Error updating publish record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if publish record exists
    const existing = await publish.getPublishRecord(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Publish record not found' }, { status: 404 })
    }

    await publish.deletePublishRecord(tenant.id, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting publish record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
