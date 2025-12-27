import { NextRequest, NextResponse } from 'next/server'
import { marketplace } from '@madebuy/db'

/**
 * POST /api/marketplace/reviews
 * Create a product review (verified purchase only)
 *
 * Body:
 * {
 *   productId: string
 *   tenantId: string (seller)
 *   buyerId: string (customer email or ID)
 *   orderId: string (verified purchase)
 *   rating: 1 | 2 | 3 | 4 | 5
 *   title: string
 *   comment: string
 *   photos?: string[] (mediaIds)
 *   verified: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.productId || !body.tenantId || !body.buyerId || !body.orderId || !body.rating || !body.title || !body.comment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate rating
    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // TODO: Verify purchase before creating review
    // - Check that orderId exists
    // - Check that order contains this productId
    // - Check that order is completed/delivered
    // - Check that buyerId matches order customer

    const review = await marketplace.createReview({
      productId: body.productId,
      tenantId: body.tenantId,
      buyerId: body.buyerId,
      orderId: body.orderId,
      rating: body.rating,
      title: body.title,
      comment: body.comment,
      photos: body.photos || [],
      verified: body.verified || false,
      helpful: 0,
      notHelpful: 0,
      status: 'pending' as const,
    })

    return NextResponse.json({
      success: true,
      review,
    })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/marketplace/reviews
 * List reviews for a product
 *
 * Query params:
 * - productId: string (required)
 * - page?: number (default: 1)
 * - limit?: number (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10

    const { reviews, total } = await marketplace.listProductReviews(productId, page, limit)

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}
