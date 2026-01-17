import { pieces, tenants } from '@madebuy/db'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://madebuy.com.au'

  // Static pages
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

  // Get all tenants (listTenants returns active tenants by default)
  const activeTenants = await tenants.listTenants()

  // Tenant storefront pages
  const tenantPages: MetadataRoute.Sitemap = activeTenants.map((tenant) => ({
    url: `${siteUrl}/${tenant.slug}`,
    lastModified: tenant.updatedAt || tenant.createdAt || new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Product pages - fetch products for each tenant
  const productPages: MetadataRoute.Sitemap = []

  for (const tenant of activeTenants) {
    try {
      const tenantPieces = await pieces.listPieces(tenant.id, {
        status: 'available',
      })

      for (const piece of tenantPieces) {
        const slug = piece.websiteSlug || piece.slug || piece.id
        productPages.push({
          url: `${siteUrl}/${tenant.slug}/product/${slug}`,
          lastModified: piece.updatedAt || piece.createdAt || new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      }
    } catch (error) {
      console.error(
        `Failed to fetch products for tenant ${tenant.slug}:`,
        error,
      )
    }
  }

  return [...staticPages, ...tenantPages, ...productPages]
}
