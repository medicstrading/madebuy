import { orders, reviews, tenants } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/reviews/verify-purchase
 * Verify if a customer can review a specific product.
 * Checks if they have a delivered order containing that product.
 *
 * Body:
 *   - tenantId (required): The tenant ID
 *   - pieceId (required): The piece/product ID to review
 *   - email (required): Customer email to verify
 *
 * Returns:
 *   - canReview: boolean
 *   - orderId: string (if canReview is true)
 *   - alreadyReviewed: boolean (if they've already left a review)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, pieceId, email } = body

    // Validate required fields
    if (!tenantId || !pieceId || !email) {
      return NextResponse.json(
        { error: 'tenantId, pieceId, and email are required' },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      )
    }

    // Validate tenant exists
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Find a delivered order with this product
    const order = await orders.findDeliveredOrderWithProduct(
      tenantId,
      email,
      pieceId,
    )

    if (!order) {
      return NextResponse.json({
        canReview: false,
        reason: 'No verified purchase found for this product',
      })
    }

    // Check if customer has already reviewed this product for this order
    const alreadyReviewed = await reviews.hasReviewedOrder(
      tenantId,
      order.id,
      pieceId,
    )

    if (alreadyReviewed) {
      return NextResponse.json({
        canReview: false,
        alreadyReviewed: true,
        reason: 'You have already reviewed this product',
      })
    }

    // Customer can review
    return NextResponse.json({
      canReview: true,
      orderId: order.id,
      customerName: order.customerName,
    })
  } catch (error) {
    console.error('Error verifying purchase:', error)
    return NextResponse.json(
      { error: 'Failed to verify purchase' },
      { status: 500 },
    )
  }
}
