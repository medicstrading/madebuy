'use client'

import type { PieceWithMedia } from '@madebuy/shared'
import { AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface SearchResultsProps {
  results: PieceWithMedia[]
  loading?: boolean
  query: string
  tenantSlug: string
}

export function SearchResults({
  results,
  loading = false,
  query,
  tenantSlug,
}: SearchResultsProps) {
  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  // No query yet
  if (!query) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          Enter a search term to find products
        </p>
      </div>
    )
  }

  // No results
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No results found
        </h3>
        <p className="text-gray-600">
          Try different keywords or browse our{' '}
          <Link
            href={`/${tenantSlug}/shop`}
            className="text-blue-600 hover:underline"
          >
            full catalog
          </Link>
        </p>
      </div>
    )
  }

  // Results
  return (
    <div>
      <p className="text-gray-600 mb-6">
        Found {results.length} {results.length === 1 ? 'result' : 'results'} for{' '}
        <span className="font-semibold">&ldquo;{query}&rdquo;</span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {results.map((product) => {
          const imageUrl =
            product.primaryImage?.variants?.large?.url ||
            product.primaryImage?.variants?.original?.url

          return (
            <Link
              key={product.id}
              href={`/${tenantSlug}/${product.slug}`}
              className="group"
            >
              <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-3">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </div>

              <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {product.name}
              </h3>

              <p className="text-lg font-semibold text-gray-900">
                {product.currency === 'AUD' && '$'}
                {product.price?.toFixed(2)}
              </p>

              {product.stock !== undefined && product.stock <= 0 && (
                <p className="text-sm text-red-600 mt-1">Out of stock</p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
