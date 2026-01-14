'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star, BadgeCheck, Loader2, MessageSquare } from 'lucide-react'
import type { SectionProps } from './SectionRenderer'
import type { Review } from '@madebuy/shared'

// Extended review with product metadata
interface ReviewWithProduct extends Review {
  piece?: {
    name: string
    slug: string
    thumbnail?: string
  }
}

interface RecentReviewsResponse {
  reviews: ReviewWithProduct[]
  stats?: {
    averageRating: number
    totalReviews: number
    ratingBreakdown: Record<string, number>
  }
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ReviewStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

/**
 * ReviewsSection - Display recent approved reviews across all products
 *
 * This section aggregates reviews from all products for this tenant,
 * showing each review with its associated product info.
 */
export function ReviewsSection({ settings, tenant, tenantSlug }: SectionProps) {
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([])
  const [stats, setStats] = useState<RecentReviewsResponse['stats']>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const title = settings.title || 'Customer Reviews'
  const subtitle = settings.subtitle
  const showRatingBreakdown = settings.reviewsShowRatingBreakdown ?? true
  const limit = settings.reviewsLimit || 6
  const layout = settings.reviewsLayout || 'grid'

  useEffect(() => {
    async function fetchReviews() {
      try {
        const params = new URLSearchParams({
          tenantId: tenant.id,
          limit: String(limit),
        })

        const response = await fetch(`/api/reviews/recent?${params}`)
        if (!response.ok) throw new Error('Failed to load reviews')

        const data: RecentReviewsResponse = await response.json()
        setReviews(data.reviews)
        setStats(data.stats)
      } catch (err) {
        console.error('Error fetching reviews:', err)
        setError('Unable to load reviews')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReviews()
  }, [tenant.id, limit])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error || reviews.length === 0) {
    return null // Don't show section if no reviews
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Section Header */}
      <div className="text-center mb-10 md:mb-14">
        <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </div>

      {/* Rating Summary */}
      {showRatingBreakdown && stats && stats.totalReviews > 0 && (
        <div className="mb-10 flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-900">
              {stats.averageRating.toFixed(1)}
            </div>
            <ReviewStars rating={Math.round(stats.averageRating)} size="md" />
            <p className="mt-1 text-sm text-gray-600">
              {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Rating Bars */}
          <div className="flex-1 max-w-xs space-y-1.5">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingBreakdown[String(rating)] || 0
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0

              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="w-3 text-xs text-gray-600">{rating}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-6 text-xs text-gray-500 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reviews Grid/List */}
      <div className={
        layout === 'list'
          ? 'space-y-6'
          : 'grid md:grid-cols-2 lg:grid-cols-3 gap-6'
      }>
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Product Info */}
            {review.piece && (
              <Link
                href={`/${tenantSlug}/product/${review.piece.slug}`}
                className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 group"
              >
                {review.piece.thumbnail ? (
                  <img
                    src={review.piece.thumbnail}
                    alt={review.piece.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: tenant.primaryColor || '#3b82f6' }}
                  >
                    {review.piece.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {review.piece.name}
                </span>
              </Link>
            )}

            {/* Rating & Verified Badge */}
            <div className="flex items-center justify-between mb-3">
              <ReviewStars rating={review.rating} />
              {review.isVerifiedPurchase && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <BadgeCheck className="h-4 w-4" />
                  <span className="text-xs font-medium">Verified</span>
                </span>
              )}
            </div>

            {/* Title */}
            {review.title && (
              <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
            )}

            {/* Review Text */}
            <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">
              {review.text}
            </p>

            {/* Photos */}
            {review.photos && review.photos.length > 0 && (
              <div className="mt-3 flex gap-2">
                {review.photos.slice(0, 3).map((photo) => (
                  <div
                    key={photo.id}
                    className="h-14 w-14 overflow-hidden rounded-lg border border-gray-200"
                  >
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.caption || 'Review photo'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
                {review.photos.length > 3 && (
                  <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium">
                    +{review.photos.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* Seller Response Preview */}
            {review.sellerResponse && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Seller Response</p>
                <p className="text-sm text-gray-600 line-clamp-2">{review.sellerResponse}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">{review.customerName}</span>
              <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
