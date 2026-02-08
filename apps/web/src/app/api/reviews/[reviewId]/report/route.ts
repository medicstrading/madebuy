import { reviews } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/rate-limit'

/**
 * REV-03 FIX: POST /api/reviews/[reviewId]/report
 * Report a review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string } },
) {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.reviews(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
    const { reviewId } = params

    // REV-07 FIX: Get voter identifier (IP address)
    const voterId = getVoterId(request)

    // Get the review to verify it exists and get tenantId
    const review = await reviews.getReviewById(reviewId)
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Report the review with voter tracking
    const success = await reviews.reportReview(
      review.tenantId,
      reviewId,
      voterId,
    )

    if (!success) {
      return NextResponse.json(
        { error: 'You have already reported this review' },
        { status: 409 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reporting review:', error)
    return NextResponse.json(
      { error: 'Failed to report review' },
      { status: 500 },
    )
  }
}

/**
 * Get voter identifier from request
 * Uses IP address for anonymous vote tracking
 */
function getVoterId(request: NextRequest): string {
  // Try to get real IP from headers (behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to a header-based fingerprint
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return `ua-${userAgent.substring(0, 50)}`
}
