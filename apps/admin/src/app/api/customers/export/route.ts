import { customers } from '@madebuy/db'
import type { Customer, CustomerFilters } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

// Maximum records to export to prevent memory exhaustion (P1 fix)
const MAX_EXPORT_RECORDS = 10000

/**
 * Export customers to CSV
 * GET /api/customers/export?emailSubscribed=true&minSpent=100
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Build filters from query params
    const filters: CustomerFilters = {}

    const emailSubscribed = searchParams.get('emailSubscribed')
    if (emailSubscribed !== null && emailSubscribed !== '') {
      filters.emailSubscribed = emailSubscribed === 'true'
    }

    const minSpent = searchParams.get('minSpent')
    if (minSpent) {
      filters.minSpent = parseFloat(minSpent)
    }

    // Fetch customers matching filters with limit to prevent memory issues
    const customerData = await customers.exportCustomers(tenant.id, filters)

    // Warn if export was truncated
    if (customerData.length >= MAX_EXPORT_RECORDS) {
      console.warn(
        `Customer export for tenant ${tenant.id} was truncated at ${MAX_EXPORT_RECORDS} records`,
      )
    }

    // Convert to CSV
    const csv = customersToCSV(customerData)

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]
    const filename = `customers-${tenant.slug}-${date}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * Convert customers array to CSV string
 */
function customersToCSV(customerData: Customer[]): string {
  // Define CSV headers
  const headers = [
    'Email',
    'Name',
    'Phone',
    'Total Orders',
    'Total Spent',
    'Average Order Value',
    'First Order Date',
    'Last Order Date',
    'Email Subscribed',
    'Acquisition Source',
    'Acquisition Medium',
    'Acquisition Campaign',
    'Tags',
    'Notes',
    'Created At',
  ]

  // Build rows
  const rows = customerData.map((customer) => [
    escapeCSV(customer.email),
    escapeCSV(customer.name),
    escapeCSV(customer.phone || ''),
    customer.totalOrders.toString(),
    customer.totalSpent.toFixed(2),
    customer.averageOrderValue.toFixed(2),
    customer.firstOrderAt ? formatDate(customer.firstOrderAt) : '',
    customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '',
    customer.emailSubscribed ? 'Yes' : 'No',
    escapeCSV(customer.acquisitionSource || ''),
    escapeCSV(customer.acquisitionMedium || ''),
    escapeCSV(customer.acquisitionCampaign || ''),
    escapeCSV((customer.tags || []).join('; ')),
    escapeCSV(customer.notes || ''),
    formatDate(customer.createdAt),
  ])

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
