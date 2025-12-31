import { NextRequest, NextResponse } from 'next/server'
import { marketplace } from '@madebuy/db'
import type { MarketplaceProductFilters } from '@madebuy/shared'
import { rateLimiters } from '@/lib/rate-limit'

/**
 * GET /api/marketplace/products
 * List marketplace products with filters
 *
 * Query params:
 * - category?: string
 * - subcategory?: string
 * - search?: string
 * - minPrice?: number
 * - maxPrice?: number
 * - minRating?: number
 * - sortBy?: 'recent' | 'popular' | 'price_low' | 'price_high' | 'rating' | 'bestseller'
 * - page?: number (default: 1)
 * - limit?: number (default: 24)
 */
export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = rateLimiters.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const searchParams = request.nextUrl.searchParams

    const filters: MarketplaceProductFilters = {
      category: searchParams.get('category') || undefined,
      subcategory: searchParams.get('subcategory') || undefined,
      search: searchParams.get('search') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'recent',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 24,
    }

    const result = await marketplace.listMarketplaceProducts(filters)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error listing marketplace products:', error)
    return NextResponse.json(
      { error: 'Failed to list products' },
      { status: 500 }
    )
  }
}
