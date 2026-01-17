'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CartItem } from '@/contexts/CartContext'
import {
  createEmptyAddress,
  formatShippingPrice,
  getShippingQuotes,
  hasRequiredAddressFields,
  isDigitalOnlyOrder,
  type QuoteResponse,
  requiresShipping,
  type ShippingAddress,
  type ShippingQuote,
  validateShippingAddress,
} from '@/lib/checkout/shipping'
import { AddressForm } from './AddressForm'
import { ShippingOption } from './ShippingOption'

interface ShippingSelectorProps {
  tenantId: string
  cartItems: CartItem[]
  destination: ShippingAddress | null
  selectedMethod: ShippingQuote | null
  onMethodSelect: (quote: ShippingQuote) => void
  onAddressChange: (address: ShippingAddress) => void
}

export function ShippingSelector({
  tenantId,
  cartItems,
  destination,
  selectedMethod,
  onMethodSelect,
  onAddressChange,
}: ShippingSelectorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | null>(null)
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({})
  const [addressWarnings, setAddressWarnings] = useState<string[]>([])
  const [validatingAddress, setValidatingAddress] = useState(false)

  // Check if this is a digital-only order
  const isDigitalOnly = isDigitalOnlyOrder(cartItems)
  const _needsShipping = requiresShipping(cartItems)

  // Initialize address if not provided
  const address = destination || createEmptyAddress()

  // Fetch shipping quotes when destination changes
  const fetchQuotes = useCallback(async () => {
    if (!hasRequiredAddressFields(address) || isDigitalOnly) {
      setQuoteResponse(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await getShippingQuotes(tenantId, cartItems, {
        postcode: address.postcode,
        suburb: address.suburb,
        state: address.state,
        country: address.country,
      })

      setQuoteResponse(response)

      // Auto-select cheapest option if nothing selected
      if (!selectedMethod && response.quotes.length > 0) {
        onMethodSelect(response.quotes[0])
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to get shipping rates',
      )
      setQuoteResponse(null)
    } finally {
      setLoading(false)
    }
  }, [
    tenantId,
    cartItems,
    address,
    isDigitalOnly,
    selectedMethod,
    onMethodSelect,
  ])

  // Debounce quote fetching
  useEffect(() => {
    if (!hasRequiredAddressFields(address)) return

    const timer = setTimeout(() => {
      fetchQuotes()
    }, 500) // Wait 500ms after last change

    return () => clearTimeout(timer)
  }, [
    address.postcode,
    address.suburb,
    address.state,
    address.country,
    fetchQuotes,
    address,
  ])

  // Validate address when it changes
  const handleAddressChange = async (newAddress: ShippingAddress) => {
    onAddressChange(newAddress)
    setAddressErrors({})
    setAddressWarnings([])
  }

  // Validate address on blur or before continuing
  const _validateAddress = async () => {
    if (!hasRequiredAddressFields(address)) return false

    setValidatingAddress(true)
    try {
      const result = await validateShippingAddress(address)

      if (!result.valid && result.errors) {
        const errorMap: Record<string, string> = {}
        result.errors.forEach((err) => {
          // Try to map errors to specific fields
          if (err.toLowerCase().includes('postcode')) errorMap.postcode = err
          else if (err.toLowerCase().includes('state')) errorMap.state = err
          else if (
            err.toLowerCase().includes('suburb') ||
            err.toLowerCase().includes('city')
          )
            errorMap.suburb = err
          else if (err.toLowerCase().includes('address')) errorMap.line1 = err
          else errorMap.general = err
        })
        setAddressErrors(errorMap)
        return false
      }

      if (result.warnings) {
        setAddressWarnings(result.warnings)
      }

      return true
    } catch (_err) {
      setAddressErrors({ general: 'Failed to validate address' })
      return false
    } finally {
      setValidatingAddress(false)
    }
  }

  // If digital only, show simplified message
  if (isDigitalOnly) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Digital Products Only
            </h3>
            <p className="mt-1 text-sm text-green-700">
              Your order contains only digital products. No shipping required -
              you&apos;ll receive download links via email after payment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Shipping Address Form */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Shipping Address
        </h2>
        <div className="mt-4">
          <AddressForm
            value={address}
            onChange={handleAddressChange}
            errors={addressErrors}
            disabled={validatingAddress}
          />
        </div>

        {/* Address Warnings */}
        {addressWarnings.length > 0 && (
          <div className="mt-4 rounded-md bg-amber-50 p-3">
            <div className="flex">
              <svg
                className="h-5 w-5 text-amber-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Address Warnings
                </h3>
                <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                  {addressWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* General Address Error */}
        {addressErrors.general && (
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">{addressErrors.general}</p>
          </div>
        )}
      </div>

      {/* Shipping Methods */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Shipping Method</h2>

        {/* Free Shipping Progress */}
        {quoteResponse?.freeShippingThreshold &&
          !quoteResponse.freeShippingEligible && (
            <FreeShippingProgress
              threshold={quoteResponse.freeShippingThreshold}
              amountUntil={quoteResponse.amountUntilFreeShipping || 0}
            />
          )}

        {/* Free Shipping Achieved */}
        {quoteResponse?.freeShippingEligible && (
          <div className="mt-4 rounded-md bg-green-50 p-3">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="ml-2 text-sm font-medium text-green-800">
                You qualify for free shipping!
              </span>
            </div>
          </div>
        )}

        <div className="mt-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <span className="ml-3 text-sm text-gray-600">
                Getting shipping rates...
              </span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    onClick={fetchQuotes}
                    className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No Address Yet */}
          {!hasRequiredAddressFields(address) && !loading && !error && (
            <div className="rounded-md bg-gray-50 p-6 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Enter your shipping address above to see available delivery
                options
              </p>
            </div>
          )}

          {/* Shipping Options */}
          {quoteResponse && quoteResponse.quotes.length > 0 && !loading && (
            <div className="space-y-3">
              {quoteResponse.quotes.map((quote) => (
                <ShippingOption
                  key={quote.id}
                  quote={quote}
                  selected={selectedMethod?.id === quote.id}
                  onSelect={() => onMethodSelect(quote)}
                />
              ))}
            </div>
          )}

          {/* No Shipping Options Available */}
          {quoteResponse &&
            quoteResponse.quotes.length === 0 &&
            hasRequiredAddressFields(address) &&
            !loading && (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      No shipping options available for this address. Please
                      contact the seller for assistance.
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

// Free Shipping Progress Bar Component
function FreeShippingProgress({
  threshold,
  amountUntil,
}: {
  threshold: number
  amountUntil: number
}) {
  const progress = Math.min(100, ((threshold - amountUntil) / threshold) * 100)

  return (
    <div className="mt-4 rounded-md bg-blue-50 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-blue-700">
          Add {formatShippingPrice(amountUntil)} more for free shipping!
        </span>
        <span className="font-medium text-blue-800">
          {formatShippingPrice(threshold)} threshold
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default ShippingSelector
