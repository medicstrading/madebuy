'use client'

import { useState } from 'react'
import { Order, Shipment, SendleQuote } from '@madebuy/shared'
import { Truck, Package, Loader2, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PrintLabel } from './PrintLabel'

interface BookShipmentProps {
  order: Order
}

interface PackageDetails {
  weightGrams: number
  lengthCm: number
  widthCm: number
  heightCm: number
}

export function BookShipment({ order }: BookShipmentProps) {
  const [step, setStep] = useState<'package' | 'quotes' | 'booking' | 'complete'>('package')
  const [packageDetails, setPackageDetails] = useState<PackageDetails>({
    weightGrams: 500, // Default 500g
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
  })
  const [quotes, setQuotes] = useState<SendleQuote[]>([])
  const [selectedQuote, setSelectedQuote] = useState<SendleQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shipment, setShipment] = useState<Shipment | null>(null)

  // Get quotes from Sendle
  const getQuotes = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/fulfillment/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          package: packageDetails,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get quotes')
      }

      setQuotes(data.quotes)
      setStep('quotes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quotes')
    } finally {
      setLoading(false)
    }
  }

  // Book shipment
  const bookShipment = async () => {
    if (!selectedQuote) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/fulfillment/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          carrier: 'sendle',
          quoteId: selectedQuote.quote_id,
          package: packageDetails,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book shipment')
      }

      setShipment(data.shipment)
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book shipment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Book with Sendle</h2>
            <p className="text-sm text-gray-500">Australian shipping at great rates</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <StepIndicator
              number={1}
              label="Package"
              active={step === 'package'}
              completed={step !== 'package'}
            />
            <div className="h-px flex-1 bg-gray-200 mx-2" />
            <StepIndicator
              number={2}
              label="Get Quotes"
              active={step === 'quotes'}
              completed={step === 'booking' || step === 'complete'}
            />
            <div className="h-px flex-1 bg-gray-200 mx-2" />
            <StepIndicator
              number={3}
              label="Book"
              active={step === 'booking'}
              completed={step === 'complete'}
            />
            <div className="h-px flex-1 bg-gray-200 mx-2" />
            <StepIndicator
              number={4}
              label="Print Label"
              active={step === 'complete'}
              completed={false}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Package Details */}
        {step === 'package' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (grams)
                </label>
                <input
                  type="number"
                  value={packageDetails.weightGrams}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, weightGrams: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length (cm)
                </label>
                <input
                  type="number"
                  value={packageDetails.lengthCm}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, lengthCm: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (cm)
                </label>
                <input
                  type="number"
                  value={packageDetails.widthCm}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, widthCm: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={packageDetails.heightCm}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, heightCm: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={getQuotes}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Getting Quotes...
                  </>
                ) : (
                  <>
                    Get Shipping Quotes
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Quote Selection */}
        {step === 'quotes' && (
          <div className="space-y-4">
            {quotes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No quotes available for this route.</p>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <button
                    key={quote.quote_id}
                    onClick={() => setSelectedQuote(quote)}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      selectedQuote?.quote_id === quote.quote_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{quote.plan_name}</p>
                        <p className="text-sm text-gray-500">
                          {quote.eta.days_range[0]}-{quote.eta.days_range[1]} business days
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{quote.route.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(quote.price.gross.amount, quote.price.gross.currency)}
                        </p>
                        <p className="text-xs text-gray-500">inc. GST</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep('package')}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('booking')}
                disabled={!selectedQuote}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm & Book */}
        {step === 'booking' && selectedQuote && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service</span>
                  <span className="text-gray-900">{selectedQuote.plan_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Time</span>
                  <span className="text-gray-900">{selectedQuote.eta.days_range[0]}-{selectedQuote.eta.days_range[1]} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Package Weight</span>
                  <span className="text-gray-900">{(packageDetails.weightGrams / 1000).toFixed(2)}kg</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="font-medium text-gray-900">Total</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(selectedQuote.price.gross.amount, selectedQuote.price.gross.currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep('quotes')}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={bookShipment}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Book Shipment
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && shipment && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Shipment Booked Successfully!</p>
                <p className="text-sm text-green-700 mt-1">
                  Your shipment has been booked and the label is ready to print.
                </p>
              </div>
            </div>

            {shipment.trackingNumber && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Tracking Number</p>
                <p className="mt-1 text-lg font-mono text-gray-900">{shipment.trackingNumber}</p>
              </div>
            )}

            {shipment.labelUrl && (
              <PrintLabel shipment={shipment} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
          completed
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-600'
        }`}
      >
        {completed ? <CheckCircle className="h-4 w-4" /> : number}
      </div>
      <span className={`mt-1 text-xs ${active ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  )
}
