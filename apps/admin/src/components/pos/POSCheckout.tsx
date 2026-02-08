'use client'

import type { Piece } from '@madebuy/shared'
import { Check, CreditCard, DollarSign, Printer, X } from 'lucide-react'
import { useState } from 'react'

interface CartItem {
  piece: Piece
  quantity: number
  variantId?: string
  variantOptions?: Record<string, string>
  price: number
}

interface POSCheckoutProps {
  items: CartItem[]
  subtotal: number
  onComplete: () => void
  onClose: () => void
}

type PaymentMethod = 'cash' | 'card_manual'

export function POSCheckout({
  items,
  subtotal,
  onComplete,
  onClose,
}: POSCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // PAY-06: Guard against double-click/double-submit
    if (processing) {
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Create order via POS API
      const response = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            pieceId: item.piece.id,
            name: item.piece.name,
            price: item.price,
            quantity: item.quantity,
            category: item.piece.category,
            variantId: item.variantId,
            variantOptions: item.variantOptions,
          })),
          customerName: customerName || 'Walk-in Customer',
          customerEmail: customerEmail || 'pos@madebuy.local',
          customerPhone: customerPhone || undefined,
          paymentMethod,
          subtotal,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create order')
      }

      const data = await response.json()
      setOrderNumber(data.orderNumber)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment')
    } finally {
      setProcessing(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Complete!
          </h2>
          {orderNumber && (
            <p className="text-sm text-gray-500 mb-6">Order #{orderNumber}</p>
          )}
          <div className="space-y-3">
            <button
              onClick={onComplete}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              New Sale
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Checkout</h2>
            <p className="text-sm text-gray-500">
              Total: ${(subtotal / 100).toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment method */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <DollarSign
                    className={`h-6 w-6 mx-auto mb-2 ${
                      paymentMethod === 'cash'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      paymentMethod === 'cash'
                        ? 'text-blue-900'
                        : 'text-gray-600'
                    }`}
                  >
                    Cash
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card_manual')}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    paymentMethod === 'card_manual'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard
                    className={`h-6 w-6 mx-auto mb-2 ${
                      paymentMethod === 'card_manual'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      paymentMethod === 'card_manual'
                        ? 'text-blue-900'
                        : 'text-gray-600'
                    }`}
                  >
                    Card
                  </span>
                </button>
              </div>
            </div>

            {/* Customer info (optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Customer Information (Optional)
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="email"
                  placeholder="Email (for receipt)"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Complete Sale - ${(subtotal / 100).toFixed(2)}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
