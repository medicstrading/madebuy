import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'
import { checkCanAddPiece, getSubscriptionSummary } from '@/lib/subscription-check'
import { CreatePieceInput, isMadeBuyError, toErrorResponse } from '@madebuy/shared'

/**
 * Helper to create standardized error responses
 */
function errorResponse(
  message: string,
  code: string,
  status: number,
  details?: Record<string, unknown>
) {
  const body: { error: string; code: string; details?: Record<string, unknown> } = { error: message, code }
  if (details) {
    body.details = details
  }
  return NextResponse.json(body, { status })
}

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
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
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return errorResponse(msg, code, statusCode, details)
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }

    // Check subscription limits before creating
    const canAdd = await checkCanAddPiece(tenant)
    if (!canAdd.allowed) {
      return errorResponse(
        canAdd.message || 'Subscription limit reached',
        'SUBSCRIPTION_LIMIT',
        403,
        { upgradeRequired: canAdd.upgradeRequired, requiredPlan: canAdd.requiredPlan }
      )
    }

    const data: CreatePieceInput = await request.json()

    const piece = await pieces.createPiece(tenant.id, data)

    return NextResponse.json({ piece }, { status: 201 })
  } catch (error) {
    console.error('Error creating piece:', error)
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return errorResponse(msg, code, statusCode, details)
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
