import { bulk } from '@madebuy/db'
import type { PieceStatus } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * POST /api/pieces/bulk
 * Perform bulk operations on pieces
 *
 * Body:
 * - operation: 'updateStatus' | 'delete' | 'updatePrices' | 'updateStock' |
 *              'updateCategory' | 'addTags' | 'removeTags' | 'setFeatured' | 'setPublished'
 * - pieceIds: string[]
 * - params: operation-specific parameters
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { operation, pieceIds, params } = body

    if (
      !operation ||
      !pieceIds ||
      !Array.isArray(pieceIds) ||
      pieceIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing operation or pieceIds' },
        { status: 400 },
      )
    }

    // Limit bulk operations to prevent abuse
    if (pieceIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 pieces per bulk operation' },
        { status: 400 },
      )
    }

    let result

    switch (operation) {
      case 'updateStatus':
        if (
          !params?.status ||
          !['draft', 'available', 'reserved', 'sold'].includes(params.status)
        ) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        result = await bulk.bulkUpdateStatus(
          tenant.id,
          pieceIds,
          params.status as PieceStatus,
        )
        break

      case 'delete':
        result = await bulk.bulkDelete(tenant.id, pieceIds)
        break

      case 'updatePrices':
        if (!params?.type || !params?.value || !params?.direction) {
          return NextResponse.json(
            { error: 'Missing price adjustment parameters' },
            { status: 400 },
          )
        }
        if (!['percentage', 'fixed'].includes(params.type)) {
          return NextResponse.json(
            { error: 'Invalid adjustment type' },
            { status: 400 },
          )
        }
        if (!['increase', 'decrease'].includes(params.direction)) {
          return NextResponse.json(
            { error: 'Invalid adjustment direction' },
            { status: 400 },
          )
        }
        result = await bulk.bulkUpdatePrices(tenant.id, pieceIds, {
          type: params.type,
          value: Number(params.value),
          direction: params.direction,
        })
        break

      case 'updateStock': {
        if (params?.stock === undefined) {
          return NextResponse.json(
            { error: 'Missing stock value' },
            { status: 400 },
          )
        }
        const stockValue =
          params.stock === 'unlimited' ? 'unlimited' : Number(params.stock)
        result = await bulk.bulkUpdateStock(tenant.id, pieceIds, stockValue)
        break
      }

      case 'updateCategory':
        if (!params?.category) {
          return NextResponse.json(
            { error: 'Missing category' },
            { status: 400 },
          )
        }
        result = await bulk.bulkUpdateCategory(
          tenant.id,
          pieceIds,
          params.category,
        )
        break

      case 'addTags':
        if (
          !params?.tags ||
          !Array.isArray(params.tags) ||
          params.tags.length === 0
        ) {
          return NextResponse.json(
            { error: 'Missing tags array' },
            { status: 400 },
          )
        }
        result = await bulk.bulkAddTags(tenant.id, pieceIds, params.tags)
        break

      case 'removeTags':
        if (
          !params?.tags ||
          !Array.isArray(params.tags) ||
          params.tags.length === 0
        ) {
          return NextResponse.json(
            { error: 'Missing tags array' },
            { status: 400 },
          )
        }
        result = await bulk.bulkRemoveTags(tenant.id, pieceIds, params.tags)
        break

      case 'setFeatured':
        if (params?.isFeatured === undefined) {
          return NextResponse.json(
            { error: 'Missing isFeatured value' },
            { status: 400 },
          )
        }
        result = await bulk.bulkSetFeatured(
          tenant.id,
          pieceIds,
          Boolean(params.isFeatured),
        )
        break

      case 'setPublished':
        if (params?.isPublished === undefined) {
          return NextResponse.json(
            { error: 'Missing isPublished value' },
            { status: 400 },
          )
        }
        result = await bulk.bulkSetPublished(
          tenant.id,
          pieceIds,
          Boolean(params.isPublished),
        )
        break

      default:
        return NextResponse.json(
          { error: 'Unknown operation' },
          { status: 400 },
        )
    }

    return NextResponse.json({
      operation,
      result,
    })
  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/pieces/bulk/stats
 * Get stats for selected pieces before bulk operation
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json(
        { error: 'Missing ids parameter' },
        { status: 400 },
      )
    }

    const pieceIds = idsParam.split(',').filter(Boolean)

    if (pieceIds.length === 0) {
      return NextResponse.json(
        { error: 'No piece IDs provided' },
        { status: 400 },
      )
    }

    const stats = await bulk.getBulkStats(tenant.id, pieceIds)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching bulk stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bulk stats' },
      { status: 500 },
    )
  }
}
