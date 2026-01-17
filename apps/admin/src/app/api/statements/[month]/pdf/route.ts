import { tenants, transactions } from '@madebuy/db'
import type { Tenant, TransactionSummary } from '@madebuy/shared'
import { getFromR2, putToR2 } from '@madebuy/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/statements/[month]/pdf
 * Generate a monthly financial statement PDF
 * Uses R2 caching - regenerates when transaction count changes
 *
 * @param month - Format: YYYY-MM (e.g., 2024-01)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { month: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate month format (YYYY-MM)
    const monthParam = params.month
    const monthMatch = monthParam.match(/^(\d{4})-(\d{2})$/)
    if (!monthMatch) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM (e.g., 2024-01)' },
        { status: 400 },
      )
    }

    const year = parseInt(monthMatch[1], 10)
    const month = parseInt(monthMatch[2], 10)

    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999) // Last day of month

    // Fetch full tenant data for branding
    const fullTenant = await tenants.getTenantById(tenant.id)
    if (!fullTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get transaction count for cache invalidation
    const transactionCount = await transactions.countTransactions(tenant.id, {
      startDate,
      endDate,
    })

    // Check R2 cache - key includes tenant, month, and transaction count for automatic invalidation
    const cacheKey = `statements/${tenant.id}/statement-${monthParam}-c${transactionCount}.pdf`
    const filename = `statement-${fullTenant.slug}-${monthParam}.pdf`

    // Try to fetch from cache
    try {
      const cachedPdf = await getFromR2(cacheKey)
      if (cachedPdf) {
        console.log(`Statement cache hit: ${cacheKey}`)
        return new NextResponse(new Uint8Array(cachedPdf), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': cachedPdf.length.toString(),
            'X-Cache': 'HIT',
          },
        })
      }
    } catch (_cacheError) {
      // Cache miss or R2 error - continue to generate
      console.log(`Statement cache miss: ${cacheKey}`)
    }

    // Fetch transaction summary for the month
    const summary = await transactions.getTransactionSummary(
      tenant.id,
      startDate,
      endDate,
    )

    // Fetch all transactions for detailed breakdown
    const monthTransactions = await transactions.listTransactions(tenant.id, {
      filters: {
        startDate,
        endDate,
      },
      limit: 1000,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    })

    // Generate PDF
    const pdfBytes = await generateStatementPDF(
      fullTenant,
      summary,
      monthTransactions,
      monthParam,
    )

    const pdfBuffer = Buffer.from(pdfBytes)

    // Store in R2 cache (non-blocking) - uses deterministic key for caching
    putToR2(cacheKey, pdfBuffer, 'application/pdf', {
      month: monthParam,
      transactionCount: String(transactionCount),
      generatedAt: new Date().toISOString(),
    })
      .then(() => {
        console.log(`Statement cached: ${cacheKey}`)
      })
      .catch((err) => {
        console.error('Failed to cache statement:', err)
      })

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'X-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('Error generating statement PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate statement' },
      { status: 500 },
    )
  }
}

