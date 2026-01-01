import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions } from '@madebuy/db'
import type { Transaction, TransactionType } from '@madebuy/shared'

/**
 * Format a date as YYYY-MM-DD for filenames
 */
function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format a date for display in CSV
 */
function formatDateForDisplay(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Escape a value for CSV - handles commas, quotes, and newlines
 */
function escapeCSV(value: string | number | undefined | null): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Format cents to dollars for display
 */
function formatCurrency(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * Get human-readable transaction type
 */
function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    sale: 'Sale',
    refund: 'Refund',
    payout: 'Payout',
    fee: 'Fee',
    adjustment: 'Adjustment',
  }
  return labels[type] || type
}

/**
 * GET /api/ledger/export/csv
 * Export transactions as CSV file
 *
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - type: TransactionType (optional filter)
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
    const typeParam = searchParams.get('type') as TransactionType | null

    // Validate required parameters
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const startDate = new Date(startDateParam)
    const endDate = new Date(endDateParam)

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // Ensure end date includes the entire day
    endDate.setHours(23, 59, 59, 999)

    // Fetch all transactions in date range (no pagination for export)
    const { transactions: txns } = await transactions.listTransactions(tenant.id, {
      type: typeParam || undefined,
      startDate,
      endDate,
      sortBy: 'createdAt',
      sortOrder: 'asc',
      limit: 10000, // High limit for export
    })

    // Build CSV content
    const headers = ['Date', 'Type', 'Description', 'Order ID', 'Gross ($)', 'Stripe Fee ($)', 'Net ($)', 'Status']
    const rows: string[][] = [headers]

    for (const tx of txns) {
      rows.push([
        escapeCSV(formatDateForDisplay(new Date(tx.createdAt))),
        escapeCSV(getTransactionTypeLabel(tx.type)),
        escapeCSV(tx.description),
        escapeCSV(tx.orderId || ''),
        escapeCSV(formatCurrency(tx.gross)),
        escapeCSV(formatCurrency(tx.fees?.stripe || 0)),
        escapeCSV(formatCurrency(tx.net)),
        escapeCSV(tx.status.charAt(0).toUpperCase() + tx.status.slice(1)),
      ])
    }

    // Add summary row
    const totals = txns.reduce(
      (acc, tx) => {
        acc.gross += tx.gross
        acc.fees += tx.fees?.stripe || 0
        acc.net += tx.net
        return acc
      },
      { gross: 0, fees: 0, net: 0 }
    )

    rows.push([]) // Empty row
    rows.push([
      '',
      '',
      'TOTALS',
      `${txns.length} transactions`,
      formatCurrency(totals.gross),
      formatCurrency(totals.fees),
      formatCurrency(totals.net),
      '',
    ])

    // Convert to CSV string
    const csvContent = rows.map(row => row.join(',')).join('\n')

    // Generate filename
    const filename = `transactions-${formatDateForFilename(startDate)}-to-${formatDateForFilename(endDate)}.csv`

    // Return as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error exporting transactions CSV:', error)
    return NextResponse.json(
      { error: 'Failed to export transactions' },
      { status: 500 }
    )
  }
}
