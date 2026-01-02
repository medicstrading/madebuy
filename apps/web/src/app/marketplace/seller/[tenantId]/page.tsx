import Link from 'next/link'
import Image from 'next/image'
import { Star, MapPin, Calendar, TrendingUp, MessageCircle, ExternalLink, ArrowLeft, Sparkles } from 'lucide-react'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: { tenantId: string } }) {
  const { marketplace, tenants } = await import('@madebuy/db')

  // Try by id first, then by slug
  let tenant = await tenants.getTenantById(params.tenantId)
  if (!tenant) {
    tenant = await tenants.getTenantBySlug(params.tenantId)
  }

  const tenantId = tenant?.id || params.tenantId
  const sellerProfile = await marketplace.getSellerProfile(tenantId)

  const sellerName = tenant?.businessName || sellerProfile?.displayName || 'Seller'

  return {
    title: `${sellerName} - MadeBuy Marketplace`,
    description: `Shop handmade products from ${sellerName}. ${sellerProfile?.bio || ''}`,
  }
}

export default async function SellerProfilePage({
  params,
  searchParams,
}: {
  params: { tenantId: string }
  searchParams: { page?: string }
}) {
  const { marketplace, tenants } = await import('@madebuy/db')

  // Fetch seller data - try by id first, then by slug
  let tenant = await tenants.getTenantById(params.tenantId)
  if (!tenant) {
    tenant = await tenants.getTenantBySlug(params.tenantId)
  }

  const tenantId = tenant?.id || params.tenantId
  const sellerProfile = await marketplace.getSellerProfile(tenantId)

  if (!tenant && !sellerProfile) {
    notFound()
  }

  // Fetch seller's products
  const currentPage = parseInt(searchParams.page || '1', 10)
  const productsResult = await marketplace.listSellerProducts(tenantId, currentPage, 12)

  const sellerName = tenant?.businessName || sellerProfile?.displayName || 'Unknown Seller'
  const memberSince = sellerProfile?.memberSince || tenant?.createdAt || new Date()
  const sellerData = sellerProfile as any // Type cast for incomplete marketplace types

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="h-64 w-full bg-gradient-to-r from-blue-600 to-purple-700"></div>

      <div className="container mx-auto px-4">
        {/* Profile Header */}
        <div className="relative -mt-20 mb-8">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
            <Link
              href="/marketplace/sellers"
              className="mb-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sellers
            </Link>

            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              {/* Avatar */}
              <div className="h-32 w-32 flex-shrink-0 rounded-full border-4 border-white bg-gradient-to-br from-blue-200 to-purple-200 shadow-lg"></div>

              {/* Info */}
              <div className="flex-1">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h1 className="mb-1 text-3xl font-bold text-gray-900">{sellerName}</h1>
                    {sellerProfile?.location && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{sellerProfile.location}</span>
                      </div>
                    )}
                  </div>

                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    <MessageCircle className="inline h-5 w-5 mr-2" />
                    Contact
                  </button>
                </div>

                {sellerProfile?.bio && (
                  <p className="mb-4 text-gray-700">{sellerProfile.bio}</p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-6 text-sm">
                  {sellerProfile?.stats?.avgRating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">
                        {sellerProfile.stats.avgRating.toFixed(1)}
                      </span>
                      <span className="text-gray-600">
                        ({sellerProfile.stats.totalReviews || 0} reviews)
                      </span>
                    </div>
                  )}
                  {sellerProfile?.stats?.totalSales && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-5 w-5 text-gray-400" />
                      <span className="font-semibold">
                        {sellerProfile.stats.totalSales.toLocaleString()}
                      </span>
                      <span className="text-gray-600">sales</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600">
                      Member since {memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Badges */}
                {sellerProfile?.badges && sellerProfile.badges.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {sellerProfile.badges.map((badge) => {
                      const badgeConfigs: Record<string, { label: string; color: string }> = {
                        top_seller: { label: 'Top Seller', color: 'green' },
                        fast_shipper: { label: 'Fast Shipper', color: 'blue' },
                        verified: { label: 'Verified', color: 'purple' },
                        eco_friendly: { label: 'Eco-Friendly', color: 'green' },
                      }
                      const badgeConfig = badgeConfigs[badge] || { label: badge, color: 'gray' }

                      return (
                        <span
                          key={badge}
                          className={`rounded-full bg-${badgeConfig.color}-100 px-3 py-1 text-xs font-medium text-${badgeConfig.color}-800`}
                        >
                          {badgeConfig.label}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              {/* Seller Stats */}
              {sellerProfile?.stats && (
                <div>
                  <h2 className="mb-3 font-semibold text-gray-900">Shop Stats</h2>
                  <dl className="space-y-2 text-sm">
                    {sellerProfile.stats.responseRate && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Response Rate</dt>
                        <dd className="font-medium text-gray-900">
                          {sellerProfile.stats.responseRate}%
                        </dd>
                      </div>
                    )}
                    {sellerProfile.stats.avgResponseTime && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Response Time</dt>
                        <dd className="font-medium text-gray-900">
                          {sellerProfile.stats.avgResponseTime} hours
                        </dd>
                      </div>
                    )}
                    {sellerProfile.stats.onTimeDeliveryRate && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">On-Time Delivery</dt>
                        <dd className="font-medium text-gray-900">
                          {sellerProfile.stats.onTimeDeliveryRate}%
                        </dd>
                      </div>
                    )}
                    {sellerProfile.stats.repeatCustomerRate && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Repeat Customers</dt>
                        <dd className="font-medium text-gray-900">
                          {sellerProfile.stats.repeatCustomerRate}%
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Policies */}
              {sellerData?.policies && (
                <div className="border-t pt-4">
                  <h2 className="mb-3 font-semibold text-gray-900">Policies</h2>
                  <dl className="space-y-2 text-sm">
                    {sellerData.policies.processingTime && (
                      <div>
                        <dt className="font-medium text-gray-900">Processing Time</dt>
                        <dd className="text-gray-600">{sellerData.policies.processingTime}</dd>
                      </div>
                    )}
                    {sellerData.policies.returns && (
                      <div>
                        <dt className="font-medium text-gray-900">Returns</dt>
                        <dd className="text-gray-600">{sellerData.policies.returns}</dd>
                      </div>
                    )}
                    {sellerData.policies.customization && (
                      <div>
                        <dt className="font-medium text-gray-900">Customization</dt>
                        <dd className="text-gray-600">{sellerData.policies.customization}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Social Links */}
              <div className="border-t pt-4">
                <h2 className="mb-3 font-semibold text-gray-900">Follow</h2>
                <div className="space-y-2">
                  <a
                    href="#"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Website
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Instagram
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Products */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Products</h2>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="recent">Recently Added</option>
                <option value="popular">Most Popular</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>

            {/* Products Grid */}
            {productsResult.products.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {productsResult.products.map((product: any) => (
                  <Link
                    key={product.id}
                    href={`/marketplace/product/${product.slug || product.id}`}
                    className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
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
                          <Sparkles className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="mb-2 line-clamp-2 font-semibold text-gray-900 group-hover:text-blue-600">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.marketplace?.avgRating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-gray-600">
                              {product.marketplace.avgRating.toFixed(1)}
                            </span>
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
                <p className="text-gray-600">
                  This seller hasn&apos;t listed any products yet.
                </p>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                Previous
              </button>
              {[1, 2, 3].map((page) => (
                <Link
                  key={page}
                  href={`/marketplace/seller/${params.tenantId}?page=${page}`}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    page === 1
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </Link>
              ))}
              <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Next
              </button>
            </div>

            {/* Placeholder message */}
            <div className="mt-8 rounded-lg bg-blue-50 p-6 text-center">
              <p className="text-sm text-gray-600">
                <strong>Coming Soon:</strong> Seller products and profile data will be loaded from the API.
              </p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Recent Reviews</h2>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b pb-4 last:border-0">
                <div className="mb-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mb-2 text-gray-700">
                  Great seller, fast shipping and beautiful product!
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Customer Name</span>
                  <span>•</span>
                  <span>2 weeks ago</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button className="text-blue-600 hover:text-blue-700 hover:underline">
              View All Reviews
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
