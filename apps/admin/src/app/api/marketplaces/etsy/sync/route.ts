import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { Etsy } from '@madebuy/marketplaces'
import { pieces, tenants } from '@madebuy/db'

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()

    if (!tenant.integrations?.etsy) {
      return NextResponse.json(
        { error: 'Etsy not connected' },
        { status: 400 }
      )
    }

    if (!ETSY_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Etsy integration not configured' },
        { status: 500 }
      )
    }

    // Get all available pieces
    const allPieces = await pieces.listPieces(tenant.id, {
      status: 'available',
    })

    const results = {
      total: allPieces.length,
      synced: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ pieceId: string; error: string }>,
    }

    // Sync each piece
    for (const piece of allPieces) {
      try {
        // Skip if piece doesn't have required data
        if (!piece.price || piece.price <= 0) {
          results.errors.push({
            pieceId: piece.id,
            error: 'Missing or invalid price',
          })
          results.failed++
          continue
        }

        const result = await Etsy.syncPieceToEtsy(piece, tenant, ETSY_CLIENT_ID)

        if (result.success) {
          results.synced++

          // Determine if created or updated
          if (piece.integrations?.etsy?.listingId) {
            results.updated++
          } else {
            results.created++
          }

          // Update piece with Etsy listing info
          await pieces.updatePiece(tenant.id, piece.id, {
            integrations: {
              ...piece.integrations,
              etsy: {
                listingId: result.listingId!,
                listingUrl: result.listingUrl || '',
                state: 'active' as const,
                lastSyncedAt: new Date(),
                etsyQuantity: piece.stock || 1,
                syncEnabled: true,
              },
            },
          } as any)
        } else {
          results.failed++
          results.errors.push({
            pieceId: piece.id,
            error: result.error || 'Unknown error',
          })
        }
      } catch (error) {
        results.failed++
        results.errors.push({
          pieceId: piece.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Update last sync timestamp
    await tenants.updateTenant(tenant.id, {
      integrations: {
        ...tenant.integrations,
        etsy: {
          ...tenant.integrations?.etsy,
          lastSyncAt: new Date(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Etsy sync error:', error)
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
