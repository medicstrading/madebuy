'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, Star, Truck, Plus, Award } from 'lucide-react'
import { useState } from 'react'

interface EtsyProductCardProps {
  product: {
    id: string
    name: string
    slug?: string
    price: number
    originalPrice?: number
    currency?: string
    images?: string[]
    rating?: number
    reviewCount?: number
    seller?: {
      name: string
      slug?: string
    }
    badges?: ('bestseller' | 'freeShipping' | 'sale' | 'ad')[]
  }
  variant?: 'default' | 'compact' | 'large'
  onQuickAdd?: (productId: string) => void
  onFavorite?: (productId: string) => void
}

export function EtsyProductCard({
  product,
  variant = 'default',
  onQuickAdd,
  onFavorite,
}: EtsyProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)

  const {
    id,
    name,
    slug,
    price,
    originalPrice,
    currency = 'AUD',
    images = [],
    rating = 0,
    reviewCount = 0,
    seller,
    badges = [],
  } = product

  const hasDiscount = originalPrice && originalPrice > price
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorited(!isFavorited)
    onFavorite?.(id)
  }

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onQuickAdd?.(id)
  }

  const isCompact = variant === 'compact'
  const isLarge = variant === 'large'

  // Add utm_source for marketplace attribution
  const productUrl = `/marketplace/product/${slug || id}?utm_source=marketplace`

  return (
    <Link
      href={productUrl}
      className="group relative block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <article
        className={`
          relative overflow-hidden rounded-lg bg-white
          transition-all duration-300 ease-out
          ${isHovered ? 'shadow-lg -translate-y-1' : 'shadow-sm'}
          ${isLarge ? 'rounded-xl' : ''}
        `}
      >
        {/* Image Container */}
        <div
          className={`
            relative overflow-hidden bg-mb-sand
            ${isCompact ? 'aspect-square' : isLarge ? 'aspect-[4/5]' : 'aspect-[4/5]'}
          `}
        >
          {images[0] ? (
            <Image
              src={images[0]}
              alt={name}
              fill
              className={`
                object-cover transition-transform duration-500 ease-out
                ${isHovered ? 'scale-105' : 'scale-100'}
              `}
              sizes={isLarge ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-mb-sky" />
            </div>
          )}

          {/* Hover overlay with second image */}
          {images[1] && isHovered && (
            <Image
              src={images[1]}
              alt={`${name} alternate view`}
              fill
              className="object-cover animate-in fade-in duration-300"
              sizes={isLarge ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
            />
          )}

          {/* Favorite Button */}
          <button
            onClick={handleFavorite}
            className={`
              absolute right-2 top-2 z-10
              flex h-9 w-9 items-center justify-center
              rounded-full bg-white/90 backdrop-blur-sm
              shadow-md transition-all duration-200
              hover:bg-white hover:scale-110
              ${isHovered || isFavorited ? 'opacity-100' : 'opacity-0'}
            `}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                isFavorited
                  ? 'fill-mb-accent text-mb-accent'
                  : 'text-mb-slate hover:text-mb-accent'
              }`}
            />
          </button>

          {/* Quick Add Button */}
          {onQuickAdd && (
            <button
              onClick={handleQuickAdd}
              className={`
                absolute bottom-2 right-2 z-10
                flex items-center gap-1.5 px-3 py-2
                rounded-full bg-mb-blue text-white text-sm font-medium
                shadow-lg transition-all duration-200
                hover:bg-mb-blue-dark hover:scale-105
                ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
              `}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}

          {/* Badges Container */}
          <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5">
            {badges.includes('bestseller') && (
              <span className="inline-flex items-center gap-1 rounded-full bg-mb-blue px-2 py-1 text-xs font-semibold text-white shadow-sm">
                <Award className="h-3 w-3" />
                Bestseller
              </span>
            )}
            {badges.includes('ad') && (
              <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-mb-slate-light backdrop-blur-sm">
                Ad
              </span>
            )}
            {hasDiscount && (
              <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">
                {discountPercent}% off
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={`p-3 ${isCompact ? 'p-2' : isLarge ? 'p-4' : 'p-3'}`}>
          {/* Seller */}
          {seller && !isCompact && (
            <p className="mb-1 truncate text-xs text-mb-slate-light">
              {seller.name}
            </p>
          )}

          {/* Product Name */}
          <h3
            className={`
              font-medium text-mb-slate leading-snug
              transition-colors group-hover:text-mb-blue
              ${isCompact ? 'text-sm line-clamp-1' : isLarge ? 'text-base line-clamp-2' : 'text-sm line-clamp-2'}
            `}
          >
            {name}
          </h3>

          {/* Rating */}
          {rating > 0 && !isCompact && (
            <div className="mt-1.5 flex items-center gap-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= Math.round(rating)
                        ? 'fill-mb-blue text-mb-blue'
                        : 'fill-mb-sand text-mb-sand'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-mb-slate-light">
                ({reviewCount.toLocaleString()})
              </span>
            </div>
          )}

          {/* Price Row */}
          <div className={`flex items-center gap-2 ${isCompact ? 'mt-1' : 'mt-2'}`}>
            <span
              className={`
                font-semibold text-mb-slate
                ${isCompact ? 'text-sm' : isLarge ? 'text-lg' : 'text-base'}
              `}
            >
              ${price.toFixed(2)}
              <span className="ml-0.5 text-xs font-normal text-mb-slate-light">
                {currency}
              </span>
            </span>
            {hasDiscount && (
              <span className="text-xs text-mb-slate-light line-through">
                ${originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Free Shipping Badge */}
          {badges.includes('freeShipping') && !isCompact && (
            <div className="mt-2 flex items-center gap-1 text-emerald-600">
              <Truck className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Free shipping</span>
            </div>
          )}
        </div>
      </article>

      {/* Subtle paper texture overlay for that handmade feel */}
      <div
        className="pointer-events-none absolute inset-0 rounded-lg opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </Link>
  )
}
