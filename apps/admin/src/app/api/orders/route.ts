import { orders } from '@madebuy/db'
import {
  createLogger,
  isMadeBuyError,
  toErrorResponse,
  UnauthorizedError,
} from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

const log = createLogger({ module: 'orders' })

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      throw new UnauthorizedError()
    }

    const allOrders = await orders.listOrders(tenant.id)

    return NextResponse.json({ orders: allOrders })
  } catch (error) {
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json({ error: msg, code, details }, { status: statusCode })
    }

    // Log and return generic error for unexpected errors
    log.error({ err: error }, 'Unexpected error fetching orders')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      throw new UnauthorizedError()
    }

    const body = await request.json()
    const { orderData, pricing } = body

    const order = await orders.createOrder(tenant.id, orderData, pricing)

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json({ error: msg, code, details }, { status: statusCode })
    }

    // Log and return generic error for unexpected errors
    log.error({ err: error }, 'Unexpected error creating order')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
