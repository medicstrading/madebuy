import type { MetadataRoute } from 'next'

// Opt out of static generation - needs database access at runtime
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://madebuy.com.au'

  // Static pages - always available
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Skip dynamic content during build (no MONGODB_URI available)
  if (!process.env.MONGODB_URI) {
    console.log(
      'Sitemap: Skipping dynamic content (no MONGODB_URI during build)',
    )
    return staticPages
  }

  // Dynamic import to avoid module-level DB initialization
  const { pieces, tenants, collections, blog } = await import('@madebuy/db')
  // Import directly from template module to avoid pulling in client-side hooks
  const { getDefaultPages, LAYOUT_TO_TEMPLATE_MAP } = await import(
    '@madebuy/shared/src/types/template'
  )

  try {
    // Get all tenants (listTenants returns active tenants by default)
    const activeTenants = await tenants.listTenants()

    // Tenant storefront pages
    const tenantPages: MetadataRoute.Sitemap = activeTenants.map((tenant) => ({
      url: `${siteUrl}/${tenant.slug}`,
      lastModified: tenant.updatedAt || tenant.createdAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

    // Product pages, collection pages, blog pages, and dynamic pages
    const productPages: MetadataRoute.Sitemap = []
    const collectionPages: MetadataRoute.Sitemap = []
    const blogPages: MetadataRoute.Sitemap = []
    const dynamicPages: MetadataRoute.Sitemap = []

    for (const tenant of activeTenants) {
      try {
        // Product pages
        const piecesResult = await pieces.listPieces(tenant.id, {
          status: 'available',
        })
        const tenantPieces =
          'data' in piecesResult ? piecesResult.data : piecesResult

        for (const piece of tenantPieces) {
          const slug = piece.websiteSlug || piece.slug || piece.id
          productPages.push({
            url: `${siteUrl}/${tenant.slug}/product/${slug}`,
            lastModified: piece.updatedAt || piece.createdAt || new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          })
        }

        // Collection pages
        const collectionsResult = await collections.listCollections(tenant.id, {
          isPublished: true,
        })
        const tenantCollections = collectionsResult.items

        if (tenantCollections.length > 0) {
          // Add collections index page
          collectionPages.push({
            url: `${siteUrl}/${tenant.slug}/collections`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          })

          // Add individual collection pages
          for (const collection of tenantCollections) {
            collectionPages.push({
              url: `${siteUrl}/${tenant.slug}/collections/${collection.slug}`,
              lastModified:
                collection.updatedAt || collection.createdAt || new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.7,
            })
          }
        }

        // Blog pages (if blog is enabled)
        if (tenant.websiteDesign?.blog?.enabled) {
          const blogPosts = await blog.listBlogPosts(tenant.id, {
            status: 'published',
          })

          if (blogPosts.length > 0) {
            // Add blog index page
            blogPages.push({
              url: `${siteUrl}/${tenant.slug}/blog`,
              lastModified: new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.7,
            })

            // Add individual blog post pages
            for (const post of blogPosts) {
              blogPages.push({
                url: `${siteUrl}/${tenant.slug}/blog/${post.slug}`,
                lastModified: post.updatedAt || post.publishedAt || new Date(),
                changeFrequency: 'monthly' as const,
                priority: 0.6,
              })
            }
          }
        }

        // Dynamic pages (about, contact, etc.)
        let pages = tenant.websiteDesign?.pages || []
        if (pages.length === 0) {
          const template =
            tenant.websiteDesign?.template ||
            (tenant.websiteDesign?.layout
              ? LAYOUT_TO_TEMPLATE_MAP[tenant.websiteDesign.layout]
              : 'classic-store')
          pages = getDefaultPages(template)
        }

        for (const page of pages) {
          // Skip home page and disabled pages
          if (page.type === 'home' || !page.enabled || !page.slug) {
            continue
          }

          dynamicPages.push({
            url: `${siteUrl}/${tenant.slug}/${page.slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
          })
        }
      } catch (error) {
        console.error(
          `Failed to fetch content for tenant ${tenant.slug}:`,
          error,
        )
      }
    }

    return [
      ...staticPages,
      ...tenantPages,
      ...collectionPages,
      ...blogPages,
      ...productPages,
      ...dynamicPages,
    ]
  } catch (error) {
    console.error('Sitemap: Failed to fetch dynamic content:', error)
    return staticPages
  }
}
