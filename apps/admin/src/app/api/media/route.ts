import { media } from '@madebuy/db'
import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allMedia = await media.listMedia(tenant.id)

    return NextResponse.json({ media: allMedia })
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
