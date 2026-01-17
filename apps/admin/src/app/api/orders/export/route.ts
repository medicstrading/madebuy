import { orders } from '@madebuy/db'
import type { Order } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

// Maximum records to export to prevent memory exhaustion (P1 fix)
const MAX_EXPORT_RECORDS = 10000

/**
 * Export orders to CSV
 * GET /api/orders/export?status=shipped&paymentStatus=paid&from=2025-01-01&to=2025-12-31
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Build filters from query params
    const filters: {
      status?: Order['status']
      paymentStatus?: Order['paymentStatus']
      limit?: number
    } = {
      limit: MAX_EXPORT_RECORDS, // Limit to prevent memory issues
    }

    const status = searchParams.get('status') as Order['status'] | null
    if (status) {
      filters.status = status
    }

    const paymentStatus = searchParams.get('paymentStatus') as
      | Order['paymentStatus']
      | null
    if (paymentStatus) {
      filters.paymentStatus = paymentStatus
    }

    // Fetch orders matching filters with limit
    const orderData = await orders.listOrders(tenant.id, filters)

    // Apply date filters if provided
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    let filteredOrders = orderData
    if (fromDate || toDate) {
      filteredOrders = orderData.filter((order) => {
        const orderDate = new Date(order.createdAt)
        if (fromDate && orderDate < new Date(fromDate)) return false
        if (toDate && orderDate > new Date(`${toDate}T23:59:59`)) return false
        return true
      })
    }

    // Convert to CSV
    const csv = ordersToCSV(filteredOrders)

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]
    const filename = `orders-${tenant.slug}-${date}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * Convert orders array to CSV string
 */
function ordersToCSV(orderData: Order[]): string {
  // Define CSV headers
  const headers = [
    'Order Number',
    'Order Date',
    'Status',
    'Payment Status',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Items',
    'Item Details',
    'Subtotal',
    'Shipping',
    'Tax',
    'Discount',
    'Total',
    'Currency',
    'Promotion Code',
    'Shipping Method',
    'Shipping Type',
    'Shipping Address',
    'Tracking Number',
    'Carrier',
    'Traffic Source',
    'Traffic Medium',
    'Traffic Campaign',
    'Customer Notes',
    'Admin Notes',
    'Paid At',
    'Shipped At',
    'Delivered At',
  ]

  // Build rows
  const rows = orderData.map((order) => {
    // Format item details
    const itemCount = order.items?.length || 0
    const itemDetails = (order.items || [])
      .map(
        (item) =>
          `${item.name} x${item.quantity} @ ${formatMoney(item.price, order.currency)}`,
      )
      .join('; ')

    // Format shipping address
    const addr = order.shippingAddress
    const shippingAddress = addr
      ? [
          addr.line1,
          addr.line2,
          addr.city,
          addr.state,
          addr.postcode,
          addr.country,
        ]
          .filter(Boolean)
          .join(', ')
      : ''

    return [
      escapeCSV(order.orderNumber),
      formatDate(order.createdAt),
      order.status,
      order.paymentStatus,
      escapeCSV(order.customerName),
      escapeCSV(order.customerEmail),
      escapeCSV(order.customerPhone || ''),
      itemCount.toString(),
      escapeCSV(itemDetails),
      formatMoney(order.subtotal, order.currency),
      formatMoney(order.shipping, order.currency),
      formatMoney(order.tax, order.currency),
      formatMoney(order.discount, order.currency),
      formatMoney(order.total, order.currency),
      order.currency,
      escapeCSV(order.promotionCode || ''),
      escapeCSV(order.shippingMethod || ''),
      order.shippingType || '',
      escapeCSV(shippingAddress),
      escapeCSV(order.trackingNumber || ''),
      escapeCSV(order.carrier || ''),
      escapeCSV(order.trafficSource || ''),
      escapeCSV(order.trafficMedium || ''),
      escapeCSV(order.trafficCampaign || ''),
      escapeCSV(order.customerNotes || ''),
      escapeCSV(order.adminNotes || ''),
      order.paidAt ? formatDate(order.paidAt) : '',
      order.shippedAt ? formatDate(order.shippedAt) : '',
      order.deliveredAt ? formatDate(order.deliveredAt) : '',
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')

  return csvContent
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (!value) return ''

  // If value contains comma, quote, or newline, wrap in quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Escape double quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

/**
 * Format a date for CSV
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0] // YYYY-MM-DD format
}

/**
 * Format money value (cents to dollars)
 */
function formatMoney(cents: number, _currency: string = 'AUD'): string {
  // Prices are stored in cents
  return (cents / 100).toFixed(2)
}
