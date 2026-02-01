import { collections, media } from '@madebuy/db'
import type { Collection, WebsitePage, WebsiteTemplate } from '@madebuy/shared'
import { getDefaultPages, LAYOUT_TO_TEMPLATE_MAP } from '@madebuy/shared'
import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/storefront/shared/Footer'
import { Header } from '@/components/storefront/shared/Header'
import { requireTenant } from '@/lib/tenant'

// ISR: Revalidate collections page every 2 minutes
export const revalidate = 120

export async function generateMetadata({
  params,
}: {
  params: { tenant: string }
}) {
  const tenant = await requireTenant(params.tenant)

  return {
    title: `Collections - ${tenant.businessName}`,
    description: `Browse our curated collections of handmade products from ${tenant.businessName}`,
  }
}

export default async function CollectionsPage({
  params,
}: {
  params: { tenant: string }
}) {
  const tenant = await requireTenant(params.tenant)

  // Fetch published collections
  const collectionsResult = await collections.listCollections(tenant.id, {
    isPublished: true,
    sortBy: 'sortOrder',
    sortOrder: 'asc',
  })
  const allCollections = collectionsResult.items

  // Fetch cover images for collections
  const coverMediaIds = allCollections
    .map((c) => c.coverMediaId)
    .filter((id): id is string => !!id)

  let coverImages: Map<string, string> = new Map()
  if (coverMediaIds.length > 0) {
    const mediaItems = await media.getMediaByIds(tenant.id, coverMediaIds)
    coverImages = new Map(
      mediaItems.map((m) => [m.id, m.variants.original.url]),
    )
  }

  // Fetch logo
  let logoUrl: string | null = null
  if (tenant.logoMediaId) {
    const logoMedia = await media.getMedia(tenant.id, tenant.logoMediaId)
    logoUrl = logoMedia?.variants.original.url || null
  }

  // Get pages for navigation
  let pages: WebsitePage[] = tenant.websiteDesign?.pages || []
  let template: WebsiteTemplate =
    tenant.websiteDesign?.template || 'classic-store'

  if (pages.length === 0) {
    if (tenant.websiteDesign?.layout && !tenant.websiteDesign?.template) {
      template =
        LAYOUT_TO_TEMPLATE_MAP[tenant.websiteDesign.layout] || 'classic-store'
    }
    pages = getDefaultPages(template)
  }

  const navPages = pages
    .filter((p) => p.enabled && p.showInNavigation)
    .sort((a, b) => a.navigationOrder - b.navigationOrder)

  // Build structured data for collections page
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://madebuy.com.au'
  const collectionsUrl = `${siteUrl}/${params.tenant}/collections`

  const collectionsSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': collectionsUrl,
    name: `Collections - ${tenant.businessName}`,
    description: `Browse our curated collections of handmade products from ${tenant.businessName}`,
    url: collectionsUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: allCollections.length,
      itemListElement: allCollections.map((collection, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Thing',
          '@id': `${siteUrl}/${params.tenant}/collections/${collection.slug}`,
          name: collection.name,
          description: collection.description || undefined,
          url: `${siteUrl}/${params.tenant}/collections/${collection.slug}`,
        },
      })),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Structured data for SEO - JSON.stringify ensures safe output
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionsSchema) }}
      />
      <div className="min-h-screen bg-white tenant-theme">
        {/* Header */}
        <Header
          tenant={tenant}
          tenantSlug={params.tenant}
          headerConfig={tenant.websiteDesign?.header}
          logoUrl={logoUrl || undefined}
          pages={navPages}
        />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
              Collections
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our curated collections of handmade products
            </p>
          </div>

          {allCollections.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">No collections available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {allCollections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  tenantSlug={params.tenant}
                  coverImageUrl={
                    collection.coverMediaId
                      ? coverImages.get(collection.coverMediaId)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <Footer
          tenant={tenant}
          tenantSlug={params.tenant}
          footerConfig={tenant.websiteDesign?.footer}
          pages={navPages}
        />
      </div>
    </>
  )
}

function CollectionCard({
  collection,
  tenantSlug,
  coverImageUrl,
}: {
  collection: Collection
  tenantSlug: string
  coverImageUrl?: string
}) {
  return (
    <Link
      href={`/${tenantSlug}/collections/${collection.slug}`}
      className="group block bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all"
    >
      <div className="relative aspect-[4/3] bg-gray-50">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={collection.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="w-16 h-16 text-gray-300" />
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
          {collection.name}
        </h3>
        {collection.description && (
          <p className="text-gray-600 line-clamp-2">{collection.description}</p>
        )}
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <span>{collection.pieceIds.length} items</span>
        </div>
      </div>
    </Link>
  )
}
