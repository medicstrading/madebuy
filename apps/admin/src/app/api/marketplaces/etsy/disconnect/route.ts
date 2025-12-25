import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { tenants, pieces } from '@madebuy/db'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()

    if (!tenant.integrations?.etsy) {
      return NextResponse.json(
        { error: 'Etsy not connected' },
        { status: 400 }
      )
    }

    // Remove Etsy integration from tenant
    const updatedIntegrations = { ...tenant.integrations }
    delete updatedIntegrations.etsy

    await tenants.updateTenant(tenant.id, {
      integrations: updatedIntegrations,
    })

    // Optional: Clear Etsy integration data from all pieces
    // (Commenting out to preserve listing IDs in case user wants to reconnect)
    /*
    const pieces = await piecesRepository.list(tenant.id, { limit: 1000 })
    for (const piece of pieces) {
      if (piece.integrations?.etsy) {
        const updatedPieceIntegrations = { ...piece.integrations }
        delete updatedPieceIntegrations.etsy

        await piecesRepository.update(tenant.id, piece.id, {
          integrations: updatedPieceIntegrations,
        })
      }
    }
    */

    return NextResponse.redirect(
      new URL('/dashboard/connections/marketplaces', request.url)
    )
  } catch (error) {
    console.error('Etsy disconnect error:', error)
    return NextResponse.json(
      {
        error: 'Disconnect failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
