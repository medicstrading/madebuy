import { customers } from '@madebuy/db'
import { sanitizeInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const search = searchParams.get('search') || undefined
    const emailSubscribed = searchParams.get('emailSubscribed')
    const minSpent = searchParams.get('minSpent')
    const minOrders = searchParams.get('minOrders')
    const acquisitionSource = searchParams.get('acquisitionSource') || undefined

    const filters: any = {}
    if (search) filters.search = search
    if (emailSubscribed !== null && emailSubscribed !== '') {
      filters.emailSubscribed = emailSubscribed === 'true'
    }
    if (minSpent) filters.minSpent = parseFloat(minSpent)
    if (minOrders) filters.minOrders = parseInt(minOrders, 10)
    if (acquisitionSource) filters.acquisitionSource = acquisitionSource

    const result = await customers.listCustomers(tenant.id, filters, {
      page,
      limit,
    })

    return NextResponse.json({
      customers: result.customers,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
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

    const body = await request.json()
    const { email, name, phone, notes, tags, emailSubscribed } = body

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 },
      )
    }

    // Check if customer exists
    const existing = await customers.getCustomerByEmail(tenant.id, email)
    if (existing) {
      return NextResponse.json(
        { error: 'A customer with this email already exists' },
        { status: 409 },
      )
    }

    // Create customer via the createOrUpdateCustomer function (sanitize inputs)
    const customer = await customers.createOrUpdateCustomer(
      tenant.id,
      sanitizeInput(email),
      {
        customerName: sanitizeInput(name),
        orderTotal: 0,
      },
    )

    // Update additional fields
    if (phone || notes || tags || emailSubscribed !== undefined) {
      await customers.updateCustomer(tenant.id, customer.id, {
        phone: phone ? sanitizeInput(phone) : undefined,
        notes: notes ? sanitizeInput(notes) : undefined,
        tags,
        emailSubscribed: emailSubscribed ?? true,
      })
    }

    const updated = await customers.getCustomerById(tenant.id, customer.id)

    return NextResponse.json({ customer: updated }, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
