'use client'

import type {
  PersonalizationConfig,
  PersonalizationValue,
  PieceWithMedia,
  ProductWithMedia,
} from '@madebuy/shared'
import { AlertCircle, Check, Clock, ShoppingCart } from 'lucide-react'
import { useCallback, useState } from 'react'
import { MiniCartPreview } from '@/components/cart/MiniCartPreview'
import { useCart } from '@/contexts/CartContext'
import { useAnalytics } from '@/hooks/useAnalytics'
import { PersonalizationForm } from './PersonalizationForm'

interface ProductAddToCartProps {
  product: ProductWithMedia | PieceWithMedia
  tenantId: string
  tenant: string
  disabled?: boolean
  personalization?: PersonalizationConfig
}

export function ProductAddToCart({
  product,
  tenantId,
  tenant,
  disabled,
  personalization,
}: ProductAddToCartProps) {
  const { addItem, items, totalAmount } = useCart()
  const { trackAddToCart } = useAnalytics(tenantId)
  const [added, setAdded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Personalization state
  const [personalizationValues, setPersonalizationValues] = useState<
    PersonalizationValue[]
  >([])
  const [personalizationTotal, setPersonalizationTotal] = useState(0)
  const [personalizationValid, setPersonalizationValid] = useState(
    !personalization?.enabled ||
      personalization.fields.every((f) => !f.required),
  )

  const hasPersonalization =
    personalization?.enabled && personalization.fields.length > 0

  const handleValuesChange = useCallback(
    (values: PersonalizationValue[], totalAdjustment: number) => {
      setPersonalizationValues(values)
      setPersonalizationTotal(totalAdjustment)
    },
    [],
  )

  const handleValidationChange = useCallback((isValid: boolean) => {
    setPersonalizationValid(isValid)
  }, [])

  const handleAddToCart = () => {
    addItem(product as ProductWithMedia, {
      quantity: 1,
      personalization: hasPersonalization ? personalizationValues : undefined,
    })
    setAdded(true)
    setShowPreview(true)

    trackAddToCart(product.id)

    setTimeout(() => {
      setAdded(false)
    }, 2000)
  }

  const handleClosePreview = useCallback(() => {
    setShowPreview(false)
  }, [])

  const canAddToCart =
    !disabled && (!hasPersonalization || personalizationValid)

  // Calculate total price including personalization
  const displayPrice = (product.price || 0) + personalizationTotal

  return (
    <div className="space-y-6">
      {/* Personalization Form */}
      {hasPersonalization && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Personalize Your Order
          </h3>

          {personalization.instructions && (
            <p className="text-sm text-gray-600 mb-4">
              {personalization.instructions}
            </p>
          )}

          <PersonalizationForm
            config={personalization}
            pieceId={product.id}
            tenantId={tenantId}
            basePrice={product.price || 0}
            onValuesChange={handleValuesChange}
            onValidationChange={handleValidationChange}
            disabled={disabled}
          />

          {/* Processing time notice */}
          {personalization.processingDays &&
            personalization.processingDays > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>
                  Personalized items require an additional{' '}
                  {personalization.processingDays} day
                  {personalization.processingDays > 1 ? 's' : ''} for
                  processing.
                </p>
              </div>
            )}

          {/* Price adjustment display */}
          {personalizationTotal > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-md bg-blue-50 p-3 text-sm">
              <span className="text-gray-700">Personalization adds:</span>
              <span className="font-semibold text-blue-700">
                +${(personalizationTotal / 100).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Validation warning */}
      {hasPersonalization && !personalizationValid && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>
            Please complete all required personalization fields before adding to
            cart.
          </p>
        </div>
      )}

      {/* Updated price display if personalization adds cost */}
      {hasPersonalization && personalizationTotal > 0 && (
        <div className="text-right">
          <span className="text-sm text-gray-500 line-through mr-2">
            ${((product.price || 0) / 100).toFixed(2)}
          </span>
          <span className="text-2xl font-bold text-gray-900">
            ${(displayPrice / 100).toFixed(2)}
          </span>
        </div>
      )}

      {/* Add to Cart Button */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!canAddToCart || added}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
          !canAddToCart
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : added
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {added ? (
          <>
            <Check className="w-5 h-5" />
            Added to Cart
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" />
            Add to Cart
          </>
        )}
      </button>

      <MiniCartPreview
        items={items}
        totalAmount={totalAmount}
        tenant={tenant}
        isOpen={showPreview}
        onClose={handleClosePreview}
        addedProductId={product.id}
      />
    </div>
  )
}
