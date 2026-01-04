import { notFound } from 'next/navigation'
import { requireTenant } from '@/lib/tenant'
import { pieces, media, collections, blog } from '@madebuy/db'
import { populatePiecesWithMedia } from '@/lib/pieces'
import { getDefaultPages, LAYOUT_TO_TEMPLATE_MAP } from '@madebuy/shared'
import type { WebsiteTemplate, WebsitePage } from '@madebuy/shared'

// New section-based components
import { SectionList } from '@/components/storefront/sections'
import { Header } from '@/components/storefront/shared/Header'
import { Footer } from '@/components/storefront/shared/Footer'

// Reserved slugs that have their own dedicated routes
const RESERVED_SLUGS = [
  'cart',
  'checkout',
  'blog',         // Blog has its own route for listing
  'collections',  // Collections has its own route
  'account',
  'login',
  'signup',
]

export async function generateMetadata({ params }: { params: { tenant: string; pageSlug: string } }) {
  // Skip metadata generation for reserved slugs
  if (RESERVED_SLUGS.includes(params.pageSlug)) {
    return {}
  }

  try {
    const tenant = await requireTenant(params.tenant)

    // Get pages from tenant or defaults
    let pages: WebsitePage[] = tenant.websiteDesign?.pages || []
    if (pages.length === 0) {
      const template: WebsiteTemplate = tenant.websiteDesign?.template || 'classic-store'
      pages = getDefaultPages(template)
    }

    // Find the page
    const page = pages.find(p => p.slug === params.pageSlug)
    if (!page) {
      return { title: 'Page Not Found' }
    }

    return {
      title: page.seo?.title || `${page.title} | ${tenant.businessName}`,
      description: page.seo?.description || tenant.description,
    }
  } catch {
    return { title: 'Page Not Found' }
  }
}

export default async function DynamicPage({ params }: { params: { tenant: string; pageSlug: string } }) {
  // Skip rendering for reserved slugs - let Next.js fall through to more specific routes
  if (RESERVED_SLUGS.includes(params.pageSlug)) {
    notFound()
  }

  const tenant = await requireTenant(params.tenant)

  // Get pages from tenant or generate defaults
  let pages: WebsitePage[] = tenant.websiteDesign?.pages || []
  let template: WebsiteTemplate = tenant.websiteDesign?.template || 'classic-store'

  // If no pages, generate from template
  if (pages.length === 0) {
    if (tenant.websiteDesign?.layout && !tenant.websiteDesign?.template) {
      template = LAYOUT_TO_TEMPLATE_MAP[tenant.websiteDesign.layout] || 'classic-store'
    }
    pages = getDefaultPages(template)
  }

  // Find the requested page
  const currentPage = pages.find(p => p.slug === params.pageSlug)

  if (!currentPage || !currentPage.enabled) {
    notFound()
  }

  // Fetch all the data needed for sections
  const rawPieces = await pieces.listPieces(tenant.id, { status: 'available' })
  const allPieces = await populatePiecesWithMedia(rawPieces)

  const collectionsResult = await collections.listCollections(tenant.id, { isPublished: true })
  const allCollections = collectionsResult.items

  let blogPosts: Awaited<ReturnType<typeof blog.listBlogPosts>> = []
  if (tenant.websiteDesign?.blog?.enabled) {
    blogPosts = await blog.listBlogPosts(tenant.id, { status: 'published', limit: 6 })
  }

  // Fetch logo
  let logoUrl: string | null = null
  if (tenant.logoMediaId) {
    const logoMedia = await media.getMedia(tenant.id, tenant.logoMediaId)
    logoUrl = logoMedia?.variants.original.url || null
  }

  // Get navigation pages for header
  const navPages = pages
    .filter(p => p.enabled && p.showInNavigation)
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
