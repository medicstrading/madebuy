import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { checkCanAddPiece, checkCanAddMedia, checkFeatureAccess } from '@/lib/subscription-check'
import type { TenantFeatures } from '@madebuy/shared'

/**
 * POST /api/subscription/check
 * Check if a specific action is allowed based on subscription
 *
 * Body:
 * - action: 'addPiece' | 'addMedia' | 'feature'
 * - params: action-specific parameters
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, params } = body

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    }

    let result

    switch (action) {
      case 'addPiece':
        result = await checkCanAddPiece(tenant)
        break

      case 'addMedia':
        if (typeof params?.currentMediaCount !== 'number') {
          return NextResponse.json(
            { error: 'Missing currentMediaCount parameter' },
            { status: 400 }
          )
        }
        result = checkCanAddMedia(tenant, params.currentMediaCount)
        break

      case 'feature':
        if (!params?.feature) {
          return NextResponse.json({ error: 'Missing feature parameter' }, { status: 400 })
        }
        const validFeatures: (keyof TenantFeatures)[] = [
          'socialPublishing',
          'aiCaptions',
          'unlimitedPieces',
          'customDomain',
        ]
        if (!validFeatures.includes(params.feature)) {
          return NextResponse.json({ error: 'Invalid feature' }, { status: 400 })
        }
        result = checkFeatureAccess(tenant, params.feature)
        break

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Subscription check error:', error)
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    )
  }
}
