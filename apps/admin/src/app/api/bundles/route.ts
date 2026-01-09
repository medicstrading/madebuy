import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { bundles } from '@madebuy/db'
import type { CreateBundleInput, BundleListOptions } from '@madebuy/shared'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const options: BundleListOptions = {}

    const status = searchParams.get('status')
    if (status) {
      if (status.includes(',')) {
        options.status = status.split(',') as BundleListOptions['status']
      } else {
        options.status = status as BundleListOptions['status']
      }
    }

    if (searchParams.get('limit')) {
      options.limit = parseInt(searchParams.get('limit')!, 10)
    }

    if (searchParams.get('offset')) {
      options.offset = parseInt(searchParams.get('offset')!, 10)
    }

    if (searchParams.get('sortBy')) {
      options.sortBy = searchParams.get('sortBy') as BundleListOptions['sortBy']
    }

    if (searchParams.get('sortOrder')) {
      options.sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc'
    }

    const result = await bundles.listBundles(tenant.id, options)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching bundles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: CreateBundleInput = await request.json()

    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!data.pieces || data.pieces.length === 0) {
      return NextResponse.json(
        { error: 'At least one piece is required in a bundle' },
        { status: 400 }
      )
    }

    if (data.bundlePrice === undefined || data.bundlePrice < 0) {
      return NextResponse.json(
        { error: 'Valid bundle price is required' },
        { status: 400 }
      )
    }

    // Validate quantities
    for (const piece of data.pieces) {
      if (!piece.pieceId || piece.quantity < 1) {
        return NextResponse.json(
          { error: 'Each piece must have a valid pieceId and quantity >= 1' },
          { status: 400 }
        )
      }
    }

    const bundle = await bundles.createBundle(tenant.id, data)

    return NextResponse.json({ bundle }, { status: 201 })
  } catch (error) {
    console.error('Error creating bundle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
