'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Star, MessageCircle, Loader2 } from 'lucide-react'

interface Review {
  id: string
  rating: number
  title?: string
  content: string
  buyerName: string
  buyerEmail?: string
  verified: boolean
  images?: string[]
  createdAt: string
  sellerResponse?: {
    content: string
    respondedAt: string
  }
}

interface ReviewSummary {
  averageRating: number
  totalReviews: number
  distribution: Record<number, number>
}

interface ProductReviewsProps {
  productId: string
  productName: string
  initialReviews?: Review[]
  initialSummary?: ReviewSummary
}

export function ProductReviews({
  productId,
  productName,
  initialReviews = [],
  initialSummary,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [summary, setSummary] = useState<ReviewSummary | null>(initialSummary || null)
  const [loading, setLoading] = useState(!initialReviews.length && !initialSummary)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Fetch reviews if not provided
  useEffect(() => {
    if (initialReviews.length > 0 || initialSummary) return

    async function fetchReviews() {
      try {
        const res = await fetch(`/api/marketplace/product/${productId}`)
        if (res.ok) {
          const data = await res.json()
          setReviews(data.recentReviews || [])
          setSummary(data.reviewSummary || null)
        }
      } catch (error) {
        console.error('Error fetching reviews:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [productId, initialReviews.length, initialSummary])

  const averageRating = summary?.averageRating || 0
  const totalReviews = summary?.totalReviews || 0

  if (loading) {
    return (
      <section className="py-12 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>

        {/* Reviews Summary */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Rating Display */}
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {totalReviews > 0 ? averageRating.toFixed(1) : '–'}
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    className={`${
                      star <= averageRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-gray-600">
                {totalReviews === 0
                  ? 'No reviews yet'
                  : `Based on ${totalReviews} review${totalReviews !== 1 ? 's' : ''}`}
              </div>
            </div>

            {/* CTA */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-gray-600 mb-4">
                {totalReviews === 0
                  ? 'Be the first to share your thoughts about this product!'
                  : 'Share your experience with this product'}
              </p>
              <button
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => {
                  // TODO: Open review modal
                  alert('Review submission coming soon!')
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Write a Review
              </button>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review: any) => (
              <div
                key={review.id}
                className="bg-white border border-gray-200 rounded-xl p-6"
              >
                {/* Review Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{review.buyerName}</div>
                    {review.title && (
                      <div className="text-gray-800 font-medium mt-1">{review.title}</div>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={`${
                            star <= review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Review Content */}
                <p className="text-gray-700 mb-3">{review.content}</p>

                {/* Review Images (if any) */}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {review.images.map((img: string, idx: number) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden">
                        <Image
                          src={img}
                          alt={`Review image ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Verified Purchase Badge */}
                {review.verified && (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified Purchase
                  </div>
                )}

                {/* Seller Response */}
                {review.sellerResponse && (
                  <div className="mt-4 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="text-sm font-medium text-blue-800 mb-1">Seller Response</div>
                    <p className="text-sm text-blue-700">{review.sellerResponse.content}</p>
                    <div className="text-xs text-blue-600 mt-2">
                      {new Date(review.sellerResponse.respondedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
