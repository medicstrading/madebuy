import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { productionRuns } from '@madebuy/db'
import type { CreateProductionRunInput } from '@madebuy/shared'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pieceId = searchParams.get('pieceId') || undefined
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await productionRuns.listProductionRuns(tenant.id, {
      pieceId,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching production runs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: CreateProductionRunInput = await request.json()

    // Validate required fields
    if (!data.pieceId) {
      return NextResponse.json({ error: 'pieceId is required' }, { status: 400 })
    }

    if (!data.quantityProduced || data.quantityProduced < 1) {
      return NextResponse.json({ error: 'quantityProduced must be at least 1' }, { status: 400 })
    }

    const productionRun = await productionRuns.createProductionRun(tenant.id, data)

    return NextResponse.json({ productionRun }, { status: 201 })
  } catch (error) {
    console.error('Error creating production run:', error)

    // Return user-friendly error for known issues
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('no materials configured') || error.message.includes('Insufficient')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
