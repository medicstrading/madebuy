import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions } from '@madebuy/db'
import type { TransactionFilters, Transaction } from '@madebuy/shared'

/**
 * GET /api/transactions/export
 * Export transactions as CSV
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - type: transaction type filter (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const typeParam = searchParams.get('type')

    // Build filters
    const filters: TransactionFilters = {}

    if (startDateParam) {
      filters.startDate = new Date(startDateParam)
    }

    if (endDateParam) {
      // Set end date to end of day
      const endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
      filters.endDate = endDate
    }

    if (typeParam) {
      filters.type = typeParam as TransactionFilters['type']
    }

    // Fetch all transactions matching filters (no pagination for export)
    const allTransactions = await transactions.listTransactions(tenant.id, {
      filters,
      limit: 10000, // Reasonable upper limit
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })

    if (allTransactions.length === 0) {
      return new NextResponse('No transactions to export', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="transactions.csv"',
        },
      })
    }

    // Convert to CSV with specific columns for accounting
    const csvRows = [
      // Header row
      [
        'Date',
        'Type',
        'Description',
        'Order ID',
        'Gross Amount',
        'Stripe Fee',
        'Platform Fee',
        'Net Amount',
        'Currency',
        'Status',
        'Stripe Payment ID',
        'Transaction ID'
      ].join(','),
      // Data rows
      ...allTransactions.map((tx: Transaction) => {
        const row = [
          formatDate(tx.createdAt),
          tx.type,
          escapeCSV(tx.description || getDefaultDescription(tx.type)),
          tx.orderId || '',
          formatMoney(tx.grossAmount),
          formatMoney(tx.stripeFee),
          formatMoney(tx.platformFee),
          formatMoney(tx.netAmount),
          tx.currency.toUpperCase(),
          tx.status,
          tx.stripePaymentIntentId || '',
          tx.id
        ]
        return row.join(',')
      })
    ]

    const csv = csvRows.join('\n')

    // Generate filename with date range if applicable
    let filename = 'transactions'
    if (startDateParam && endDateParam) {
      filename += `-${startDateParam}-to-${endDateParam}`
    } else if (startDateParam) {
      filename += `-from-${startDateParam}`
    } else if (endDateParam) {
      filename += `-to-${endDateParam}`
    }
    filename += '.csv'

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting transactions:', error)
    return NextResponse.json(
      { error: 'Failed to export transactions' },
      { status: 500 }
    )
  }
}

// Helper functions

function formatDate(date: Date): string {
  // Format as YYYY-MM-DD HH:mm:ss for Excel compatibility
  const d = new Date(date)
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

function formatMoney(cents: number): string {
  // Convert cents to dollars with 2 decimal places
  return (cents / 100).toFixed(2)
}

function escapeCSV(value: string): string {
  // Escape values with commas, quotes, or newlines
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function getDefaultDescription(type: string): string {
  const descriptions: Record<string, string> = {
    sale: 'Order payment',
    refund: 'Order refund',
    payout: 'Payout to bank',
    fee: 'Platform fee',
    subscription: 'Subscription payment'
  }
  return descriptions[type] || type
}
