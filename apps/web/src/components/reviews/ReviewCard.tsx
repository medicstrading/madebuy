'use client'

import { BadgeCheck, ThumbsUp, Flag } from 'lucide-react'
import { ReviewStars } from './ReviewStars'
import type { Review } from '@madebuy/shared'

interface ReviewCardProps {
  review: Review
  /** Show the helpful/report buttons */
  showActions?: boolean
  /** Callback when helpful is clicked */
  onHelpful?: (reviewId: string) => void
  /** Callback when report is clicked */
  onReport?: (reviewId: string) => void
}

/**
 * Format a date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * ReviewCard - Display a single customer review
 *
 * Features:
 * - Star rating with ReviewStars component
 * - Verified purchase badge
 * - Review title and content
 * - Optional photo gallery
 * - Seller response section
 * - Helpful count and report actions
 */
export function ReviewCard({
  review,
  showActions = true,
  onHelpful,
  onReport,
}: ReviewCardProps) {
  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0">
      {/* Header: Rating and Verified Badge */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <ReviewStars rating={review.rating} size="sm" />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-900">{review.customerName}</span>
            {review.isVerifiedPurchase && (
              <span className="flex items-center gap-1 text-green-600">
                <BadgeCheck className="h-4 w-4" />
                <span className="text-xs font-medium">Verified Purchase</span>
              </span>
            )}
          </div>
        </div>
        <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="mt-3 font-medium text-gray-900">{review.title}</h4>
      )}

      {/* Review Text */}
      <p className="mt-2 text-gray-700 whitespace-pre-line">{review.text}</p>

      {/* Photos */}
      {review.photos && review.photos.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {review.photos.map((photo) => (
            <div
              key={photo.id}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200"
            >
              <img
                src={photo.thumbnailUrl || photo.url}
                alt={photo.caption || 'Review photo'}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Seller Response */}
      {review.sellerResponse && (
        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Seller Response</span>
            {review.sellerRespondedAt && (
              <span className="text-xs text-gray-500">
                {formatDate(review.sellerRespondedAt)}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600">{review.sellerResponse}</p>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => onHelpful?.(review.id)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ThumbsUp className="h-4 w-4" />
            <span>Helpful</span>
            {review.helpfulCount > 0 && (
              <span className="text-gray-400">({review.helpfulCount})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onReport?.(review.id)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Flag className="h-4 w-4" />
            <span>Report</span>
          </button>
        </div>
      )}
    </div>
  )
}
