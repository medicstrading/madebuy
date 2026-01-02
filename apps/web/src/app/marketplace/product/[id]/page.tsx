import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  Star,
  ChevronRight,
  Clock,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  Shield,
  Check,
  MessageCircle,
} from 'lucide-react'
import { unstable_cache } from 'next/cache'
import { ProductImageGallery } from '@/components/marketplace/ProductImageGallery'
import { ProductActions } from '@/components/marketplace/ProductActions'
import { EtsyProductCard, RecentlyViewed, TrackProductView } from '@/components/marketplace'

// ISR with 5 minute revalidation
export const revalidate = 300

// Generate static params for popular products
export async function generateStaticParams() {
  // Optional: Pre-generate top products at build time
  return []
}

// Cached product data fetch
const getProductData = unstable_cache(
  async (productIdOrSlug: string) => {
    const { marketplace, tenants, media } = await import('@madebuy/db')

    // Get product with seller info
    const product = await marketplace.getMarketplaceProduct(productIdOrSlug)
    if (!product) return null

    // Get tenant and seller profile in parallel
    const [tenant, sellerProfile] = await Promise.all([
      tenants.getTenantById(product.tenantId),
      marketplace.getSellerProfile(product.tenantId),
    ])

    // Get media for this product (images)
    const productMedia = product.mediaIds?.length
      ? await media.getMediaByIds(product.tenantId, product.mediaIds)
      : []

    // Map media to image URLs (use large variant, fallback to original)
    const images = productMedia
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map(m => m.variants?.large?.url || m.variants?.original?.url)
      .filter(Boolean) as string[]

    // Get related products (same category)
    const relatedResult = await marketplace.listMarketplaceProducts({
      category: product.category,
      limit: 7,
      page: 1,
    })

    // Get tenant info for related products
    const relatedTenantIds = [...new Set(relatedResult.products.map((p: any) => p.tenantId))]
    const relatedTenantMap = await tenants.getTenantsByIds(relatedTenantIds)

    const relatedProducts = relatedResult.products
      .filter((p: any) => p.id !== product.id)
      .slice(0, 6)
      .map((p: any) => ({
        ...p,
        seller: {
          tenantId: p.tenantId,
          businessName: relatedTenantMap.get(p.tenantId)?.businessName || 'Seller',
        },
      }))

    return {
      product: {
        ...product,
        images,
      },
      tenant,
      sellerProfile,
      relatedProducts,
    }
  },
  ['marketplace-product'],
  { revalidate: 300, tags: ['marketplace'] }
)

export async function generateMetadata({ params }: { params: { id: string } }) {
  const data = await getProductData(params.id)

  if (!data) {
    return { title: 'Product Not Found - MadeBuy' }
  }

  return {
    title: `${data.product.name} - MadeBuy Marketplace`,
    description: data.product.description?.slice(0, 160) || `Shop ${data.product.name} on MadeBuy`,
    openGraph: {
      title: data.product.name,
      description: data.product.description?.slice(0, 160),
      images: data.product.images?.[0] ? [data.product.images[0]] : [],
    },
  }
}

