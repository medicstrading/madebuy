import { newsletters } from '@madebuy/db'
import type { UpdateNewsletterInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const newsletter = await newsletters.getNewsletterById(tenant.id, params.id)

    if (!newsletter) {
      return NextResponse.json(
        { error: 'Newsletter not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ newsletter })
  } catch (error) {
    console.error('Error fetching newsletter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: UpdateNewsletterInput = await request.json()

    const newsletter = await newsletters.updateNewsletter(
      tenant.id,
      params.id,
      data,
    )

    if (!newsletter) {
      return NextResponse.json(
        { error: 'Newsletter not found or already sent' },
        { status: 404 },
      )
    }

    return NextResponse.json({ newsletter })
  } catch (error) {
    console.error('Error updating newsletter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deleted = await newsletters.deleteNewsletter(tenant.id, params.id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Newsletter not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting newsletter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
