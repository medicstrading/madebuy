'use client'

import { useState, useEffect, useCallback } from 'react'
import { Star, ChevronDown, Loader2, MessageSquare } from 'lucide-react'
import { ReviewCard } from './ReviewCard'
import { ReviewStars } from './ReviewStars'
import type { Review, ProductReviewStats } from '@madebuy/shared'

interface ReviewsListProps {
  tenantId: string
  pieceId: string
  /** Initial reviews (for SSR) */
  initialReviews?: Review[]
  /** Initial stats (for SSR) */
  initialStats?: ProductReviewStats
  /** Number of reviews to load per page */
  pageSize?: number
}

interface ReviewsResponse {
  reviews: Review[]
  stats: ProductReviewStats
}

/**
 * ReviewsList - Display a list of reviews with rating breakdown and pagination
 *
 * Features:
 * - Rating summary with breakdown bars
 * - Sort by most recent or highest rated
 * - Filter by star rating
 * - Load more pagination
 * - Helpful/report actions
 */
export function ReviewsList({
  tenantId,
  pieceId,
  initialReviews = [],
  initialStats,
  pageSize = 10,
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [stats, setStats] = useState<ProductReviewStats | null>(initialStats || null)
  const [isLoading, setIsLoading] = useState(!initialReviews.length)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(initialReviews.length)
  const [sortBy, setSortBy] = useState<'createdAt' | 'rating'>('createdAt')
  const [filterRating, setFilterRating] = useState<number | null>(null)

  // Fetch reviews
  const fetchReviews = useCallback(async (
    currentOffset: number,
    append: boolean = false
  ) => {
    try {
      const params = new URLSearchParams({
        tenantId,
        pieceId,
        limit: String(pageSize),
        offset: String(currentOffset),
      })

      const response = await fetch(`/api/reviews?${params}`)
      if (!response.ok) throw new Error('Failed to fetch reviews')

      const data: ReviewsResponse = await response.json()

      if (append) {
        setReviews(prev => [...prev, ...data.reviews])
      } else {
        setReviews(data.reviews)
      }

      setStats(data.stats)
      setHasMore(data.reviews.length === pageSize)
      setOffset(currentOffset + data.reviews.length)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }, [tenantId, pieceId, pageSize])

  // Initial load if no initial data
  useEffect(() => {
    if (initialReviews.length === 0) {
      setIsLoading(true)
      fetchReviews(0).finally(() => setIsLoading(false))
    }
  }, [fetchReviews, initialReviews.length])

  // Load more reviews
  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    await fetchReviews(offset, true)
    setIsLoadingMore(false)
  }

  // Handle helpful click
  const handleHelpful = async (reviewId: string) => {
    try {
      await fetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' })
      setReviews(prev =>
        prev.map(r =>
          r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
        )
      )
    } catch (error) {
      console.error('Error marking review helpful:', error)
    }
  }

  // Handle report click
  const handleReport = async (reviewId: string) => {
    try {
      await fetch(`/api/reviews/${reviewId}/report`, { method: 'POST' })
      // Could show a toast notification here
    } catch (error) {
      console.error('Error reporting review:', error)
    }
  }

  // Filter reviews by rating
  const filteredReviews = filterRating
    ? reviews.filter(r => r.rating === filterRating)
    : reviews

  // Sort reviews
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortBy === 'rating') {
      return b.rating - a.rating
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-gray-400" />
        <h3 className="mt-3 text-lg font-medium text-gray-900">No reviews yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Be the first to review this product
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Overall Rating */}
          <div className="text-center sm:text-left">
            <div className="text-5xl font-bold text-gray-900">
              {stats.averageRating.toFixed(1)}
            </div>
            <ReviewStars rating={stats.averageRating} size="md" />
            <p className="mt-1 text-sm text-gray-500">
              {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Rating Breakdown */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingBreakdown[rating.toString() as keyof typeof stats.ratingBreakdown]
              const percentage = stats.totalReviews > 0
                ? (count / stats.totalReviews) * 100
                : 0

              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                  className={`flex w-full items-center gap-2 rounded-lg p-1 transition-colors ${
                    filterRating === rating
                      ? 'bg-yellow-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="w-8 text-sm text-gray-600">{rating} star</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm text-gray-500">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-gray-100">
          {stats.verifiedPurchaseCount > 0 && (
            <span className="text-sm text-gray-600">
              {stats.verifiedPurchaseCount} verified {stats.verifiedPurchaseCount === 1 ? 'purchase' : 'purchases'}
            </span>
          )}
          {stats.withPhotosCount > 0 && (
            <span className="text-sm text-gray-600">
              {stats.withPhotosCount} with photos
            </span>
          )}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filterRating && (
            <button
              type="button"
              onClick={() => setFilterRating(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'rating')}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="createdAt">Most Recent</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {sortedReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onHelpful={handleHelpful}
            onReport={handleReport}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && !filterRating && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Load More Reviews
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
