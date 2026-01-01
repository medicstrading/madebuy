import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions, orders } from '@madebuy/db'

/**
 * Australian GST Reporting API
 *
 * GST Rate: 10%
 * GST Calculation: GST = Total / 11 (when prices include GST)
 * GST-exclusive: GST = Total * 0.1
 *
 * Only applies when seller is GST registered (ABN + gstRegistered = true)
 */

export interface GSTReportSummary {
  period: {
    type: 'monthly' | 'quarterly' | 'custom'
    startDate: string
    endDate: string
    label: string
  }
  gstRegistered: boolean
  abn: string | null

  // GST figures (all in cents, converted to dollars in response)
  totalSalesInclGST: number       // Total revenue including GST
  totalSalesExclGST: number       // Total revenue excluding GST
  gstCollected: number            // GST collected on sales (1/11 of GST-inclusive)
  gstOnPurchases: number          // GST paid on purchases (placeholder)
  netGSTPayable: number           // GST collected - GST on purchases

  // Transaction breakdown
  salesCount: number
  refundCount: number
  refundAmount: number

  // Detailed transactions for the period
  transactions: Array<{
    id: string
    date: string
    description: string
    gross: number
    gstAmount: number
    net: number
    type: string
  }>
}

function getQuarterDates(quarter: string, year: number): { start: Date; end: Date } {
  // Australian financial year quarters
  // Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun
  const quarters: Record<string, { startMonth: number; endMonth: number; yearOffset: number }> = {
    Q1: { startMonth: 6, endMonth: 8, yearOffset: 0 },   // Jul-Sep (months are 0-indexed)
    Q2: { startMonth: 9, endMonth: 11, yearOffset: 0 },  // Oct-Dec
    Q3: { startMonth: 0, endMonth: 2, yearOffset: 1 },   // Jan-Mar (next calendar year)
    Q4: { startMonth: 3, endMonth: 5, yearOffset: 1 },   // Apr-Jun (next calendar year)
  }

  const q = quarters[quarter]
  if (!q) throw new Error('Invalid quarter')

  const startYear = year + q.yearOffset
  const start = new Date(startYear, q.startMonth, 1)
  const end = new Date(startYear, q.endMonth + 1, 0, 23, 59, 59, 999) // Last day of end month

  return { start, end }
}

function getMonthDates(monthsAgo: number): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function formatPeriodLabel(startDate: Date, endDate: Date, periodType: string): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
  const startStr = startDate.toLocaleDateString('en-AU', options)
  const endStr = endDate.toLocaleDateString('en-AU', options)

  if (periodType === 'monthly' && startStr === endStr) {
    return startStr
  }
  return `${startStr} - ${endStr}`
}

/**
 * Calculate GST from a GST-inclusive amount
 * GST = Total / 11 (standard Australian formula)
 */
function calculateGSTFromInclusive(amountInclGST: number): number {
  return Math.round(amountInclGST / 11 * 100) / 100
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'monthly'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const monthsAgo = parseInt(searchParams.get('monthsAgo') || '0', 10)

    let startDate: Date
    let endDate: Date
    let periodType: 'monthly' | 'quarterly' | 'custom' = 'monthly'

    if (startDateParam && endDateParam) {
      // Custom date range
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
      periodType = 'custom'
    } else if (period === 'quarterly') {
      // Default to current quarter
      const now = new Date()
      const currentMonth = now.getMonth()
      let quarter: string
      let year = now.getFullYear()

      // Determine current Australian FY quarter
      if (currentMonth >= 6 && currentMonth <= 8) {
        quarter = 'Q1'
      } else if (currentMonth >= 9 && currentMonth <= 11) {
        quarter = 'Q2'
      } else if (currentMonth >= 0 && currentMonth <= 2) {
        quarter = 'Q3'
        year = year - 1 // Adjust for financial year
      } else {
        quarter = 'Q4'
        year = year - 1 // Adjust for financial year
      }

      const dates = getQuarterDates(quarter, year)
      startDate = dates.start
      endDate = dates.end
      periodType = 'quarterly'
    } else {
      // Monthly (default) - uses monthsAgo parameter
      const dates = getMonthDates(monthsAgo)
      startDate = dates.start
      endDate = dates.end
      periodType = 'monthly'
    }

    // Fetch transactions for the period
    const { transactions: txns } = await transactions.listTransactions(tenant.id, {
      startDate,
      endDate,
      status: 'completed',
    })

    // Calculate GST figures
    let totalSalesInclGST = 0
    let salesCount = 0
    let refundCount = 0
    let refundAmount = 0

    const transactionDetails = txns.map(tx => {
      const isRefund = tx.type === 'refund'
      const amount = Math.abs(tx.gross)

      if (isRefund) {
        refundCount++
        refundAmount += amount
      } else if (tx.type === 'sale') {
        salesCount++
        totalSalesInclGST += amount
      }

      // Calculate GST component (assuming GST-inclusive pricing)
      const gstAmount = tenant.gstRegistered ? calculateGSTFromInclusive(amount) : 0

      return {
        id: tx.id,
        date: tx.createdAt.toISOString(),
        description: tx.description,
        gross: amount,
        gstAmount,
        net: amount - gstAmount,
        type: tx.type,
      }
    })

    // Calculate GST totals (only if GST registered)
    const gstCollected = tenant.gstRegistered ? calculateGSTFromInclusive(totalSalesInclGST) : 0
    const totalSalesExclGST = totalSalesInclGST - gstCollected

    // Placeholder for GST on purchases - would need expense tracking
    const gstOnPurchases = 0
    const netGSTPayable = gstCollected - gstOnPurchases

    const summary: GSTReportSummary = {
      period: {
        type: periodType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: formatPeriodLabel(startDate, endDate, periodType),
      },
      gstRegistered: tenant.gstRegistered || false,
      abn: tenant.abn || null,
      totalSalesInclGST,
      totalSalesExclGST,
      gstCollected,
      gstOnPurchases,
      netGSTPayable,
      salesCount,
      refundCount,
      refundAmount,
      transactions: transactionDetails.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error generating GST report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
