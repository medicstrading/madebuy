import { bundles } from '@madebuy/db'
import { ChevronRight, Package } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BundleCard } from '@/components/bundles/BundleCard'
import { getTenantBySlug } from '@/lib/tenant'

interface BundlesPageProps {
  params: Promise<{
    tenant: string
  }>
}

export async function generateMetadata({
  params,
}: BundlesPageProps): Promise<Metadata> {
  const { tenant: tenantSlug } = await params

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) return { title: 'Shop Not Found' }

  return {
    title: `Bundles | ${tenant.businessName}`,
    description: `Save more with our product bundles at ${tenant.businessName}`,
  }
}

export default async function BundlesPage({ params }: BundlesPageProps) {
  const { tenant: tenantSlug } = await params

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  // Get all active bundles with piece details
  const activeBundles = await bundles.listActiveBundles(tenant.id, 50)

  const bundlesWithPieces = await Promise.all(
    activeBundles.map((bundle) =>
      bundles.getBundleWithPieces(tenant.id, bundle.id),
    ),
  )

  const validBundles = bundlesWithPieces.filter(
    (b): b is NonNullable<typeof b> => b !== null,
  )

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
            <span className="text-gray-900 font-medium">Bundles</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Package className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Product Bundles</h1>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            Save more when you buy together. Our curated bundles offer great
            value on complementary products.
          </p>
        </div>

        {/* Bundles Grid */}
        {validBundles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No bundles available
            </h3>
            <p className="text-gray-500 mb-4">
              Check back later for special bundle deals.
            </p>
            <Link
              href={`/${tenantSlug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {validBundles.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                tenantSlug={tenantSlug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
