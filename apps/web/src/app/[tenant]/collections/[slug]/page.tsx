import { collections, media, pieces } from '@madebuy/db'
import type { WebsitePage, WebsiteTemplate } from '@madebuy/shared'
import { getDefaultPages, LAYOUT_TO_TEMPLATE_MAP } from '@madebuy/shared'
import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ProductCard } from '@/components/storefront/ProductCard'
import { Footer } from '@/components/storefront/shared/Footer'
import { Header } from '@/components/storefront/shared/Header'
import { populatePiecesWithMedia } from '@/lib/pieces'
import { mapPieceToProduct } from '@/lib/productMapping'
import { requireTenant } from '@/lib/tenant'

// ISR: Revalidate collection pages every 2 minutes
export const revalidate = 120

export async function generateMetadata({
  params,
}: {
  params: { tenant: string; slug: string }
}) {
  try {
    const tenant = await requireTenant(params.tenant)
    const collection = await collections.getCollectionBySlug(
      tenant.id,
      params.slug,
    )

    if (!collection || !collection.isPublished) {
      return { title: 'Collection Not Found' }
    }

    return {
      title: `${collection.name} - ${tenant.businessName}`,
      description:
        collection.description ||
        `Shop the ${collection.name} collection from ${tenant.businessName}`,
    }
  } catch {
    return { title: 'Collection Not Found' }
  }
}

export default async function CollectionDetailPage({
  params,
}: {
  params: { tenant: string; slug: string }
}) {
  const tenant = await requireTenant(params.tenant)

  // Fetch collection by slug
  const collection = await collections.getCollectionBySlug(
    tenant.id,
    params.slug,
  )

  // Return 404 if collection not found or not published
  if (!collection || !collection.isPublished) {
    notFound()
  }

  // Fetch pieces in collection
  const pieceMap = await pieces.getPiecesByIds(tenant.id, collection.pieceIds)
  const piecesArray = Array.from(pieceMap.values()).filter(
    (p) => p.status === 'available',
  )
  const piecesWithMedia = await populatePiecesWithMedia(piecesArray)

  // Fetch cover image
  let coverImageUrl: string | null = null
  if (collection.coverMediaId) {
    const coverMedia = await media.getMedia(tenant.id, collection.coverMediaId)
    coverImageUrl = coverMedia?.variants.original.url || null
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

  // Build structured data for collection
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://madebuy.com.au'
  const collectionUrl = `${siteUrl}/${params.tenant}/collections/${params.slug}`

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': collectionUrl,
    name: collection.name,
    description: collection.description || undefined,
    url: collectionUrl,
    image: coverImageUrl || undefined,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: piecesWithMedia.length,
      itemListElement: piecesWithMedia.slice(0, 10).map((piece, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          '@id': `${siteUrl}/${params.tenant}/product/${piece.slug}`,
          name: piece.name,
          image: piece.primaryImage?.variants.original.url,
          offers: {
            '@type': 'Offer',
            price: piece.price,
            priceCurrency: 'AUD',
            availability: 'https://schema.org/InStock',
          },
        },
      })),
    },
  }

  // Map pieces to product cards
  const products = piecesWithMedia.map((piece) =>
    mapPieceToProduct(piece, params.tenant, tenant.businessName),
  )

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Structured data for SEO - JSON.stringify ensures safe output */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
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

        {/* Collection Hero */}
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Cover Image */}
              <div className="relative aspect-[4/3] bg-white rounded-xl overflow-hidden">
                {coverImageUrl ? (
                  <Image
                    src={coverImageUrl}
                    alt={collection.name}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-24 h-24 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Collection Info */}
              <div>
                <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="text-lg text-gray-600 mb-6">
                    {collection.description}
                  </p>
                )}
                <div className="text-sm text-gray-500">
                  {piecesWithMedia.length} item
                  {piecesWithMedia.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {piecesWithMedia.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">
                No products available in this collection
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
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
