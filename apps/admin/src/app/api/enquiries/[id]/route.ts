import { enquiries } from '@madebuy/db'
import type { Enquiry } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const enquiry = await enquiries.getEnquiry(tenant.id, id)

    if (!enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 })
    }

    return NextResponse.json({ enquiry })
  } catch (error) {
    console.error('Error fetching enquiry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { status, note } = await request.json()

    // Update status if provided
    if (status) {
      await enquiries.updateEnquiryStatus(
        tenant.id,
        id,
        status as Enquiry['status'],
      )
    }

    // Add note if provided
    if (note) {
      await enquiries.addEnquiryNote(tenant.id, id, note)
    }

    // Fetch updated enquiry
    const enquiry = await enquiries.getEnquiry(tenant.id, id)

    if (!enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 })
    }

    return NextResponse.json({ enquiry })
  } catch (error) {
    console.error('Error updating enquiry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await enquiries.deleteEnquiry(tenant.id, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting enquiry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
