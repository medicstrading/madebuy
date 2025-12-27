import Link from 'next/link'
import Image from 'next/image'
import { Star, Heart, Share2, ShoppingCart, MapPin, Package, Shield, ArrowLeft, Sparkles } from 'lucide-react'
import { ProductImage, ProductReviews, RelatedItems, MobileProductCTA } from '@/components/marketplace'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { marketplace } = await import('@madebuy/db')
  const product = await marketplace.getMarketplaceProduct(params.id)

  if (!product) {
    return {
      title: 'Product Not Found - MadeBuy Marketplace',
      description: 'This product could not be found.',
    }
  }

  return {
    title: `${product.name} - MadeBuy Marketplace`,
    description: product.description || `Buy ${product.name} on MadeBuy marketplace`,
  }
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const { marketplace, tenants } = await import('@madebuy/db')

  // Fetch product data
  const product = await marketplace.getMarketplaceProduct(params.id)

  if (!product) {
    notFound()
  }

  // Fetch seller information
  const tenant = await tenants.getTenantById(product.tenantId)
  const sellerProfile = await marketplace.getSellerProfile(product.tenantId)

  // Record view
  await marketplace.recordMarketplaceView(product.id)
  // Fetch related products (same category)
  const relatedProductsResult = await marketplace.listMarketplaceProducts({
    category: product.category,
    page: 1,
    limit: 6,
  })
  
  // Filter out current product
  const relatedProducts = relatedProductsResult.products.filter(p => p.id !== product.id).slice(0, 6)


  // Type assertion for marketplace product (full typing TBD)
  const productData = product as any

  // Get reviews (using marketplace function, or fallback to empty)
  const reviewSummary = {
    avgRating: productData.marketplace?.avgRating || 0,
    totalReviews: productData.marketplace?.totalReviews || 0,
    distribution: {
      5: Math.floor((product.marketplace?.totalReviews || 0) * 0.85),
      4: Math.floor((product.marketplace?.totalReviews || 0) * 0.10),
      3: Math.floor((product.marketplace?.totalReviews || 0) * 0.03),
      2: Math.floor((product.marketplace?.totalReviews || 0) * 0.01),
      1: Math.floor((product.marketplace?.totalReviews || 0) * 0.01),
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
        <Link href="/marketplace" className="hover:text-blue-600">
          Home
        </Link>
        <span>/</span>
        <Link href="/marketplace/browse" className="hover:text-blue-600">
          Products
        </Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </div>

      <Link
        href="/marketplace/browse"
        className="mb-6 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Browse
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Product Images */}
        <div>
          <div className="sticky top-24 space-y-4">
            {/* Main Image */}
            <div className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              {productData.images && productData.images[0] ? (
                <Image
                  src={productData.images[0]}
                  alt={productData.name}
                  width={800}
                  height={800}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                  <Sparkles className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* Thumbnail Grid */}
            {productData.images && productData.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {productData.images.slice(0, 4).map((image: string, i: number) => (
                  <button
                    key={i}
                    className="aspect-square overflow-hidden rounded-lg border-2 border-transparent bg-gray-100 hover:border-blue-600"
                  >
                    <Image
                      src={image}
                      alt={`${productData.name} - Image ${i + 1}`}
                      width={200}
                      height={200}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title and Rating */}
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              {product.name}
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i <= Math.round(reviewSummary.avgRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {reviewSummary.avgRating.toFixed(1)} ({reviewSummary.totalReviews} reviews)
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="border-y py-4">
            <div className="mb-1 text-3xl font-bold text-gray-900">
              ${productData.price?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-gray-600">
              <Package className="inline h-4 w-4" />
              {productData.stock && productData.stock > 0 ? (
                <> In Stock ({productData.stock} available)</>
              ) : (
                <> In Stock</>
              )}
            </div>
          </div>

          {/* Seller Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-200 to-purple-200"></div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {tenant?.businessName || sellerProfile?.displayName || 'Unknown Seller'}
                </h3>
                {sellerProfile?.location && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{sellerProfile.location}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-4 text-sm">
                  {sellerProfile?.stats?.avgRating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">
                        {sellerProfile.stats.avgRating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {sellerProfile?.stats?.totalSales && (
                    <span className="text-gray-600">
                      {sellerProfile.stats.totalSales} sales
                    </span>
                  )}
                  {sellerProfile?.badges?.includes('top_seller') && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Top Seller
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/marketplace/seller/${product.tenantId}`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View Shop
              </Link>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">
              <ShoppingCart className="h-5 w-5" />
              Add to Cart
            </button>
            <div className="flex gap-2">
              <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                <Heart className="h-5 w-5" />
                Save
              </button>
              <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                <Share2 className="h-5 w-5" />
                Share
              </button>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center gap-4 border-t pt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span>Buyer Protection</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span>Free Returns</span>
            </div>
          </div>

          {/* Description */}
          <div className="border-t pt-6">
            <h2 className="mb-3 text-xl font-bold text-gray-900">Description</h2>
            <div className="space-y-3 text-gray-700">
              <p>{product.description || 'No description available.'}</p>
            </div>
          </div>

          {/* Attributes */}
          <div className="border-t pt-6">
            <h2 className="mb-3 text-xl font-bold text-gray-900">Details</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {product.category && (
                <div>
                  <dt className="font-medium text-gray-900">Category</dt>
                  <dd className="text-gray-600 capitalize">
                    {product.category.replace(/-/g, ' ')}
                  </dd>
                </div>
              )}
              {product.subcategory && (
                <div>
                  <dt className="font-medium text-gray-900">Subcategory</dt>
                  <dd className="text-gray-600 capitalize">
                    {product.subcategory.replace(/-/g, ' ')}
                  </dd>
                </div>
              )}
              {sellerProfile?.location && (
                <div>
                  <dt className="font-medium text-gray-900">Made In</dt>
                  <dd className="text-gray-600">{sellerProfile.location}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-gray-900">SKU</dt>
                <dd className="text-gray-600">{product.id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Product Reviews Component */}
      <ProductReviews productId={product.id} productName={product.name} />
      
      {/* Related Items Carousel */}
      <RelatedItems products={relatedProducts} title="Similar Products" />

      {/* Mobile CTA Bar */}
      <MobileProductCTA 
        product={product}

      />
    </div>
  )
}
