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

    return NextResponse.json({ sellers })
  } catch (error) {
    console.error('Error fetching top sellers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sellers' },
      { status: 500 }
    )
  }
}
