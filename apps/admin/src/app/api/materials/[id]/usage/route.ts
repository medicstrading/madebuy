import { materials } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pieceId, quantityUsed } = body

    if (!pieceId || !quantityUsed || quantityUsed <= 0) {
      return NextResponse.json(
        { error: 'pieceId and quantityUsed > 0 are required' },
        { status: 400 },
      )
    }

    // Record the material usage
    const usage = await materials.recordMaterialUsage(
      tenant.id,
      pieceId,
      params.id,
      quantityUsed,
    )

    return NextResponse.json({ usage })
  } catch (error) {
    console.error('Material usage error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to record material usage',
      },
      { status: 500 },
    )
  }
}
