'use client'

import { useState } from 'react'
import { Truck, Download, RefreshCw, ExternalLink, CheckCircle } from 'lucide-react'

interface ShippingActionsProps {
  orderId: string
  orderStatus: string
  paymentStatus: string
  isDigitalOnly: boolean
  hasLabel: boolean
  labelUrl?: string
  trackingNumber?: string
}

export function ShippingActions({
  orderId,
  orderStatus,
  paymentStatus,
  isDigitalOnly,
  hasLabel,
  labelUrl,
  trackingNumber,
}: ShippingActionsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedLabel, setGeneratedLabel] = useState<{
    labelUrl: string
    trackingNumber: string
    trackingUrl: string
  } | null>(null)

  // Digital orders don't need shipping
  if (isDigitalOnly) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="text-sm font-medium">Digital order - no shipping required</span>
      </div>
    )
  }

  // Can't ship if not paid
  if (paymentStatus !== 'paid') {
    return (
      <div className="text-sm text-gray-500">
        Order must be paid before shipping.
      </div>
    )
  }

  // Already has a label
  if (hasLabel || generatedLabel) {
    const url = generatedLabel?.labelUrl || labelUrl
    const tracking = generatedLabel?.trackingNumber || trackingNumber

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Shipping label generated</span>
        </div>

        {tracking && (
          <div className="text-sm">
            <span className="text-gray-500">Tracking: </span>
            <span className="font-mono text-gray-900">{tracking}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Download Label
            </a>
          )}
          {generatedLabel?.trackingUrl && (
            <a
              href={generatedLabel.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              Track Package
            </a>
          )}
        </div>
      </div>
    )
  }

  // Show generate button
  const handleGenerateLabel = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/orders/${orderId}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate shipping label')
      }

      setGeneratedLabel({
        labelUrl: data.labelUrl,
        trackingNumber: data.trackingNumber,
        trackingUrl: data.trackingUrl,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerateLabel}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Truck className="h-4 w-4" />
            Generate Shipping Label
          </>
        )}
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Creates a Sendle shipping order and generates a printable label.
      </p>
    </div>
  )
}
