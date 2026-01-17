import { reviews } from '@madebuy/db'
import type { ReviewStatus } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ReviewStatus | null
    const pieceId = searchParams.get('pieceId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const allReviews = await reviews.listReviews(tenant.id, {
      filters: {
        ...(status && { status }),
        ...(pieceId && { pieceId }),
      },
      limit,
      offset,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })

    return NextResponse.json({ reviews: allReviews })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
