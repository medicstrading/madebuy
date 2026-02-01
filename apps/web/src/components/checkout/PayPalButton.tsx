'use client'

import {
  PayPalButtons,
  PayPalScriptProvider,
} from '@paypal/react-paypal-js'
import { useState } from 'react'

interface PayPalButtonProps {
  tenantId: string
  items: Array<{
    pieceId: string
    quantity: number
    price: number
    basePrice?: number
    currency?: string
    variantId?: string
    personalization?: any[]
    personalizationTotal?: number
  }>
  customerInfo: {
    email: string
    name: string
    phone?: string
  }
  shippingAddress?: {
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  notes?: string
  onSuccess: (orderId: string, orderNumber: string) => void
  onError: (error: string) => void
  disabled?: boolean
}

export function PayPalButton({
  tenantId,
  items,
  customerInfo,
  shippingAddress,
  notes,
  onSuccess,
  onError,
  disabled = false,
}: PayPalButtonProps) {
  const [reservationSessionId, setReservationSessionId] = useState<
    string | null
  >(null)

  // Check if PayPal is configured on client-side
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  if (!clientId) {
    return null // Don't show PayPal button if not configured
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'AUD',
        intent: 'capture',
      }}
    >
      <PayPalButtons
        disabled={disabled}
        style={{
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
        }}
        createOrder={async () => {
          try {
            const response = await fetch('/api/checkout/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tenantId,
                items,
                customerInfo,
                shippingAddress,
                notes,
              }),
            })

            if (!response.ok) {
              const data = await response.json()
              throw new Error(data.error || 'Failed to create PayPal order')
            }

            const data = await response.json()
            setReservationSessionId(data.reservationSessionId)
            return data.orderID
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : 'Failed to create order'
            onError(errorMsg)
            throw err
          }
        }}
        onApprove={async (data) => {
          try {
            const response = await fetch('/api/checkout/paypal/capture', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderID: data.orderID,
                tenantId,
                reservationSessionId,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Payment capture failed')
            }

            const result = await response.json()
            onSuccess(result.orderId, result.orderNumber)
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : 'Payment failed'
            onError(errorMsg)
          }
        }}
        onError={(err) => {
          const errorMsg =
            err instanceof Error ? err.message : 'PayPal error occurred'
          onError(errorMsg)
        }}
        onCancel={() => {
          // User cancelled PayPal checkout - just log it
          console.log('PayPal checkout cancelled by user')
        }}
      />
    </PayPalScriptProvider>
  )
}
