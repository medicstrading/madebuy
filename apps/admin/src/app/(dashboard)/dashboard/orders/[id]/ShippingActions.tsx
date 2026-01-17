'use client'

import {
  CheckCircle,
  Download,
  ExternalLink,
  Eye,
  Printer,
  RefreshCw,
  Truck,
  X,
} from 'lucide-react'
import { useCallback, useState } from 'react'

interface ShippingActionsProps {
  orderId: string
  orderStatus: string
  paymentStatus: string
  isDigitalOnly: boolean
  hasLabel: boolean
  labelUrl?: string
  trackingNumber?: string
  trackingUrl?: string
}

export function ShippingActions({
  orderId,
  orderStatus,
  paymentStatus,
  isDigitalOnly,
  hasLabel,
  labelUrl,
  trackingNumber,
  trackingUrl: propTrackingUrl,
}: ShippingActionsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [generatedLabel, setGeneratedLabel] = useState<{
    labelUrl: string
    trackingNumber: string
    trackingUrl: string
    emailSent: boolean
  } | null>(null)

  // Get current label data - must be computed before useCallback
  const url = generatedLabel?.labelUrl || labelUrl
  const tracking = generatedLabel?.trackingNumber || trackingNumber
  const trackingUrl = generatedLabel?.trackingUrl || propTrackingUrl

  // Print handler - opens PDF in new window for printing
  // IMPORTANT: Must be called before any conditional returns (React hooks rules)
  const handlePrint = useCallback(() => {
    if (!url) return
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }, [url])

  // Digital orders don't need shipping
  if (isDigitalOnly) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="text-sm font-medium">
          Digital order - no shipping required
        </span>
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
    return (
      <>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">
              Shipping label generated
            </span>
          </div>

          {generatedLabel?.emailSent && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Tracking email sent to customer</span>
            </div>
          )}

          {tracking && (
            <div className="text-sm">
              <span className="text-gray-500">Tracking: </span>
              <span className="font-mono text-gray-900">{tracking}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {url && (
              <>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  View Label
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <a
                  href={url}
                  download
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </>
            )}
            {trackingUrl && (
              <a
                href={trackingUrl}
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

        {/* PDF Modal */}
        {showModal && url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative mx-4 h-[90vh] w-full max-w-3xl rounded-lg bg-white shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Shipping Label
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <a
                    href={url}
                    download
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* PDF Embed */}
              <div className="h-[calc(100%-60px)] p-4">
                <iframe
                  src={`${url}#toolbar=1&navpanes=0`}
                  className="h-full w-full rounded-lg border"
                  title="Shipping Label PDF"
                />
              </div>
            </div>
          </div>
        )}
      </>
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
        emailSent: data.emailSent,
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
        type="button"
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
