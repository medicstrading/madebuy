import { NextRequest, NextResponse } from 'next/server'
import { reviews, orders, marketplace } from '@madebuy/db'
import { rateLimiters } from '@/lib/rate-limit'

/**
 * POST /api/marketplace/reviews
 * Create a product review (verified purchase only)
 *
 * Body:
 * {
 *   pieceId: string
 *   tenantId: string (seller)
 *   orderId: string (verified purchase)
 *   rating: 1 | 2 | 3 | 4 | 5
 *   title?: string
 *   content: string
 *   reviewerName: string
 *   reviewerEmail: string
 *   photos?: string[] (URLs or mediaIds)
 * }
 */
export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per minute (prevent review spam)
  const rateLimitResponse = rateLimiters.reviews(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.pieceId || !body.tenantId || !body.orderId || !body.rating || !body.content || !body.reviewerName || !body.reviewerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: pieceId, tenantId, orderId, rating, content, reviewerName, reviewerEmail' },
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

    // Validate photos (max 5)
    if (body.photos && body.photos.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 photos allowed' },
        { status: 400 }
      )
    }

    // Verify purchase
    const order = await orders.getOrder(body.tenantId, body.orderId)
    let verifiedPurchase = false

    if (order) {
      // Check that order contains this product
      const hasProduct = order.items?.some(item => item.pieceId === body.pieceId)
      // Check that order is delivered or completed
      const isDelivered = ['delivered', 'completed'].includes(order.status)
      // Check that email matches
      const emailMatches = order.customerEmail?.toLowerCase() === body.reviewerEmail.toLowerCase()

      verifiedPurchase = !!(hasProduct && isDelivered && emailMatches)
    }

    // Check if already reviewed
    const hasReviewed = await reviews.hasReviewed(body.tenantId, body.orderId, body.pieceId)
    if (hasReviewed) {
      return NextResponse.json(
        { error: 'You have already reviewed this product for this order' },
        { status: 400 }
      )
    }

    const review = await reviews.createReview(
      body.tenantId,
      {
        pieceId: body.pieceId,
        orderId: body.orderId,
        rating: body.rating,
        title: body.title,
        content: body.content,
        reviewerName: body.reviewerName,
        reviewerEmail: body.reviewerEmail,
        photos: body.photos || [],
      },
      verifiedPurchase
    )

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        rating: review.rating,
        verifiedPurchase: review.verifiedPurchase,
        status: review.status,
      },
      message: verifiedPurchase
        ? 'Review submitted successfully. It will be visible after approval.'
        : 'Review submitted. We could not verify your purchase, but your review will be considered.',
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
 * - pieceId: string (required) - can also use productId for backwards compatibility
 * - tenantId: string (required)
 * - page?: number (default: 1)
 * - limit?: number (default: 10)
 * - rating?: number (filter by rating)
 * - verifiedOnly?: boolean (only verified purchases)
 * - summary?: boolean (include rating summary)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Support both pieceId and productId for backwards compatibility
    const pieceId = searchParams.get('pieceId') || searchParams.get('productId')
    const tenantId = searchParams.get('tenantId')

    if (!pieceId) {
      return NextResponse.json(
        { error: 'pieceId is required' },
        { status: 400 }
      )
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined
    const verifiedOnly = searchParams.get('verifiedOnly') === 'true'
    const includeSummary = searchParams.get('summary') === 'true'

    const { reviews: reviewsList, total } = await reviews.getReviewsByPiece(
      tenantId,
      pieceId,
      {
        page,
        limit,
        rating,
        verifiedPurchase: verifiedOnly || undefined,
      }
    )

    const response: any = {
      reviews: reviewsList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }

    // Include summary if requested
    if (includeSummary) {
      response.summary = await reviews.getReviewSummary(tenantId, pieceId)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/marketplace/reviews
 * Mark a review as helpful
 *
 * Body:
 * {
 *   reviewId: string
 *   action: 'helpful' | 'report'
 * }
 */
export async function PATCH(request: NextRequest) {
  // Rate limit to prevent abuse
  const rateLimitResponse = rateLimiters.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()

    if (!body.reviewId || !body.action) {
      return NextResponse.json(
        { error: 'reviewId and action are required' },
        { status: 400 }
      )
    }

    if (body.action === 'helpful') {
      await reviews.markReviewHelpful(body.reviewId)
    } else if (body.action === 'report') {
      await reviews.reportReview(body.reviewId)
    } else {
      return NextResponse.json(
        { error: 'action must be "helpful" or "report"' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    )
  }
}
