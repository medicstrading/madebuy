'use client'

import Image from 'next/image'
import { Star, MessageCircle } from 'lucide-react'

interface ProductReviewsProps {
  productId: string
  productName: string
}

export function ProductReviews({ productId, productName }: ProductReviewsProps) {
  // TODO: Fetch actual reviews from database
  const reviews: any[] = []
  const averageRating = 0
  const totalReviews = 0

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
                    <div className="font-semibold text-gray-900">{review.author}</div>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
