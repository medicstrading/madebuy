import { requireTenant } from '@/lib/tenant'
import { reviews } from '@madebuy/db'
import { getPieceBySlug, populatePieceWithMedia } from '@/lib/pieces'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { ProductAddToCart } from '@/components/product/ProductAddToCart'
import { ProductViewTracker } from '@/components/analytics/ProductViewTracker'
import { ReviewStars, ReviewsList } from '@/components/reviews'

export async function generateMetadata({
  params
}: {
  params: { tenant: string; slug: string }
}) {
  const tenant = await requireTenant(params.tenant)
  const piece = await getPieceBySlug(tenant.id, params.slug)

  if (!piece) {
    return {
      title: 'Product Not Found',
    }
  }

  return {
    title: `${piece.name} - ${tenant.businessName}`,
    description: piece.description || `Buy ${piece.name} from ${tenant.businessName}`,
  }
}

export default async function PieceDetailPage({
  params,
}: {
  params: { tenant: string; slug: string }
}) {
  const tenant = await requireTenant(params.tenant)
  const rawPiece = await getPieceBySlug(tenant.id, params.slug)

  if (!rawPiece || rawPiece.status !== 'available') {
    notFound()
  }

  // Populate piece with media and fetch review stats (reviews fail gracefully)
  const piece = await populatePieceWithMedia(rawPiece)
  let reviewStats = { averageRating: 0, totalReviews: 0, ratingDistribution: {} }
  let initialReviews: Awaited<ReturnType<typeof reviews.listApprovedReviews>> = []
  try {
    ;[reviewStats, initialReviews] = await Promise.all([
      reviews.getProductReviewStats(tenant.id, rawPiece.id),
      reviews.listApprovedReviews(tenant.id, rawPiece.id, { limit: 10 }),
    ])
  } catch (reviewError) {
    console.error('Failed to load reviews:', reviewError)
    // Continue without reviews - non-critical feature
  }

  const inStock = piece.stock === undefined || piece.stock > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Analytics Tracking */}
      <ProductViewTracker tenantId={tenant.id} productId={piece.id} />

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${params.tenant}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Shop
            </Link>
            <Link
              href={`/${params.tenant}/cart`}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <ShoppingCart className="h-5 w-5" />
              Cart
            </Link>
          </div>
        </div>
      </header>

      {/* Product Detail */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Gallery */}
          <div>
            {piece.primaryImage ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white shadow-lg">
                <Image
                  src={piece.primaryImage.variants.large?.url || piece.primaryImage.variants.original.url}
                  alt={piece.name}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-gray-100">
                <ImageIcon className="h-24 w-24 text-gray-300" />
              </div>
            )}

            {/* Additional images */}
            {piece.allImages && piece.allImages.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {piece.allImages.slice(0, 4).map((img: any, idx: number) => (
                  <div key={idx} className="relative aspect-square overflow-hidden rounded-md">
                    <Image
                      src={img.variants.thumb?.url || img.variants.original.url}
                      alt={`${piece.name} ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{piece.name}</h1>

            {/* Rating Display */}
            {reviewStats.totalReviews > 0 && (
              <div className="mt-2">
                <ReviewStars
                  rating={reviewStats.averageRating}
                  size="md"
                  showValue
                  reviewCount={reviewStats.totalReviews}
                />
              </div>
            )}

            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(piece.price, piece.currency)}
              </span>
            </div>

            {piece.description && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900">Description</h2>
                <p className="mt-2 text-gray-700 whitespace-pre-line">{piece.description}</p>
              </div>
            )}

            {/* Materials */}
            {piece.materials && piece.materials.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900">Materials</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {piece.materials.map((material: string, idx: number) => (
                    <span
                      key={idx}
                      className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                    >
                      {material}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {piece.tags && piece.tags.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {piece.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stock status */}
            <div className="mt-6">
              {inStock ? (
                <span className="text-green-600 font-medium">In Stock</span>
              ) : (
                <span className="text-red-600 font-medium">Out of Stock</span>
              )}
              {piece.stock !== undefined && inStock && (
                <span className="ml-2 text-gray-600">
                  ({piece.stock} available)
                </span>
              )}
            </div>

            {/* Add to Cart */}
            <div className="mt-8">
              <ProductAddToCart
                product={piece}
                tenantId={tenant.id}
                tenant={params.tenant}
                disabled={!inStock}
                personalization={piece.personalization}
              />
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <section className="mt-16 border-t border-gray-200 pt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
          <ReviewsList
            tenantId={tenant.id}
            pieceId={piece.id}
            initialReviews={initialReviews}
            initialStats={reviewStats}
          />
        </section>
      </main>
    </div>
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
