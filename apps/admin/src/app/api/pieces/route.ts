import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'
import { checkCanAddPiece, getSubscriptionSummary } from '@/lib/subscription-check'
import { CreatePieceInput } from '@madebuy/shared'

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allPieces = await pieces.listPieces(tenant.id)

    // Include subscription info for the UI
    const subscription = await getSubscriptionSummary(tenant)

    return NextResponse.json({
      pieces: allPieces,
      subscription: {
        plan: subscription.plan,
        pieces: subscription.pieces,
      },
    })
  } catch (error) {
    console.error('Error fetching pieces:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check subscription limits before creating
    const canAdd = await checkCanAddPiece(tenant)
    if (!canAdd.allowed) {
      return NextResponse.json(
        {
          error: canAdd.message,
          upgradeRequired: canAdd.upgradeRequired,
          requiredPlan: canAdd.requiredPlan,
        },
        { status: 403 }
      )
    }

    const data: CreatePieceInput = await request.json()

    const piece = await pieces.createPiece(tenant.id, data)

    return NextResponse.json({ piece }, { status: 201 })
  } catch (error) {
    console.error('Error creating piece:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
