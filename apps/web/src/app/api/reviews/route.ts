import { orders, reviews, tenants } from '@madebuy/db'
import type { CreateReviewInput } from '@madebuy/shared'
import { sanitizeInput, safeValidateCreateReview } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/reviews
 * Get approved reviews for a piece (public endpoint)
 * Query params:
 *   - tenantId (required): The tenant ID
 *   - pieceId (required): The piece/product ID
 *   - limit (optional): Max number of reviews (default 20)
 *   - offset (optional): Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const pieceId = searchParams.get('pieceId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (!tenantId || !pieceId) {
      return NextResponse.json(
        { error: 'tenantId and pieceId are required' },
        { status: 400 },
      )
    }

    // Validate tenant exists
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get approved reviews for this piece
    const [pieceReviews, stats] = await Promise.all([
      reviews.listApprovedReviews(tenantId, pieceId, { limit, offset }),
      reviews.getProductReviewStats(tenantId, pieceId),
    ])

    return NextResponse.json({
      reviews: pieceReviews,
      stats,
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/reviews
 * Submit a new product review
 * Requires verified purchase (order containing the product must exist)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate with Zod
    const validation = safeValidateCreateReview(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const {
      pieceId,
      orderId,
      customerEmail,
      customerName,
      rating,
      title,
      text,
      photos,
    } = validation.data

    // Get tenantId from body (not in schema since it's context from URL)
    const tenantId = body.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 },
      )
    }

    // VERIFIED PURCHASE CHECK
    // Get the order and verify it belongs to this customer and contains this product
    const order = await orders.getOrder(tenantId, orderId)

    if (!order) {
      return NextResponse.json(
        {
          error:
            'Order not found. Please purchase this product before reviewing.',
        },
        { status: 403 },
      )
    }

    // Verify customer email matches the order
    if (order.customerEmail.toLowerCase() !== customerEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'This order does not belong to your account.' },
        { status: 403 },
      )
    }

    // Verify the product was in this order
    const productInOrder = order.items.some((item) => item.pieceId === pieceId)
    if (!productInOrder) {
      return NextResponse.json(
        {
          error:
            'This product was not in your order. Verified purchase required.',
        },
        { status: 403 },
      )
    }

    // Verify order is delivered (or at least shipped/completed)
    const validStatuses = ['delivered', 'shipped', 'completed']
    if (!validStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: 'You can only review products from completed orders.' },
        { status: 403 },
      )
    }

    // Check if customer has already reviewed this product for this order
    const alreadyReviewed = await reviews.hasReviewedOrder(
      tenantId,
      orderId,
      pieceId,
    )
    if (alreadyReviewed) {
      return NextResponse.json(
        { error: 'You have already reviewed this product for this order.' },
        { status: 400 },
      )
    }

    // Create the review (sanitize all text inputs)
    const reviewInput: CreateReviewInput = {
      pieceId,
      orderId,
      customerEmail: sanitizeInput(customerEmail),
      customerName: sanitizeInput(customerName || order.customerName),
      rating,
      title: title ? sanitizeInput(title) : undefined,
      text: sanitizeInput(text),
      photos: (photos || []).map((url, index) => ({ id: `photo-${index}`, url })),
    }

    const review = await reviews.createReview(tenantId, reviewInput)

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 },
    )
  }
}
