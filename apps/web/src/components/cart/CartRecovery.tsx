'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

interface CartRecoveryProps {
  tenant: string
  tenantId: string
  onRecovered: (items: RecoveredItem[], discountCode?: string) => void
}

interface RecoveredItem {
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

interface RecoveryResponse {
  success: boolean
  error?: string
  items?: RecoveredItem[]
  discountCode?: string
  discountPercentage?: number
}

/**
 * CartRecovery - Handles recovering abandoned cart from email link
 *
 * When user clicks recovery link in email (e.g., /cart?recover=abc123):
 * 1. Fetches cart data from API
 * 2. Restores items to cart
 * 3. Optionally applies discount code (for 24h+ abandoned carts)
 * 4. Marks cart as recovered
 */
export function CartRecovery({ tenant, tenantId, onRecovered }: CartRecoveryProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const recoveryId = searchParams?.get('recover') ?? null

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [discountApplied, setDiscountApplied] = useState<{ code: string; percentage: number } | null>(null)

  useEffect(() => {
    if (!recoveryId) return

    recoverCart()
  }, [recoveryId])

  const recoverCart = async () => {
    setStatus('loading')

    try {
      const response = await fetch('/api/carts/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: recoveryId,
          tenantId,
        }),
      })

      const data: RecoveryResponse = await response.json()

      if (!response.ok || !data.success) {
        setStatus('error')
        setMessage(data.error || 'Unable to recover cart')
        return
      }

      if (data.items && data.items.length > 0) {
        // Call parent to restore items
        onRecovered(data.items, data.discountCode)

        // Show success with discount info if applicable
        if (data.discountCode && data.discountPercentage) {
          setDiscountApplied({
            code: data.discountCode,
            percentage: data.discountPercentage,
          })
          setMessage(`Cart restored! ${data.discountPercentage}% discount code applied.`)
        } else {
          setMessage('Your cart has been restored!')
        }

        setStatus('success')

        // Clean up URL after 3 seconds
        setTimeout(() => {
          router.replace(`/${tenant}/cart`)
        }, 3000)
      } else {
        setStatus('error')
        setMessage('Your cart was empty or items are no longer available')
      }
    } catch (error) {
      console.error('Cart recovery error:', error)
      setStatus('error')
      setMessage('Failed to recover cart. Please try again.')
    }
  }

  // Don't render anything if no recovery ID
  if (!recoveryId || status === 'idle') {
    return null
  }

  return (
    <div className="mb-6">
      {status === 'loading' && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          <span className="text-blue-700">Recovering your cart...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <span className="text-green-700 font-medium">{message}</span>
            {discountApplied && (
              <p className="text-green-600 text-sm mt-1">
                Use code <strong>{discountApplied.code}</strong> at checkout for {discountApplied.percentage}% off!
              </p>
            )}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-red-700">{message}</span>
        </div>
      )}
    </div>
  )
}
