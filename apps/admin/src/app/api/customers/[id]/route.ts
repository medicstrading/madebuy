import { customers } from '@madebuy/db'
import type { Customer, CustomerWithOrders } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeOrders = searchParams.get('includeOrders') === 'true'

    let customer: Customer | CustomerWithOrders | null
    if (includeOrders) {
      customer = await customers.getCustomerWithOrders(tenant.id, id)
    } else {
      customer = await customers.getCustomerById(tenant.id, id)
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Error fetching customer:', error)
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
    const body = await request.json()
    const {
      name,
      phone,
      notes,
      tags,
      emailSubscribed,
      preferredContactMethod,
    } = body

    const existing = await customers.getCustomerById(tenant.id, id)
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone
    if (notes !== undefined) updates.notes = notes
    if (tags !== undefined) updates.tags = tags
    if (emailSubscribed !== undefined) updates.emailSubscribed = emailSubscribed
    if (preferredContactMethod !== undefined)
      updates.preferredContactMethod = preferredContactMethod

    await customers.updateCustomer(tenant.id, id, updates)
    const updated = await customers.getCustomerById(tenant.id, id)

    return NextResponse.json({ customer: updated })
  } catch (error) {
    console.error('Error updating customer:', error)
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

    const existing = await customers.getCustomerById(tenant.id, id)
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    await customers.deleteCustomer(tenant.id, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
