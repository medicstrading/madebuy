import { orders, pieces, reviews, tenants } from '@madebuy/db'
import type { CreateReviewInput } from '@madebuy/shared'
import { safeValidateCreateReview, sanitizeInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/rate-limit'

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

    // Validate and clamp limit
    let limit = parseInt(searchParams.get('limit') || '20', 10)
    if (Number.isNaN(limit) || limit < 1) limit = 20
    if (limit > 100) limit = 100

    // Validate and clamp offset
    let offset = parseInt(searchParams.get('offset') || '0', 10)
    if (Number.isNaN(offset) || offset < 0) offset = 0

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
  // REV-01 FIX: Apply rate limiting
  const rateLimitResult = await rateLimiters.reviews(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

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

    // REV-02 FIX: Derive tenantId from piece lookup instead of trusting request body
    // This prevents tenantId spoofing attacks
    const piece = await pieces.getPieceById(pieceId)
    if (!piece) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 },
      )
    }
    const tenantId = piece.tenantId

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

    // REV-04 FIX: Check if customer has already reviewed this product
    // Use customer email to prevent duplicate reviews (not just orderId+pieceId)
    const alreadyReviewedByCustomer = await reviews.hasCustomerReviewedPiece(
      tenantId,
      pieceId,
      customerEmail,
    )
    if (alreadyReviewedByCustomer) {
      return NextResponse.json(
        { error: 'You have already reviewed this product.' },
        { status: 400 },
      )
    }

    // Validate photo URLs - only allow HTTPS URLs from R2 bucket
    const R2_BUCKET_DOMAIN = process.env.R2_PUBLIC_URL || ''
    const validatedPhotos = (photos || [])
      .filter((url) => {
        // Must be HTTPS
        if (!url.startsWith('https://')) {
          console.warn(`Rejected non-HTTPS photo URL: ${url}`)
          return false
        }
        // Reject javascript:, data:, etc.
        if (url.match(/^(javascript|data|vbscript|file):/i)) {
          console.warn(`Rejected dangerous photo URL: ${url}`)
          return false
        }
        // Only allow URLs from R2 bucket domain
        if (R2_BUCKET_DOMAIN && !url.startsWith(R2_BUCKET_DOMAIN)) {
          console.warn(
            `Rejected photo URL not from R2 bucket: ${url} (expected ${R2_BUCKET_DOMAIN})`,
          )
          return false
        }
        return true
      })
      .map((url, index) => ({
        id: `photo-${index}`,
        url,
      }))

    // Create the review (sanitize all text inputs)
    const reviewInput: CreateReviewInput = {
      pieceId,
      orderId,
      customerId: customerEmail, // REV-04 FIX: Track customerId to prevent duplicates
      customerEmail: sanitizeInput(customerEmail),
      customerName: sanitizeInput(customerName || order.customerName),
      rating,
      title: title ? sanitizeInput(title) : undefined,
      text: sanitizeInput(text),
      photos: validatedPhotos,
    }

    // REV-05 FIX: Pass order to determine verified purchase status
    const review = await reviews.createReview(tenantId, reviewInput, order)

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 },
    )
  }
}