// Map to EtsyProductCard format
function mapToCardProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug || product.id,
    price: product.price,
    originalPrice: product.originalPrice,
    currency: 'AUD',
    images: product.images || [],
    rating: product.marketplace?.avgRating || 0,
    reviewCount: product.marketplace?.totalReviews || 0,
    seller: {
      name: product.seller?.businessName || 'Seller',
      slug: product.seller?.tenantId,
    },
    badges: [],
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const data = await getProductData(params.id)

  if (!data) {
    notFound()
  }

  const { product, tenant, sellerProfile, relatedProducts } = data
  const images = product.images || []
  const rating = product.marketplace?.avgRating || 0
  const reviewCount = product.marketplace?.totalReviews || 0
  const salesCount = product.marketplace?.marketplaceViews || 0
  const price = product.price || 0
  const lowStock = product.stock && product.stock <= 5
  const sellerName = tenant?.businessName || sellerProfile?.displayName || 'Seller'

  return (
    <div className="min-h-screen bg-white">
      {/* Track view client-side */}
      <TrackProductView
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug || product.id,
          price,
          currency: 'AUD',
          image: images[0],
        }}
      />

      {/* Breadcrumb */}
      <div className="border-b border-mb-sand bg-mb-cream">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-mb-slate-light">
            <Link href="/marketplace" className="hover:text-mb-blue">
              Marketplace
            </Link>
            <ChevronRight className="h-4 w-4" />
            {product.category && (
              <>
                <Link
                  href={`/marketplace/categories/${product.category}`}
                  className="hover:text-mb-blue capitalize"
                >
                  {product.category.replace(/-/g, ' ')}
                </Link>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
            <span className="text-mb-slate truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Product Section */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column - Images (Client Component for interactivity) */}
          <ProductImageGallery
            images={images}
            productName={product.name}
            featured={product.isFeatured}
          />

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            {/* Seller Link */}
            <Link
              href={`/marketplace/seller/${product.tenantId}`}
              className="inline-flex items-center gap-2 text-sm text-mb-slate-light hover:text-mb-blue transition-colors"
            >
              <div className="relative h-6 w-6 overflow-hidden rounded-full bg-mb-sky">
                <div className="h-full w-full bg-gradient-to-br from-mb-sky to-mb-sky-dark" />
              </div>
              <span className="font-medium">{sellerName}</span>
              {sellerProfile?.badges?.includes('top_seller') && (
                <span className="rounded-full bg-mb-sky px-2 py-0.5 text-[10px] font-semibold text-mb-blue">
                  Star Seller
                </span>
              )}
            </Link>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-mb-slate leading-tight lg:text-3xl">
              {product.name}
            </h1>

            {/* Rating & Sales */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-mb-sand text-mb-sand'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium text-mb-slate">{rating.toFixed(1)}</span>
                <span className="text-mb-slate-light">({reviewCount} reviews)</span>
              </div>
              {salesCount > 0 && (
                <>
                  <span className="text-mb-slate-light">|</span>
                  <span className="text-mb-slate-light">{salesCount.toLocaleString()} views</span>
                </>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-mb-slate">
                ${price.toFixed(2)}
              </span>
            </div>

            {/* Low Stock Warning */}
            {lowStock && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <Clock className="h-4 w-4" />
                <span>
                  Only <strong>{product.stock} left</strong> - order soon!
                </span>
              </div>
            )}

            {/* Interactive Actions (Client Component) */}
            <ProductActions productId={product.id} price={price} />

            {/* Shipping Info */}
            <div className="space-y-3 rounded-xl border border-mb-sand bg-mb-cream p-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mb-accent/10">
                  <Truck className="h-4 w-4 text-mb-accent" />
                </div>
                <div>
                  <span className="font-semibold text-mb-accent">Free shipping</span>
                  <span className="text-mb-slate-light"> to Australia</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mb-sky">
                  <Package className="h-4 w-4 text-mb-blue" />
                </div>
                <div>
                  <span className="text-mb-slate">Arrives in </span>
                  <span className="font-medium text-mb-slate">5-7 business days</span>
                </div>
              </div>
              {sellerProfile?.location && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mb-sky">
                    <MapPin className="h-4 w-4 text-mb-blue" />
                  </div>
                  <div>
                    <span className="text-mb-slate">Ships from </span>
                    <span className="font-medium text-mb-slate">{sellerProfile.location}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mb-sky">
                  <RefreshCw className="h-4 w-4 text-mb-blue" />
                </div>
                <div>
                  <span className="font-medium text-mb-slate">30-day returns</span>
                  <span className="text-mb-slate-light"> accepted</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 text-xs text-mb-slate-light">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span>Secure checkout</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="h-4 w-4" />
                <span>Quality guarantee</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>Direct seller support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description & Seller */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {/* Description */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-xl font-semibold text-mb-slate">Description</h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-mb-slate-light whitespace-pre-line">
                {product.description || 'No description available.'}
              </p>
            </div>

            {/* Details */}
            <div className="mt-8 border-t border-mb-sand pt-6">
              <h3 className="mb-4 text-lg font-semibold text-mb-slate">Details</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {product.category && (
                  <div>
                    <dt className="font-medium text-mb-slate">Category</dt>
                    <dd className="text-mb-slate-light capitalize">
                      {product.category.replace(/-/g, ' ')}
                    </dd>
                  </div>
                )}
                {product.subcategory && (
                  <div>
                    <dt className="font-medium text-mb-slate">Subcategory</dt>
                    <dd className="text-mb-slate-light capitalize">
                      {product.subcategory.replace(/-/g, ' ')}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium text-mb-slate">SKU</dt>
                  <dd className="text-mb-slate-light">{product.id}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Seller Card */}
          <div>
            <div className="sticky top-24 rounded-xl border border-mb-sand bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-mb-sky">
                  <div className="h-full w-full bg-gradient-to-br from-mb-sky to-mb-sky-dark" />
                </div>
                <div>
                  <h3 className="font-semibold text-mb-slate">{sellerName}</h3>
                  {sellerProfile?.badges?.includes('top_seller') && (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 fill-mb-blue text-mb-blue" />
                      <span className="font-medium text-mb-blue">Star Seller</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4 text-center">
                <div className="rounded-lg bg-mb-cream p-3">
                  <div className="text-lg font-bold text-mb-slate">
                    {sellerProfile?.stats?.totalSales?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-mb-slate-light">Sales</div>
                </div>
                <div className="rounded-lg bg-mb-cream p-3">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-lg font-bold text-mb-slate">
                      {sellerProfile?.stats?.avgRating?.toFixed(1) || '0'}
                    </span>
                  </div>
                  <div className="text-xs text-mb-slate-light">Rating</div>
                </div>
              </div>

              {sellerProfile?.location && (
                <div className="mb-4 flex items-center gap-2 text-sm text-mb-slate-light">
                  <MapPin className="h-4 w-4" />
                  <span>{sellerProfile.location}</span>
                </div>
              )}

              <div className="space-y-2">
                <Link
                  href={`/marketplace/seller/${product.tenantId}`}
                  className="block w-full rounded-full border-2 border-mb-blue py-2 text-center text-sm font-semibold text-mb-blue hover:bg-mb-sky transition-colors"
                >
                  Visit shop
                </Link>
                <button className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-mb-sand py-2 text-sm font-medium text-mb-slate hover:border-mb-slate transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  Contact seller
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 border-t border-mb-sand pt-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-mb-slate">More from this shop</h2>
              <Link
                href={`/marketplace/seller/${product.tenantId}`}
                className="text-sm font-medium text-mb-blue hover:text-mb-blue-dark transition-colors"
              >
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {relatedProducts.map((p: any) => (
                <EtsyProductCard
                  key={p.id}
                  product={mapToCardProduct(p)}
                  variant="compact"
                />
              ))}
            </div>
          </section>
        )}

        {/* Recently Viewed */}
        <section className="mt-16 border-t border-mb-sand pt-12">
          <RecentlyViewed />
        </section>
      </main>
    </div>
  )
}
