'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import {
  Star,
  Heart,
  Share2,
  ChevronRight,
  ChevronLeft,
  Clock,
  MapPin,
  Package,
  RefreshCw,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
  Shield,
  Check,
  MessageCircle,
} from 'lucide-react'
import { EtsyProductCard, RecentlyViewed, trackProductView } from '@/components/marketplace'

// Map database product to EtsyProductCard format
function mapToCardProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug || product.id,
    price: product.price,
    originalPrice: product.originalPrice,
    currency: 'AUD',
    images: product.images || [],
    rating: product.marketplace?.avgRating || product.rating || 0,
    reviewCount: product.marketplace?.totalReviews || 0,
    seller: {
      name: product.seller?.businessName || 'Seller',
      slug: product.seller?.tenantId,
    },
    badges: [],
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string

  const [product, setProduct] = useState<any>(null)
  const [tenant, setTenant] = useState<any>(null)
  const [sellerProfile, setSellerProfile] = useState<any>(null)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isFavorited, setIsFavorited] = useState(false)

  // Fetch product data
  useEffect(() => {
    async function fetchData() {
      try {
        const { marketplace, tenants } = await import('@madebuy/db')

        const productData = await marketplace.getMarketplaceProduct(productId)
        if (!productData) {
          setLoading(false)
          return
        }

        setProduct(productData)

        // Fetch seller info
        const tenantData = await tenants.getTenantById(productData.tenantId)
        setTenant(tenantData)

        const profile = await marketplace.getSellerProfile(productData.tenantId)
        setSellerProfile(profile)

        // Record view
        await marketplace.recordMarketplaceView(productId)

        // Track for recently viewed
        trackProductView({
          id: productData.id,
          name: productData.name,
          slug: productData.slug || productData.id,
          price: productData.price,
          currency: 'AUD',
          image: productData.images?.[0],
        })

        // Fetch related products
        const related = await marketplace.listMarketplaceProducts({
          category: productData.category,
          limit: 8,
          page: 1,
        })
        setRelatedProducts(
          related.products.filter((p: any) => p.id !== productId).slice(0, 6)
        )

        setLoading(false)
      } catch (error) {
        console.error('Error fetching product:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [productId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-mb-blue border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-mb-slate mb-4">Product Not Found</h1>
        <Link href="/marketplace/browse" className="text-mb-blue hover:underline">
          Back to Browse
        </Link>
      </div>
    )
  }

  const images = product.images || []
  const rating = product.marketplace?.avgRating || 0
  const reviewCount = product.marketplace?.totalReviews || 0
  const salesCount = product.marketplace?.totalViews || 0
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0
  const lowStock = product.stock && product.stock <= 5
  const sellerName = tenant?.businessName || sellerProfile?.displayName || 'Seller'

  return (
    <div className="min-h-screen bg-white">
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
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="group relative aspect-square overflow-hidden rounded-2xl bg-mb-cream">
              {images.length > 0 ? (
                <Image
                  src={images[selectedImage]}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-24 w-24 text-mb-slate-light" />
                </div>
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setSelectedImage((prev) =>
                        prev > 0 ? prev - 1 : images.length - 1
                      )
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg text-mb-slate hover:bg-white hover:text-mb-blue transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() =>
                      setSelectedImage((prev) =>
                        prev < images.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg text-mb-slate hover:bg-white hover:text-mb-blue transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute left-4 top-4 flex flex-col gap-2">
                {product.featured && (
                  <span className="rounded-full bg-mb-accent px-3 py-1 text-xs font-semibold text-white shadow-md">
                    Bestseller
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                    {discount}% OFF
                  </span>
                )}
              </div>

              {/* Favorite & Share */}
              <div className="absolute right-4 top-4 flex flex-col gap-2">
                <button
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all ${
                    isFavorited
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/90 text-mb-slate hover:bg-white hover:text-rose-500'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg text-mb-slate hover:bg-white hover:text-mb-blue transition-all">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative flex-shrink-0 h-20 w-20 overflow-hidden rounded-lg transition-all ${
                      selectedImage === index
                        ? 'ring-2 ring-mb-blue ring-offset-2'
                        : 'ring-1 ring-mb-sand hover:ring-mb-blue'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

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
                ${product.price?.toFixed(2)}
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-mb-slate-light line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-sm font-semibold text-rose-600">
                    Save ${(product.originalPrice - product.price).toFixed(2)}
                  </span>
                </>
              )}
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

            {/* Quantity */}
            <div className="border-t border-mb-sand pt-6">
              <label className="mb-2 block text-sm font-medium text-mb-slate">
                Quantity
              </label>
              <div className="inline-flex items-center rounded-lg border-2 border-mb-sand">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-10 w-10 items-center justify-center text-mb-slate hover:bg-mb-cream transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-medium text-mb-slate">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-10 w-10 items-center justify-center text-mb-slate hover:bg-mb-cream transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="flex-1 flex items-center justify-center gap-2 rounded-full bg-mb-blue px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-mb-blue/25 hover:bg-mb-blue-dark transition-all hover:shadow-xl hover:shadow-mb-blue/30 active:scale-[0.98]">
                <ShoppingBag className="h-5 w-5" />
                Add to cart
              </button>
              <button className="flex items-center justify-center gap-2 rounded-full border-2 border-mb-slate px-6 py-4 text-lg font-semibold text-mb-slate hover:bg-mb-cream transition-all">
                Buy it now
              </button>
            </div>

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

      {/* Sticky Mobile Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-mb-sand bg-white p-4 shadow-lg lg:hidden">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-lg font-bold text-mb-slate">${product.price?.toFixed(2)}</div>
            <div className="text-xs text-mb-accent">Free shipping</div>
          </div>
          <button className="flex-1 flex items-center justify-center gap-2 rounded-full bg-mb-blue px-4 py-3 font-semibold text-white shadow-md">
            <ShoppingBag className="h-5 w-5" />
            Add to cart
          </button>
        </div>
      </div>
    </div>
  )
}
