import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions, tenants } from '@madebuy/db'
import { getCurrentQuarter } from '@madebuy/shared'

/**
 * GET /api/reports/gst
 * Get quarterly GST summary for BAS (Business Activity Statement)
 *
 * Query params:
 *   - quarter: String in format "YYYY-QN" (e.g., "2024-Q1"). Defaults to current quarter.
 *
 * Response:
 *   - QuarterlyGSTReport object with GST collected, paid, and net amounts
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get full tenant data for tax settings
    const fullTenant = await tenants.getTenantById(tenant.id)
    if (!fullTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check if tenant is GST registered
    if (!fullTenant.taxSettings?.gstRegistered) {
      return NextResponse.json({
        error: 'GST reporting is only available for GST-registered businesses. Please enable GST in your tax settings.',
        code: 'GST_NOT_REGISTERED',
      }, { status: 400 })
    }

    // Get quarter from query params or use current quarter
    const { searchParams } = new URL(request.url)
    const quarter = searchParams.get('quarter') || getCurrentQuarter()

    // Validate quarter format
    if (!/^\d{4}-Q[1-4]$/.test(quarter)) {
      return NextResponse.json({
        error: 'Invalid quarter format. Use YYYY-QN (e.g., 2024-Q1)',
        code: 'INVALID_QUARTER_FORMAT',
      }, { status: 400 })
    }

    // Get the GST rate from tenant settings
    const gstRate = fullTenant.taxSettings?.gstRate || 10

    // Generate the report
    const report = await transactions.getQuarterlyGSTReport(
      tenant.id,
      quarter,
      gstRate
    )

    if (!report) {
      return NextResponse.json({
        error: 'Failed to generate GST report',
        code: 'REPORT_GENERATION_FAILED',
      }, { status: 500 })
    }

    return NextResponse.json({
      report,
      tenant: {
        abn: fullTenant.taxSettings?.abn,
        businessName: fullTenant.businessName,
        gstRate: gstRate,
      },
    })
  } catch (error) {
    console.error('Error generating GST report:', error)
    return NextResponse.json(
      { error: 'Failed to generate GST report' },
      { status: 500 }
    )
  }
}
