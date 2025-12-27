import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { getDatabase } from '@madebuy/db'
import { marketplace } from '@madebuy/db'

/**
 * POST /api/marketplace/toggle
 * Toggle marketplace listing for a product
 *
 * Body:
 * {
 *   productId: string
 *   listed: boolean
 *   categories?: string[] (marketplace categories)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if tenant has marketplace feature
    if (!tenant.features.marketplaceListing) {
      return NextResponse.json(
        { error: 'Marketplace listing requires Pro plan or higher' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { productId, listed, categories } = body

    if (!productId || listed === undefined) {
      return NextResponse.json(
        { error: 'productId and listed are required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()

    // Verify product belongs to this tenant
    const product = await db.collection('products').findOne({
      id: productId,
      tenantId: tenant.id
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Update marketplace listing status
    const update: any = {
      'marketplace.listed': listed,
      updatedAt: new Date()
    }

    if (categories && categories.length > 0) {
      update['marketplace.categories'] = categories
    }

    if (listed) {
      // When listing for the first time, set to pending approval
      if (!product.marketplace?.approvalStatus) {
        update['marketplace.approvalStatus'] = 'pending'
      }

      // Set listedAt timestamp
      if (!product.marketplace?.listedAt) {
        update['marketplace.listedAt'] = new Date()
      }

      // Create seller profile if doesn't exist
      const existingProfile = await marketplace.getSellerProfile(tenant.id)
      if (!existingProfile) {
        await marketplace.createSellerProfile(tenant.id, tenant.businessName)
      }

      // Initialize marketplace stats if doesn't exist
      const existingStats = await marketplace.getTenantMarketplaceStats(tenant.id)
      if (!existingStats) {
        await marketplace.initializeTenantMarketplaceStats(tenant.id)
      }
    }

    await db.collection('products').updateOne(
      { id: productId, tenantId: tenant.id },
      { $set: update }
    )

    // Update tenant marketplace stats
    if (listed) {
      await db.collection('tenant_marketplace_stats').updateOne(
        { tenantId: tenant.id },
        {
          $inc: { totalProductsListed: 1, pendingProducts: 1 },
          $set: { updatedAt: new Date() }
        }
      )
    } else {
      await db.collection('tenant_marketplace_stats').updateOne(
        { tenantId: tenant.id },
        {
          $inc: { totalProductsListed: -1 },
          $set: { updatedAt: new Date() }
        }
      )
    }

    return NextResponse.json({
      success: true,
      message: listed ? 'Product listed to marketplace' : 'Product removed from marketplace'
    })
  } catch (error) {
    console.error('Error toggling marketplace listing:', error)
    return NextResponse.json(
      { error: 'Failed to update marketplace listing' },
      { status: 500 }
    )
  }
}
