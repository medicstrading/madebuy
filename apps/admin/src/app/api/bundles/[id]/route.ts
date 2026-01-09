import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { bundles } from '@madebuy/db'
import type { UpdateBundleInput } from '@madebuy/shared'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if we need populated piece details
    const { searchParams } = new URL(request.url)
    const withPieces = searchParams.get('withPieces') === 'true'

    if (withPieces) {
      const bundle = await bundles.getBundleWithPieces(tenant.id, id)
      if (!bundle) {
        return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
      }
      return NextResponse.json({ bundle })
    }

    const bundle = await bundles.getBundle(tenant.id, id)

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    return NextResponse.json({ bundle })
  } catch (error) {
    console.error('Error fetching bundle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data: UpdateBundleInput = await request.json()

    // Validate pieces if provided
    if (data.pieces) {
      if (data.pieces.length === 0) {
        return NextResponse.json(
          { error: 'Bundle must have at least one piece' },
          { status: 400 }
        )
      }

      for (const piece of data.pieces) {
        if (!piece.pieceId || piece.quantity < 1) {
          return NextResponse.json(
            { error: 'Each piece must have a valid pieceId and quantity >= 1' },
            { status: 400 }
          )
        }
      }
    }

    // Validate price if provided
    if (data.bundlePrice !== undefined && data.bundlePrice < 0) {
      return NextResponse.json(
        { error: 'Bundle price cannot be negative' },
        { status: 400 }
      )
    }

    const bundle = await bundles.updateBundle(tenant.id, id, data)

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    return NextResponse.json({ bundle })
  } catch (error) {
    console.error('Error updating bundle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const deleted = await bundles.deleteBundle(tenant.id, id)

    if (!deleted) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bundle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
