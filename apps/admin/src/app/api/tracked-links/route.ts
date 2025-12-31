import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { tracking } from '@madebuy/db'

/**
 * GET /api/tracked-links
 * Get pre-built tracked links for the tenant's storefront
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://madebuy.com.au'
    const links = tracking.generateTrackedLinks(tenant.slug, baseUrl)

    // Add product-specific link generator info
    const productLinkTemplate = `${baseUrl}/${tenant.slug}/[product-slug]?utm_source=[source]`

    return NextResponse.json({
      storefront: links.storefront,
      links: links.links,
      productLinkTemplate,
      usage: {
        instagram_bio: 'Use this link in your Instagram bio',
        facebook_page: 'Use this link on your Facebook page',
        tiktok_bio: 'Use this link in your TikTok bio',
        email_footer: 'Add this link to your email signature',
        linktree: 'Add this link to your Linktree or similar',
      },
    })
  } catch (error) {
    console.error('Error generating tracked links:', error)
    return NextResponse.json(
      { error: 'Failed to generate tracked links' },
      { status: 500 }
    )
  }
}
