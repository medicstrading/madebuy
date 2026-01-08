import { NextRequest, NextResponse } from 'next/server'
import { reviews, orders } from '@madebuy/db'
import type { CreateReviewInput } from '@madebuy/shared'

/**
 * POST /api/reviews
 * Submit a new product review
 * Requires verified purchase (order containing the product must exist)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tenantId,
      pieceId,
      orderId,
      customerEmail,
      customerName,
      rating,
      title,
      text,
      photos,
    } = body

    // Validate required fields
    if (!tenantId || !pieceId || !orderId || !customerEmail || !rating || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate rating is 1-5
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate text length
    if (text.length < 10) {
      return NextResponse.json(
        { error: 'Review text must be at least 10 characters' },
        { status: 400 }
      )
    }

    // VERIFIED PURCHASE CHECK
    // Get the order and verify it belongs to this customer and contains this product
    const order = await orders.getOrder(tenantId, orderId)

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found. Please purchase this product before reviewing.' },
        { status: 403 }
      )
    }

    // Verify customer email matches the order
    if (order.customerEmail.toLowerCase() !== customerEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'This order does not belong to your account.' },
        { status: 403 }
      )
    }

    // Verify the product was in this order
    const productInOrder = order.items.some(item => item.pieceId === pieceId)
    if (!productInOrder) {
      return NextResponse.json(
        { error: 'This product was not in your order. Verified purchase required.' },
        { status: 403 }
      )
    }

    // Verify order is delivered (or at least shipped/completed)
    const validStatuses = ['delivered', 'shipped', 'completed']
    if (!validStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: 'You can only review products from completed orders.' },
        { status: 403 }
      )
    }

    // Check if customer has already reviewed this product for this order
    const alreadyReviewed = await reviews.hasReviewedOrder(tenantId, orderId, pieceId)
    if (alreadyReviewed) {
      return NextResponse.json(
        { error: 'You have already reviewed this product for this order.' },
        { status: 400 }
      )
    }

    // Create the review
    const reviewInput: CreateReviewInput = {
      pieceId,
      orderId,
      customerEmail,
      customerName: customerName || order.customerName,
      rating,
      title,
      text,
      photos: photos || [],
    }

    const review = await reviews.createReview(tenantId, reviewInput)

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    )
  }
}
