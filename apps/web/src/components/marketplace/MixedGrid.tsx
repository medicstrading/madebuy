'use client'

import { EtsyProductCard } from './EtsyProductCard'

interface Product {
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

interface MixedGridProps {
  products: Product[]
  title?: string
  subtitle?: string
  viewAllHref?: string
  onQuickAdd?: (productId: string) => void
  onFavorite?: (productId: string) => void
}

/**
 * MixedGrid - Etsy's signature layout with 1 large hero + 4 smaller products
 *
 * Layout:
 * ┌─────────────┬───────┬───────┐
 * │             │  Sm   │  Sm   │
 * │   LARGE     ├───────┼───────┤
 * │   HERO      │  Sm   │  Sm   │
 * └─────────────┴───────┴───────┘
 */
export function MixedGrid({
  products,
  title,
  subtitle,
  viewAllHref,
  onQuickAdd,
  onFavorite,
}: MixedGridProps) {
  if (products.length === 0) return null

  // Take first 5 products: 1 hero + 4 small
  const [heroProduct, ...smallProducts] = products.slice(0, 5)
  const fourSmall = smallProducts.slice(0, 4)

  return (
    <section className="relative">
      {/* Section Header */}
      {(title || subtitle) && (
        <div className="mb-6 flex items-end justify-between">
          <div>
            {title && (
              <h2 className="text-2xl font-semibold text-mb-slate tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-mb-slate-light">{subtitle}</p>
            )}
          </div>
          {viewAllHref && (
            <a
              href={viewAllHref}
              className="group flex items-center gap-1 text-sm font-medium text-mb-blue hover:text-mb-blue-dark transition-colors"
            >
              See more
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Mixed Grid Layout */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Hero Product - Takes 2 rows on desktop */}
        <div className="col-span-2 row-span-1 lg:col-span-1 lg:row-span-2">
          <div className="h-full">
            <EtsyProductCard
              product={heroProduct}
              variant="large"
              onQuickAdd={onQuickAdd}
              onFavorite={onFavorite}
            />
          </div>
        </div>

        {/* 4 Small Products - 2x2 grid on desktop */}
        {fourSmall.map((product, index) => (
          <div
            key={product.id}
            className="animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${(index + 1) * 75}ms` }}
          >
            <EtsyProductCard
              product={product}
              variant="compact"
              onQuickAdd={onQuickAdd}
              onFavorite={onFavorite}
            />
          </div>
        ))}
      </div>

      {/* Decorative Elements */}
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #F56400 0%, transparent 70%)',
        }}
      />
    </section>
  )
}

/**
 * MixedGridAlt - Alternative layout with hero on the right
 */
export function MixedGridAlt({
  products,
  title,
  subtitle,
  viewAllHref,
  onQuickAdd,
  onFavorite,
}: MixedGridProps) {
  if (products.length === 0) return null

  const [heroProduct, ...smallProducts] = products.slice(0, 5)
  const fourSmall = smallProducts.slice(0, 4)

  return (
    <section className="relative">
      {(title || subtitle) && (
        <div className="mb-6 flex items-end justify-between">
          <div>
            {title && (
              <h2 className="text-2xl font-semibold text-mb-slate tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-mb-slate-light">{subtitle}</p>
            )}
          </div>
          {viewAllHref && (
            <a
              href={viewAllHref}
              className="group flex items-center gap-1 text-sm font-medium text-mb-blue hover:text-mb-blue-dark transition-colors"
            >
              See more
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Mixed Grid - Hero on Right */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {/* 4 Small Products first on desktop (order matters for grid flow) */}
        {fourSmall.map((product, index) => (
          <div
            key={product.id}
            className="order-2 lg:order-1 animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${index * 75}ms` }}
          >
            <EtsyProductCard
              product={product}
              variant="compact"
              onQuickAdd={onQuickAdd}
              onFavorite={onFavorite}
            />
          </div>
        ))}

        {/* Hero Product on right */}
        <div className="order-1 col-span-2 row-span-1 lg:order-2 lg:col-span-1 lg:row-span-2">
          <div className="h-full">
            <EtsyProductCard
              product={heroProduct}
              variant="large"
              onQuickAdd={onQuickAdd}
              onFavorite={onFavorite}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * MixedGridDouble - Two hero products with 6 small
 *
 * Layout:
 * ┌───────┬───────┬───────┬───────┐
 * │       │  Sm   │  Sm   │       │
 * │ HERO  ├───────┼───────┤ HERO  │
 * │       │  Sm   │  Sm   │       │
 * └───────┴───────┴───────┴───────┘
 */
export function MixedGridDouble({
  products,
  title,
  subtitle,
  viewAllHref,
  onQuickAdd,
  onFavorite,
}: MixedGridProps) {
  if (products.length < 6) return null

  const heroLeft = products[0]
  const heroRight = products[5]
  const middleFour = products.slice(1, 5)

  return (
    <section className="relative">
      {(title || subtitle) && (
        <div className="mb-6 flex items-end justify-between">
          <div>
            {title && (
              <h2 className="text-2xl font-semibold text-mb-slate tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-mb-slate-light">{subtitle}</p>
            )}
          </div>
          {viewAllHref && (
            <a
              href={viewAllHref}
              className="group flex items-center gap-1 text-sm font-medium text-mb-blue hover:text-mb-blue-dark transition-colors"
            >
              See more
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Double Hero Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {/* Left Hero */}
        <div className="col-span-1 row-span-2 hidden lg:block">
          <div className="h-full">
            <EtsyProductCard
              product={heroLeft}
              variant="large"
              onQuickAdd={onQuickAdd}
              onFavorite={onFavorite}
            />
          </div>
        </div>

        {/* Middle 4 small products */}
        {middleFour.map((product, index) => (
          <div
            key={product.id}
            className="animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${index * 75}ms` }}
          >
            <EtsyProductCard
              product={product}
              variant="compact"
              onQuickAdd={onQuickAdd}
              onFavorite={onFavorite}
            />
          </div>
        ))}

        {/* Right Hero */}
        <div className="col-span-1 row-span-2 hidden lg:block">
          <div className="h-full">
            <EtsyProductCard
              product={heroRight}
              variant="large"
              onQuickAdd={onQuickAdd}
              onFavorite={onFavorite}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
