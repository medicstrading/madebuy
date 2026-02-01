import { workshops } from '@madebuy/db'
import { Calendar, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'

interface WorkshopsPageProps {
  params: Promise<{
    tenant: string
  }>
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

export async function generateMetadata({
  params,
}: WorkshopsPageProps): Promise<Metadata> {
  const { tenant: tenantSlug } = await params

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) return { title: 'Shop Not Found' }

  return {
    title: `Workshops & Classes | ${tenant.businessName}`,
    description: `Book workshops and classes at ${tenant.businessName}`,
  }
}

export default async function WorkshopsPage({ params }: WorkshopsPageProps) {
  const { tenant: tenantSlug } = await params

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  // Get published workshops
  const result = await workshops.listWorkshops(
    tenant.id,
    { status: 'published', isPublishedToWebsite: true },
    { limit: 50, sortBy: 'createdAt', sortOrder: 'desc' },
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
            <span className="text-gray-900 font-medium">Workshops</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Workshops & Classes
          </h1>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            Learn new skills and create something amazing. Browse our upcoming
            workshops and classes.
          </p>
        </div>

        {/* Workshops Grid */}
        {result.data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Workshops Available
            </h3>
            <p className="text-gray-500">
              Check back soon for upcoming workshops and classes.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.data.map((workshop) => (
              <Link
                key={workshop.id}
                href={`/${tenantSlug}/workshops/${workshop.slug}`}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {workshop.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {workshop.shortDescription || workshop.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-medium text-gray-900">
                        {workshop.durationMinutes} minutes
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Capacity:</span>
                      <span className="font-medium text-gray-900">
                        Up to {workshop.capacity} people
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Price:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {formatPrice(workshop.price)}
                      </span>
                    </div>
                  </div>

                  {workshop.skillLevel && (
                    <div className="mt-4">
                      <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {workshop.skillLevel.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <span className="text-sm text-blue-600 font-medium">
                    View Details & Book →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
