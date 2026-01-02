import { NextRequest, NextResponse } from 'next/server'
import { marketplace } from '@madebuy/db'

/**
 * GET /api/marketplace/sellers
 * Get top sellers
 *
 * Query params:
 * - limit?: number (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10

    const sellers = await marketplace.getTopSellers(limit)

    // Cache for 5 min, serve stale for up to 15 min while revalidating
    return NextResponse.json({ sellers }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      },
    })
  } catch (error) {
    console.error('Error fetching top sellers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sellers' },
      { status: 500 }
    )
  }
}
