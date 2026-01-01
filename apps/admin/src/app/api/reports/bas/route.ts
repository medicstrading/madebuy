import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions } from '@madebuy/db'

/**
 * Australian BAS (Business Activity Statement) Reporting API
 *
 * BAS is lodged quarterly for GST reporting.
 * Australian Financial Year Quarters:
 * - Q1: July - September
 * - Q2: October - December
 * - Q3: January - March
 * - Q4: April - June
 *
 * Key BAS fields for GST:
 * - G1: Total sales (including GST)
 * - 1A: GST on sales
 * - 1B: GST on purchases
 * - Net GST payable/refundable
 */

export interface BASReportData {
  quarter: string
  financialYear: string
  periodLabel: string
  startDate: string
  endDate: string

  // Business details
  businessName: string
  abn: string | null
  gstRegistered: boolean

  // BAS Fields (in dollars)
  // Sales and GST
  G1_TotalSales: number           // G1: Total sales (including GST-free sales)
  G2_ExportSales: number          // G2: Export sales (GST-free)
  G3_OtherGSTFreeSales: number    // G3: Other GST-free sales
  G4_InputTaxedSales: number      // G4: Input taxed sales
  G5_G2_plus_G3_plus_G4: number   // G5: Total non-taxable sales
  G6_TotalTaxableSales: number    // G6: G1 minus G5 (taxable sales)
  G7_Adjustments: number          // G7: Adjustments
  G8_TotalSalesSubjectToGST: number // G8: G6 + G7

  // GST on sales
  label_1A_GSTOnSales: number     // 1A: GST on sales (G8 / 11)

  // GST on purchases (placeholders for now)
  G10_CapitalPurchases: number    // G10: Capital purchases
  G11_NonCapitalPurchases: number // G11: Non-capital purchases
  G12_G10_plus_G11: number        // G12: Total purchases
  G13_PurchasesPrivateUse: number // G13: Purchases for private use
  G14_PurchasesGSTFree: number    // G14: Purchases from GST-free sales
  G15_EstimatedPurchases: number  // G15: Estimated purchases for private use
  G16_G13_plus_G14_plus_G15: number // G16: Total non-creditable purchases
  G17_TotalCreditable: number     // G17: G12 minus G16
  G18_Adjustments: number         // G18: Adjustments
  G19_TotalPurchasesSubjectToGST: number // G19: G17 + G18

  // GST on purchases
  label_1B_GSTOnPurchases: number // 1B: GST on purchases (G19 / 11)

  // Net GST
  netGSTPayable: number           // If positive, you owe ATO. If negative, refund due.

  // Summary stats
  transactionCount: number
  refundCount: number
  refundAmount: number

  // Warning if not GST registered
  warnings: string[]
}

function getQuarterDates(quarter: string, year: number): { start: Date; end: Date } {
  // Australian financial year quarters
  // Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun
  // Year parameter is the financial year start (e.g., 2024 for FY 2024-25)
  const quarters: Record<string, { startMonth: number; endMonth: number; yearOffset: number }> = {
    Q1: { startMonth: 6, endMonth: 8, yearOffset: 0 },   // Jul-Sep (current calendar year)
    Q2: { startMonth: 9, endMonth: 11, yearOffset: 0 },  // Oct-Dec (current calendar year)
    Q3: { startMonth: 0, endMonth: 2, yearOffset: 1 },   // Jan-Mar (next calendar year)
    Q4: { startMonth: 3, endMonth: 5, yearOffset: 1 },   // Apr-Jun (next calendar year)
  }

  const q = quarters[quarter]
  if (!q) throw new Error('Invalid quarter')

  const startYear = year + q.yearOffset
  const start = new Date(startYear, q.startMonth, 1)
  const end = new Date(startYear, q.endMonth + 1, 0, 23, 59, 59, 999)

  return { start, end }
}

function getFinancialYear(date: Date): { year: number; label: string } {
  const month = date.getMonth()
  const calendarYear = date.getFullYear()

  // Australian FY starts July 1
  // July-December = FY starting this calendar year
  // January-June = FY starting last calendar year
  const fyStartYear = month >= 6 ? calendarYear : calendarYear - 1
  const fyEndYear = fyStartYear + 1

  return {
    year: fyStartYear,
    label: `FY ${fyStartYear}-${fyEndYear.toString().slice(-2)}`,
  }
}

function getCurrentQuarter(): { quarter: string; year: number } {
  const now = new Date()
  const month = now.getMonth()
  const fy = getFinancialYear(now)

  let quarter: string
  if (month >= 6 && month <= 8) {
    quarter = 'Q1'
  } else if (month >= 9 && month <= 11) {
    quarter = 'Q2'
  } else if (month >= 0 && month <= 2) {
    quarter = 'Q3'
  } else {
    quarter = 'Q4'
  }

  return { quarter, year: fy.year }
}

