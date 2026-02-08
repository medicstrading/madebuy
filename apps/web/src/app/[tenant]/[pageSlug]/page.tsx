import { notFound } from 'next/navigation'
import { requireTenant } from '@/lib/tenant'

// Force dynamic rendering - this route requires database access
export const dynamic = 'force-dynamic'

import { blog, collections, media, pieces } from '@madebuy/db'
import type { WebsitePage, WebsiteTemplate } from '@madebuy/shared'
import { getDefaultPages, LAYOUT_TO_TEMPLATE_MAP } from '@madebuy/shared'
// New section-based components
import { SectionList } from '@/components/storefront/sections'
import { Footer } from '@/components/storefront/shared/Footer'
import { Header } from '@/components/storefront/shared/Header'
import { populatePiecesWithMedia } from '@/lib/pieces'

// Reserved slugs that have their own dedicated routes
const RESERVED_SLUGS = [
  'cart',
  'checkout',
  'blog', // Blog has its own route for listing
  'collections', // Collections has its own route
  'account',
  'login',
  'signup',
]

export async function generateMetadata({
  params,
}: {
  params: { tenant: string; pageSlug: string }
}) {
  // Skip metadata generation for reserved slugs
  if (RESERVED_SLUGS.includes(params.pageSlug)) {
    return {}
  }

  try {
    const tenant = await requireTenant(params.tenant)

    // Get pages from tenant or defaults
    let pages: WebsitePage[] = tenant.websiteDesign?.pages || []
    if (pages.length === 0) {
      const template: WebsiteTemplate =
        tenant.websiteDesign?.template || 'classic-store'
      pages = getDefaultPages(template)
    }

    // Find the page
    const page = pages.find((p) => p.slug === params.pageSlug)
    if (!page) {
      return { title: 'Page Not Found' }
    }

    // Fetch logo for OG image
    let logoUrl: string | null = null
    if (tenant.logoMediaId) {
      const logoMedia = await media.getMedia(tenant.id, tenant.logoMediaId)
      logoUrl = logoMedia?.variants.original.url || null
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://madebuy.com.au'
    const pageUrl = `${siteUrl}/${params.tenant}/${params.pageSlug}`
    const title = page.seo?.title || `${page.title} | ${tenant.businessName}`
    const description = page.seo?.description || tenant.description

    return {
      title,
      description,
      openGraph: {
        title,
        description: description || undefined,
        url: pageUrl,
        siteName: tenant.businessName,
        type: 'website',
        locale: 'en_AU',
        images: logoUrl
          ? [
              {
                url: logoUrl,
                width: 1200,
                height: 630,
                alt: tenant.businessName,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: description || undefined,
        images: logoUrl ? [logoUrl] : [],
      },
    }
  } catch {
    return { title: 'Page Not Found' }
  }
}

export default async function DynamicPage({
  params,
}: {
  params: { tenant: string; pageSlug: string }
}) {
  // Skip rendering for reserved slugs - let Next.js fall through to more specific routes
  if (RESERVED_SLUGS.includes(params.pageSlug)) {
    notFound()
  }

  const tenant = await requireTenant(params.tenant)

  // Get pages from tenant or generate defaults
  let pages: WebsitePage[] = tenant.websiteDesign?.pages || []
  let template: WebsiteTemplate =
    tenant.websiteDesign?.template || 'classic-store'

  // If no pages, generate from template
  if (pages.length === 0) {
    if (tenant.websiteDesign?.layout && !tenant.websiteDesign?.template) {
      template =
        LAYOUT_TO_TEMPLATE_MAP[tenant.websiteDesign.layout] || 'classic-store'
    }
    pages = getDefaultPages(template)
  }

  // Find the requested page
  const currentPage = pages.find((p) => p.slug === params.pageSlug)

  if (!currentPage || !currentPage.enabled) {
    notFound()
  }

  // Fetch all the data needed for sections
  const rawPiecesResult = await pieces.listPieces(tenant.id, {
    status: 'available',
  })
  const rawPieces =
    'data' in rawPiecesResult ? rawPiecesResult.data : rawPiecesResult
  const allPieces = await populatePiecesWithMedia(rawPieces)

  const collectionsResult = await collections.listCollections(tenant.id, {
    isPublished: true,
  })
  const allCollections = collectionsResult.items

  let blogPosts: Awaited<ReturnType<typeof blog.listBlogPosts>> = []
  if (tenant.websiteDesign?.blog?.enabled) {
    blogPosts = await blog.listBlogPosts(tenant.id, {
      status: 'published',
      limit: 6,
    })
  }

  // Fetch logo
  let logoUrl: string | null = null
  if (tenant.logoMediaId) {
    const logoMedia = await media.getMedia(tenant.id, tenant.logoMediaId)
    logoUrl = logoMedia?.variants.original.url || null
  }

  // Get navigation pages for header
  const navPages = pages
    .filter((p) => p.enabled && p.showInNavigation)
    .sort((a, b) => a.navigationOrder - b.navigationOrder)

  return (
    <div className="min-h-screen bg-white tenant-theme">
      {/* Header */}
      <Header
        tenant={tenant}
        tenantSlug={params.tenant}
        headerConfig={tenant.websiteDesign?.header}
        logoUrl={logoUrl || undefined}
        pages={navPages}
      />

      {/* Page Content */}
      <main>
        <SectionList
          sections={currentPage.sections}
          tenant={tenant}
          tenantSlug={params.tenant}
          pieces={allPieces}
          collections={allCollections}
          blogPosts={blogPosts}
        />
      </main>

      {/* Footer */}
      <Footer
        tenant={tenant}
        tenantSlug={params.tenant}
        footerConfig={tenant.websiteDesign?.footer}
        pages={navPages}
      />
    </div>
  )
}
