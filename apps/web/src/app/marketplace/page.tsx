import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Star, TrendingUp, Sparkles } from 'lucide-react'
import { MARKETPLACE_CATEGORIES } from '@madebuy/shared/src/types/marketplace'

export const metadata = {
  title: 'MadeBuy Marketplace - Handmade Goods from Independent Makers',
  description: 'Discover unique handmade products from talented creators. Art, jewelry, clothing, home decor, and more. No transaction fees for sellers.',
}

export default async function MarketplaceHomePage() {
  // Fetch featured and trending products from database
  const { marketplace, tenants } = await import('@madebuy/db')

  const [featuredResult, trendingResult] = await Promise.all([
    marketplace.listMarketplaceProducts({
      sortBy: 'rating',
      limit: 4,
      page: 1,
    }),
    marketplace.listMarketplaceProducts({
      sortBy: 'popular',
      limit: 6,
      page: 1,
    })
  ])

  // Enrich products with seller info and normalize fields
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

  const featuredData = { products: featuredProducts }
  const trendingData = { products: trendingProducts }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-700 py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 text-5xl font-bold">
            Discover Handmade Magic
          </h1>
          <p className="mb-8 text-xl text-blue-100">
            Shop unique products from independent makers and creators
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/marketplace/browse"
              className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-blue-600 shadow-lg hover:bg-gray-100"
            >
              Browse Products
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg border-2 border-white px-6 py-3 font-semibold hover:bg-white/10"
            >
              Start Selling
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold">1,000+</div>
              <div className="text-blue-100">Products</div>
            </div>
            <div>
              <div className="text-4xl font-bold">200+</div>
              <div className="text-blue-100">Makers</div>
            </div>
            <div>
              <div className="text-4xl font-bold">0%</div>
              <div className="text-blue-100">Transaction Fees</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Shop by Category</h2>
          <Link
            href="/marketplace/categories"
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {MARKETPLACE_CATEGORIES.slice(0, 10).map((category) => (
            <Link
              key={category.id}
              href={`/marketplace/categories/${category.slug}`}
              className="group flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                {/* Icon placeholder - could use actual icons based on category.icon */}
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-gray-900">{category.name}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {category.subcategories.length} types
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
          </div>
          <Link
            href="/marketplace/browse?sortBy=rating"
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            View All
          </Link>
        </div>

        {featuredData.products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredData.products.slice(0, 4).map((product: any) => (
              <Link
                key={product.id}
                href={`/marketplace/product/${product.id}`}
                className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {product.images && product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                      <Sparkles className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  {product.badge && (
                    <div className="absolute right-2 top-2 rounded-full bg-yellow-500 px-2 py-1 text-xs font-semibold text-white">
                      {product.badge}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="mb-1 line-clamp-2 font-semibold text-gray-900 group-hover:text-blue-600">
                    {product.name}
                  </h3>
                  <p className="mb-3 text-sm text-gray-600 line-clamp-1">
                    by {product.seller?.businessName || 'Unknown'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.rating && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{product.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-16 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              No Products Yet
            </h3>
            <p className="mb-6 text-gray-600">
              Be the first to list your handmade products on MadeBuy!
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Start Selling
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {/* Trending This Week */}
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <h2 className="text-3xl font-bold text-gray-900">Trending This Week</h2>
            </div>
            <Link
              href="/marketplace/browse?sortBy=popular"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              View All
            </Link>
          </div>

          {trendingData.products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {trendingData.products.map((product: any) => (
                <Link
                  key={product.id}
                  href={`/marketplace/product/${product.id}`}
                  className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    {product.images && product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-100 to-blue-100">
                        <TrendingUp className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="mb-1 line-clamp-1 text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                      {product.name}
                    </h3>
                    <span className="text-sm font-bold text-gray-900">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white py-12 text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-600">
                Trending products will appear here once makers start listing!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose MadeBuy */}
      <section className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Why Shop on MadeBuy?
          </h2>
          <p className="text-lg text-gray-600">
            Supporting independent makers has never been easier
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Sparkles className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">
              Unique & Handmade
            </h3>
            <p className="text-gray-600">
              Every item is crafted with care by talented independent makers. No mass production, just authentic handmade quality.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Star className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">
              Support Creators
            </h3>
            <p className="text-gray-600">
              100% of your purchase goes to the maker. We don&apos;t charge transaction fees, so creators keep what they earn.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">
              Curated Quality
            </h3>
            <p className="text-gray-600">
              We verify every seller and their products. Shop with confidence knowing you&apos;re getting authentic, high-quality items.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 py-16">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="mb-4 text-4xl font-bold">Ready to Start Selling?</h2>
          <p className="mb-8 text-xl text-purple-100">
            Join hundreds of makers already selling on MadeBuy. No transaction fees, ever.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-lg bg-white px-8 py-3 font-semibold text-purple-600 shadow-lg hover:bg-gray-100"
            >
              Create Your Store
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border-2 border-white px-8 py-3 font-semibold hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
