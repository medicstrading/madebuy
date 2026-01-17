import { collections } from '@madebuy/db'
import type {
  CollectionListOptions,
  CreateCollectionInput,
} from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const options: CollectionListOptions = {}

    if (searchParams.get('isPublished') !== null) {
      options.isPublished = searchParams.get('isPublished') === 'true'
    }

    if (searchParams.get('isFeatured') !== null) {
      options.isFeatured = searchParams.get('isFeatured') === 'true'
    }

    if (searchParams.get('limit')) {
      options.limit = parseInt(searchParams.get('limit')!, 10)
    }

    if (searchParams.get('offset')) {
      options.offset = parseInt(searchParams.get('offset')!, 10)
    }

    if (searchParams.get('sortBy')) {
      options.sortBy = searchParams.get(
        'sortBy',
      ) as CollectionListOptions['sortBy']
    }

    if (searchParams.get('sortOrder')) {
      options.sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc'
    }

    const result = await collections.listCollections(tenant.id, options)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: CreateCollectionInput = await request.json()

    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const collection = await collections.createCollection(tenant.id, data)

    return NextResponse.json({ collection }, { status: 201 })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
