import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { media } from '@madebuy/db'
import { UpdateMediaInput } from '@madebuy/shared'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mediaItem = await media.getMedia(tenant.id, params.id)

    if (!mediaItem) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    return NextResponse.json({ media: mediaItem })
  } catch (error) {
    console.error('Error fetching media:', error)
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

    const data: UpdateMediaInput = await request.json()

    // Check if media exists
    const existing = await media.getMedia(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Update the media
    await media.updateMedia(tenant.id, params.id, data)

    // Fetch updated media
    const mediaItem = await media.getMedia(tenant.id, params.id)

    return NextResponse.json({ media: mediaItem })
  } catch (error) {
    console.error('Error updating media:', error)
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

    // Check if media exists
    const existing = await media.getMedia(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    await media.deleteMedia(tenant.id, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
