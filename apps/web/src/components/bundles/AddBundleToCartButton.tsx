'use client'

import { useState, useCallback } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useAnalytics } from '@/hooks/useAnalytics'
import { MiniCartPreview } from '@/components/cart/MiniCartPreview'
import type { BundleWithPieces, ProductWithMedia, BundleProductData } from '@madebuy/shared'
import { ShoppingCart, Check, Package } from 'lucide-react'

// Extended product type for bundles (P2 type safety fix)
type BundleAsProduct = ProductWithMedia & { _bundleData: BundleProductData }

interface AddBundleToCartButtonProps {
  bundle: BundleWithPieces
  tenantId: string
  tenant: string
  disabled?: boolean
}

export function AddBundleToCartButton({
  bundle,
  tenantId,
  tenant,
  disabled,
}: AddBundleToCartButtonProps) {
  const { addItem, items, totalAmount } = useCart()
  const { trackAddToCart } = useAnalytics(tenantId)
  const [added, setAdded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleAddBundle = () => {
    // Add bundle as a special product with bundle metadata
    // The cart will treat it as a single item but with bundle reference
    const bundleProduct: BundleAsProduct = {
      id: `bundle_${bundle.id}`,
      tenantId: bundle.tenantId,
      name: bundle.name,
      slug: bundle.slug,
      description: bundle.description,
      price: bundle.bundlePrice,
      currency: bundle.tenantId ? 'AUD' : 'AUD', // TODO: Get from tenant settings
      status: 'available',
      mediaIds: [],
      isFeatured: false,
      category: 'Bundle',
      tags: ['bundle'],
      isPublishedToWebsite: true,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
      // Store bundle details in a way the cart can use
      attributes: {},
      allImages: [],
      marketplace: {
        listed: false,
        categories: [],
        approvalStatus: 'pending',
        marketplaceViews: 0,
        marketplaceSales: 0,
        avgRating: 0,
        totalReviews: 0,
      },
      // Bundle metadata with proper typing
      _bundleData: {
        bundleId: bundle.id,
        originalPrice: bundle.originalPrice,
        discountPercent: bundle.discountPercent,
        pieces: bundle.pieces,
      },
    }

    addItem(bundleProduct, 1)
    setAdded(true)
    setShowPreview(true)

    // Track add to cart event for the bundle
    trackAddToCart(bundle.id)

    // Reset button state after 2 seconds
    setTimeout(() => {
      setAdded(false)
    }, 2000)
  }

  const handleClosePreview = useCallback(() => {
    setShowPreview(false)
  }, [])

  const isOutOfStock = !bundle.isAvailable

  return (
    <>
      <button
        onClick={handleAddBundle}
        disabled={disabled || added || isOutOfStock}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
          isOutOfStock
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : added
                ? 'bg-green-600 text-white'
                : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {isOutOfStock ? (
          <>
            <Package className="w-5 h-5" />
            Out of Stock
          </>
        ) : added ? (
          <>
            <Check className="w-5 h-5" />
            Added to Cart
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" />
            Add Bundle to Cart
          </>
        )}
      </button>

      <MiniCartPreview
        items={items}
        totalAmount={totalAmount}
        tenant={tenant}
        isOpen={showPreview}
        onClose={handleClosePreview}
        addedProductId={`bundle_${bundle.id}`}
      />
    </>
  )
}
