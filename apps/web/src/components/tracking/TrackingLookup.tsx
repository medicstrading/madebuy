'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'

interface TrackingLookupProps {
  /** Compact mode for header/footer placement */
  compact?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Tracking lookup form component
 * Can be used in header, footer, or standalone
 */
export function TrackingLookup({
  compact = false,
  placeholder = 'Enter tracking number',
  className = '',
}: TrackingLookupProps) {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = trackingNumber.trim()

    if (!trimmed) {
      setError('Please enter a tracking number')
      return
    }

    // Basic validation - tracking numbers are typically alphanumeric
    if (!/^[A-Za-z0-9-_]+$/.test(trimmed)) {
      setError('Invalid tracking number format')
      return
    }

    setIsLoading(true)

    // Navigate to tracking page
    router.push(`/tracking/${encodeURIComponent(trimmed.toUpperCase())}`)
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`}>
        <div className="relative flex-1">
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => {
              setTrackingNumber(e.target.value)
              setError(null)
            }}
            placeholder={placeholder}
            className={`w-full rounded-lg border px-3 py-2 text-sm placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center rounded-lg bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:bg-purple-400"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </form>
    )
  }

  return (
    <div className={`rounded-xl bg-white p-6 shadow-sm ${className}`}>
      <h3 className="font-semibold text-gray-900 mb-4">Track Your Order</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tracking-number" className="block text-sm font-medium text-gray-700 mb-1">
            Tracking Number
          </label>
          <div className="relative">
            <input
              id="tracking-number"
              type="text"
              value={trackingNumber}
              onChange={(e) => {
                setTrackingNumber(e.target.value)
                setError(null)
              }}
              placeholder={placeholder}
              className={`w-full rounded-lg border px-4 py-3 pr-12 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:bg-purple-400 transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Looking up...
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Track Package
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Enter the tracking number from your shipping confirmation email
        </p>
      </form>
    </div>
  )
}