function getQuarterLabel(quarter: string): string {
  const labels: Record<string, string> = {
    Q1: 'July - September',
    Q2: 'October - December',
    Q3: 'January - March',
    Q4: 'April - June',
  }
  return labels[quarter] || quarter
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
    const quarterParam = searchParams.get('quarter') // Q1, Q2, Q3, Q4
    const yearParam = searchParams.get('year') // Financial year start (e.g., 2024 for FY2024-25)

    // Default to current quarter
    const current = getCurrentQuarter()
    const quarter = quarterParam || current.quarter
    const year = yearParam ? parseInt(yearParam, 10) : current.year

    // Validate quarter
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return NextResponse.json({ error: 'Invalid quarter. Use Q1, Q2, Q3, or Q4.' }, { status: 400 })
    }

    // Get date range for the quarter
    const { start: startDate, end: endDate } = getQuarterDates(quarter, year)
    const fy = getFinancialYear(startDate)

    // Collect warnings
    const warnings: string[] = []

    if (!tenant.gstRegistered) {
      warnings.push('Your business is not registered for GST. GST calculations are shown for reference only.')
    }

    if (!tenant.abn) {
      warnings.push('No ABN registered. You need an ABN to lodge a BAS.')
    }

    // Fetch transactions for the quarter
    const { transactions: txns } = await transactions.listTransactions(tenant.id, {
      startDate,
      endDate,
      status: 'completed',
    })

    // Calculate totals
    let totalSales = 0
    let refundAmount = 0
    let salesCount = 0
    let refundCount = 0

    txns.forEach(tx => {
      if (tx.type === 'sale') {
        totalSales += tx.gross
        salesCount++
      } else if (tx.type === 'refund') {
        refundAmount += Math.abs(tx.gross)
        refundCount++
      }
    })

    // Net sales after refunds
    const netSales = totalSales - refundAmount

    // BAS Calculations
    // G1: Total sales including any GST
    const G1_TotalSales = netSales

    // For now, assume all sales are taxable (no exports or GST-free)
    const G2_ExportSales = 0
    const G3_OtherGSTFreeSales = 0
    const G4_InputTaxedSales = 0
    const G5_G2_plus_G3_plus_G4 = G2_ExportSales + G3_OtherGSTFreeSales + G4_InputTaxedSales

    // G6: Taxable sales
    const G6_TotalTaxableSales = G1_TotalSales - G5_G2_plus_G3_plus_G4

    // G7-G8: No adjustments for now
    const G7_Adjustments = 0
    const G8_TotalSalesSubjectToGST = G6_TotalTaxableSales + G7_Adjustments

    // 1A: GST on sales (only calculate if GST registered)
    const label_1A_GSTOnSales = tenant.gstRegistered
      ? calculateGSTFromInclusive(G8_TotalSalesSubjectToGST)
      : 0

    // Purchases (placeholder - would need expense tracking)
    const G10_CapitalPurchases = 0
    const G11_NonCapitalPurchases = 0
    const G12_G10_plus_G11 = G10_CapitalPurchases + G11_NonCapitalPurchases
    const G13_PurchasesPrivateUse = 0
    const G14_PurchasesGSTFree = 0
    const G15_EstimatedPurchases = 0
    const G16_G13_plus_G14_plus_G15 = G13_PurchasesPrivateUse + G14_PurchasesGSTFree + G15_EstimatedPurchases
    const G17_TotalCreditable = G12_G10_plus_G11 - G16_G13_plus_G14_plus_G15
    const G18_Adjustments = 0
    const G19_TotalPurchasesSubjectToGST = G17_TotalCreditable + G18_Adjustments

    // 1B: GST on purchases
    const label_1B_GSTOnPurchases = tenant.gstRegistered
      ? calculateGSTFromInclusive(G19_TotalPurchasesSubjectToGST)
      : 0

    // Net GST payable (positive = owe ATO, negative = refund)
    const netGSTPayable = label_1A_GSTOnSales - label_1B_GSTOnPurchases

    const basReport: BASReportData = {
      quarter,
      financialYear: fy.label,
      periodLabel: getQuarterLabel(quarter),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),

      businessName: tenant.businessName,
      abn: tenant.abn || null,
      gstRegistered: tenant.gstRegistered || false,

      G1_TotalSales,
      G2_ExportSales,
      G3_OtherGSTFreeSales,
      G4_InputTaxedSales,
      G5_G2_plus_G3_plus_G4,
      G6_TotalTaxableSales,
      G7_Adjustments,
      G8_TotalSalesSubjectToGST,
      label_1A_GSTOnSales,

      G10_CapitalPurchases,
      G11_NonCapitalPurchases,
      G12_G10_plus_G11,
      G13_PurchasesPrivateUse,
      G14_PurchasesGSTFree,
      G15_EstimatedPurchases,
      G16_G13_plus_G14_plus_G15,
      G17_TotalCreditable,
      G18_Adjustments,
      G19_TotalPurchasesSubjectToGST,
      label_1B_GSTOnPurchases,

      netGSTPayable,

      transactionCount: salesCount,
      refundCount,
      refundAmount,

      warnings,
    }

    return NextResponse.json(basReport)
  } catch (error) {
    console.error('Error generating BAS report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