async function generateStatementPDF(
  tenant: Tenant,
  summary: TransactionSummary,
  transactionsList: any[],
  _monthStr: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
  const { width, height } = page.getSize()

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Colors
  const black = rgb(0, 0, 0)
  const gray = rgb(0.4, 0.4, 0.4)
  const blue = rgb(0.2, 0.4, 0.8)
  const lightGray = rgb(0.9, 0.9, 0.9)

  let y = height - 50

  // Header - Shop name
  page.drawText(tenant.businessName || tenant.slug, {
    x: 50,
    y,
    size: 24,
    font: helveticaBold,
    color: black,
  })

  y -= 20
  page.drawText('Monthly Financial Statement', {
    x: 50,
    y,
    size: 14,
    font: helvetica,
    color: gray,
  })

  // Month and period
  y -= 40
  const monthName = new Date(summary.startDate).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  })
  page.drawText(`Period: ${monthName}`, {
    x: 50,
    y,
    size: 12,
    font: helveticaBold,
    color: black,
  })

  y -= 15
  page.drawText(
    `${formatDatePDF(summary.startDate)} - ${formatDatePDF(summary.endDate)}`,
    {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    },
  )

  // Summary section
  y -= 40
  page.drawText('Summary', {
    x: 50,
    y,
    size: 14,
    font: helveticaBold,
    color: blue,
  })

  y -= 5
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: lightGray,
  })

  // Summary table
  y -= 25
  const summaryData = [
    { label: 'Total Sales', value: `${summary.sales.count.toString()} orders` },
    { label: 'Gross Revenue', value: formatCurrency(summary.sales.gross) },
    {
      label: 'Processing Fees (Stripe)',
      value: `-${formatCurrency(summary.sales.fees)}`,
    },
    { label: 'Net Revenue', value: formatCurrency(summary.sales.net) },
    {
      label: 'Refunds',
      value:
        summary.refunds.count > 0
          ? `-${formatCurrency(summary.refunds.amount)} (${summary.refunds.count})`
          : '$0.00',
    },
    {
      label: 'Payouts to Bank',
      value:
        summary.payouts.count > 0
          ? `${formatCurrency(summary.payouts.amount)} (${summary.payouts.count})`
          : '$0.00',
    },
  ]

  for (const item of summaryData) {
    page.drawText(item.label, {
      x: 50,
      y,
      size: 11,
      font: helvetica,
      color: black,
    })
    page.drawText(item.value, {
      x: 350,
      y,
      size: 11,
      font: helveticaBold,
      color: black,
    })
    y -= 20
  }

  // Transaction details section
  y -= 30
  page.drawText('Transaction Details', {
    x: 50,
    y,
    size: 14,
    font: helveticaBold,
    color: blue,
  })

  y -= 5
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: lightGray,
  })

  // Table headers
  y -= 20
  const colX = { date: 50, type: 140, desc: 220, amount: 400, net: 480 }

  page.drawText('Date', {
    x: colX.date,
    y,
    size: 9,
    font: helveticaBold,
    color: gray,
  })
  page.drawText('Type', {
    x: colX.type,
    y,
    size: 9,
    font: helveticaBold,
    color: gray,
  })
  page.drawText('Description', {
    x: colX.desc,
    y,
    size: 9,
    font: helveticaBold,
    color: gray,
  })
  page.drawText('Gross', {
    x: colX.amount,
    y,
    size: 9,
    font: helveticaBold,
    color: gray,
  })
  page.drawText('Net', {
    x: colX.net,
    y,
    size: 9,
    font: helveticaBold,
    color: gray,
  })

  y -= 10
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 0.5,
    color: lightGray,
  })

  // Transaction rows (limit to fit on page)
  y -= 15
  const maxRows = Math.min(transactionsList.length, 25)
  for (let i = 0; i < maxRows; i++) {
    const tx = transactionsList[i]
    if (y < 100) break // Leave room for footer

    const txDate = formatDatePDF(new Date(tx.createdAt))
    const txType = tx.type.charAt(0).toUpperCase() + tx.type.slice(1)
    const txDesc = (tx.description || getDefaultDescription(tx.type)).slice(
      0,
      25,
    )
    const txGross = formatCurrency(tx.grossAmount)
    const txNet = formatCurrency(tx.netAmount)

    page.drawText(txDate, {
      x: colX.date,
      y,
      size: 9,
      font: helvetica,
      color: black,
    })
    page.drawText(txType, {
      x: colX.type,
      y,
      size: 9,
      font: helvetica,
      color: black,
    })
    page.drawText(txDesc, {
      x: colX.desc,
      y,
      size: 9,
      font: helvetica,
      color: black,
    })
    page.drawText(txGross, {
      x: colX.amount,
      y,
      size: 9,
      font: helvetica,
      color: black,
    })
    page.drawText(txNet, {
      x: colX.net,
      y,
      size: 9,
      font: helvetica,
      color: black,
    })

    y -= 15
  }

  if (transactionsList.length > maxRows) {
    page.drawText(
      `... and ${transactionsList.length - maxRows} more transactions`,
      {
        x: 50,
        y,
        size: 9,
        font: helvetica,
        color: gray,
      },
    )
  }

  // Footer
  const footerY = 50
  page.drawLine({
    start: { x: 50, y: footerY + 15 },
    end: { x: width - 50, y: footerY + 15 },
    thickness: 0.5,
    color: lightGray,
  })

  page.drawText(
    `Generated by MadeBuy on ${new Date().toLocaleDateString('en-AU')}`,
    {
      x: 50,
      y: footerY,
      size: 8,
      font: helvetica,
      color: gray,
    },
  )

  if (tenant.email) {
    page.drawText(tenant.email, {
      x: width - 50 - helvetica.widthOfTextAtSize(tenant.email, 8),
      y: footerY,
      size: 8,
      font: helvetica,
      color: gray,
    })
  }

  return await pdfDoc.save()
}

function formatDatePDF(date: Date): string {
  return new Date(date).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(dollars)
}

function getDefaultDescription(type: string): string {
  const descriptions: Record<string, string> = {
    sale: 'Order payment',
    refund: 'Order refund',
    payout: 'Payout to bank',
    fee: 'Platform fee',
    subscription: 'Subscription payment',
  }
  return descriptions[type] || type
}
