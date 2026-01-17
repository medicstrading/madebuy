'use client'

import { Star } from 'lucide-react'

interface ReviewStarsProps {
  /** Rating value 1-5 */
  rating: number
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the numeric rating */
  showValue?: boolean
  /** Number of reviews (shown after rating) */
  reviewCount?: number
  /** Interactive mode - allows clicking to set rating */
  interactive?: boolean
  /** Callback when rating changes (interactive mode only) */
  onRatingChange?: (rating: number) => void
  /** Current hover state for interactive mode */
  hoverRating?: number
  /** Callback for hover state */
  onHoverChange?: (rating: number) => void
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

/**
 * ReviewStars - Star rating display component
 *
 * Can be used in two modes:
 * 1. Display mode (default) - Shows a read-only star rating
 * 2. Interactive mode - Allows users to select a rating
 */
export function ReviewStars({
  rating,
  size = 'md',
  showValue = false,
  reviewCount,
  interactive = false,
  onRatingChange,
  hoverRating = 0,
  onHoverChange,
}: ReviewStarsProps) {
  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating

  const handleClick = (star: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(star)
    }
  }

  const handleMouseEnter = (star: number) => {
    if (interactive && onHoverChange) {
      onHoverChange(star)
    }
  }

  const handleMouseLeave = () => {
    if (interactive && onHoverChange) {
      onHoverChange(0)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center" onMouseLeave={handleMouseLeave}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayRating
          const isPartial = !isFilled && star - 0.5 <= displayRating

          return (
            <button
              key={star}
              onClick={() => handleClick(star)}
              onMouseEnter={() => handleMouseEnter(star)}
              disabled={!interactive}
              className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded' : 'cursor-default'} p-0.5`}
              aria-label={
                interactive
                  ? `Rate ${star} star${star !== 1 ? 's' : ''}`
                  : undefined
              }
            >
              <Star
                className={`${sizeClasses[size]} ${
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : isPartial
                      ? 'fill-yellow-200 text-yellow-400'
                      : 'fill-gray-200 text-gray-300'
                }`}
              />
            </button>
          )
        })}
      </div>

      {showValue && (
        <span
          className={`${textSizeClasses[size]} font-medium text-gray-700 ml-1`}
        >
          {rating.toFixed(1)}
        </span>
      )}

      {reviewCount !== undefined && (
        <span className={`${textSizeClasses[size]} text-gray-500 ml-1`}>
          ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  )
}

/**
 * Compact star rating for product cards
 */
export function CompactRating({
  rating,
  reviewCount,
}: {
  rating: number
  reviewCount: number
}) {
  if (reviewCount === 0) return null

  return (
    <div className="flex items-center gap-1">
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-medium text-gray-700">
        {rating.toFixed(1)}
      </span>
      <span className="text-sm text-gray-500">({reviewCount})</span>
    </div>
  )
}
