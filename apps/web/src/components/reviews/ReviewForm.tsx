'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Star, Upload, X, Loader2, Send } from 'lucide-react'

interface ReviewFormProps {
  pieceId: string
  orderId: string
  pieceName?: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface PhotoUpload {
  id: string
  file: File
  preview: string
}

interface ReviewDraft {
  rating: number
  title: string
  text: string
  savedAt: number
}

/**
 * Generate localStorage key for review draft
 */
function getDraftKey(pieceId: string, orderId: string): string {
  return `review_draft_${pieceId}_${orderId}`
}

/**
 * ReviewForm - Customer product review submission
 *
 * Key behaviors:
 * - No default star rating (user must explicitly select)
 * - Rating is required to submit
 * - Minimum 10 characters for review text
 * - Optional photo uploads
 * - Auto-saves draft to localStorage (recovered on return)
 */
export function ReviewForm({
  pieceId,
  orderId,
  pieceName,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  // Rating starts at 0 (no selection) - not 1
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<PhotoUpload[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState({
    rating: false,
    text: false,
  })
  const [draftRestored, setDraftRestored] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get draft key for this specific piece/order
  const draftKey = getDraftKey(pieceId, orderId)

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        const draft: ReviewDraft = JSON.parse(saved)
        // Only restore if draft is less than 7 days old
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - draft.savedAt < sevenDaysMs) {
          if (draft.rating) setRating(draft.rating)
          if (draft.title) setTitle(draft.title)
          if (draft.text) setText(draft.text)
          setDraftRestored(true)
          // Auto-hide the restored message after 5 seconds
          setTimeout(() => setDraftRestored(false), 5000)
        } else {
          // Clear stale draft
          localStorage.removeItem(draftKey)
        }
      }
    } catch (e) {
      // Ignore localStorage errors
      console.warn('Failed to restore review draft:', e)
    }
  }, [draftKey])

  // Auto-save draft to localStorage (debounced)
  const saveDraft = useCallback(() => {
    // Only save if there's something to save
    if (rating === 0 && !title.trim() && !text.trim()) {
      localStorage.removeItem(draftKey)
      return
    }

    const draft: ReviewDraft = {
      rating,
      title,
      text,
      savedAt: Date.now(),
    }

    try {
      localStorage.setItem(draftKey, JSON.stringify(draft))
    } catch (e) {
      // Ignore storage full or other errors
      console.warn('Failed to save review draft:', e)
    }
  }, [draftKey, rating, title, text])

  // Debounced save on changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(saveDraft, 1000) // Save after 1 second of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [saveDraft])

  // Clear draft on successful submission
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey)
  }, [draftKey])

  // Validation
  const isRatingValid = rating >= 1 && rating <= 5
  const isTextValid = text.trim().length >= 10
  const canSubmit = isRatingValid && isTextValid && !isSubmitting

  // Show validation errors after field is touched
  const showRatingError = touched.rating && !isRatingValid
  const showTextError = touched.text && !isTextValid

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newPhotos: PhotoUpload[] = []
    for (let i = 0; i < files.length && photos.length + newPhotos.length < 5; i++) {
      const file = files[i]
      if (file.size > 5 * 1024 * 1024) {
        setError('Photos must be under 5MB each')
        continue
      }
      newPhotos.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      })
    }

    setPhotos(prev => [...prev, ...newPhotos])
    e.target.value = '' // Reset input
  }

  const handlePhotoRemove = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id)
      if (photo) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter(p => p.id !== id)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched to show validation errors
    setTouched({ rating: true, text: true })

    if (!canSubmit) {
      if (!isRatingValid) {
        setError('Please select a star rating')
      } else if (!isTextValid) {
        setError('Review must be at least 10 characters')
      }
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // TODO: Upload photos to R2 first if any
      // For now, submit without photos

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pieceId,
          orderId,
          rating,
          title: title.trim() || undefined,
          text: text.trim(),
          // photos would be added here after R2 upload
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit review')
      }

      // Cleanup photo previews
      photos.forEach(p => URL.revokeObjectURL(p.preview))

      // Clear the saved draft on successful submission
      clearDraft()

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Write a Review</h2>
        {pieceName && (
          <p className="mt-1 text-sm text-gray-500">
            Share your thoughts about <span className="font-medium">{pieceName}</span>
          </p>
        )}
      </div>

      {/* Draft Restored Message */}
      {draftRestored && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-800">
            Your previous draft has been restored.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Star Rating - No default selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <div
          className="flex gap-1"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setRating(star)
                setTouched(prev => ({ ...prev, rating: true }))
                setError(null)
              }}
              onMouseEnter={() => setHoverRating(star)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              <Star
                className={`h-8 w-8 ${
                  star <= displayRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        {showRatingError && (
          <p className="mt-1 text-sm text-red-600">Please select a rating</p>
        )}
        {rating === 0 && !showRatingError && (
          <p className="mt-1 text-sm text-gray-500">Click a star to rate</p>
        )}
        {rating > 0 && (
          <p className="mt-1 text-sm text-gray-600">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        )}
      </div>

      {/* Title (optional) */}
      <div>
        <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-1">
          Title (optional)
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your experience"
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Review Text */}
      <div>
        <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 mb-1">
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => setTouched(prev => ({ ...prev, text: true }))}
          placeholder="Tell us what you liked or didn't like about this product..."
          rows={4}
          minLength={10}
          maxLength={2000}
          className={`w-full rounded-lg border px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
            showTextError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }`}
        />
        <div className="mt-1 flex justify-between text-sm">
          <span className={showTextError ? 'text-red-600' : 'text-gray-500'}>
            {showTextError
              ? `At least 10 characters required (${text.trim().length}/10)`
              : `${text.trim().length}/2000 characters`}
          </span>
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photos (optional)
        </label>
        <div className="flex flex-wrap gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.preview}
                alt="Review photo"
                className="h-20 w-20 rounded-lg object-cover border border-gray-200"
              />
              <button
                type="button"
                onClick={() => handlePhotoRemove(photo.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < 5 && (
            <label className="h-20 w-20 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer transition-colors">
              <Upload className="h-5 w-5 text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">Add</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoAdd}
                className="sr-only"
              />
            </label>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Up to 5 photos, max 5MB each
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Review
            </>
          )}
        </button>
      </div>

      {/* Validation Summary */}
      {!canSubmit && (touched.rating || touched.text) && (
        <p className="text-center text-sm text-gray-500">
          {!isRatingValid && !isTextValid && 'Please select a rating and write your review'}
          {!isRatingValid && isTextValid && 'Please select a star rating'}
          {isRatingValid && !isTextValid && 'Please write at least 10 characters'}
        </p>
      )}
    </form>
  )
}
