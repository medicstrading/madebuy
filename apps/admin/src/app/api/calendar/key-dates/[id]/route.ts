import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { keyDates } from '@madebuy/db'
import type { UpdateKeyDateInput } from '@madebuy/shared'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keyDate = await keyDates.getKeyDateById(tenant.id, params.id)

    if (!keyDate) {
      return NextResponse.json({ error: 'Key date not found' }, { status: 404 })
    }

    return NextResponse.json({ keyDate })
  } catch (error) {
    console.error('Error fetching key date:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: UpdateKeyDateInput = await request.json()

    const keyDate = await keyDates.updateKeyDate(tenant.id, params.id, data)

    if (!keyDate) {
      return NextResponse.json({ error: 'Key date not found' }, { status: 404 })
    }

    return NextResponse.json({ keyDate })
  } catch (error) {
    console.error('Error updating key date:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deleted = await keyDates.deleteKeyDate(tenant.id, params.id)

    if (!deleted) {
      return NextResponse.json({ error: 'Key date not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting key date:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
