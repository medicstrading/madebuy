import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'
import { CreatePieceInput } from '@madebuy/shared'

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allPieces = await pieces.listPieces(tenant.id)

    return NextResponse.json({ pieces: allPieces })
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

    const data: CreatePieceInput = await request.json()

    const piece = await pieces.createPiece(tenant.id, data)

    return NextResponse.json({ piece }, { status: 201 })
  } catch (error) {
    console.error('Error creating piece:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
