import { memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import type { CardProduct } from '@/lib/productMapping'

interface ProductCardProps {
  product: CardProduct
  variant?: 'default' | 'compact'
}

// Memoized to prevent re-renders in grid layouts when sibling cards change
export const ProductCard = memo(function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const imageUrl = product.images?.[0]
  const href = product.href || `/${product.seller.slug}/product/${product.slug}`

  return (
    <Link
      href={href}
      className="group block bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all"
    >
      <div className={`relative bg-gray-50 ${variant === 'compact' ? 'aspect-square' : 'aspect-[4/5]'}`}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>
      <div className={`${variant === 'compact' ? 'p-3' : 'p-4'}`}>
        <h3 className={`font-medium text-gray-900 truncate group-hover:text-primary ${variant === 'compact' ? 'text-sm' : ''}`}>
          {product.name}
        </h3>
        {product.price !== undefined && (
          <p className={`mt-1 font-semibold text-gray-900 ${variant === 'compact' ? 'text-sm' : ''}`}>
            ${product.price.toFixed(2)}
          </p>
        )}
      </div>
    </Link>
  )
})

export function RecentlyViewed() {
  return null
}

interface MixedGridProps {
  products?: CardProduct[]
  title?: string
  subtitle?: string
  children?: React.ReactNode
}

export function MixedGrid({ products, title, subtitle, children }: MixedGridProps) {
  return (
    <div>
      {(title || subtitle) && (
        <div className="text-center mb-8">
          {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
          {subtitle && <p className="mt-1 text-gray-500">{subtitle}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products?.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
        {children}
      </div>
    </div>
  )
}
