import { NextRequest, NextResponse } from 'next/server'
import { marketplace, tenants, media } from '@madebuy/db'
import { rateLimiters } from '@/lib/rate-limit'

/**
 * POST /api/marketplace/products/batch
 * Fetch multiple products by IDs for cart display
 */
export async function POST(request: NextRequest) {
  // Rate limit: 30 requests per minute (cart operations)
  const rateLimitResponse = rateLimiters.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      )
    }

    // Limit to 50 products per request
    const productIds = ids.slice(0, 50)

    // Fetch products
    const products = await Promise.all(
      productIds.map(async (id: string) => {
        try {
          const product = await marketplace.getMarketplaceProduct(id)
          if (!product) return null

          // Get tenant info for seller name
          const tenant = await tenants.getTenantById(product.tenantId)

          // Get primary image
          let image: string | undefined
          if (product.mediaIds?.length) {
            const productMedia = await media.getMediaByIds(product.tenantId, [product.mediaIds[0]])
            if (productMedia.length > 0) {
              image = productMedia[0].variants?.thumb?.url ||
                      productMedia[0].variants?.large?.url ||
                      productMedia[0].variants?.original?.url
            }
          }

          return {
            id: product.id,
            name: product.name,
            slug: product.slug || product.id,
            price: product.price,
            currency: 'AUD',
            stock: product.stock,
            image,
            seller: {
              tenantId: product.tenantId,
              businessName: tenant?.businessName || 'Seller',
            },
          }
        } catch (error) {
          console.error(`Failed to fetch product ${id}:`, error)
          return null
        }
      })
    )

    // Filter out failed fetches
    const validProducts = products.filter(Boolean)

    return NextResponse.json({
      products: validProducts,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('Error fetching batch products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
