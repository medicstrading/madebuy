import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'
import { wishlists, pieces } from '@madebuy/db'
import { rateLimiters } from '@/lib/rate-limit'

const VISITOR_COOKIE = 'mb_visitor_id'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Get or create visitor ID from cookies
 */
async function getVisitorId(): Promise<string> {
  const cookieStore = await cookies()
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value

  if (!visitorId) {
    visitorId = nanoid()
  }

  return visitorId
}

/**
 * GET /api/wishlist
 * Get current visitor's wishlist
 *
 * Query params:
 * - pieceId?: string (check if specific piece is in wishlist)
 */
export async function GET(request: NextRequest) {
  try {
    const visitorId = await getVisitorId()
    const searchParams = request.nextUrl.searchParams
    const pieceId = searchParams.get('pieceId')

    // Check if specific piece is in wishlist
    if (pieceId) {
      const isWishlisted = await wishlists.isInWishlist(visitorId, pieceId)
      return NextResponse.json({ isWishlisted })
    }

    // Get full wishlist
    const wishlistItems = await wishlists.getWishlist(visitorId)

    // Optionally enrich with piece details
    const enriched = searchParams.get('enrich') === 'true'
    if (enriched && wishlistItems.length > 0) {
      const pieceIds = wishlistItems.map(item => item.pieceId)
      const enrichedItems = await Promise.all(
        wishlistItems.map(async (item) => {
          const piece = await pieces.getPiece(item.tenantId, item.pieceId)
          return {
            ...item,
            piece: piece ? {
              id: piece.id,
              name: piece.name,
              price: piece.price,
              mediaIds: piece.mediaIds || [],
              primaryMediaId: piece.primaryMediaId,
              slug: piece.slug,
            } : null
          }
        })
      )
      return NextResponse.json({ items: enrichedItems, count: wishlistItems.length })
    }

    return NextResponse.json({
      items: wishlistItems,
      count: wishlistItems.length,
    })
  } catch (error) {
    console.error('Error fetching wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/wishlist
 * Add item to wishlist
 *
 * Body:
 * {
 *   pieceId: string
 *   tenantId: string
 * }
 */
export async function POST(request: NextRequest) {
  // Rate limit: 30 requests per minute
  const rateLimitResponse = rateLimiters.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const visitorId = await getVisitorId()
    const body = await request.json()

    if (!body.pieceId || !body.tenantId) {
      return NextResponse.json(
        { error: 'pieceId and tenantId are required' },
        { status: 400 }
      )
    }

    const item = await wishlists.addToWishlist({
      visitorId,
      pieceId: body.pieceId,
      tenantId: body.tenantId,
    })

    // Set visitor cookie if not already set
    const response = NextResponse.json({
      success: true,
      item,
    })

    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/wishlist
 * Remove item from wishlist
 *
 * Query params:
 * - pieceId: string (required)
 */
export async function DELETE(request: NextRequest) {
  // Rate limit: 30 requests per minute
  const rateLimitResponse = rateLimiters.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const visitorId = await getVisitorId()
    const searchParams = request.nextUrl.searchParams
    const pieceId = searchParams.get('pieceId')

    if (!pieceId) {
      return NextResponse.json(
        { error: 'pieceId is required' },
        { status: 400 }
      )
    }

    const removed = await wishlists.removeFromWishlist(visitorId, pieceId)

    return NextResponse.json({
      success: true,
      removed,
    })
  } catch (error) {
    console.error('Error removing from wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    )
  }
}
