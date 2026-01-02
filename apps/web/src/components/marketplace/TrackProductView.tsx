'use client'

import { useEffect } from 'react'
import { trackProductView } from './RecentlyViewed'

interface TrackProductViewProps {
  product: {
    id: string
    name: string
    slug: string
    price: number
    currency?: string
    image?: string
  }
}

/**
 * Client component to track product views for "Recently Viewed" feature.
 * Place this at the top of product detail pages.
 */
export function TrackProductView({ product }: TrackProductViewProps) {
  useEffect(() => {
    trackProductView({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      currency: product.currency || 'AUD',
      image: product.image,
    })
  }, [product.id, product.name, product.slug, product.price, product.currency, product.image])

  return null
}
