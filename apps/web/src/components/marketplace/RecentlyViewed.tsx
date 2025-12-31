'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'

interface ViewedProduct {
  id: string
  name: string
  slug?: string
  price: number
  currency?: string
  image?: string
  viewedAt: number // timestamp
}

const STORAGE_KEY = 'madebuy_recently_viewed'
const MAX_ITEMS = 20

/**
 * Hook to manage recently viewed products in localStorage
 */
export function useRecentlyViewed() {
  const [items, setItems] = useState<ViewedProduct[]>([])

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ViewedProduct[]
        // Filter out items older than 30 days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
        const valid = parsed.filter((p) => p.viewedAt > thirtyDaysAgo)
        setItems(valid)
      } catch {
        setItems([])
      }
    }
  }, [])

  const addItem = (product: Omit<ViewedProduct, 'viewedAt'>) => {
    setItems((prev) => {
      // Remove if already exists
      const filtered = prev.filter((p) => p.id !== product.id)
      // Add to beginning
      const updated = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS)
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const removeItem = (productId: string) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== productId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
      return filtered
    })
  }

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY)
    setItems([])
  }

  return { items, addItem, removeItem, clearAll }
}

interface RecentlyViewedProps {
  products?: ViewedProduct[]
  maxItems?: number
  showClearAll?: boolean
  className?: string
}

export function RecentlyViewed({
  products: externalProducts,
  maxItems = 8,
  showClearAll = true,
  className = '',
}: RecentlyViewedProps) {
  const { items: storedItems, removeItem, clearAll } = useRecentlyViewed()
  const products = externalProducts || storedItems
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const visibleProducts = products.slice(0, maxItems)

  // Check scroll position
  const checkScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    )
  }

  useEffect(() => {
    checkScroll()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScroll)
      return () => container.removeEventListener('scroll', checkScroll)
    }
  }, [visibleProducts])

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.8
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  if (visibleProducts.length === 0) return null

  return (
    <section className={`relative ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-mb-blue" />
          <h2 className="text-lg font-semibold text-mb-slate">Recently Viewed</h2>
          <span className="rounded-full bg-mb-sky px-2 py-0.5 text-xs font-medium text-mb-slate-light">
            {visibleProducts.length}
          </span>
        </div>
        {showClearAll && (
          <button
            onClick={clearAll}
            className="text-sm text-mb-slate-light hover:text-mb-blue transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Carousel Container */}
      <div className="relative group/carousel">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="
              absolute -left-3 top-1/2 z-10 -translate-y-1/2
              flex h-10 w-10 items-center justify-center
              rounded-full bg-white shadow-lg border border-mb-sand
              text-mb-slate hover:text-mb-blue
              opacity-0 group-hover/carousel:opacity-100 transition-all
              hover:scale-110
            "
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Products */}
        <div
          ref={scrollContainerRef}
          className="
            flex gap-4 overflow-x-auto scroll-smooth
            scrollbar-hide pb-2 -mx-1 px-1
          "
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {visibleProducts.map((product, index) => (
            <div
              key={product.id}
              className="flex-shrink-0 animate-in fade-in slide-in-from-right-4"
              style={{
                scrollSnapAlign: 'start',
                animationDelay: `${index * 50}ms`,
              }}
            >
              <RecentlyViewedCard
                product={product}
                onRemove={() => removeItem(product.id)}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="
              absolute -right-3 top-1/2 z-10 -translate-y-1/2
              flex h-10 w-10 items-center justify-center
              rounded-full bg-white shadow-lg border border-mb-sand
              text-mb-slate hover:text-mb-blue
              opacity-0 group-hover/carousel:opacity-100 transition-all
              hover:scale-110
            "
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Fade edges */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        )}
      </div>
    </section>
  )
}

interface RecentlyViewedCardProps {
  product: ViewedProduct
  onRemove?: () => void
}

function RecentlyViewedCard({ product, onRemove }: RecentlyViewedCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      href={`/marketplace/product/${product.slug || product.id}`}
      className="group relative block w-36 sm:w-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          className={`
            absolute -right-1 -top-1 z-10
            flex h-6 w-6 items-center justify-center
            rounded-full bg-white shadow-md border border-mb-sand
            text-mb-slate-light hover:text-mb-accent hover:border-mb-accent
            transition-all
            ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
          `}
          aria-label="Remove from recently viewed"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Card */}
      <div
        className={`
          overflow-hidden rounded-lg bg-white border border-mb-sand
          transition-all duration-200
          ${isHovered ? 'shadow-md border-mb-blue/30' : ''}
        `}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-mb-cream">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className={`
                object-cover transition-transform duration-300
                ${isHovered ? 'scale-105' : ''}
              `}
              sizes="160px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-mb-sky" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2">
          <h3 className="text-xs font-medium text-mb-slate line-clamp-2 leading-tight group-hover:text-mb-blue transition-colors">
            {product.name}
          </h3>
          <p className="mt-1 text-sm font-semibold text-mb-slate">
            ${product.price.toFixed(2)}
            <span className="ml-0.5 text-xs font-normal text-mb-slate-light">
              {product.currency || 'AUD'}
            </span>
          </p>
        </div>
      </div>
    </Link>
  )
}

/**
 * Utility function to track a product view
 * Call this on product detail pages
 */
export function trackProductView(product: Omit<ViewedProduct, 'viewedAt'>) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const items: ViewedProduct[] = stored ? JSON.parse(stored) : []

    // Remove if already exists
    const filtered = items.filter((p) => p.id !== product.id)

    // Add to beginning
    const updated = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
