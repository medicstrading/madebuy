'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart } from 'lucide-react'
import type { ProductWithMedia } from '@madebuy/shared'

interface RelatedItemsProps {
  products: ProductWithMedia[]
  title?: string
}

export function RelatedItems({
  products,
  title = 'You May Also Like'
}: RelatedItemsProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">{title}</h2>

        {/* Horizontal scrolling carousel */}
        <div className="overflow-x-auto scrollbar-hide -mx-6 px-6">
          <div className="flex gap-4 md:gap-6 pb-4">
            {products.map((product) => {
              const imageUrl = product.primaryImage?.variants?.watermarked?.url ||
                             product.primaryImage?.variants?.original?.url

              return (
                <Link
                  key={product.id}
                  href={`/marketplace/product/${product.id}`}
                  className="group flex-shrink-0 w-[240px] md:w-[280px]"
                >
                  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                    <div className="aspect-square bg-gray-50 relative overflow-hidden">
                      {/* Status Badges */}
                      {product.status === 'sold' && (
                        <div className="absolute top-3 left-3 bg-gray-500 text-white text-xs px-3 py-1 rounded-full z-10">
                          Sold
                        </div>
                      )}

                      {product.status === 'reserved' && (
                        <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs px-3 py-1 rounded-full z-10">
                          Reserved
                        </div>
                      )}

                      {/* Product Image */}
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 240px, 280px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <ShoppingCart className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                        {product.category || 'Handmade'}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="text-blue-600 font-bold text-lg">
                          ${product.price?.toLocaleString()} <span className="text-xs font-normal">{product.currency}</span>
                        </div>
                        {product.status === 'available' && (
                          <ShoppingCart className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
