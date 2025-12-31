import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Star, Heart, Check, Users, Package, Percent } from 'lucide-react'
import { MARKETPLACE_CATEGORIES } from '@madebuy/shared/src/types/marketplace'
import { MixedGrid, MixedGridAlt, EtsyProductCard, RecentlyViewed } from '@/components/marketplace'
import { mapMarketplaceProduct } from '@/lib/productMapping'

export const metadata = {
  title: 'MadeBuy Marketplace - Handmade Goods from Independent Makers',
  description: 'Discover unique handmade products from talented creators. Art, jewelry, clothing, home decor, and more. No transaction fees for sellers.',
}

export default async function MarketplaceHomePage() {
  const { marketplace, tenants } = await import('@madebuy/db')

  // Fetch more products for denser grids
  const [featuredResult, trendingResult] = await Promise.all([
    marketplace.listMarketplaceProducts({
      sortBy: 'rating',
      limit: 17, // 5 for MixedGrid + 12 for dense grid
      page: 1,
    }),
    marketplace.listMarketplaceProducts({
      sortBy: 'popular',
      limit: 12,
      page: 1,
    })
  ])

  const enrichProduct = async (product: any) => {
    const tenant = await tenants.getTenantById(product.tenantId)
    return {
      ...product,
      rating: product.marketplace?.avgRating || product.rating || 0,
      seller: {
        tenantId: product.tenantId,
        businessName: tenant?.businessName || 'Unknown Seller'
      }
    }
  }

  const [featuredProducts, trendingProducts] = await Promise.all([
    Promise.all(featuredResult.products.map(enrichProduct)),
    Promise.all(trendingResult.products.map(enrichProduct)),
  ])

  // Map to card format
  const featuredCards = featuredProducts.map(mapMarketplaceProduct)
  const trendingCards = trendingProducts.map(mapMarketplaceProduct)

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-mb-cream pt-12 pb-16 lg:pt-16 lg:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-mb-slate tracking-tight">
              Discover <span className="text-mb-blue">Handmade</span> Magic
            </h1>
            <p className="mt-6 text-lg text-mb-slate-light leading-relaxed">
              Shop unique products from independent makers and creators. Support small businesses with zero transaction fees.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/marketplace/browse"
                className="flex items-center gap-2 rounded-full bg-mb-blue px-8 py-4 text-base font-medium text-white hover:bg-mb-blue-dark transition-colors shadow-lg shadow-mb-blue/25"
              >
                Browse Products
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/auth/signup"
                className="flex items-center gap-2 rounded-full border-2 border-mb-sand bg-white px-8 py-4 text-base font-medium text-mb-slate hover:border-mb-blue hover:text-mb-blue transition-all"
              >
                Start Selling
              </Link>
            </div>

            {/* Stats Row */}
            <div className="mt-14 flex items-center justify-center gap-8 sm:gap-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-mb-slate">1,000+</div>
                <div className="text-sm text-mb-slate-light mt-1">Products</div>
              </div>
              <div className="h-8 w-px bg-mb-sand" />
              <div className="text-center">
                <div className="text-3xl font-bold text-mb-slate">200+</div>
                <div className="text-sm text-mb-slate-light mt-1">Makers</div>
              </div>
              <div className="h-8 w-px bg-mb-sand" />
              <div className="text-center">
                <div className="text-3xl font-bold text-mb-accent">0%</div>
                <div className="text-sm text-mb-slate-light mt-1">Fees</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <section className="border-y border-mb-sand bg-white py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <Link
              href="/marketplace/browse"
              className="flex-shrink-0 rounded-full bg-mb-blue px-5 py-2.5 text-sm font-medium text-white"
            >
              All
            </Link>
            {MARKETPLACE_CATEGORIES.slice(0, 8).map((category) => (
              <Link
                key={category.id}
                href={`/marketplace/categories/${category.slug}`}
                className="flex-shrink-0 rounded-full border border-mb-sand bg-white px-5 py-2.5 text-sm font-medium text-mb-slate hover:border-mb-blue hover:text-mb-blue transition-all"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products - MixedGrid Layout */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {featuredCards.length > 0 ? (
            <>
              {/* MixedGrid: 1 hero + 4 small */}
              <MixedGrid
                products={featuredCards.slice(0, 5)}
                title="Editor's Picks"
                subtitle="Handpicked items from local artisans"
                viewAllHref="/marketplace/browse?sortBy=rating"
              />

              {/* Dense Grid: More featured products */}
              {featuredCards.length > 5 && (
                <div className="mt-10">
                  <h3 className="mb-6 text-lg font-semibold text-mb-slate">More to Explore</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {featuredCards.slice(5, 17).map((product) => (
                      <EtsyProductCard
                        key={product.id}
                        product={product}
                        variant="compact"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyProductsPlaceholder />
          )}
        </div>
      </section>

      {/* Top Sellers */}
      <section className="border-y border-mb-sand bg-mb-cream py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-mb-slate">Top Sellers</h2>
              <p className="mt-1 text-mb-slate-light">Meet the makers behind the products</p>
            </div>
            <Link
              href="/marketplace/sellers"
              className="flex items-center gap-1 text-sm font-medium text-mb-blue hover:text-mb-blue-dark transition-colors"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="group rounded-2xl border border-mb-sand bg-white p-6 hover:shadow-lg hover:border-mb-blue/30 transition-all">
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-mb-sky to-mb-sky-dark mb-4" />
                  <h3 className="font-semibold text-mb-slate group-hover:text-mb-blue transition-colors">Artisan Studio {i}</h3>
                  <p className="text-sm text-mb-slate-light mt-1">Handmade Jewelry</p>
                  <div className="flex items-center gap-1 mt-3 text-sm text-mb-slate-light">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-mb-slate">4.9</span>
                    <span>(120)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products - MixedGridAlt Layout */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {trendingCards.length > 0 ? (
            <>
              {/* MixedGridAlt: Hero on right */}
              <MixedGridAlt
                products={trendingCards.slice(0, 5)}
                title="Trending Now"
                subtitle="What's hot this week"
                viewAllHref="/marketplace/browse?sortBy=popular"
              />

              {/* More trending in dense grid */}
              {trendingCards.length > 5 && (
                <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {trendingCards.slice(5, 11).map((product) => (
                    <EtsyProductCard
                      key={product.id}
                      product={product}
                      variant="compact"
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyProductsPlaceholder />
          )}
        </div>
      </section>

      {/* Recently Viewed */}
      <section className="border-t border-mb-sand py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RecentlyViewed />
        </div>
      </section>

      {/* Dark CTA Section */}
      <section className="bg-gray-900 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                Ready to Start Selling?
              </h2>
              <p className="mt-4 text-lg text-gray-400 leading-relaxed">
                Join hundreds of makers already selling on MadeBuy. Get your own storefront, list unlimited products, and keep 100% of your earnings.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Zero transaction fees',
                  'Your own branded storefront',
                  'Marketplace exposure',
                  'Easy inventory management',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-gray-300">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/signup"
                  className="flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-medium text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Create Your Store
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center justify-center gap-2 rounded-full border-2 border-gray-700 px-8 py-4 text-base font-medium text-white hover:border-gray-600 transition-colors"
                >
                  View Pricing
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-2xl bg-gray-800 p-6">
                    <Users className="h-8 w-8 text-blue-400 mb-3" />
                    <div className="text-2xl font-bold text-white">200+</div>
                    <div className="text-gray-400">Active Sellers</div>
                  </div>
                  <div className="rounded-2xl bg-gray-800 p-6">
                    <Percent className="h-8 w-8 text-green-400 mb-3" />
                    <div className="text-2xl font-bold text-white">0%</div>
                    <div className="text-gray-400">Transaction Fees</div>
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="rounded-2xl bg-gray-800 p-6">
                    <Package className="h-8 w-8 text-purple-400 mb-3" />
                    <div className="text-2xl font-bold text-white">1,000+</div>
                    <div className="text-gray-400">Listed Products</div>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-6">
                    <Star className="h-8 w-8 text-white mb-3" />
                    <div className="text-2xl font-bold text-white">4.9</div>
                    <div className="text-blue-100">Average Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ProductCard({ product }: { product: any }) {
  return (
    <Link
      href={`/marketplace/product/${product.id}`}
      className="group relative rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {product.images && product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
        )}
        {/* Wishlist Button */}
        <button className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white">
          <Heart className="h-4 w-4 text-gray-600" />
        </button>
        {/* Badge */}
        {product.badge && (
          <div className="absolute left-3 top-3 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-medium text-white">
            {product.badge}
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1">
          {product.seller?.businessName}
        </p>
        <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">
            ${product.price.toFixed(2)}
          </span>
          {product.rating > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function EmptyProductsPlaceholder() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-20 text-center">
      <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        No Products Yet
      </h3>
      <p className="mb-6 text-gray-500 max-w-sm mx-auto">
        Be the first to list your handmade products on MadeBuy!
      </p>
      <Link
        href="/auth/signup"
        className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800 transition-colors"
      >
        Start Selling
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
