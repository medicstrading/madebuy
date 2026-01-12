import { requireTenant } from '@/lib/tenant'
import { pieces, media, collections, blog } from '@madebuy/db'

// Force dynamic rendering - this route requires database access
export const dynamic = 'force-dynamic'
import { populatePiecesWithMedia } from '@/lib/pieces'
import { LAYOUT_TO_TEMPLATE_MAP, getDefaultPages } from '@madebuy/shared'
import type { PageSection, WebsiteTemplate, WebsitePage } from '@madebuy/shared'

// New section-based components
import { SectionList } from '@/components/storefront/sections'
import { Header } from '@/components/storefront/shared/Header'
import { Footer } from '@/components/storefront/shared/Footer'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, MapPin, Star, ArrowLeft } from 'lucide-react'

export async function generateMetadata({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  return {
    title: `${tenant.businessName} - Handmade Products`,
    description: tenant.description || `Shop handmade products from ${tenant.businessName}`,
  }
}

export default async function ShopHomePage({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)
  const rawPieces = await pieces.listPieces(tenant.id, { status: 'available' })
  const allPieces = await populatePiecesWithMedia(rawPieces)

  // Fetch collections
  const collectionsResult = await collections.listCollections(tenant.id, { isPublished: true })
  const allCollections = collectionsResult.items

  // Fetch blog posts if blog is enabled
  let blogPosts: Awaited<ReturnType<typeof blog.listBlogPosts>> = []
  if (tenant.websiteDesign?.blog?.enabled) {
    blogPosts = await blog.listBlogPosts(tenant.id, { status: 'published', limit: 6 })
  }

  // Fetch logo if exists
  let logoUrl: string | null = null
  if (tenant.logoMediaId) {
    const logoMedia = await media.getMedia(tenant.id, tenant.logoMediaId)
    logoUrl = logoMedia?.variants.original.url || null
  }

  // Get pages from tenant or generate defaults
  let pages: WebsitePage[] = tenant.websiteDesign?.pages || []
  let template: WebsiteTemplate = tenant.websiteDesign?.template || 'classic-store'

  // If no pages, generate from template
  if (pages.length === 0) {
    // Check for legacy layout migration
    if (tenant.websiteDesign?.layout && !tenant.websiteDesign?.template) {
      template = LAYOUT_TO_TEMPLATE_MAP[tenant.websiteDesign.layout] || 'classic-store'
    }
    pages = getDefaultPages(template)
  }

  // Find homepage (type === 'home' or slug === '')
  const homePage = pages.find(p => p.type === 'home' || p.slug === '')
  const sections = homePage?.sections || []

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

      {/* Section-Based Content */}
      <main>
        <SectionList
          sections={sections}
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
