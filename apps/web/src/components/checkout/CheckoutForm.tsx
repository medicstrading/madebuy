'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/lib/utils'
import { ShippingSelector } from './ShippingSelector'
import {
  ShippingAddress,
  ShippingQuote,
  createEmptyAddress,
  hasRequiredAddressFields,
  requiresShipping,
  isDigitalOnlyOrder,
  formatShippingPrice,
} from '@/lib/checkout/shipping'

// Update abandoned cart with customer email
async function updateCartWithEmail(tenantId: string, email: string) {
  try {
    await fetch('/api/carts/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        customerEmail: email,
        items: [], // Empty items - just updating email
        total: 0,
      }),
    })
  } catch (error) {
    // Silently fail
    console.error('Failed to update cart with email:', error)
  }
}

interface CheckoutFormProps {
  tenant: string
  tenantId: string
}

export function CheckoutForm({ tenant, tenantId }: CheckoutFormProps) {
  const { items, totalAmount, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'shipping' | 'review'>('shipping')

  // Shipping state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(createEmptyAddress())
  const [selectedShipping, setSelectedShipping] = useState<ShippingQuote | null>(null)

  // Order notes
  const [notes, setNotes] = useState('')

  // Check if order needs physical shipping
  const needsShipping = useMemo(() => requiresShipping(items), [items])
  const isDigitalOnly = useMemo(() => isDigitalOnlyOrder(items), [items])

  // Calculate order totals
  const subtotalCents = useMemo(() => Math.round(totalAmount * 100), [totalAmount])
  const shippingCents = selectedShipping?.price || 0
  const totalCents = subtotalCents + (needsShipping ? shippingCents : 0)

  // Form validation
  const canProceedToReview = useMemo(() => {
    if (isDigitalOnly) {
      // For digital-only orders, just need email
      return Boolean(shippingAddress.email?.trim())
    }
    // For physical orders, need full address and shipping method
    return hasRequiredAddressFields(shippingAddress) && selectedShipping !== null
  }, [isDigitalOnly, shippingAddress, selectedShipping])

  // Debounced email tracking for abandoned cart
  const emailTrackingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    const email = shippingAddress.email?.trim()
    if (!email || !email.includes('@')) return

    // Debounce to avoid tracking on every keystroke
    if (emailTrackingTimeoutRef.current) {
      clearTimeout(emailTrackingTimeoutRef.current)
    }

    emailTrackingTimeoutRef.current = setTimeout(() => {
      updateCartWithEmail(tenantId, email)
    }, 1500) // Wait 1.5 seconds after email entry stops

    return () => {
      if (emailTrackingTimeoutRef.current) {
        clearTimeout(emailTrackingTimeoutRef.current)
      }
    }
  }, [shippingAddress.email, tenantId])

  const handleAddressChange = (address: ShippingAddress) => {
    setShippingAddress(address)
    setError(null)
  }

  const handleShippingSelect = (quote: ShippingQuote) => {
    setSelectedShipping(quote)
    setError(null)
  }

  const handleProceedToReview = () => {
    if (!canProceedToReview) {
      if (isDigitalOnly && !shippingAddress.email?.trim()) {
        setError('Please enter your email address')
      } else if (!hasRequiredAddressFields(shippingAddress)) {
        setError('Please complete your shipping address')
      } else if (!selectedShipping) {
        setError('Please select a shipping method')
      }
      return
    }
    setStep('review')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          items: items.map(item => ({
            pieceId: item.product.id,
            quantity: item.quantity,
            price: (item.product.price || 0) + (item.personalizationTotal || 0),
            basePrice: item.product.price,
            currency: item.product.currency,
            variantId: item.product.selectedVariantId,
            personalization: item.personalization,
            personalizationTotal: item.personalizationTotal,
          })),
          customerInfo: {
            email: shippingAddress.email,
            name: shippingAddress.name,
            phone: shippingAddress.phone,
          },
          shippingAddress: needsShipping
            ? {
                line1: shippingAddress.line1,
                line2: shippingAddress.line2,
                city: shippingAddress.suburb,
                state: shippingAddress.state,
                postalCode: shippingAddress.postcode,
                country: shippingAddress.country,
              }
            : undefined,
          shippingMethod: selectedShipping
            ? {
                id: selectedShipping.id,
                carrier: selectedShipping.carrier,
                service: selectedShipping.service,
                price: selectedShipping.price,
                estimatedDays: selectedShipping.estimatedDays,
              }
            : undefined,
          notes: notes || undefined,
          successUrl: `${window.location.origin}/${tenant}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/${tenant}/checkout/cancel`,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()

      // Redirect to Stripe checkout
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 text-center">
        <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-sm">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Your cart is empty</h2>
          <p className="mt-2 text-gray-600">Add some items to your cart to checkout.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3">
      {/* Checkout Form */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setStep('shipping')}
              className={`flex items-center ${
                step === 'shipping' ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === 'shipping'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                1
              </span>
              <span className="ml-2 font-medium">
                {needsShipping ? 'Shipping' : 'Contact'}
              </span>
            </button>

            <div className="h-px flex-1 bg-gray-200 mx-4" />

            <button
              type="button"
              onClick={() => canProceedToReview && setStep('review')}
              disabled={!canProceedToReview}
              className={`flex items-center ${
                step === 'review' ? 'text-blue-600' : 'text-gray-500'
              } ${!canProceedToReview ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === 'review'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                2
              </span>
              <span className="ml-2 font-medium">Review & Pay</span>
            </button>
          </div>

          {/* Step Content */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {step === 'shipping' && (
              <>
                {/* Digital-only order - just need email */}
                {isDigitalOnly ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Your download links will be sent to this email address.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          required
                          value={shippingAddress.email || ''}
                          onChange={e =>
                            handleAddressChange({ ...shippingAddress, email: e.target.value })
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                          placeholder="your@email.com"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={shippingAddress.name || ''}
                          onChange={e =>
                            handleAddressChange({ ...shippingAddress, name: e.target.value })
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                          placeholder="John Smith"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-start">
                        <svg
                          className="h-5 w-5 text-green-500"
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
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-800">
                            Digital Products - No Shipping Required
                          </p>
                          <p className="mt-1 text-sm text-green-700">
                            You&apos;ll receive instant access to your downloads after payment.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Physical order - full shipping form */
                  <ShippingSelector
                    tenantId={tenantId}
                    cartItems={items}
                    destination={shippingAddress}
                    selectedMethod={selectedShipping}
                    onMethodSelect={handleShippingSelect}
                    onAddressChange={handleAddressChange}
                  />
                )}

                {/* Continue Button */}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleProceedToReview}
                    disabled={!canProceedToReview}
                    className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue to Review
                  </button>
                </div>
              </>
            )}

            {step === 'review' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Review Your Order</h2>

                {/* Shipping Summary */}
                {needsShipping && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Ship to:</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {shippingAddress.name}
                          <br />
                          {shippingAddress.line1}
                          {shippingAddress.line2 && <>, {shippingAddress.line2}</>}
                          <br />
                          {shippingAddress.suburb}, {shippingAddress.state}{' '}
                          {shippingAddress.postcode}
                          <br />
                          {shippingAddress.country}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep('shipping')}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Edit
                      </button>
                    </div>

                    {selectedShipping && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-medium text-gray-900">Shipping Method:</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {selectedShipping.service} - {formatShippingPrice(selectedShipping.price)}
                          <br />
                          <span className="text-gray-500">
                            Est. {selectedShipping.estimatedDays.min}-{selectedShipping.estimatedDays.max} business days
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Summary for Digital */}
                {isDigitalOnly && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Deliver to:</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {shippingAddress.name && <>{shippingAddress.name}<br /></>}
                          {shippingAddress.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep('shipping')}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}

                {/* Order Notes */}
                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Order Notes <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Any special instructions for your order..."
                  />
                </div>

                {/* Error Display */}
                {error && (
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
                      <p className="ml-3 text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="mr-2 h-5 w-5 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>

                <p className="text-center text-xs text-gray-500">
                  You&apos;ll be redirected to our secure payment partner to complete your purchase.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

          {/* Items */}
          <div className="mt-4 space-y-4">
            {items.map(item => {
              // Get image URL - handle both string and MediaItem types
              const imageUrl = typeof item.product.primaryImage === 'string'
                ? item.product.primaryImage
                : item.product.primaryImage?.variants?.thumb?.url ||
                  item.product.primaryImage?.variants?.large?.url ||
                  item.product.primaryImage?.variants?.original?.url

              return (
              <div key={item.product.id} className="flex gap-3">
                {/* Product Image */}
                {imageUrl && (
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <img
                      src={imageUrl}
                      alt={item.product.name}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 line-clamp-2">
                        {item.product.name}
                      </p>
                      <p className="text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(
                        item.product.price ? item.product.price * item.quantity : undefined,
                        item.product.currency
                      )}
                    </p>
                  </div>
                </div>
              </div>
              )
            })}
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>

            {needsShipping && (
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>
                  {selectedShipping
                    ? formatShippingPrice(selectedShipping.price)
                    : 'Select shipping'}
                </span>
              </div>
            )}

            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(totalCents / 100)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {needsShipping ? 'Including shipping' : 'No shipping required'}
              </p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-6 flex items-center justify-center gap-4 border-t pt-4">
            <div className="flex items-center text-xs text-gray-500">
              <svg
                className="mr-1 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Secure Checkout
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <svg
                className="mr-1 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Buyer Protection
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutForm
