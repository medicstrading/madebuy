import { NextRequest, NextResponse } from 'next/server'
import { marketplace } from '@madebuy/db'
import { MARKETPLACE_CATEGORIES } from '@madebuy/shared/src/types/marketplace'
import { rateLimiters } from '@/lib/rate-limit'

/**
 * GET /api/marketplace/search
 * Search for products and categories
 *
 * Query params:
 * - q: search query (required)
 * - limit: max results per type (default: 5)
 */
export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute
  const rateLimitResponse = rateLimiters.search(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!query) {
      return NextResponse.json({ results: [] })
    }

    const results: Array<{
      id: string
      type: 'product' | 'category' | 'seller'
      name: string
      slug?: string
      image?: string
      price?: number
      currency?: string
      subtitle?: string
    }> = []

    // Search products
    const { products } = await marketplace.listMarketplaceProducts({
      search: query,
      limit,
      page: 1,
    })

    for (const product of products) {
      results.push({
        id: product.id,
        type: 'product',
        name: product.name,
        slug: product.slug || product.id,
        image: product.images?.[0],
        price: product.price,
        currency: 'AUD',
      })
    }

    // Search categories (match against category names)
    const queryLower = query.toLowerCase()
    const matchingCategories = MARKETPLACE_CATEGORIES.filter(
      (cat) =>
        cat.name.toLowerCase().includes(queryLower) ||
        cat.slug.toLowerCase().includes(queryLower) ||
        cat.subcategories.some((sub) => sub.toLowerCase().includes(queryLower))
    ).slice(0, 3)

    for (const cat of matchingCategories) {
      results.push({
        id: `cat-${cat.slug}`,
        type: 'category',
        name: cat.name,
        slug: cat.slug,
        subtitle: `${cat.subcategories.length} subcategories`,
      })
    }

    // Get unique sellers from product results for seller suggestions
    const sellerIds = new Set<string>()
    for (const product of products) {
      if (product.seller && !sellerIds.has(product.tenantId)) {
        sellerIds.add(product.tenantId)
        results.push({
          id: product.tenantId,
          type: 'seller',
          name: product.seller.businessName || product.tenantId,
          slug: product.tenantId,
          subtitle: 'Seller',
        })
        if (sellerIds.size >= 2) break // Max 2 seller suggestions
      }
    }

    // Short cache for search results (30s fresh, 2 min stale)
    return NextResponse.json({ results }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ results: [] })
  }
}
