import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions } from '@madebuy/db'
import type { Transaction, TransactionType, TransactionSummary } from '@madebuy/shared'

/**
 * Format a date as YYYY-MM-DD for filenames
 */
function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format a date for display
 */
function formatDateForDisplay(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/**
 * Format a date with time for display
 */
function formatDateTimeForDisplay(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Format cents to currency string
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
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
 * Get status badge color
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#059669' // green
    case 'pending':
      return '#d97706' // amber
    case 'failed':
      return '#dc2626' // red
    default:
      return '#6b7280' // gray
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate HTML content for PDF
 */
function generatePdfHtml(
  businessName: string,
  abn: string | undefined,
  startDate: Date,
  endDate: Date,
  txns: Transaction[],
  summary: TransactionSummary
): string {
  const transactionRows = txns
    .map(
      (tx) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">
          ${formatDateTimeForDisplay(new Date(tx.createdAt))}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; background-color: ${
            tx.type === 'sale' ? '#dcfce7' : tx.type === 'refund' ? '#fee2e2' : '#f3f4f6'
          }; color: ${
            tx.type === 'sale' ? '#166534' : tx.type === 'refund' ? '#991b1b' : '#374151'
          };">
            ${getTransactionTypeLabel(tx.type)}
          </span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHtml(tx.description)}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-family: monospace; color: #6b7280;">
          ${tx.orderId ? escapeHtml(tx.orderId) : '-'}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">
          ${formatCurrency(tx.gross)}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; color: #dc2626;">
          -${formatCurrency(tx.fees?.stripe || 0)}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-weight: 600;">
          ${formatCurrency(tx.net)}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 500; color: white; background-color: ${getStatusColor(tx.status)};">
            ${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
          </span>
        </td>
      </tr>
    `
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transaction Statement - ${businessName}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 0.5in; size: A4 landscape; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.5;
      color: #111827;
      background: white;
      margin: 0;
      padding: 40px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e5e7eb;
    }
    .business-info h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #111827;
    }
    .business-info p {
      margin: 4px 0;
      color: #6b7280;
      font-size: 14px;
    }
    .statement-info {
      text-align: right;
    }
    .statement-info h2 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #4f46e5;
    }
    .statement-info p {
      margin: 4px 0;
      font-size: 14px;
      color: #6b7280;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }
    .summary-card {
      background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
    }
    .summary-card h3 {
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .summary-card .subtext {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
    }
    .table-container {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 32px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      background: #f9fafb;
    }
    th {
      padding: 14px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e5e7eb;
    }
    th:nth-child(5), th:nth-child(6), th:nth-child(7) {
      text-align: right;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    .totals-row {
      background: #f9fafb;
      font-weight: 600;
    }
    .totals-row td {
      padding: 16px;
      border-top: 2px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="business-info">
        <h1>${escapeHtml(businessName)}</h1>
        ${abn ? `<p>ABN: ${escapeHtml(abn)}</p>` : ''}
        <p>Transaction Statement</p>
      </div>
      <div class="statement-info">
        <h2>STATEMENT</h2>
        <p><strong>Period:</strong> ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}</p>
        <p><strong>Generated:</strong> ${formatDateTimeForDisplay(new Date())}</p>
        <p><strong>Transactions:</strong> ${txns.length}</p>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Gross Revenue</h3>
        <p class="value">${formatCurrency(summary.totalGross)}</p>
        <p class="subtext">${summary.salesCount} sale${summary.salesCount !== 1 ? 's' : ''}</p>
      </div>
      <div class="summary-card">
        <h3>Processing Fees</h3>
        <p class="value" style="color: #dc2626;">-${formatCurrency(summary.totalFees)}</p>
        <p class="subtext">Stripe fees</p>
      </div>
      <div class="summary-card">
        <h3>Refunds</h3>
        <p class="value" style="color: #d97706;">${formatCurrency(summary.refundAmount)}</p>
        <p class="subtext">${summary.refundCount} refund${summary.refundCount !== 1 ? 's' : ''}</p>
      </div>
      <div class="summary-card">
        <h3>Net Revenue</h3>
        <p class="value" style="color: #059669;">${formatCurrency(summary.totalNet)}</p>
        <p class="subtext">After fees & refunds</p>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Description</th>
            <th>Order ID</th>
            <th>Gross</th>
            <th>Stripe Fee</th>
            <th>Net</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${transactionRows}
          <tr class="totals-row">
            <td colspan="4" style="text-align: right;">TOTALS</td>
            <td style="text-align: right;">${formatCurrency(summary.totalGross)}</td>
            <td style="text-align: right; color: #dc2626;">-${formatCurrency(summary.totalFees)}</td>
            <td style="text-align: right; color: #059669;">${formatCurrency(summary.totalNet)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated by MadeBuy &bull; madebuy.com.au</p>
      <p>This statement is for informational purposes only. All amounts are in AUD.</p>
    </div>
  </div>
</body>
</html>
`
}

/**
 * GET /api/ledger/export/pdf
 * Export transactions as PDF-ready HTML
 *
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - type: TransactionType (optional filter)
 *
 * Note: Returns HTML that can be printed to PDF via browser print dialog.
 * For server-side PDF generation, consider adding puppeteer or @react-pdf/renderer.
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
    const endDateAdjusted = new Date(endDate)
    endDateAdjusted.setHours(23, 59, 59, 999)

    // Fetch all transactions in date range
    const { transactions: txns } = await transactions.listTransactions(tenant.id, {
      type: typeParam || undefined,
      startDate,
      endDate: endDateAdjusted,
      sortBy: 'createdAt',
      sortOrder: 'asc',
      limit: 10000,
    })

    // Get summary
    const summary = await transactions.getTransactionSummary(
      tenant.id,
      startDate,
      endDateAdjusted
    )

    // Generate HTML content
    const htmlContent = generatePdfHtml(
      tenant.businessName,
      tenant.abn,
      startDate,
      endDate,
      txns,
      summary
    )

    // Generate filename
    const filename = `statement-${formatDateForFilename(startDate)}-to-${formatDateForFilename(endDate)}.html`

    // Return as HTML file for printing to PDF
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error exporting transactions PDF:', error)
    return NextResponse.json(
      { error: 'Failed to export transactions' },
      { status: 500 }
    )
  }
}
