'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface CheckoutFormProps {
  tenant: string
  tenantId: string
}

export function CheckoutForm({ tenant, tenantId }: CheckoutFormProps) {
  const { items, totalAmount, clearCart } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    shippingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'AU',
    },
    notes: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name.startsWith('shipping.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          [field]: value,
        },
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
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
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
            currency: item.product.currency,
          })),
          customerInfo: {
            email: formData.email,
            name: formData.name,
            phone: formData.phone,
          },
          shippingAddress: formData.shippingAddress,
          notes: formData.notes,
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
        <p className="text-gray-600">Your cart is empty.</p>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3">
      {/* Checkout Form */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900">Shipping Address</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="line1" className="block text-sm font-medium text-gray-700">
                  Address Line 1
                </label>
                <input
                  type="text"
                  id="line1"
                  name="shipping.line1"
                  required
                  value={formData.shippingAddress.line1}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="line2" className="block text-sm font-medium text-gray-700">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  id="line2"
                  name="shipping.line2"
                  value={formData.shippingAddress.line2}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="shipping.city"
                    required
                    value={formData.shippingAddress.city}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="shipping.state"
                    required
                    value={formData.shippingAddress.state}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    name="shipping.postalCode"
                    required
                    value={formData.shippingAddress.postalCode}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <select
                    id="country"
                    name="shipping.country"
                    required
                    value={formData.shippingAddress.country}
                    onChange={(e) => handleInputChange(e as any)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  >
                    <option value="AU">Australia</option>
                    <option value="NZ">New Zealand</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Order Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Any special instructions for your order..."
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </form>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

          <div className="mt-4 space-y-4">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.product.name}</p>
                  <p className="text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium text-gray-900">
                  {formatCurrency(item.product.price ? item.product.price * item.quantity : undefined, item.product.currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>Calculated at payment</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
