import { Star, ThumbsUp } from 'lucide-react'
import type { MarketplaceReview } from '@madebuy/shared'

interface ReviewCardProps {
  review: Partial<MarketplaceReview>
}

export function ReviewCard({ review }: ReviewCardProps) {
  const {
    rating = 5,
    title,
    comment,
    photos,
    verified,
    helpful = 0,
    createdAt,
    sellerResponse,
  } = review

  const timeAgo = createdAt
    ? formatTimeAgo(new Date(createdAt))
    : 'Recently'

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          {/* Rating */}
          <div className="mb-1 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Title */}
          {title && <div className="font-semibold text-gray-900">{title}</div>}
        </div>

        {/* Date */}
        <span className="text-sm text-gray-500">{timeAgo}</span>
      </div>

      {/* Comment */}
      {comment && <p className="mb-3 text-gray-700">{comment}</p>}

      {/* Photos */}
      {photos && photos.length > 0 && (
        <div className="mb-3 flex gap-2">
          {photos.map((photoId) => (
            <div
              key={photoId}
              className="h-20 w-20 rounded-lg bg-gray-100"
            >
              {/* TODO: Display actual review photos */}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-200"></div>
          <div className="text-sm">
            <span className="text-gray-600">Customer Name</span>
            {verified && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Verified Purchase
              </span>
            )}
          </div>
        </div>

        {/* Helpful button */}
        <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
          <ThumbsUp className="h-4 w-4" />
          <span>Helpful {helpful > 0 && `(${helpful})`}</span>
        </button>
      </div>

      {/* Seller Response */}
      {sellerResponse && (
        <div className="mt-4 rounded-lg bg-blue-50 p-4">
          <div className="mb-2 text-sm font-semibold text-gray-900">
            Seller Response
          </div>
          <p className="text-sm text-gray-700">{sellerResponse.comment}</p>
          <div className="mt-2 text-xs text-gray-500">
            Responded {formatTimeAgo(new Date(sellerResponse.respondedAt))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`
  return `${Math.floor(seconds / 31536000)} years ago`
}
