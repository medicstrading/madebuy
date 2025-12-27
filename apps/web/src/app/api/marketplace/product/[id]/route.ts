import { NextRequest, NextResponse } from 'next/server'
import { marketplace } from '@madebuy/db'

/**
 * GET /api/marketplace/product/[id]
 * Get product detail with seller info and reviews
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id

    // Get product with seller info
    const product = await marketplace.getMarketplaceProduct(productId)

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or not listed' },
        { status: 404 }
      )
    }

    // Record view (async, don't wait)
    marketplace.recordMarketplaceView(productId).catch(err =>
      console.error('Failed to record view:', err)
    )

    // Get reviews summary
    const reviewSummary = await marketplace.getProductReviewSummary(productId)

    // Get recent reviews (first page)
    const { reviews } = await marketplace.listProductReviews(productId, 1, 5)

    return NextResponse.json({
      product,
      reviewSummary,
      recentReviews: reviews,
    })
  } catch (error) {
    console.error('Error fetching product detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
