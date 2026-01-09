import { notFound } from 'next/navigation'
import Link from 'next/link'
import { bundles } from '@madebuy/db'
import { getTenantBySlug } from '@/lib/tenant'
import { AddBundleToCartButton } from '@/components/bundles/AddBundleToCartButton'
import { Package, Percent, ChevronRight, ImageIcon, Check } from 'lucide-react'
import Image from 'next/image'
import type { Metadata } from 'next'

interface BundlePageProps {
  params: Promise<{
    tenant: string
    slug: string
  }>
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

export async function generateMetadata({ params }: BundlePageProps): Promise<Metadata> {
  const { tenant: tenantSlug, slug } = await params

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) return { title: 'Bundle Not Found' }

  const bundle = await bundles.getBundleWithPiecesBySlug(tenant.id, slug)
  if (!bundle || bundle.status !== 'active') return { title: 'Bundle Not Found' }

  return {
    title: `${bundle.name} | ${tenant.shopName || tenant.name}`,
    description: bundle.description || `Save ${bundle.discountPercent}% with this bundle of ${bundle.pieceDetails.length} products`,
  }
}

export default async function BundlePage({ params }: BundlePageProps) {
  const { tenant: tenantSlug, slug } = await params

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const bundle = await bundles.getBundleWithPiecesBySlug(tenant.id, slug)
  if (!bundle || bundle.status !== 'active') notFound()

  // Get images for pieces
  const pieceImages: Record<string, string> = {}
  for (const piece of bundle.pieceDetails) {
    // We'd need to join with media - for now we'll use placeholder
    pieceImages[piece.id] = piece.thumbnailUrl || ''
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href={`/${tenantSlug}`} className="hover:text-gray-900">
              Shop
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/${tenantSlug}/bundles`} className="hover:text-gray-900">
              Bundles
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">{bundle.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Bundle Image / Visual */}
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center overflow-hidden">
              <Package className="w-32 h-32 text-purple-200" />

              {/* Discount badge */}
              {bundle.discountPercent > 0 && (
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-full text-lg font-bold shadow-lg">
                  <Percent className="h-5 w-5" />
                  {bundle.discountPercent}% OFF
                </div>
              )}

              {/* Bundle badge */}
              <div className="absolute top-4 left-4 flex items-center gap-1 bg-purple-500 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
                <Package className="h-4 w-4" />
                Bundle
              </div>
            </div>

            {/* Included items preview grid */}
            {bundle.pieceDetails.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {bundle.pieceDetails.slice(0, 4).map((piece, index) => (
                  <div
                    key={piece.id}
                    className="aspect-square bg-white rounded-lg border border-gray-200 flex items-center justify-center relative overflow-hidden"
                  >
                    {pieceImages[piece.id] ? (
                      <Image
                        src={pieceImages[piece.id]}
                        alt={piece.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                    {piece.quantity > 1 && (
                      <span className="absolute bottom-1 right-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        x{piece.quantity}
                      </span>
                    )}
                    {index === 3 && bundle.pieceDetails.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium">
                        +{bundle.pieceDetails.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bundle Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{bundle.name}</h1>
              {bundle.description && (
                <p className="mt-3 text-gray-600 text-lg">{bundle.description}</p>
              )}
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-gray-900">
                  {formatPrice(bundle.bundlePrice)}
                </span>
                {bundle.originalPrice > bundle.bundlePrice && (
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(bundle.originalPrice)}
                  </span>
                )}
              </div>

              {bundle.discountPercent > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <Percent className="h-4 w-4" />
                    Save {bundle.discountPercent}%
                  </span>
                  <span className="text-green-600 font-medium">
                    ({formatPrice(bundle.originalPrice - bundle.bundlePrice)} savings)
                  </span>
                </div>
              )}

              <div className="mt-6">
                <AddBundleToCartButton
                  bundle={bundle}
                  tenantId={tenant.id}
                  tenant={tenantSlug}
                  disabled={!bundle.isAvailable}
                />
              </div>

              {!bundle.isAvailable && (
                <p className="mt-3 text-center text-sm text-red-500">
                  Some items in this bundle are currently out of stock
                </p>
              )}
            </div>

            {/* What's Included */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                What&apos;s Included ({bundle.pieceDetails.length} items)
              </h2>
              <div className="space-y-3">
                {bundle.pieceDetails.map((piece) => (
                  <div
                    key={piece.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {pieceImages[piece.id] ? (
                        <Image
                          src={pieceImages[piece.id]}
                          alt={piece.name}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{piece.name}</p>
                      <p className="text-sm text-gray-500">
                        {piece.price ? formatPrice(piece.price) : 'Price varies'}
                        {piece.quantity > 1 && ` x ${piece.quantity}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">Included</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Value breakdown */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Individual total</span>
                  <span className="line-through">{formatPrice(bundle.originalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-green-600 mt-1">
                  <span>Bundle savings</span>
                  <span>-{formatPrice(bundle.originalPrice - bundle.bundlePrice)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 mt-2">
                  <span>Bundle price</span>
                  <span>{formatPrice(bundle.bundlePrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
