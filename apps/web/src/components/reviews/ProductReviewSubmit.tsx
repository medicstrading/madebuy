'use client'

import { CheckCircle2, Loader2, Mail, Star, XCircle } from 'lucide-react'
import { useState } from 'react'
import { ReviewForm } from './ReviewForm'

interface ProductReviewSubmitProps {
  tenantId: string
  pieceId: string
  pieceName: string
}

type VerificationState =
  | { status: 'idle' }
  | { status: 'verifying' }
  | { status: 'verified'; orderId: string; customerName: string }
  | { status: 'error'; message: string }
  | { status: 'already_reviewed' }
  | { status: 'submitted' }

/**
 * ProductReviewSubmit - Email verification flow for leaving product reviews.
 *
 * Flow:
 * 1. Customer enters email
 * 2. System checks for delivered orders containing this product
 * 3. If verified, show ReviewForm
 * 4. If already reviewed, show message
 * 5. If no purchase, show "not found" message
 */
export function ProductReviewSubmit({
  tenantId,
  pieceId,
  pieceName,
}: ProductReviewSubmitProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<VerificationState>({ status: 'idle' })

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) return

    setState({ status: 'verifying' })

    try {
      const response = await fetch('/api/reviews/verify-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          pieceId,
          email: email.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      if (data.alreadyReviewed) {
        setState({ status: 'already_reviewed' })
      } else if (data.canReview) {
        setState({
          status: 'verified',
          orderId: data.orderId,
          customerName: data.customerName,
        })
      } else {
        setState({
          status: 'error',
          message: data.reason || 'No verified purchase found for this email',
        })
      }
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Verification failed',
      })
    }
  }

  const handleReviewSuccess = () => {
    setState({ status: 'submitted' })
  }

  const handleReset = () => {
    setEmail('')
    setState({ status: 'idle' })
  }

  // Show success message after submission
  if (state.status === 'submitted') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          Thank you for your review!
        </h3>
        <p className="mt-2 text-gray-600">
          Your review has been submitted and is pending approval. Once approved,
          it will appear on this product page.
        </p>
      </div>
    )
  }

  // Show review form after verification
  if (state.status === 'verified') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>Purchase verified for {email}</span>
        </div>
        <ReviewForm
          pieceId={pieceId}
          orderId={state.orderId}
          pieceName={pieceName}
          onSuccess={handleReviewSuccess}
          onCancel={handleReset}
        />
      </div>
    )
  }

  // Already reviewed state
  if (state.status === 'already_reviewed') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <Star className="mx-auto h-10 w-10 text-amber-500 fill-amber-500" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          Already Reviewed
        </h3>
        <p className="mt-2 text-gray-600">
          You have already submitted a review for this product. Thank you!
        </p>
        <button
          onClick={handleReset}
          className="mt-4 text-sm text-blue-600 hover:text-blue-800"
        >
          Try a different email
        </button>
      </div>
    )
  }

  // Error state
  if (state.status === 'error') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="text-center">
          <XCircle className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Purchase Not Found
          </h3>
          <p className="mt-2 text-gray-600">{state.message}</p>
          <p className="mt-2 text-sm text-gray-500">
            Only customers who have received their order can leave a review.
          </p>
          <button
            onClick={handleReset}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            Try a different email
          </button>
        </div>
      </div>
    )
  }

  // Default: email verification form
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="text-center mb-6">
        <Star className="mx-auto h-10 w-10 text-amber-400 fill-amber-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          Write a Review
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Purchased this product? Enter your email to verify and leave a review.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label htmlFor="verify-email" className="sr-only">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="verify-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your order email"
              required
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={state.status === 'verifying' || !email.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 px-4 font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state.status === 'verifying' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Purchase & Write Review'
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        We verify purchases to ensure authentic reviews
      </p>
    </div>
  )
}
